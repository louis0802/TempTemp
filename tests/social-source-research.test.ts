import { describe, it, expect, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  socialIdentity,
  buildSocialInventory,
  verifySocialOwnership,
  type AuthorityReview,
} from "../scripts/research/social-sources/inventory";
import {
  readSocialResearch,
  socialResearchInputs,
} from "../scripts/research/social-sources/read";
import {
  assessInstagramCapture,
  assessSocialCaption,
} from "../scripts/research/social-sources/assessment";
import { readMapInputs } from "../scripts/research/build-merchant-source-map";
import {
  assertSourceScope,
  instagramIdentity,
} from "@/ingestion/direct-sources/source-scope";
import { BoundedDirectFetch } from "@/ingestion/direct-sources/fetch";
import { directSources } from "@/ingestion/direct-sources/registry";
import {
  trustedDirectSource,
  DIRECT_SOURCE_PROCESSOR_VERSION,
} from "@/ingestion/direct-sources/publication";
import { sourceSchema } from "@/domain/promotion";
import type { AuditResult } from "../scripts/research/source-origin-audit/types";
const hash = (v: string) => createHash("sha256").update(v).digest("hex");
const scope = {
  sourceKind: "merchant_social" as const,
  allowedHosts: ["www.instagram.com"],
  socialScope: {
    platform: "instagram" as const,
    account: "examplemerchant",
    allowedContent: ["profile", "post", "reel", "tv"] as const,
  },
};
const caption = (text: string | null, kind: "post" | "reel" = "post") =>
  assessSocialCaption({
    caption: text,
    publishedAt: "2026-10-01T10:00:00Z",
    kind,
    accountAssociationVerified: true,
  });
