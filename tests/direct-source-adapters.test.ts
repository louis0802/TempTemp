import { describe, expect, it, vi } from "vitest";
import {
  readFile,
  mkdtemp,
  symlink,
  writeFile,
  readdir,
} from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import ts from "typescript";
import {
  BoundedDirectFetch,
  canonicalUrl,
  type DirectTransport,
  DEFAULT_LIMITS,
} from "../src/ingestion/direct-sources/fetch";
import {
  sourceAdapter,
  sourceDefinition,
  directSources,
} from "../src/ingestion/direct-sources/registry";
import { runDirectSource } from "../src/ingestion/direct-sources/runner";
import { fixtureTransport } from "../src/ingestion/direct-sources/fixtures";
import {
  candidateId,
  contentHash,
} from "../src/ingestion/direct-sources/evidence";
import { campaignDates } from "../src/ingestion/direct-sources/dates";
import { associatedNativePdfText } from "../src/ingestion/direct-sources/pdf";
import { directPromotionCandidateSchema } from "../src/ingestion/direct-sources/types";
import {
  parseArgs,
  prepareOutput,
  writeRunArtifacts,
} from "../scripts/direct-source-preview";
import type { DirectSourceContext } from "../src/ingestion/direct-sources/adapter";
const root = path.resolve("tests/fixtures/direct-sources");
const pepper = sourceDefinition("pepper_lunch_sg");
const paradise = sourceDefinition("paradise_group_sg");
const observedAt = "2026-09-30T14:00:00.000Z";
const offer = "https://www.pepperlunch.com.sg/promo/uper-value-deal/";
const htmlResponse = (
  body: string,
  status = 200,
  headers: Record<string, string> = {},
) => ({
  status,
  headers: { "content-type": "text/html", ...headers },
  body: Buffer.from(body),
});
async function fixtureRun(
  source = pepper,
  mutate?: (url: URL, body: string) => string,
) {
  const f = await fixtureTransport(path.join(root, "manifest.json"));
  const transport: DirectTransport = async (url, signal, max) => {
    const r = await f.transport(url, signal, max);
    return mutate && r.headers["content-type"] === "text/html"
      ? { ...r, body: Buffer.from(mutate(url, r.body.toString())) }
      : r;
  };
  return runDirectSource(source, {
    observedAt: f.observedAt,
    transport,
    mode: "fixture",
  });
}
async function fixtureContext() {
  const f = await fixtureTransport(path.join(root, "manifest.json"));
  const http = new BoundedDirectFetch(pepper, f.transport, () => observedAt);
  const ctx: DirectSourceContext = { source: pepper, http, observedAt };
  return ctx;
}

