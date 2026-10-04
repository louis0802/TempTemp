import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import {
  BoundedDirectFetch,
  DEFAULT_LIMITS,
  type DirectTransport,
} from "@/ingestion/direct-sources/fetch";
import { sourceDefinition } from "@/ingestion/direct-sources/registry";
import { runDirectSource } from "@/ingestion/direct-sources/runner";
import { parseArgs } from "../scripts/direct-source-preview";
import { parseIngestArgs } from "../scripts/direct-source-ingest";
import {
  capturedShakeRun,
  capturedShakeOutletResolver,
  completeShakeManifest,
} from "./helpers/direct-source-fixtures";
import {
  acquisitionReady,
  directCampaignLifecycle,
  evaluateDirectPublication,
  singaporeObservationDate,
} from "@/ingestion/direct-sources/publication";
import { fixtureTransport } from "@/ingestion/direct-sources/fixtures";
import { contentHash } from "@/ingestion/direct-sources/evidence";
const source = sourceDefinition("shake_shack_sg");
const listing = (count: number) =>
  `<main><div class="pp-posts">${Array.from({ length: count }, (_, i) => `<div class="pp-post"><h2 class="pp-post-title"><a href="/article-${i}/">Free deal ${i}</a></h2></div>`).join("")}</div></main>`;
async function boundary(
  count: number,
  limits?: NonNullable<Parameters<typeof runDirectSource>[1]>["limits"],
  detail = "<p>Enjoy a complimentary burger with purchase of a meal.</p><p>Terms &amp; Conditions:</p><p>Offer is valid on 1 October 2026 only.</p>",
) {
  const transport: DirectTransport = async (url) => ({
    status: 200,
    headers: { "content-type": "text/html" },
    body: Buffer.from(
      url.pathname === "/blog/"
        ? listing(count)
        : `<div data-elementor-type="wp-post">${detail}</div>`,
    ),
  });
  return runDirectSource(source, {
    mode: "fixture",
    observedAt: "2026-10-01T04:00:00.000Z",
    transport,
    limits,
  });
}
describe("registered acquisition budgets", () => {
  it.each(["pepper_lunch_sg", "paradise_group_sg"] as const)(
    "%s retains exact defaults",
    (id) => {
      expect(new BoundedDirectFetch(sourceDefinition(id)).limits).toEqual(
        DEFAULT_LIMITS,
      );
      expect(sourceDefinition(id).acquisitionLimits).toBeUndefined();
    },
  );
  it("Shake profile changes count budgets only and global defaults remain frozen", () => {
    expect(DEFAULT_LIMITS).toEqual({
      maxRequests: 40,
      maxListingPages: 5,
      maxDetailPages: 20,
      maxEvidencePages: 8,
      maxBytes: 3_000_000,
      timeoutMs: 12_000,
      maxRedirects: 3,
    });
    expect(new BoundedDirectFetch(source).limits).toEqual({
      ...DEFAULT_LIMITS,
      maxDetailPages: 50,
      maxRequests: 60,
    });
    expect(
      new BoundedDirectFetch(source, undefined, undefined, {
        maxRequests: 999,
        maxBytes: 99999999,
        timeoutMs: 999999,
        maxRedirects: 99,
      }).limits,
    ).toEqual(new BoundedDirectFetch(source).limits);
  });
  it("production preview selection automatically applies profile; both CLIs use the same runner without limit flags", async () => {
    const selected = parseArgs(["--source", source.id]).sources[0];
    expect(
      (
        await runDirectSource(selected, {
          transport: async () => {
            throw new Error("no network in test");
          },
        })
      ).limits.maxDetailPages,
    ).toBe(50);
    for (const cli of ["preview", "ingest"]) {
      const text = await readFile(`scripts/direct-source-${cli}.ts`, "utf8");
      expect(text).toContain("await runDirectSource(source,");
      expect(text).not.toContain("limits:");
    }
    expect(() =>
      parseArgs(["--source", source.id, "--maxDetailPages", "100"]),
    ).toThrow();
    expect(() =>
      parseIngestArgs(["--source", source.id, "--maxRequests", "100"]),
    ).toThrow();
  });
  it("44 discovered article bodies fit without caller overrides", async () => {
    const run = await boundary(44);
    expect(run.gate.acquisition_ready).toBe(true);
    expect(run.requests).toHaveLength(45);
    expect(run.enumeration.classification).toMatchObject({
      discovered_articles: 44,
      classified_articles: 44,
      promotion_articles: 44,
      non_promotion_articles: 0,
      unresolved_articles: 0,
    });
  });
  it.each([
    [51, undefined, "detail_page_limit"],
    [44, { maxDetailPages: 20 }, "detail_page_limit"],
    [44, { maxRequests: 40 }, "request_limit"],
  ])("capacity failure stays closed (%s, %j)", async (count, limits, code) => {
    const run = await boundary(
      count as number,
      limits as Parameters<typeof boundary>[1],
    );
    expect(run.enumeration.complete).toBe(false);
    expect(run.gate.acquisition_ready).toBe(false);
    expect(run.issues.some((i) => i.code === code)).toBe(true);
    expect(run.enumeration.classification!.unresolved_articles).toBeGreaterThan(
      0,
    );
  });
  it("total registered request cap counts redirects and fails closed", async () => {
    const run = await runDirectSource(source, {
      mode: "fixture",
      transport: async (url) => ({
        status: url.search ? 200 : url.pathname === "/blog/" ? 200 : 302,
        headers: {
          "content-type": "text/html",
          location: `${url.href}?redirected=1`,
        },
        body: Buffer.from(
          url.pathname === "/blog/"
            ? listing(44)
            : '<div data-elementor-type="wp-post"><p>Editorial.</p></div>',
        ),
      }),
    });
    expect(run.requests).toHaveLength(60);
    expect(run.issues.some((i) => i.code === "request_limit")).toBe(true);
    expect(run.enumeration.complete).toBe(false);
  });
  it.each([
    "<p>Terms &amp; Conditions:</p><p>Free parking and a $ sign.</p>",
    "<p>Enjoy a complimentary burger with purchase of a meal.</p>",
    "<p>Terms &amp; Conditions:</p><p>This is editorial content.</p>",
  ])(
    "terms alone or economic copy alone remains non-promotion: %s",
    async (detail) => {
      const run = await boundary(1, undefined, detail);
      expect(run.candidates).toHaveLength(0);
      expect(run.enumeration.classification).toMatchObject({
        discovered_articles: 1,
        classified_articles: 1,
        non_promotion_articles: 1,
        unresolved_articles: 0,
      });
    },
  );
});

