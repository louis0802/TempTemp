import { beforeAll, describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { load, type CheerioAPI } from "cheerio";
import type { Pool } from "pg";
import { readMapInputs } from "../scripts/research/build-merchant-source-map";
import {
  reports,
  type MerchantMap,
} from "../scripts/research/merchant-source-map/build";
import {
  canonicalIdentity,
  readIdentityReview,
  validateAliases,
} from "../scripts/research/merchant-source-map/identity";
import {
  resolvePublicAccount,
  socialContentKey,
} from "../scripts/research/social-sources/resolution";
import { coverageBatch2Sources } from "@/ingestion/direct-sources/coverage-batch-2-definitions";
import { BoundedDirectFetch } from "@/ingestion/direct-sources/fetch";
import { fixtureTransport } from "@/ingestion/direct-sources/fixtures";
import {
  runDirectSource,
  type DirectSourceRun,
} from "@/ingestion/direct-sources/runner";
import {
  directRevisionHash,
  evaluateDirectPublication,
  DIRECT_SOURCE_PROCESSOR_VERSION,
} from "@/ingestion/direct-sources/publication";
import { persistDirectSourceRun } from "@/ingestion/direct-sources/persistence";
import {
  fixtureKeys,
  replayCoverageSource,
} from "../scripts/research/coverage-batch-2";

const hash = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
const folder = "docs/changes/coverage-batch-2";
let before: MerchantMap, after: MerchantMap;
const runs = new Map<string, DirectSourceRun>();
beforeAll(async () => {
  before = JSON.parse(
    await readFile(`${folder}/baseline-merchants.json`, "utf8"),
  );
  after = await readMapInputs();
  for (const source of coverageBatch2Sources)
    runs.set(source.id, await replayCoverageSource(source));
});
async function editedRun(
  id: (typeof coverageBatch2Sources)[number]["id"],
  edit: ($: CheerioAPI, url: URL) => void,
) {
  const source = coverageBatch2Sources.find((s) => s.id === id)!;
  const key = fixtureKeys[id as keyof typeof fixtureKeys];
  const fixture = await fixtureTransport(
    `tests/fixtures/coverage-batch-2/${key}/replay-manifest.json`,
  );
  return runDirectSource(source, {
    mode: "fixture",
    observedAt: fixture.observedAt,
    transport: async (url, signal, max) => {
      const r = await fixture.transport(url, signal, max),
        $ = load(r.body.toString());
      edit($, url);
      return { ...r, body: Buffer.from($.html()) };
    },
  });
}
describe("narrow canonical identity review", () => {
  it("retains every frozen corpus/audit and prior capture byte", async () => {
    const snapshot = JSON.parse(
      await readFile(`${folder}/protected-baseline.json`, "utf8"),
    ) as Record<string, string>;
    const protectedFiles = Object.entries(snapshot).filter(
      ([f]) =>
        f.startsWith("tests/corpus/") ||
        f.startsWith("tests/fixtures/direct-sources/") ||
        f.startsWith("tests/fixtures/social-sources/") ||
        f.startsWith(".local/source-origin-audit/") ||
        f.startsWith(".local/direct-source-audit/"),
    );
    expect(protectedFiles.length).toBeGreaterThan(150);
    for (const [file, sha] of protectedFiles)
      expect(hash(await readFile(file)), file).toBe(sha);
  });
  it("merges only explicitly self-identified labels, retaining all TG observations and denominator accounting", async () => {
    const { aliases } = await readIdentityReview(process.cwd());
    expect(aliases.map((a) => [a.alias, a.canonical])).toEqual([
      ["Ajumma’s", "Ajumma's Korean Restaurant"],
    ]);
    const canonical = after.merchants.find(
      (r) => r.merchant === "Ajumma's Korean Restaurant",
    )!;
    const originals = before.merchants.filter(
      (r) =>
        canonicalIdentity(r.merchant, aliases) ===
        canonical.normalized_merchant,
    );
    expect(canonical.merchant_labels).toEqual(
      [...new Set(originals.flatMap((r) => r.merchant_labels))].sort(),
    );
    expect(canonical.historical_signal_count).toBe(
      originals.reduce((n, r) => n + r.historical_signal_count, 0),
    );
    expect(canonical.historical_offer_count).toBe(
      originals.reduce((n, r) => n + r.historical_offer_count, 0),
    );
    expect(canonical.canonical_identity_review?.historical_signal_urls).toEqual(
      ["https://t.me/sgfooddeals/4932", "https://t.me/tastesoulsg/4474"],
    );
    expect(canonical.canonical_identity_review?.historical_offer_ids).toEqual([
      "reviewed:d3ad1420-f9dd-5baa-ae24-d6917313649f",
      "reviewed:fd8cc9e2-af8d-55fd-a917-e873fcfabb0e",
    ]);
    expect(reports(after)["report.csv"].split("\n")[0]).toContain(
      "canonical_identity_review",
    );
    expect(canonical.evidence_refs).toEqual(
      [...new Set(originals.flatMap((r) => r.evidence_refs))].sort(),
    );
    expect(after.summary.historical_merchant_count).toBe(
      before.summary.historical_merchant_count - originals.length + 1,
    );
    expect(
      after.merchants.filter(
        (r) =>
          canonicalIdentity(r.merchant, aliases) ===
          canonical.normalized_merchant,
      ),
    ).toHaveLength(1);
  });
  it("rejects string-only, operator-only, tampered and cyclic alias claims", async () => {
    const { aliases } = await readIdentityReview(process.cwd()),
      a = aliases[0],
      body = await readFile(a.capture_file, "utf8"),
      captures = new Map([[a.capture_file, body]]);
    expect(() =>
      validateAliases([{ ...a, basis: "string_similarity" }], captures),
    ).toThrow();
    expect(() =>
      validateAliases([{ ...a, basis: "same_operator" }], captures),
    ).toThrow();
    expect(() =>
      validateAliases(
        [{ ...a, alias: "Bari Bari Grand", canonical: "Bari Bari Steak" }],
        captures,
      ),
    ).toThrow("alias_labels_not_independently_identified");
    expect(() =>
      validateAliases(aliases, new Map([[a.capture_file, body + "changed"]])),
    ).toThrow("alias_evidence_invalid");
    expect(() =>
      validateAliases(
        [...aliases, { ...a, alias: a.canonical, canonical: a.alias }],
        captures,
      ),
    ).toThrow("alias_duplicate_or_cycle");
  });
  it.each([
    ["Marché", "Marche"],
    ["Smooy", "Smöoy"],
    ["Tofu G", "Tofu G Gelato"],
    ["Bari Bari Grand", "Bari Bari Steak"],
  ])(
    "does not merge %s with %s without same-identity evidence",
    async (a, b) => {
      const { aliases } = await readIdentityReview(process.cwd());
      expect(canonicalIdentity(a, aliases)).not.toBe(
        canonicalIdentity(b, aliases),
      );
    },
  );
  it("leaves the denominator unchanged when there are no reviewed aliases", async () => {
    const base = await readMapInputs(process.cwd(), {
      includeSocial: false,
      includeCoverage: false,
    });
    expect(base.summary.historical_merchant_count).toBe(
      before.summary.historical_merchant_count,
    );
  });
});
describe("canonical batch progress and social resolution", () => {
  it("keeps every historical label in one row; census, registry-only and unresolved records reconcile", () => {
    for (const label of before.merchants.flatMap((r) => r.merchant_labels))
      expect(
        after.merchants.filter((r) => r.merchant_labels.includes(label)),
      ).toHaveLength(1);
    expect(
      new Set(after.merchants.map((r) => r.normalized_merchant)).size,
    ).toBe(after.merchants.length);
    expect(
      Object.values(after.summary.progress_counts).reduce((a, b) => a + b, 0),
    ).toBe(after.summary.historical_merchant_count);
    expect(after.summary.registry_only_merchant_count).toBe(
      before.summary.registry_only_merchant_count,
    );
    expect(after.unresolved_records).toEqual(before.unresolved_records);
  });
  it("preserves the fixed cohort and all unrelated rows exactly", async () => {
    const selection = JSON.parse(
      await readFile(`${folder}/selection.json`, "utf8"),
    ) as MerchantMap["merchants"];
    expect(selection).toHaveLength(12);
    const keys = new Set([
      ...selection.map((r) => r.normalized_merchant),
      "ajummas",
      "ajummaskoreanrestaurant",
    ]);
    for (const b of before.merchants)
      if (!keys.has(b.normalized_merchant))
        expect(
          after.merchants.find(
            (a) => a.normalized_merchant === b.normalized_merchant,
          ),
          b.merchant,
        ).toEqual(b);
    for (const b of selection) {
      expect(
        before.merchants.find(
          (r) => r.normalized_merchant === b.normalized_merchant,
        ),
      ).toEqual(b);
      const a = after.merchants.find(
        (a) => a.normalized_merchant === b.normalized_merchant,
      )!;
      expect(a.historical_signal_count).toBe(b.historical_signal_count);
      expect(a.historical_offer_count).toBe(b.historical_offer_count);
      expect(a.source_tracks.length).toBeGreaterThan(0);
      expect(a.source_tracks.every((t) => t.evidence_refs.length > 0)).toBe(
        true,
      );
    }
  });
  it("replays canonical JSON/Markdown/CSV byte-identically", async () => {
    const second = await readMapInputs();
    expect(reports(second)).toEqual(reports(after));
    for (const [target, key] of [
      ["merchants.json", "merchants.json"],
      ["report.csv", "report.csv"],
      ["merchant-automation-progress.md", "report.md"],
    ] as const)
      expect(await readFile(`docs/research/${target}`, "utf8")).toBe(
        reports(after)[key],
      );
  });
  it("does not erase account-unresolved posts just because a blocked owned profile exists", () => {
    const kei = after.merchants.find((r) => r.merchant === "Kei Kaisendon")!;
    expect(kei.automation_progress).toBe("source_candidate");
    expect(
      kei.source_tracks.filter(
        (t) => t.account === null && t.platform === "instagram",
      ),
    ).toHaveLength(2);
    expect(
      kei.source_tracks.find((t) => t.account === "keikaisendon"),
    ).toMatchObject({ ownership: "verified", activation_status: "blocked" });
  });
  it("preserves the original four Instagram acquisition conclusions exactly", async () => {
    const snapshot = JSON.parse(
      await readFile(`${folder}/protected-baseline.json`, "utf8"),
    ) as Record<string, string>;
    const current = JSON.parse(
      await readFile(
        "docs/research/social-source-acquisition-review.json",
        "utf8",
      ),
    );
    const originalAccounts = new Set([
      "ajummasg",
      "shinrai.sg",
      "sinpopobrand",
      "starbuckssg",
    ]);
    const reconstructed = {
      ...current,
      provenance: current.provenance
        .filter((p: { file: string }) => !p.file.includes("coverage-batch-2"))
        .map((p: { file: string; sha256: string }) => ({
          ...p,
          sha256: snapshot[p.file] ?? p.sha256,
        })),
      accounts: current.accounts.filter((a: { account: string }) =>
        originalAccounts.has(a.account),
      ),
      content_bindings: current.content_bindings.filter(
        (a: { account: string }) => originalAccounts.has(a.account),
      ),
    };
    expect(current.adapter_created).toBe(false);
    expect(hash(JSON.stringify(reconstructed, null, 2) + "\n")).toBe(
      snapshot["docs/research/social-source-acquisition-review.json"],
    );
  });
  it("does not infer an Instagram account from the merchant label or caption name", () => {
    const capture = {
      url: "https://www.instagram.com/p/ABC/",
      status: 200,
      body: '<meta property="og:title" content="Pizza Hut on Instagram">',
      redirectTo: null,
      error: null,
    };
    expect(resolvePublicAccount(capture.url, capture)).toMatchObject({
      outcome: "exact_account_unresolved",
      account: null,
    });
  });
  it("binds only exact standard metadata, rejects contradictions and login", () => {
    const capture = {
      url: "https://www.instagram.com/p/ABC/",
      status: 200,
      body: '<link rel="canonical" href="https://www.instagram.com/p/ABC/"><meta property="og:url" content="https://www.instagram.com/exact/reel/ABC/">',
      redirectTo: null,
      error: null,
    };
    expect(resolvePublicAccount(capture.url, capture)).toMatchObject({
      account: "exact",
      outcome: "exact_account_unverified",
    });
    expect(
      resolvePublicAccount(capture.url, {
        ...capture,
        body:
          capture.body +
          '<a rel="author" href="https://www.instagram.com/other/">x</a>',
      }),
    ).toMatchObject({ outcome: "contradictory_identity", account: null });
    expect(
      resolvePublicAccount(capture.url, {
        ...capture,
        body:
          capture.body +
          '<form action="/accounts/login"><input type="password"></form>',
      }),
    ).toMatchObject({ outcome: "blocked_access", account: null });
    expect(
      resolvePublicAccount(capture.url, {
        ...capture,
        body: capture.body.replace("/reel/ABC/", "/reel/OTHER/"),
      }),
    ).toMatchObject({ outcome: "exact_account_unresolved", account: null });
  });
  it("keeps unsupported Facebook transport out of identity and numeric account identity platform-specific", () => {
    expect(
      socialContentKey("https://www.facebook.com/unsupportedbrowser"),
    ).toBeNull();
    const capture = {
      url: "https://www.facebook.com/reel/123",
      status: 200,
      body: '<link rel="canonical" href="https://www.facebook.com/456/videos/title/123/"><meta property="og:url" content="https://www.facebook.com/456/videos/title/123/">',
      redirectTo: null,
      error: null,
    };
    expect(resolvePublicAccount(capture.url, capture)).toMatchObject({
      account: "456",
      outcome: "exact_account_unverified",
    });
  });
  it("accepts exact author metadata and rejects another account's scoped URL", () => {
    const capture = {
      url: "https://www.instagram.com/p/ABC/",
      status: 200,
      body: '<link rel="canonical" href="https://www.instagram.com/p/ABC/"><meta property="og:url" content="https://www.instagram.com/p/ABC/"><a rel="author" href="https://www.instagram.com/exact/">Author</a>',
      redirectTo: null,
      error: null,
    };
    expect(resolvePublicAccount(capture.url, capture)).toMatchObject({
      account: "exact",
      outcome: "exact_account_unverified",
    });
    const other = {
      ...capture,
      body: '<link rel="canonical" href="https://www.instagram.com/other/p/ABC/"><meta property="og:url" content="https://www.instagram.com/other/p/ABC/">',
    };
    expect(
      resolvePublicAccount("https://www.instagram.com/exact/p/ABC/", other),
    ).toMatchObject({ account: null, outcome: "contradictory_identity" });
  });
});
describe("bounded shadow web acquisitions", () => {
  it.each(coverageBatch2Sources)(
    "$id replays useful candidates without activation or altered processor",
    async (source) => {
      const run = runs.get(source.id)!;
      expect(source.publicationPolicy.enabled).toBe(false);
      expect(run.candidates.length).toBeGreaterThan(0);
      expect(run.gate.acquisition_ready).toBe(false);
      expect(run.enumeration.complete).toBe(false);
      expect(DIRECT_SOURCE_PROCESSOR_VERSION).toBe("direct-source-v2");
      const repeat = await replayCoverageSource(source);
      expect(repeat.candidates).toEqual(run.candidates);
      expect(repeat.requests).toEqual(run.requests);
      expect(repeat.candidates.map(directRevisionHash)).toEqual(
        run.candidates.map(directRevisionHash),
      );
    },
  );
  it.each(coverageBatch2Sources)(
    "$id rejects foreign hosts and undiscovered recursive paths before transport",
    async (source) => {
      const transport = vi.fn();
      const http = new BoundedDirectFetch(source, transport);
      await expect(
        http.fetch("https://evil.example/promotions/", "listing"),
      ).rejects.toThrow();
      await expect(
        http.fetch(source.origin + "/unregistered/recursive/", "detail"),
      ).rejects.toThrow();
      expect(transport).not.toHaveBeenCalled();
      for (const root of source.listingUrls)
        expect(source.allowedHosts).toContain(new URL(root).hostname);
      expect(source.acquisitionLimits).toBeUndefined();
    },
  );
  it.each(coverageBatch2Sources)(
    "$id fails closed on unknown pagination and structure changes",
    async (source) => {
      const changed = await editedRun(source.id, ($) => {
        $("body").append(
          '<nav class="pagination"><a rel="next" href="https://evil.example/next">Next</a></nav>',
        );
      });
      expect(changed.gate.acquisition_ready).toBe(false);
      expect(
        changed.issues.some((i) => i.code === "pagination_unresolved"),
      ).toBe(true);
      const broken = await editedRun(source.id, ($) => {
        $("body").empty();
      });
      expect(broken.gate.acquisition_ready).toBe(false);
      expect(broken.candidates).toHaveLength(0);
    },
  );
  it.each(coverageBatch2Sources)(
    "$id does not publish unresolved validity, media or physical participation",
    (source) => {
      for (const c of runs.get(source.id)!.candidates) {
        expect(c.locationScope).toBe("source_unspecified");
        expect(c.locationNames).toEqual([]);
        expect(
          evaluateDirectPublication(c, {
            asOf: "2026-10-02",
            acquisitionReady: false,
            outlets: [],
            outletsVerified: false,
            outletIssues: [],
            verifiedAt: c.observedAt,
          }).result,
        ).not.toBe("ready");
      }
    },
  );
  it("keeps the one explicitly expired Captain Kim campaign excluded and the other six in review", () => {
    const decisions = runs.get("captain_kim_sg")!.candidates.map((c) =>
      evaluateDirectPublication(c, {
        asOf: "2026-10-02",
        acquisitionReady: false,
        outlets: [],
        outletsVerified: false,
        outletIssues: [],
        verifiedAt: c.observedAt,
      }),
    );
    expect(decisions.filter((d) => d.result === "exclude")).toHaveLength(1);
    expect(decisions.filter((d) => d.result === "needs_review")).toHaveLength(
      6,
    );
  });
  it("never uses article dates or McDonald's embedded contest dates as campaign validity", () => {
    for (const id of ["bari_bari_steak_sg", "sushiro_sg", "mcdonalds_sg"])
      for (const c of runs.get(id)!.candidates) {
        expect(c.startDate).toBeNull();
        expect(c.endDate).toBeNull();
      }
  });
  it("rejects wrong canonical detail association and isolates Bari card facts from related-post bodies", async () => {
    const invalid = await editedRun("bari_bari_steak_sg", ($, url) => {
      if (url.pathname !== "/promotions/")
        $('link[rel="canonical"]').attr(
          "href",
          "https://baribaristeak.com.sg/2026/09/23/wrong/",
        );
    });
    expect(invalid.candidates).toHaveLength(0);
    expect(
      invalid.issues.some(
        (i) => i.code === "bari_detail_association_unresolved",
      ),
    ).toBe(true);
    const lunch = runs
      .get("bari_bari_steak_sg")!
      .candidates.find((c) => c.title?.startsWith("Weekday Lunch"))!;
    expect(lunch.description).toContain("26% off");
    expect(lunch.description).not.toContain("20% discount");
    expect(lunch.description).not.toContain("15% OFF");
    expect(lunch.issues).toContain("detail_campaign_body_unassociated");
  });
  it.each(coverageBatch2Sources)(
    "$id rejects persistence before DB or outlet operations",
    async (source) => {
      const query = vi.fn(),
        connect = vi.fn(),
        outlets = vi.fn();
      await expect(
        persistDirectSourceRun(runs.get(source.id)!, {
          pool: { query, connect } as unknown as Pool,
          resolveOutlets: outlets,
        }),
      ).rejects.toThrow();
      expect(query).not.toHaveBeenCalled();
      expect(connect).not.toHaveBeenCalled();
      expect(outlets).not.toHaveBeenCalled();
    },
  );
});