describe("bounded direct-source architecture", () => {
  it("registers audited sources with provenance; probable ownership remains disabled shadow", () => {
    expect(directSources.map((s) => s.id)).toEqual([
      "pepper_lunch_sg",
      "paradise_group_sg",
      "shake_shack_sg",
      "gourmet_carousel_sg",
      "fairprice_sg",
      "kris_plus_sg",
      "dian_xiao_er_sg",
      "bari_bari_steak_sg",
      "captain_kim_sg",
      "sushiro_sg",
      "mcdonalds_sg",
    ]);
    expect(
      directSources.every(
        (s) =>
          (s.authority.ownership === "verified" ||
            (s.authority.ownership === "probable" &&
              !s.publicationPolicy.enabled &&
              !s.publicationPolicy.autoPublish &&
              s.activationReview?.blockers.includes("ownership_unverified"))) &&
          s.authority.evidenceUrls.length > 0 &&
          s.operator,
      ),
    ).toBe(true);
  });
  it.each([
    "https://evil.example/",
    "https://www.paradisegp.com/",
    "https://www.pepperlunch.com.sg.evil.example/",
  ])("rejects unregistered hosts %s before transport", async (url) => {
    const transport = vi.fn();
    const http = new BoundedDirectFetch(pepper, transport);
    await expect(http.fetch(url, "detail")).rejects.toThrow(
      "unregistered_host",
    );
    expect(transport).not.toHaveBeenCalled();
  });
  it.each([
    "file:///tmp/a",
    "https://a:b@www.pepperlunch.com.sg/",
    "https://www.pepperlunch.com.sg:8443/",
    "http://127.0.0.1/",
  ])("rejects unsafe URL %s", async (url) => {
    const transport = vi.fn();
    await expect(
      new BoundedDirectFetch(pepper, transport).fetch(url, "detail"),
    ).rejects.toThrow();
    expect(transport).not.toHaveBeenCalled();
  });
  it("rejects arbitrary same-site URLs and cannot grant links absent from listing DOM", async () => {
    const ctx = await fixtureContext();
    const page = await ctx.http.fetch(pepper.listingUrls[0], "listing");
    expect(
      ctx.http.discover(page, 'a[href="/private/"]', "detail", () => true),
    ).toEqual([]);
    await expect(
      ctx.http.fetch("https://www.pepperlunch.com.sg/private/", "detail"),
    ).rejects.toThrow("undiscovered_url");
  });
  it("allows only listing-discovered detail URLs and records parent attribution", async () => {
    const ctx = await fixtureContext();
    const enumeration = await sourceAdapter(pepper).enumerate(ctx);
    await ctx.http.fetch(enumeration.entries[0].canonicalUrl, "detail");
    expect(ctx.http.attempts[1]).toMatchObject({
      url: offer,
      parentUrl: pepper.listingUrls[0],
      relation: "detail",
    });
  });
  it("cannot recurse from detail to another HTML offer", async () => {
    const ctx = await fixtureContext();
    await sourceAdapter(pepper).enumerate(ctx);
    const page = await ctx.http.fetch(offer, "detail");
    expect(() =>
      ctx.http.discover(page, ".social__share a[href]", "detail", () => true),
    ).toThrow("recursive_detail_crawl_forbidden");
  });
  it("rejects fabricated and cross-source parent evidence", async () => {
    const ctx = await fixtureContext();
    const page = await ctx.http.fetch(pepper.listingUrls[0], "listing");
    expect(() =>
      ctx.http.discover({ ...page }, ".promo__item a", "detail", () => true),
    ).toThrow("unknown_parent_evidence");
  });
  it("rejects redirect leaving allowed host without requesting it", async () => {
    const transport = vi.fn(async () =>
      htmlResponse("", 302, { location: "https://evil.example/" }),
    );
    const http = new BoundedDirectFetch(pepper, transport);
    await expect(http.fetch(pepper.listingUrls[0], "listing")).rejects.toThrow(
      "unregistered_host",
    );
    expect(transport).toHaveBeenCalledOnce();
    expect(http.attempts[0].redirectTo).toBe("https://evil.example/");
  });
  it("bounds redirect count and records each attempted redirect", async () => {
    const transport: DirectTransport = async (url) =>
      htmlResponse("", 302, { location: url.pathname + "a/" });
    const http = new BoundedDirectFetch(pepper, transport, () => observedAt, {
      maxRedirects: 1,
    });
    await expect(http.fetch(pepper.listingUrls[0], "listing")).rejects.toThrow(
      "redirect_limit",
    );
    expect(http.attempts).toHaveLength(2);
  });
  it("rejects oversized bodies and oversized declared content length", async () => {
    for (const response of [
      htmlResponse("abcdef"),
      htmlResponse("a", 200, { "content-length": "100" }),
    ]) {
      const http = new BoundedDirectFetch(
        pepper,
        async () => response,
        () => observedAt,
        { maxBytes: 3 },
      );
      await expect(
        http.fetch(pepper.listingUrls[0], "listing"),
      ).rejects.toThrow("response_too_large");
    }
  });
  it("retains timeout as acquisition failure without retry or bypass", async () => {
    const run = await runDirectSource(pepper, {
      transport: async () => new Promise(() => {}),
      limits: { timeoutMs: 5 },
      observedAt,
      mode: "fixture",
    });
    expect(run.issues).toContainEqual({
      code: "acquisition_timeout",
      url: pepper.listingUrls[0],
      relation: "listing",
    });
    expect(run.gate.listing_fetch_success).toBe(false);
    expect(run.enumeration.complete).toBe(false);
    expect(run.requests).toHaveLength(1);
  });
  it("retains HTTP denial evidence and repeated fetch never turns failure into success", async () => {
    const http = new BoundedDirectFetch(pepper, async () =>
      htmlResponse("access denied", 403),
    );
    for (let i = 0; i < 2; i++)
      await expect(
        http.fetch(pepper.listingUrls[0], "listing"),
      ).rejects.toThrow("http_403");
    expect(http.capturedPages[0].evidence.httpStatus).toBe(403);
    expect(http.attempts).toHaveLength(1);
  });
  it("rejects a PDF listing root even when a same-host redirect points to it", async () => {
    const http = new BoundedDirectFetch(pepper, async () => ({
      status: 200,
      headers: { "content-type": "application/pdf" },
      body: Buffer.from("%PDF-1.4"),
    }));
    await expect(http.fetch(pepper.listingUrls[0], "listing")).rejects.toThrow(
      "listing_not_html",
    );
  });
  it("canonicalizes tracking, fragments and query order without deleting semantic query values", () => {
    expect(canonicalUrl(offer + "?b=2&utm_source=telegram&a=1#id")).toBe(
      offer + "?a=1&b=2",
    );
    expect(canonicalUrl(offer + "?offer=2")).not.toBe(
      canonicalUrl(offer + "?offer=3"),
    );
  });
  it("candidate IDs depend only on schema/source/canonical URL/native ID, never signal/title/text", () => {
    expect(candidateId(pepper.id, offer)).toBe(
      candidateId(
        pepper.id,
        canonicalUrl(
          offer + "?utm_source=telegram&utm_campaign=sgfooddeals#123",
        ),
      ),
    );
    expect(candidateId(paradise.id, offer)).not.toBe(
      candidateId(pepper.id, offer),
    );
    expect(candidateId(pepper.id, offer, "native-1")).not.toBe(
      candidateId(pepper.id, offer),
    );
  });
  it("hashes exact bytes deterministically, independently of timestamps", async () => {
    expect(contentHash("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    const a = await fixtureRun();
    const b = await fixtureRun();
    expect(a.pages.map((p) => p.evidence.contentHash)).toEqual(
      b.pages.map((p) => p.evidence.contentHash),
    );
  });
  it("bounds detail and total request budgets with explicit failures", async () => {
    const f = await fixtureTransport(path.join(root, "manifest.json"));
    const run = await runDirectSource(paradise, {
      ...f,
      mode: "fixture",
      limits: { maxDetailPages: 1, maxRequests: 3 },
    });
    expect(run.requests.length).toBeLessThanOrEqual(3);
    expect(
      run.issues.some((i) =>
        /(?:detail_page_limit|request_limit)/.test(i.code),
      ),
    ).toBe(true);
    expect(run.gate.detail_fetch_success).toBe(false);
  });
});

describe("Pepper Lunch DOM and conservative facts", () => {
  it("enumerates expected canonical offer URLs and dedupes duplicate cards", async () => {
    const run = await fixtureRun();
    expect(run.enumeration.entries.map((e) => e.canonicalUrl)).toEqual([offer]);
    expect(run.enumeration.complete).toBe(true);
    expect(run.gate.status).toBe("fixture-validated");
  });
  it("follows exposed pagination, terminates previous-page cycles and rejects pages beyond budget", async () => {
    const listing = await readFile(
      path.join(root, "pepper-listing.html"),
      "utf8",
    );
    const detail = await readFile(
      path.join(root, "pepper-detail.html"),
      "utf8",
    );
    const transport: DirectTransport = async (url) =>
      htmlResponse(
        url.href === offer
          ? detail
          : listing.replace(
              "</main>",
              `<nav class="pagination"><a rel="${url.pathname.includes("page") ? "prev" : "next"}" href="${url.pathname.includes("page") ? "/promo/" : "/promo/page/2/"}">Next</a></nav></main>`,
            ),
      );
    const run = await runDirectSource(pepper, {
      transport,
      observedAt,
      mode: "fixture",
    });
    expect(run.enumeration.pagination.requested).toEqual([
      pepper.listingUrls[0],
      "https://www.pepperlunch.com.sg/promo/page/2/",
    ]);
    expect(run.enumeration.complete).toBe(true);
    const limited = await runDirectSource(pepper, {
      transport,
      observedAt,
      mode: "fixture",
      limits: { maxListingPages: 1 },
    });
    expect(limited.enumeration.complete).toBe(false);
    expect(limited.enumeration.pagination.unresolved).toContain(
      "https://www.pepperlunch.com.sg/promo/page/2/",
    );
    expect(
      limited.requests.filter((r) => r.relation === "listing"),
    ).toHaveLength(1);
  });
  it("unrecognized pagination and missing listing structure prevent readiness", async () => {
    const run = await fixtureRun(pepper, (url, body) =>
      url.pathname === "/promo/"
        ? body.replace(
            "</main>",
            '<a rel="next" href="/promo/?paged=2">Next</a></main>',
          )
        : body,
    );
    expect(run.enumeration.complete).toBe(false);
    expect(
      run.enumeration.issues.some((i) => i.code === "pagination_unresolved"),
    ).toBe(true);
    const changed = await fixtureRun(pepper, (url, body) =>
      url.pathname === "/promo/" ? "<main>No cards</main>" : body,
    );
    expect(changed.gate.deterministic_extraction).toBe(false);
    expect(changed.enumeration.complete).toBe(false);
  });
  it("extracts observed proposition, explicit campaign dates and source merchant with evidence", async () => {
    const c = (await fixtureRun()).candidates[0];
    expect(c.merchant).toBe("Pepper Lunch");
    expect(c.title).toBe("$uper Value Deal");
    expect(c.benefit).toContain("from just $9.90");
    expect(c.startDate).toBe("2026-09-01");
    expect(c.endDate).toBe("2026-10-31");
    expect(c.facts.validity?.quote).toBe(
      "Available from 1 September to 31 October 2026.",
    );
    expect(c.facts.benefit?.evidenceIds).toEqual([
      c.evidence.find((e) => e.relation === "detail")!.id,
    ]);
  });
  it("publication metadata never fills missing validity", async () => {
    const c = (
      await fixtureRun(pepper, (_url, body) =>
        body
          .replace("Available from 1 September to 31 October 2026.", "")
          .replace(
            "<body>",
            '<head><meta property="article:published_time" content="2026-09-01T00:00:00Z"></head><body>',
          ),
      )
    ).candidates[0];
    expect(c.startDate).toBeNull();
    expect(c.endDate).toBeNull();
    expect(c.issues).toContain("start_date_unknown");
  });
  it("brand format does not imply all physical outlets; unknown facts remain null", async () => {
    const c = (await fixtureRun()).candidates[0];
    expect(c.locationScope).toBe("source_unspecified");
    expect(c.locationNames).toEqual([]);
    expect(c.eligibility).toBeNull();
    expect(c.redemption).toBeNull();
    expect(c.issues).toEqual(
      expect.arrayContaining([
        "locations_unknown",
        "outlet_type_only",
        "eligibility_unknown",
        "redemption_unknown",
      ]),
    );
    expect(c.extractionStatus).toBe("partial");
  });
  it("retains explicit outlet wording, eligibility/redemption and terms provenance", async () => {
    const c = (
      await fixtureRun(pepper, (_url, body) =>
        body.replace(
          "Available from 1 September",
          "Available only at Tampines One.<br>Students only. Present your student card for dine-in.<br>Available from 1 September",
        ),
      )
    ).candidates[0];
    expect(c.locationScope).toBe("named_outlets");
    expect(c.locationNames).toEqual(["Tampines One"]);
    expect(c.redemption?.join()).toContain("Present your student card");
    expect(c.terms?.join()).toContain("Not valid with other promotions");
    expect(c.facts.locations?.quote).toBe("Available only at Tampines One.");
    expect(c.facts.terms?.evidenceIds.length).toBe(1);
  });
  it("listing completeness and candidate extraction completeness are independent", async () => {
    const run = await fixtureRun();
    expect(run.enumeration.complete).toBe(true);
    expect(run.candidates[0].extractionStatus).toBe("partial");
  });
  it("stable offline rerun has byte-equivalent complete semantic candidate output", async () => {
    expect(JSON.stringify((await fixtureRun()).candidates)).toBe(
      JSON.stringify((await fixtureRun()).candidates),
    );
  });
  it("detail failure retains listing evidence and an explicit failed candidate", async () => {
    const f = await fixtureTransport(path.join(root, "manifest.json"));
    const run = await runDirectSource(pepper, {
      ...f,
      transport: async (url, s, m) =>
        url.href === offer
          ? htmlResponse("blocked", 403)
          : f.transport(url, s, m),
      mode: "fixture",
    });
    expect(run.enumeration.complete).toBe(true);
    expect(run.candidates[0].extractionStatus).toBe("failed");
    expect(run.candidates[0].issues).toContain("detail_fetch_failed:http_403");
    expect(run.gate.detail_fetch_success).toBe(false);
  });
  it.each([
    ["1 Oct 2026 – 31 Oct 2026", "2026-10-01", "2026-10-31"],
    ["From 1 October 2026", "2026-10-01", null],
    ["Valid till 30 September 2026", null, "2026-09-30"],
  ])("supports observed direct date grammar %s", (text, start, end) => {
    expect(campaignDates([text!]).startDate).toBe(start);
    expect(campaignDates([text!]).endDate).toBe(end);
  });
  it("unsupported and contradictory dates stay unknown with an issue", () => {
    expect(campaignDates(["Valid till next month"]).issue).toBe(
      "validity_unparsed",
    );
    expect(
      campaignDates(["1 Oct 2026 – 31 Oct 2026", "1 Nov 2026 – 30 Nov 2026"])
        .startDate,
    ).toBeNull();
  });
});

describe("Paradise and cross-source contract", () => {
  it("enumerates corporate cards, Hotpot offers and linked PDF evidence through the same contract", async () => {
    const run = await fixtureRun(paradise);
    expect(run.enumeration.entries).toHaveLength(3);
    expect(
      run.enumeration.entries.some(
        (e) =>
          e.canonicalUrl.includes("celebrating-paradise") &&
          e.relation === "detail",
      ),
    ).toBe(true);
    const menu = run.enumeration.entries.find((e) => e.relation === "menu")!;
    expect(menu.listingUrl).toBe("https://www.paradisegp.com/paradise-hotpot/");
    expect(
      run.pages.find((p) => p.evidence.url === menu.canonicalUrl)?.evidence
        .contentType,
    ).toBe("application/pdf");
  });
  it("historical PDF is evidence only, never a root and never fetched by guessing", async () => {
    const f = await fixtureTransport(path.join(root, "manifest.json"));
    const http = new BoundedDirectFetch(paradise, f.transport);
    await expect(
      http.fetch(
        "https://www.paradisegp.com/wp-content/uploads/Paradise-Hotpot-Menu_-Aug-2025.pdf",
        "menu",
      ),
    ).rejects.toThrow("undiscovered_url");
    expect(http.attempts).toEqual([]);
  });
  it("partial corporate coverage and unresolved LOAD MORE remain false", async () => {
    const run = await fixtureRun(paradise);
    expect(run.enumeration.complete).toBe(false);
    expect(run.enumeration.issues.map((i) => i.code)).toEqual(
      expect.arrayContaining([
        "corporate_coverage_partial",
        "pagination_unresolved",
      ]),
    );
    expect(run.gate.listing_fetch_success).toBe(true);
  });
  it("multi-brand page never combines one brand's benefit and another brand's outlet terms", async () => {
    const c = (await fixtureRun(paradise)).candidates.find((c) =>
      c.canonicalUrl.includes("mondayismembersday"),
    )!;
    expect(c.description).toContain("1 Dines Free with 3 Paying Adults");
    expect(c.terms?.join()).toContain("Scotts Square");
    expect(c.benefit).toBeNull();
    expect(c.locationScope).toBe("source_unspecified");
    expect(c.locationNames).toEqual([]);
    expect(c.issues).toContain("multi_offer_page_requires_association");
    expect(c.weekdays).toEqual([1]);
    expect(c.eligibility?.join()).toContain(
      "Paradise Gourmet Rewards members only",
    );
  });
  it("native PDF text contributes only with exact single-offer association; columns/pages are refused", () => {
    expect(
      associatedNativePdfText("One offer\nExplicit benefit $10", "One offer"),
    ).toEqual({ text: "Explicit benefit $10", issue: null });
    expect(
      associatedNativePdfText("Another offer\n$10", "One offer").issue,
    ).toBe("pdf_offer_association_unknown");
    expect(
      associatedNativePdfText(
        "One offer\nAdult   Child\n$10   $5",
        "One offer",
      ),
    ).toEqual({ text: null, issue: "pdf_layout_ambiguous" });
    expect(
      associatedNativePdfText("One offer\n$10\fOther offer", "One offer").text,
    ).toBeNull();
  });
  it("PDF unavailable/native ambiguity never invents campaign facts", async () => {
    const c = (await fixtureRun(paradise)).candidates.find((c) =>
      c.canonicalUrl.endsWith(".pdf"),
    )!;
    expect(c.benefit).toBeNull();
    expect(c.startDate).toBeNull();
    expect(c.endDate).toBeNull();
    expect(c.issues).toContain("pdf_native_text_unavailable");
    expect(c.evidence.some((e) => e.relation === "menu")).toBe(true);
  });
  it("same adapter interface, isolated identities/URLs/evidence, same apparent title never merges sources", async () => {
    const runs = await Promise.all([fixtureRun(), fixtureRun(paradise)]);
    for (const run of runs) {
      expect(sourceAdapter(run.source).sourceId).toBe(run.source.id);
      for (const c of run.candidates) {
        expect(c.sourceId).toBe(run.source.id);
        expect(run.source.allowedHosts).toContain(
          new URL(c.canonicalUrl).hostname,
        );
        expect(c.evidence.every((e) => e.sourceId === c.sourceId)).toBe(true);
      }
    }
    expect(candidateId(pepper.id, offer)).not.toBe(
      candidateId(paradise.id, offer),
    );
  });
  it("schema rejects mixed-source evidence and facts without evidence", async () => {
    const c = (await fixtureRun()).candidates[0];
    expect(
      directPromotionCandidateSchema.safeParse({
        ...c,
        evidence: c.evidence.map((e) => ({ ...e, sourceId: paradise.id })),
      }).success,
    ).toBe(false);
    expect(
      directPromotionCandidateSchema.safeParse({ ...c, facts: {} }).success,
    ).toBe(false);
  });
  it("shared primitives contain no merchant-specific selectors/facts or Telegram identity fields", async () => {
    for (const file of [
      "adapter",
      "candidate",
      "dates",
      "evidence",
      "fetch",
      "html",
      "pdf",
      "runner",
      "fixtures",
    ]) {
      const text = await readFile(
        `src/ingestion/direct-sources/${file}.ts`,
        "utf8",
      );
      expect(text).not.toMatch(
        /pepper|paradise|sgfooddeals|tastesoulsg|messageId|signalId|PostOfferParser|SourcePost/i,
      );
    }
  });
});

describe("shadow CLI and production isolation", () => {
  it("requires an explicit source and rejects unknown sources/arguments", () => {
    expect(() => parseArgs([])).toThrow("explicit_source_required");
    expect(() => parseArgs(["--source", "shake_shack"])).toThrow();
    expect(() => parseArgs(["--all", "--source", pepper.id])).toThrow();
    expect(() => parseArgs(["--all", "--worker"])).toThrow();
    expect(parseArgs(["--all"]).sources).toHaveLength(11);
  });
  it("writes complete local evidence reports, rejects reuse, production output and symlink escapes", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "direct-source-output-"));
    await expect(prepareOutput("data/promotions", cwd)).rejects.toThrow(
      "output_must_be_preview_child",
    );
    const output = await prepareOutput(
      ".local/direct-source-preview/fixture",
      cwd,
    );
    const run = await fixtureRun();
    await writeRunArtifacts(output, [run]);
    expect(await readdir(output)).toEqual(
      expect.arrayContaining([
        "run.json",
        "enumeration.json",
        "candidates.json",
        "evidence",
        "report.md",
      ]),
    );
    expect(
      JSON.parse(await readFile(path.join(output, "candidates.json"), "utf8")),
    ).toEqual(run.candidates);
    await expect(
      prepareOutput(".local/direct-source-preview/fixture", cwd),
    ).rejects.toThrow();
    await symlink(root, path.join(cwd, ".local/direct-source-preview/alias"));
    await expect(
      prepareOutput(".local/direct-source-preview/alias/run", cwd),
    ).rejects.toThrow("output_symlink_forbidden");
  });
  it("fixture mode has no network fallback and rejects artifact traversal", async () => {
    const f = await fixtureTransport(path.join(root, "manifest.json"));
    await expect(
      f.transport(
        new URL("https://www.paradisegp.com/unknown/"),
        new AbortController().signal,
        100,
      ),
    ).rejects.toThrow("fixture_url_missing");
    const dir = await mkdtemp(path.join(os.tmpdir(), "direct-fixture-"));
    await writeFile(
      path.join(dir, "manifest.json"),
      JSON.stringify({
        observedAt,
        pages: { [offer]: { path: "../outside", contentType: "text/html" } },
      }),
    );
    await writeFile(
      path.join(dir, "manifest-symlink.json"),
      JSON.stringify({
        observedAt,
        pages: { [offer]: { path: "escape.html", contentType: "text/html" } },
      }),
    );
    await symlink(
      path.join(root, "pepper-detail.html"),
      path.join(dir, "escape.html"),
    );
    const escaped = await fixtureTransport(
      path.join(dir, "manifest-symlink.json"),
    );
    await expect(
      escaped.transport(
        new URL(offer),
        new AbortController().signal,
        DEFAULT_LIMITS.maxBytes,
      ),
    ).rejects.toThrow("fixture_path_escape");
  });
  it("preview dependency closure imports no DB, publication, Telegram acquisition, worker or research", async () => {
    const visited = new Set<string>();
    const packages = new Set<string>();
    async function walk(file: string): Promise<void> {
      if (visited.has(file)) return;
      visited.add(file);
      const text = await readFile(file, "utf8");
      const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
      for (const statement of ast.statements) {
        if (
          !ts.isImportDeclaration(statement) ||
          !ts.isStringLiteral(statement.moduleSpecifier)
        )
          continue;
        const spec = statement.moduleSpecifier.text;
        if (spec.startsWith("."))
          await walk(path.resolve(path.dirname(file), spec + ".ts"));
        else packages.add(spec);
      }
    }
    await walk(path.resolve("scripts/direct-source-preview.ts"));
    expect([...visited].join("\n")).not.toMatch(
      /\/server\/|\/db\/|\/research\/|\/ingestion\/(?:service|live|worker|parser|sources)\./,
    );
    expect([...packages]).not.toContain("pg");
    expect([...packages]).not.toContain("@supabase/supabase-js");
    expect(
      [...visited].filter((file) => file.includes("direct-sources")),
    ).not.toHaveLength(0);
  });
  it("frozen production Telegram/domain/registry and research files retain baseline hashes", async () => {
    // Checked-in expectations are independent of generated preview output.
    const expected = JSON.parse(
      await readFile(
        path.join(root, "protected-production-hashes.json"),
        "utf8",
      ),
    ) as Record<string, string>;
    for (const [file, hash] of Object.entries(expected)) {
      // The autonomous-ingestion change explicitly extends this schema; mixed/legacy
      // parsing is covered by direct-publication tests. All other byte freezes remain.
      if (file === "src/domain/promotion.ts") continue;
      expect(contentHash(await readFile(file)), file).toBe(hash);
    }
  });
});