describe("complete captured mixed archive", () => {
  it("all archive pages/articles traverse and accounting is exhaustive and unique", async () => {
    const run = await capturedShakeRun(),
      c = run.enumeration.classification!;
    expect(run.enumeration.pagination.requested).toHaveLength(4);
    expect(run.enumeration.pagination.unresolved).toEqual([]);
    expect(c).toMatchObject({
      discovered_articles: 44,
      classified_articles: 44,
      promotion_articles: 10,
      non_promotion_articles: 34,
      unresolved_articles: 0,
    });
    expect(c.promotion_articles + c.non_promotion_articles).toBe(
      c.discovered_articles,
    );
    expect(new Set(c.articles.map((a) => a.url)).size).toBe(
      c.discovered_articles,
    );
    expect(c.articles.every((a) => a.evidenceId)).toBe(true);
    expect(run.requests).toHaveLength(48);
    expect(run.issues).toEqual([]);
    expect(run.gate.acquisition_ready).toBe(true);
    expect(run.enumeration.complete).toBe(true);
    expect(
      c.articles.find((a) => a.url.endsWith("/our-french-onion-menu/"))?.result,
    ).toBe("non_promotion");
  });
  it("every stored body retains hash/size/status/type/provenance; twice-replayed semantic bytes match live proof", async () => {
    const root = completeShakeManifest.slice(0, -"manifest.json".length);
    const manifest = JSON.parse(await readFile(completeShakeManifest, "utf8"));
    const provenance = JSON.parse(
      await readFile(root + "capture-provenance.json", "utf8"),
    );
    for (const capture of provenance.captures) {
      const body = await readFile(
        root + manifest.pages[capture.requestedUrl].path,
      );
      expect(contentHash(body)).toBe(capture.contentHash);
      expect(body.length).toBe(capture.byteLength);
      expect(capture.httpStatus).toBe(200);
      expect(capture.contentType).toBe("text/html");
      expect(capture.retrievedAt).toMatch(/^2026-10-01T/);
      expect(capture.purpose).toMatch(
        /archive_enumeration|article_body_classification/,
      );
    }
    const semantic = (r: Awaited<ReturnType<typeof capturedShakeRun>>) =>
      JSON.stringify({
        observedAt: r.observedAt,
        limits: r.limits,
        enumeration: r.enumeration,
        candidates: r.candidates,
        issues: r.issues,
        acquisitionReady: r.gate.acquisition_ready,
      });
    const a = semantic(await capturedShakeRun()),
      b = semantic(await capturedShakeRun());
    expect(a).toBe(b);
    const proof = JSON.parse(
      await readFile(root + "replay-proof.json", "utf8"),
    );
    expect(contentHash(a)).toBe(proof.live_semantic_sha256);
    expect(proof.offline_first_sha256).toBe(proof.offline_second_sha256);
  });
  it("detail failure invalidates completeness and leaves exactly that URL unresolved", async () => {
    const f = await fixtureTransport(completeShakeManifest);
    const run = await runDirectSource(source, {
      ...f,
      mode: "fixture",
      transport: async (url, signal, max) => {
        if (url.pathname === "/hello-parkway-parade/")
          throw new Error("captured_detail_failure");
        return f.transport(url, signal, max);
      },
    });
    expect(run.gate.acquisition_ready).toBe(false);
    expect(run.enumeration.complete).toBe(false);
    expect(run.enumeration.classification).toMatchObject({
      discovered_articles: 44,
      classified_articles: 43,
      unresolved_articles: 1,
    });
  });
  it("hypothetical enabled gate excludes four expired, reviews five incomplete, and accepts captured Parkway", async () => {
    const run = await capturedShakeRun(),
      resolve = await capturedShakeOutletResolver();
    const old = { ...source.publicationPolicy };
    try {
      Object.assign(source.publicationPolicy, {
        enabled: true,
        autoPublish: true,
      });
      const decisions = [];
      for (const c of run.candidates) {
        const expired =
          directCampaignLifecycle(
            c,
            singaporeObservationDate(run.observedAt),
          ) === "expired";
        const context = {
          ...(expired
            ? { outlets: [], outletsVerified: false, outletIssues: [] }
            : await resolve(c)),
          acquisitionReady: acquisitionReady(run),
          verifiedAt: run.observedAt,
          asOf: singaporeObservationDate(run.observedAt),
        };
        decisions.push({
          title: c.title,
          ...evaluateDirectPublication(c, context),
        });
      }
      expect(decisions.filter((d) => d.result === "exclude")).toHaveLength(4);
      expect(decisions.filter((d) => d.result === "needs_review")).toHaveLength(
        5,
      );
      expect(
        decisions.filter((d) => d.result === "ready").map((d) => d.title),
      ).toEqual(["Hello, Parkway Parade!"]);
      expect(
        decisions.find((d) => d.title === "Feeding a Crowd?")?.reasons,
      ).toEqual(
        expect.arrayContaining([
          "missing_start_date",
          "missing_end_date",
          "source_unspecified_locations",
        ]),
      );
    } finally {
      Object.assign(source.publicationPolicy, old);
    }
  });
});

it("recorded activation and ingest selection reflect the complete acquisition decision", async () => {
  const run = await capturedShakeRun();
  expect(acquisitionReady(run)).toBe(true);
  expect(source.publicationPolicy).toMatchObject({
    enabled: true,
    autoPublish: true,
  });
  expect(source.activationReview).toMatchObject({
    enumeration: "complete",
    blockers: [],
  });
  expect(parseIngestArgs(["--source", source.id])).toBe(source);
  expect(
    new BoundedDirectFetch(parseIngestArgs(["--source", source.id])).limits,
  ).toEqual(run.limits);
});

it("archive cards outside registered article path shape are never fetched", async () => {
  const urls: string[] = [];
  const run = await runDirectSource(source, {
    mode: "fixture",
    transport: async (url) => {
      urls.push(url.href);
      return {
        status: 200,
        headers: { "content-type": "text/html" },
        body: Buffer.from(
          '<main><div class="pp-posts"><div class="pp-post"><h2 class="pp-post-title"><a href="/shake-restaurants/parkway-parade/">Outside article path</a></h2></div></div></main>',
        ),
      };
    },
  });
  expect(urls).toEqual(source.listingUrls);
  expect(run.enumeration.complete).toBe(false);
});