function ownershipFixture() {
  const body =
    '<h1>Reviewed official merchant site</h1><a href="https://www.instagram.com/examplemerchant/">Instagram</a>';
  const entry: AuthorityReview["entries"][number] = {
    merchant: "Example Merchant",
    platform: "instagram",
    account: "examplemerchant",
    authority: "verified",
    evidence_urls: ["https://merchant.example/"],
    evidence_note: "Independently reviewed merchant control and exact backlink",
    official_url: "https://merchant.example/",
    controlled_merchant: "Example Merchant",
    control_evidence_refs: ["reviewed corporate evidence"],
    capture_file: "capture",
    capture_sha256: hash(body),
    frozen_signal_ids: [],
    variation: [],
  };
  const review: AuthorityReview = { version: 1, entries: [entry] };
  const captures = new Map([
    [
      "capture",
      { url: entry.official_url, body, sha256: hash(body), status: 200 },
    ],
  ]);
  return { body, entry, review, captures };
}
describe("exact social candidate identities and ownership", () => {
  it.each([
    [
      "https://www.instagram.com/examplemerchant/p/ABC/",
      "instagram",
      "examplemerchant",
    ],
    ["https://www.instagram.com/p/ABC/", "instagram", null],
    [
      "https://www.facebook.com/examplemerchant/",
      "facebook",
      "examplemerchant",
    ],
    [
      "https://www.tiktok.com/@examplemerchant/photo/123",
      "tiktok",
      "examplemerchant",
    ],
  ])("extracts exact identity %s", (url, platform, account) =>
    expect(socialIdentity(url)).toEqual({ platform, account }),
  );
  it("never uses unsupported-browser transport as identity or shares an account between platforms", async () => {
    const audit = JSON.parse(
      await readFile(socialResearchInputs.audit, "utf8"),
    ) as AuditResult;
    const actual = audit.records.find(
      (r) =>
        r.association === "offer" &&
        r.destination_class === "official_social_candidate" &&
        r.candidate_domain === "instagram.com",
    )!;
    const merchant = "Example Merchant";
    const records = [
      {
        ...actual,
        merchant_hint: merchant,
        canonical_candidate_url:
          "https://www.instagram.com/examplemerchant/p/ABC/",
      },
      {
        ...actual,
        merchant_hint: merchant,
        canonical_candidate_url: "https://www.facebook.com/examplemerchant/",
        signal_id: "fb",
      },
      {
        ...actual,
        merchant_hint: merchant,
        canonical_candidate_url:
          "https://www.tiktok.com/@examplemerchant/video/123",
        signal_id: "tk",
      },
      {
        ...actual,
        merchant_hint: "Neighbor",
        association: "source_post" as const,
      },
    ];
    const inventory = buildSocialInventory({
      audit: { ...audit, records },
      review: { version: 1, entries: [] },
      captures: new Map(),
      merchantKeys: new Set(["examplemerchant", "neighbor"]),
      provenance: null,
    });
    expect(inventory.accounts.map((a) => a.platform).sort()).toEqual([
      "facebook",
      "instagram",
      "tiktok",
    ]);
    expect(inventory.accounts[0].transport_final_urls).toContain(
      "https://www.facebook.com/unsupportedbrowser",
    );
    expect(inventory.summary.merchants_with_social_candidates).toBe(1);
    expect(inventory.accounts.every((a) => a.ownership === "unverified")).toBe(
      true,
    );
    expect(inventory.excluded_records[0].reason).toBe(
      "context_or_non_promotion_discovery",
    );
  });
  it("exact captured official backlink verifies; names/branding and an arbitrary same-name account cannot", () => {
    const f = ownershipFixture();
    expect(verifySocialOwnership(f.entry, f.review, f.captures).ownership).toBe(
      "verified",
    );
    expect(
      verifySocialOwnership(
        { ...f.entry, account: "examplemerchant2" },
        f.review,
        f.captures,
      ).ownership,
    ).toBe("unverified");
    const body = "<h1>examplemerchant official display name</h1>";
    expect(
      verifySocialOwnership(
        { ...f.entry, capture_sha256: hash(body) },
        f.review,
        new Map([
          [
            "capture",
            {
              url: f.entry.official_url,
              status: 200,
              body,
              sha256: hash(body),
            },
          ],
        ]),
      ).ownership,
    ).toBe("unverified");
  });
  it("merchant mismatch, conflicting owners, tampered captures and discovery publishers fail closed", () => {
    const f = ownershipFixture();
    expect(
      verifySocialOwnership(
        { ...f.entry, controlled_merchant: "Another" },
        f.review,
        f.captures,
      ).ownership,
    ).toBe("unverified");
    expect(
      verifySocialOwnership(
        f.entry,
        { version: 1, entries: [f.entry, { ...f.entry, merchant: "Another" }] },
        f.captures,
      ).blockers,
    ).toContain("conflicting_ownership_evidence");
    expect(
      verifySocialOwnership(
        f.entry,
        f.review,
        new Map([
          [
            "capture",
            {
              url: f.entry.official_url,
              status: 200,
              body: f.body + "changed",
              sha256: f.entry.capture_sha256,
            },
          ],
        ]),
      ),
    ).toMatchObject({ ownership: "unverified" });
    for (const official_url of [
      "https://t.me/sgfooddeals/1",
      "https://www.google.com/",
      "https://www.instagram.com/examplemerchant/",
    ])
      expect(
        verifySocialOwnership(
          { ...f.entry, official_url },
          f.review,
          f.captures,
        ).ownership,
      ).toBe("unverified");
  });
  it("replays checked bytes without network and keeps accountless content separate from exact account candidates", async () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("no network"));
    try {
      const map = await readMapInputs(),
        keys = new Set(map.merchants.map((r) => r.normalized_merchant));
      const identities = JSON.parse(
        await readFile("docs/research/merchant-source-map-review.json", "utf8"),
      ).signal_identities;
      const a = await readSocialResearch(process.cwd(), keys, identities),
        b = await readSocialResearch(process.cwd(), keys, identities);
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
      expect(fetch).not.toHaveBeenCalled();
      expect(a!.socialInventory.summary).toMatchObject({
        instagram_account_candidates: 16,
        verified_instagram_accounts: 14,
        unverified_instagram_accounts: 2,
      });
      expect(
        a!.socialInventory.account_unresolved_content.length,
      ).toBeGreaterThan(0);
      expect(
        a!.socialInventory.accounts
          .filter(
            (a) =>
              a.platform === "instagram" &&
              [
                "ajummasg",
                "shinrai.sg",
                "sinpopobrand",
                "starbuckssg",
              ].includes(a.account),
          )
          .every((a) => a.content_association === "independently_verified"),
      ).toBe(true);
      expect(a!.acquisitionReview.adapter_created).toBe(false);
      expect(a!.socialAssessments).toHaveLength(15);
      expect(
        a!.socialAssessments.every(
          (a) => !a.acquisition_ready && !a.production_enabled,
        ),
      ).toBe(true);
    } finally {
      fetch.mockRestore();
    }
  });
});
describe("trusted shared-host scope", () => {
  it.each([
    "https://www.instagram.com/another/",
    "https://www.instagram.com/another/p/ABC/",
    "https://www.instagram.com/another/reel/ABC/",
    "https://www.instagram.com/another/tv/ABC/",
  ])("rejects another account %s", (url) =>
    expect(() => assertSourceScope(scope, url)).toThrow(
      "social_account_mismatch",
    ),
  );
  it.each([
    "http://www.instagram.com/examplemerchant/",
    "https://www.instagram.com/",
    "https://www.instagram.com/accounts/login/",
    "https://www.instagram.com/examplemerchant/stories/ABC/",
    "https://www.instagram.com/examplemerchant//p/ABC/",
    "https://www.instagram.com/examplemerchant/?access_token=fake",
    "https://www.instagram.com/%65xamplemerchant/",
    "https://www.instagram.com:444/examplemerchant/",
    "https://user:pass@www.instagram.com/examplemerchant/",
  ])("rejects unsupported URL %s", (url) =>
    expect(() => assertSourceScope(scope, url)).toThrow(),
  );
  it("requires independent exact accountless item evidence; both publication and redirect transport enforce the same scope", async () => {
    expect(() =>
      assertSourceScope(scope, "https://www.instagram.com/p/ABC/"),
    ).toThrow("social_content_account_unproven");
    const bound = {
      ...scope,
      socialScope: {
        ...scope.socialScope,
        contentBindings: [
          {
            url: "https://www.instagram.com/p/ABC/",
            account: "examplemerchant",
            evidenceRefs: ["captured public og:url proof"],
          },
        ],
      },
    };
    expect(
      assertSourceScope(bound, "https://www.instagram.com/p/ABC/").pathname,
    ).toBe("/p/ABC/");
    expect(() =>
      assertSourceScope(bound, "https://www.instagram.com/p/DEF/"),
    ).toThrow();
    const source = {
      ...directSources[0],
      ...scope,
      listingUrls: ["https://www.instagram.com/examplemerchant/"],
      publicationPolicy: {
        ...directSources[0].publicationPolicy,
        enabled: false,
        autoPublish: false,
      },
    };
    expect(trustedDirectSource(source, source.listingUrls[0])).toMatchObject({
      sourceKind: "merchant_social",
      platform: "instagram",
    });
    expect(() =>
      trustedDirectSource(source, "https://www.instagram.com/another/"),
    ).toThrow();
    const transport = vi.fn(async () => ({
      status: 302,
      headers: { location: "https://www.instagram.com/another/" },
      body: Buffer.alloc(0),
    }));
    const http = new BoundedDirectFetch(source, transport);
    await expect(http.fetch(source.listingUrls[0], "listing")).rejects.toThrow(
      "social_account_mismatch",
    );
    expect(transport).toHaveBeenCalledTimes(1);
    expect(
      () =>
        new BoundedDirectFetch(
          { ...source, sourceKind: "merchant_web", socialScope: undefined },
          transport,
        ),
    ).toThrow("social_account_scope_required");
  });
  it("retains legacy/site representations and unchanged publication processor", () => {
    expect(
      sourceSchema.parse({
        label: "Telegram",
        url: "https://t.me/sgfooddeals/1",
      }),
    ).toEqual({ label: "Telegram", url: "https://t.me/sgfooddeals/1" });
    expect(
      trustedDirectSource(directSources[0], directSources[0].listingUrls[0]),
    ).toEqual({
      kind: "direct",
      sourceId: "pepper_lunch_sg",
      label: directSources[0].label,
      url: directSources[0].listingUrls[0],
    });
    expect(DIRECT_SOURCE_PROCESSOR_VERSION).toBe("direct-source-v2");
    expect(instagramIdentity("https://www.instagram.com/reel/ABC/")?.kind).toBe(
      "reel",
    );
  });
});
describe("public Instagram response and caption semantics", () => {
  it("login/challenge interruptions and unknown continuation never become acquisition-ready", () => {
    for (const body of [
      "<h1>Log in to continue</h1>",
      "<h1>CAPTCHA challenge</h1>",
      '<button>Load more</button><a href="/examplemerchant/p/ABC/">Post</a>',
    ]) {
      const a = assessInstagramCapture("examplemerchant", {
        url: "https://www.instagram.com/examplemerchant/",
        status: 200,
        body,
        redirectTo: null,
        error: null,
      });
      expect(a.acquisition_ready).toBe(false);
      expect(a.enumeration_complete).toBe(false);
      expect(a.blockers).toContain("bounded_feed_boundary_unproven");
    }
  });
  it("caption metadata needs exact native identity and account; display-name similarity cannot prove association", () => {
    const body =
      '<link rel="canonical" href="https://www.instagram.com/p/ABC/"><meta property="og:url" content="https://www.instagram.com/examplemerchant/p/ABC/"><meta property="og:title" content=\'Example on Instagram: "20% off. Valid from 1 October 2026. Valid until 31 October 2026."\'>';
    const a = assessInstagramCapture("examplemerchant", {
      url: "https://www.instagram.com/p/ABC/",
      status: 200,
      body,
      redirectTo: null,
      error: null,
    });
    expect(a.account_post_association).toBe("verified");
    expect(a.public_caption).toContain("20% off");
    expect(
      assessInstagramCapture("examplemerchant", {
        url: "https://www.instagram.com/p/ABC/",
        status: 200,
        body:
          body +
          '<a rel="author" href="https://www.instagram.com/another/">Author</a>',
        redirectTo: null,
        error: null,
      }).account_post_association,
    ).toBe("unproven");
    expect(
      assessInstagramCapture("another", {
        url: "https://www.instagram.com/p/ABC/",
        status: 200,
        body,
        redirectTo: null,
        error: null,
      }).account_post_association,
    ).toBe("unproven");
  });
  it("explicit caption promotions emit research candidates; ordinary posts and unverified identity do not", () => {
    expect(
      caption(
        "20% off all drinks. 1–31 Oct 2026. Available at all Singapore outlets.",
      ),
    ).toMatchObject({
      classification: "promotion",
      emits_research_candidate: true,
      startDate: "2026-10-01",
      endDate: "2026-10-31",
      locationScope: "all_outlets",
    });
    for (const text of [
      "New menu launch",
      "New store opening",
      "Our signature coffee",
      "A day in the cafe",
    ])
      expect(caption(text)).toMatchObject({
        classification: "non_promotion",
        emits_research_candidate: false,
      });
    expect(
      assessSocialCaption({
        caption: "20% off",
        kind: "post",
        publishedAt: null,
        accountAssociationVerified: false,
      }).emits_research_candidate,
    ).toBe(false);
  });
  it("publication timestamps, images and videos never establish campaign validity; selected outlets review", () => {
    expect(caption("20% off. See image for details")).toMatchObject({
      startDate: null,
      endDate: null,
      publishedAt: "2026-10-01T10:00:00Z",
    });
    expect(caption("20% off. See image for details").issues).toContain(
      "image_only_facts_unknown",
    );
    expect(caption("20% off. See video for details", "reel").issues).toContain(
      "video_only_facts_unknown",
    );
    expect(
      caption("20% off at selected outlets. 1–31 Oct 2026.").issues,
    ).toContain("selected_outlets_unresolved");
    expect(caption("20% off. 1–31 Oct.")).toMatchObject({
      startDate: null,
      endDate: null,
    });
  });
  it("public transport source contains no authenticated requests/private API and does not retain response cookies", async () => {
    const transport = await readFile(
      "scripts/research/social-sources/capture.ts",
      "utf8",
    );
    expect(transport).not.toMatch(
      /headers\["set-cookie"\]|Authorization:|Cookie:|sessionid|api\/v1|graphql\//,
    );
    expect(transport).toContain("nodeBodyTransport");
    expect(transport).toContain("No cookies");
    expect(
      await readFile("src/ingestion/direct-sources/fetch.ts", "utf8"),
    ).not.toMatch(/Authorization:|Cookie:/);
  });
});
