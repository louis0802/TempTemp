import { describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import type { MerchantBranch } from "@/ingestion/resolution/types";
import { sourceDefinition } from "@/ingestion/direct-sources/registry";
import { runDirectSource } from "@/ingestion/direct-sources/runner";
import {
  BoundedDirectFetch,
  type DirectTransport,
} from "@/ingestion/direct-sources/fetch";
import { fixtureTransport } from "@/ingestion/direct-sources/fixtures";
import { contentHash } from "@/ingestion/direct-sources/evidence";
import {
  parseShakeOutlets,
  ShakeShackOutletProvider,
  shakeOutletUrl,
} from "@/ingestion/direct-sources/adapters/shake-shack-outlets";
import { createDirectOutletResolver } from "@/ingestion/direct-sources/outlet-resolution";
import {
  evaluateDirectPublication,
  directPromotionId,
  directRevisionHash,
} from "@/ingestion/direct-sources/publication";
import { parseIngestArgs } from "../scripts/direct-source-ingest";
import { parseArgs } from "../scripts/direct-source-preview";
const root = "tests/fixtures/direct-sources/shake-shack",
  source = sourceDefinition("shake_shack_sg"),
  origin = source.origin;
const paths = [
  "national-cheeseburger-day",
  "our-french-onion-menu",
  "shack-meal",
  "were-introducing-chicken-sundays",
  "study-breaks-just-got-better",
];
const listing = (slugs: string[], links = "") =>
  `<html><main><div class="pp-posts">${slugs.map((s) => `<div class="pp-post"><h2 class="pp-post-title"><a href="${origin}/${s}/">${s}</a></h2></div>`).join("")}</div><div class="pagination">${links}</div></main></html>`;
async function smallRun(
  edit?: (body: string, url: URL) => string,
  options: Parameters<typeof runDirectSource>[1] = {},
) {
  const f = await fixtureTransport(`${root}/manifest.json`);
  const transport: DirectTransport = async (url, signal, max) => {
    const response =
      url.pathname === "/blog/"
        ? {
            status: 200,
            headers: { "content-type": "text/html" },
            body: Buffer.from(
              listing(
                paths.slice(0, 2),
                '<a class="page-numbers" href="/blog/page/2/">2</a>',
              ),
            ),
          }
        : url.pathname === "/blog/page/2/"
          ? {
              status: 200,
              headers: { "content-type": "text/html" },
              body: Buffer.from(listing(paths.slice(2))),
            }
          : await f.transport(url, signal, max);
    return edit
      ? { ...response, body: Buffer.from(edit(response.body.toString(), url)) }
      : response;
  };
  return runDirectSource(source, {
    ...f,
    transport,
    mode: "fixture",
    ...options,
  });
}
const candidate = async () =>
  (await smallRun()).candidates.find((c) =>
    c.canonicalUrl.endsWith("/national-cheeseburger-day/"),
  )!;
async function directory() {
  const f = await fixtureTransport(`${root}/manifest.json`);
  return new ShakeShackOutletProvider(f.transport).getSingaporeBranches(
    "Shake Shack",
  );
}
const resolved = {
  asOf: "2026-09-16",
  acquisitionReady: true,
  outletsVerified: true,
  outletIssues: [],
  verifiedAt: "2026-10-01T04:00:00.000Z",
  outlets: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      name: "Westgate",
      address: "3 Gateway Drive #01-20 Westgate Singapore 608532",
      lat: 1.3,
      lng: 103.8,
      evidence: "Synthetic test coordinates only",
      verifiedAt: "2026-10-01T04:00:00.000Z",
    },
  ],
};
describe("Shake Shack bounded acquisition", () => {
  it("fetches the registered listing and exposed numbered page, filters editorial and emits captured promotions", async () => {
    const r = await smallRun();
    expect(r.enumeration.complete).toBe(true);
    expect(r.enumeration.pagination.requested).toEqual([
      `${origin}/blog/`,
      `${origin}/blog/page/2/`,
    ]);
    expect(r.candidates).toHaveLength(4);
    expect(
      r.candidates.some((c) =>
        c.canonicalUrl.includes("our-french-onion-menu"),
      ),
    ).toBe(false);
  });
  it("traverses the four captured archive pages without asserting unclassified details are complete", async () => {
    const f = await fixtureTransport(`${root}/manifest.json`);
    const r = await runDirectSource(source, { ...f, mode: "fixture" });
    expect(r.enumeration.pagination.requested).toHaveLength(4);
    expect(r.enumeration.complete).toBe(false);
    expect(r.issues.some((i) => i.code === "fixture_url_missing")).toBe(true);
  });
  it("terminates a next-link cycle and reports partial", async () => {
    const r = await smallRun((body, url) =>
      url.pathname.endsWith("/page/2/")
        ? body.replace("</main>", '<a rel="next" href="/blog/">Next</a></main>')
        : body,
    );
    expect(r.enumeration.complete).toBe(false);
    expect(r.issues.some((i) => i.code === "pagination_cycle")).toBe(true);
    expect(r.enumeration.pagination.requested).toHaveLength(2);
  });
  it("page cap blocks completeness", async () => {
    const r = await smallRun(undefined, { limits: { maxListingPages: 1 } });
    expect(r.enumeration.complete).toBe(false);
    expect(r.issues.some((i) => i.code === "listing_page_limit")).toBe(true);
  });
  it.each([
    '<button class="load-more">More</button>',
    '<div data-infinite-scroll="true"></div>',
    '<div class="infinite-scroll"><a>More</a></div>',
  ])("unknown controls block completeness: %s", async (control) => {
    const r = await smallRun((body) =>
      body.replace("</main>", `${control}</main>`),
    );
    expect(r.enumeration.complete).toBe(false);
  });
  it("canonical duplicate article links dedupe", async () => {
    const r = await smallRun((body, url) =>
      url.pathname === "/blog/"
        ? body.replace(
            "</main>",
            listing(["national-cheeseburger-day"]) + "</main>",
          )
        : body,
    );
    expect(
      r.candidates.filter((c) =>
        c.canonicalUrl.includes("national-cheeseburger"),
      ),
    ).toHaveLength(1);
    expect(
      r.enumeration.classification?.articles.filter((a) =>
        a.url.includes("national-cheeseburger"),
      ),
    ).toHaveLength(1);
  });
  it("unregistered paths and hosts are not fetched; unapproved pagination blocks proof", async () => {
    const r = await smallRun((body, url) =>
      url.pathname === "/blog/"
        ? body.replace(
            "</main>",
            '<a href="/admin/">Admin</a><div class="pp-posts"><div class="pp-post"><h2 class="pp-post-title"><a href="https://evil.example/free/">Free</a></h2></div></div><a class="page-numbers" href="/locations/">More</a></main>',
          )
        : body,
    );
    expect(r.requests.some((q) => /evil|admin|locations/.test(q.url))).toBe(
      false,
    );
    expect(r.enumeration.complete).toBe(false);
  });
  it("arbitrary same-site crawling and unregistered hosts reject before transport", async () => {
    const t = vi.fn(),
      http = new BoundedDirectFetch(source, t);
    await expect(http.fetch(`${origin}/arbitrary/`, "detail")).rejects.toThrow(
      "undiscovered_url",
    );
    await expect(
      http.fetch("https://evil.example/blog/", "listing"),
    ).rejects.toThrow("unregistered_host");
    expect(t).not.toHaveBeenCalled();
  });
  it("missing listing structure is partial", async () => {
    const r = await smallRun((body, url) =>
      url.pathname === "/blog/"
        ? body.replaceAll("pp-posts", "unknown-posts")
        : body,
    );
    expect(r.enumeration.complete).toBe(false);
  });
  it("currency/free words without the terms and economic proposition do not create editorial candidates", async () => {
    const r = await smallRun((body, url) =>
      url.pathname.includes("our-french-onion-menu")
        ? body.replace("As we head", "Free $5 deal. As we head")
        : body,
    );
    expect(
      r.candidates.some((c) =>
        c.canonicalUrl.includes("our-french-onion-menu"),
      ),
    ).toBe(false);
  });
});
describe("campaign facts and provenance", () => {
  it("keeps publication separate from explicit campaign validity and extracts benefit/redemption/terms evidence", async () => {
    const c = await candidate();
    expect(c.publishedAt).toBe("2026-09-09T02:00:16+00:00");
    expect(c.startDate).toBe("2026-09-14");
    expect(c.endDate).toBe("2026-09-18");
    expect(c.benefit).toContain("FREE Beef Patty");
    expect(c.redemption?.join("\n")).toContain("Tap on ‘Order’");
    expect(c.terms?.join("\n")).toContain("while stocks last");
    for (const field of [
      "benefit",
      "validity",
      "redemption",
      "terms",
      "publishedAt",
    ] as const)
      expect(c.facts[field]?.evidenceIds.length).toBeGreaterThan(0);
  });
  it("article date cannot supply campaign year/start/end", async () => {
    const r = await smallRun((body, url) =>
      url.pathname.includes("national-cheeseburger")
        ? body.replace(
            "Promotion is valid from 14 to 18 September 2026, while stocks last.",
            "Promotion is valid until further notice.",
          )
        : body,
    );
    const c = r.candidates.find((c) =>
      c.canonicalUrl.includes("national-cheeseburger"),
    )!;
    expect(c.publishedAt).not.toBeNull();
    expect(c.startDate).toBeNull();
    expect(c.endDate).toBeNull();
    expect(evaluateDirectPublication(c, resolved).reasons).toContain(
      "missing_end_date",
    );
  });
  it("missing expiry and explicit hours stay review blockers; no post-date fabrication", async () => {
    const c = (await smallRun()).candidates.find((c) =>
      c.canonicalUrl.endsWith("/shack-meal/"),
    )!;
    expect(c.endDate).toBeNull();
    expect(c.startDate).toBeNull();
    expect(c.weekdays).toEqual([1, 2, 3, 4, 5]);
    expect(c.issues).toContain("unresolved_hour_restriction");
    expect(evaluateDirectPublication(c, resolved).result).toBe("needs_review");
  });
  it("explicit Sunday restriction and explicit year are represented", async () => {
    const c = (await smallRun()).candidates.find((c) =>
      c.canonicalUrl.includes("chicken-sundays"),
    )!;
    expect(c.weekdays).toEqual([7]);
    expect(c.startDate).toBe("2025-11-30");
    expect(c.endDate).toBe("2025-12-28");
  });
  it("eligibility is retained verbatim and holiday restrictions still block", async () => {
    const c = (await smallRun()).candidates.find((c) =>
      c.canonicalUrl.includes("study-breaks"),
    )!;
    expect(c.eligibility?.join("\n")).toContain(
      "A valid student ID must be presented at the point of purchase to enjoy the promotion.",
    );
    expect(evaluateDirectPublication(c, resolved).reasons).toContain(
      "unsupported_holiday_validity",
    );
    expect(c.startDate).toBeNull();
  });
  it("captured named participants preserve exact identities while holidays still block", async () => {
    const c = (await smallRun()).candidates.find((c) =>
      c.canonicalUrl.includes("study-breaks"),
    )!;
    expect(c.locationScope).toBe("named_outlets");
    expect(c.locationNames).toEqual(["Westgate", "Junction 8", "Great World"]);
    expect(c.issues).not.toContain("location_identity_unresolved");
  });
  it("a single explicit campaign date supplies both bounds without a publication-date inference", async () => {
    const r = await smallRun((body, url) =>
      url.pathname.includes("national-cheeseburger")
        ? body.replace(
            "Promotion is valid from 14 to 18 September 2026, while stocks last.",
            "Offer is valid on 18 September 2026 only.",
          )
        : body,
    );
    const c = r.candidates.find((c) =>
      c.canonicalUrl.includes("national-cheeseburger"),
    )!;
    expect([c.startDate, c.endDate]).toEqual(["2026-09-18", "2026-09-18"]);
  });
  it("unknown location never becomes all outlets", async () => {
    const r = await smallRun((body, url) =>
      url.pathname.includes("national-cheeseburger")
        ? body.replace(
            "Valid at all Shake Shack Singapore outlets.",
            "Visit the Shack.",
          )
        : body,
    );
    const c = r.candidates.find((c) =>
      c.canonicalUrl.includes("national-cheeseburger"),
    )!;
    expect(c.locationScope).toBe("source_unspecified");
    expect(evaluateDirectPublication(c, resolved).reasons).toContain(
      "source_unspecified_locations",
    );
  });
  it("explicit exclusions never become unrestricted all outlets", async () => {
    const r = await smallRun((body, url) =>
      url.pathname.includes("national-cheeseburger")
        ? body.replace(
            "Valid at all Shake Shack Singapore outlets.",
            "Valid at all Shake Shack Singapore outlets except Westgate.",
          )
        : body,
    );
    expect(
      r.candidates.find((c) =>
        c.canonicalUrl.includes("national-cheeseburger"),
      )!.locationScope,
    ).not.toBe("all_outlets");
  });
  it("facts quotes refer to captured body or explicit metadata rather than invented values", async () => {
    const r = await smallRun();
    for (const c of r.candidates)
      for (const fact of Object.values(c.facts)) {
        expect(fact).toBeDefined();
        expect(c.evidence.some((e) => fact!.evidenceIds.includes(e.id))).toBe(
          true,
        );
        expect(fact!.quote.length).toBeGreaterThan(0);
      }
  });
  it("identity and revisions are deterministic across observedAt while changed bytes change only revision", async () => {
    const a = await candidate(),
      b = (
        await smallRun((body, url) =>
          url.pathname.includes("national-cheeseburger")
            ? body.replace("while stocks last", "while promotional stocks last")
            : body,
        )
      ).candidates.find((c) =>
        c.canonicalUrl.includes("national-cheeseburger"),
      )!;
    expect(b.candidateId).toBe(a.candidateId);
    expect(directPromotionId(b.sourceId, b.candidateId)).toBe(
      directPromotionId(a.sourceId, a.candidateId),
    );
    expect(directRevisionHash(a)).toBe(
      directRevisionHash({ ...a, observedAt: "2027-01-01T00:00:00.000Z" }),
    );
    expect(directRevisionHash(b)).not.toBe(directRevisionHash(a));
  });
});
describe("authority, outlet proof and activation", () => {
  it("recorded legal ownership evidence matches exact URL/PDF hash and preserves prior probable assessment", async () => {
    const proof = JSON.parse(await readFile(`${root}/ownership.json`, "utf8"));
    expect(proof.status).toBe("verified");
    expect(proof.prior_audit_status).toBe("probable");
    expect(source.authority.evidenceUrls).toContain(proof.evidence_url);
    expect(contentHash(await readFile(`${root}/${proof.evidence_file}`))).toBe(
      proof.sha256,
    );
    expect(await readFile(`${root}/legal-native.txt`, "utf8")).toContain(
      "Shake Shack Singapore Jewel",
    );
  });
  it("probable ownership cannot pass acquisition", async () => {
    const f = await fixtureTransport(`${root}/manifest.json`);
    const r = await runDirectSource(
      { ...source, authority: { ...source.authority, ownership: "probable" } },
      { ...f, mode: "fixture" },
    );
    expect(r.gate.ownership_verified).toBe(false);
    expect(r.gate.status).toBe("fixture-validated");
  });
  it("ten-card directory is incomplete until two independently linked exact branch details agree", async () => {
    const f = await fixtureTransport(`${root}/manifest.json`),
      http = new BoundedDirectFetch(
        { ...source, listingUrls: [shakeOutletUrl] },
        f.transport,
      );
    const page = await http.fetch(shakeOutletUrl, "listing");
    const partial = parseShakeOutlets(page);
    expect(partial.branches).toHaveLength(10);
    expect(partial.authoritative).toBe(false);
    const full = await directory();
    expect(full.authoritative).toBe(true);
    expect(full.officialCount).toBe(12);
    expect(full.branches).toHaveLength(12);
  });
  it("wrong official count or duplicate map identity fails closed", async () => {
    const f = await fixtureTransport(`${root}/manifest.json`);
    const transport: DirectTransport = async (url, s, max) => {
      const r = await f.transport(url, s, max);
      return {
        ...r,
        body: Buffer.from(
          r.body
            .toString()
            .replace("Showing all 12 results", "Showing all 11 results"),
        ),
      };
    };
    await expect(
      new ShakeShackOutletProvider(transport).getSingaporeBranches(
        "Shake Shack",
      ),
    ).rejects.toThrow("unverified_shake_directory");
  });
  it("exact names resolve only exact official branches; Google supplies coordinates only", async () => {
    const f = await fixtureTransport(`${root}/manifest.json`),
      places = {
        resolve: vi.fn(async (_m: string, branch: MerchantBranch) => ({
          address: branch.address,
          lat: 1.3,
          lng: 103.8,
          coordinatePrecision: "building" as const,
          coordinateEvidence: [
            {
              url: "https://maps.google.com",
              checkedAt: "2026-10-01T04:00:00.000Z",
              summary: "Synthetic coordinate resolution, not enumeration",
            },
          ],
        })),
      };
    const resolver = createDirectOutletResolver({
      providers: [new ShakeShackOutletProvider(f.transport)],
      places,
    });
    const c = await candidate();
    const exact = await resolver({
      ...c,
      locationScope: "named_outlets",
      locationNames: ["Westgate"],
      locationWording: "Valid only at Westgate.",
    });
    expect(exact.outletsVerified).toBe(true);
    expect(exact.outlets.map((o) => o.name)).toEqual(["Westgate"]);
    places.resolve.mockClear();
    const fuzzy = await resolver({
      ...c,
      locationScope: "named_outlets",
      locationNames: ["Westgates"],
      locationWording: "Valid only at Westgates.",
    });
    expect(fuzzy.outletsVerified).toBe(false);
    expect(places.resolve).not.toHaveBeenCalled();
  });
  it("preview accepts Shake Shack, ingest rejects a shadow policy and accepts the activated registry", () => {
    expect(parseArgs(["--source", "shake_shack_sg"]).sources[0]).toBe(source);
    const old = { ...source.publicationPolicy };
    try {
      Object.assign(source.publicationPolicy, {
        enabled: false,
        autoPublish: false,
      });
      expect(() => parseIngestArgs(["--source", "shake_shack_sg"])).toThrow(
        "direct_publication_disabled",
      );
    } finally {
      Object.assign(source.publicationPolicy, old);
    }
    expect(parseIngestArgs(["--source", "shake_shack_sg"]).id).toBe(
      "shake_shack_sg",
    );
    expect(parseIngestArgs(["--source", "pepper_lunch_sg"]).id).toBe(
      "pepper_lunch_sg",
    );
    expect(
      sourceDefinition("paradise_group_sg").publicationPolicy.enabled,
    ).toBe(false);
  });
  it("complete campaign can pass the unchanged generic gate only in an explicitly hypothetical enabled-policy test", async () => {
    const c = await candidate();
    const old = { ...source.publicationPolicy };
    try {
      Object.assign(source.publicationPolicy, {
        enabled: false,
        autoPublish: false,
      });
      expect(evaluateDirectPublication(c, resolved).reasons).toContain(
        "automatic_publication_disabled",
      );
      source.publicationPolicy.enabled = true;
      source.publicationPolicy.autoPublish = true;
      expect(evaluateDirectPublication(c, resolved).result).toBe("ready");
    } finally {
      Object.assign(source.publicationPolicy, old);
    }
  });
  it("missing recorded ownership evidence cannot pass the generic gate even under a hypothetical enabled policy", async () => {
    const c = await candidate(),
      policy = { ...source.publicationPolicy },
      authority = source.authority;
    try {
      source.publicationPolicy.enabled = true;
      source.publicationPolicy.autoPublish = true;
      source.authority = { ...authority, evidenceUrls: [] };
      expect(evaluateDirectPublication(c, resolved).reasons).toContain(
        "source_not_authoritative",
      );
      const r = await smallRun();
      expect(r.gate.ownership_verified).toBe(false);
    } finally {
      Object.assign(source.publicationPolicy, policy);
      source.authority = authority;
    }
  });
  it("captured provenance hashes and byte lengths all match immutable fixtures", async () => {
    const p = JSON.parse(
      await readFile(`${root}/capture-provenance.json`, "utf8"),
    );
    for (const capture of p.captures) {
      const bytes = await readFile(`${root}/${capture.file}`);
      expect(bytes.length).toBe(capture.byte_length);
      expect(contentHash(bytes)).toBe(capture.hash);
      expect(capture.timestamp).toBeTruthy();
      expect(capture.purpose).toBeTruthy();
    }
  });
});