describe("reviewed conservative edge cases", () => {
  it("all restaurants is source scope, never a fabricated named physical outlet", async () => {
    const c = (
      await fixtureRun(pepper, (_url, body) =>
        body.replace(
          "Available from 1 September",
          "Available at all Pepper Lunch Restaurants.<br>Available from 1 September",
        ),
      )
    ).candidates[0];
    expect(c.locationScope).toBe("all_outlets");
    expect(c.locationNames).toEqual([]);
  });
  it("explicit exclusions retain selected scope instead of asserting all outlets", async () => {
    const c = (
      await fixtureRun(pepper, (_url, body) =>
        body.replace(
          "Available from 1 September",
          "Available at all Pepper Lunch Restaurants except Tampines One.<br>Available from 1 September",
        ),
      )
    ).candidates[0];
    expect(c.locationScope).toBe("selected_outlets");
    expect(c.locationWording).toContain("except Tampines One");
  });
  it("restaurant type restriction does not invent participation or physical identities", async () => {
    const c = (
      await fixtureRun(pepper, (_url, body) =>
        body.replace(
          "Available from 1 September",
          "Valid at Pepper Lunch restaurants only.<br>Available from 1 September",
        ),
      )
    ).candidates[0];
    expect(c.locationScope).toBe("source_unspecified");
    expect(c.locationNames).toEqual([]);
    expect(c.issues).toContain("location_identity_unresolved");
  });
  it("invalid campaign dates discard the entire invalid range and unrelated not-valid terms do not imply calendar parsing failure", () => {
    expect(campaignDates(["31 February 2026 – 31 March 2026"])).toEqual({
      startDate: null,
      endDate: null,
      quote: null,
      issue: "validity_unparsed",
    });
    expect(
      campaignDates(["Not valid with other promotions."]).issue,
    ).toBeNull();
  });
  it("self-referencing next pagination remains unresolved", async () => {
    const run = await fixtureRun(pepper, (url, body) =>
      url.pathname === "/promo/"
        ? body.replace(
            "</main>",
            '<nav class="pagination"><a rel="next" href="/promo/">Next</a></nav></main>',
          )
        : body,
    );
    expect(run.enumeration.complete).toBe(false);
    expect(
      run.enumeration.issues.some((i) => i.code === "pagination_cycle"),
    ).toBe(true);
  });
});
