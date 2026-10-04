import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import {
  runDiscovery,
  type FetchPage,
  type Source,
  type SourceRegistry,
} from "../scripts/research/source-monitor/discovery";
import registryFile from "../scripts/research/source-monitor/protocol/source-registry.json";

const dirs: string[] = [];
const now = () => "2026-09-25T00:10:00.000Z";
async function temporaryRun() {
  const dir = await mkdtemp(path.join(tmpdir(), "research-discovery-"));
  dirs.push(dir);
  return dir;
}
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});
const html = (body: string) => ({
  status: 200,
  contentType: "text/html; charset=utf-8",
  body: `<html><body>${body}</body></html>`,
});
const source = (id: string, origin: string, maxPages = 2): Source => ({
  source_id: id,
  source_type: "publisher_date_archive",
  origin_url: origin,
  enumerable: true,
  ordering: "fixture order",
  pagination: "fixture pagination",
  freshness_visibility: "fixture dates",
  reasonable_per_run_cap: { max_pages: maxPages, max_entries: 10 },
});

describe("research source discovery", () => {
  it("records every frozen registry source and multiple details per source, then reuses checkpoints", async () => {
    const runDir = await temporaryRun();
    const registry = structuredClone(registryFile) as SourceRegistry;
    registry.sources.find(
      (item) => item.source_id === "singpromos_ongoing",
    )!.reasonable_per_run_cap.max_pages = 2;
    const index = "https://singpromos.com/bydate/ontoday/";
    const second = "https://singpromos.com/bydate/ontoday/page/2/";
    const seen: string[] = [];
    const fetchPage: FetchPage = async (url) => {
      seen.push(url);
      if (url === index)
        return html(
          '<article class="mh-loop-item"><a href="/offer/a">Cafe A 1-for-1 Latte</a></article><article class="mh-loop-item"><a href="/offer/b">Cafe B 50% Off Coffee</a></article><a rel="next" href="/bydate/ontoday/page/2/">Next</a>',
        );
      if (url === second)
        return html(
          '<article class="mh-loop-item"><a href="/offer/c">Cafe C S$2 off Sandwich</a></article>',
        );
      if (url.startsWith("https://singpromos.com/offer/"))
        return html(
          "<main>Promotion valid 23 Sep to 30 Sep 2026 at participating Singapore stores. Terms apply.</main>",
        );
      return html("<main>Fixture index has no supported cards.</main>");
    };
    const result = await runDiscovery({ runDir, registry, now, fetchPage });
    expect(result.source_snapshots).toHaveLength(19);
    expect(result.totals.sources).toBe(19);
    expect(result.candidates).toHaveLength(3);
    const snapshot = result.source_snapshots[0];
    expect(snapshot.source_id).toBe("singpromos_ongoing");
    expect(snapshot.pages).toHaveLength(2);
    expect(snapshot.cards_evaluated).toBe(3);
    expect(snapshot.detail_attempts).toBe(3);
    expect(snapshot.candidate_proposals).toBe(3);
    expect(
      new Set(snapshot.detail_inspections.map((item) => item.raw_file)).size,
    ).toBe(3);
    for (const item of [...snapshot.pages, ...snapshot.detail_inspections]) {
      const raw = await readFile(path.join(runDir, item.raw_file!));
      expect(createHash("sha256").update(raw).digest("hex")).toBe(
        item.raw_sha256,
      );
    }
    expect(
      result.source_snapshots.filter((item) => item.extraction_incomplete)
        .length,
    ).toBeGreaterThan(0);
    const calls = seen.length;
    const restarted = await runDiscovery({
      runDir,
      registry,
      now,
      fetchPage: async () => {
        throw new Error("completed source was fetched again");
      },
    });
    expect(seen).toHaveLength(calls);
    expect(restarted.source_snapshots).toEqual(result.source_snapshots);
    expect(restarted.candidates).toEqual(result.candidates);
  });

  it("stops at an abort, returns honest partial snapshots, and retries incomplete sources on restart", async () => {
    const runDir = await temporaryRun();
    const registry: SourceRegistry = {
      sources: [
        source("singpromos_ongoing", "https://singpromos.com/bydate/ontoday/"),
        source("eatbook_deals", "https://eatbook.sg/category/news/deals/"),
      ],
    };
    const controller = new AbortController();
    const partial = await runDiscovery({
      runDir,
      registry,
      now,
      signal: controller.signal,
      fetchPage: async () => {
        controller.abort();
        return new Promise(() => {});
      },
    });
    expect(partial.source_snapshots).toHaveLength(2);
    expect(
      partial.source_snapshots.every(
        (item) => item.status === "partial" && item.extraction_incomplete,
      ),
    ).toBe(true);
    expect(partial.source_snapshots[0].incomplete_reasons).toContain(
      "acquisition_interrupted_during_source",
    );
    expect(partial.source_snapshots[1].incomplete_reasons).toContain(
      "acquisition_interrupted_before_source",
    );
    expect(await readdir(path.join(runDir, "discovery", "sources"))).toEqual([
      "singpromos_ongoing.json",
    ]);
    const calls: string[] = [];
    const resumed = await runDiscovery({
      runDir,
      registry,
      now,
      fetchPage: async (url) => {
        calls.push(url);
        return html("<main>Empty but successful source fixture.</main>");
      },
    });
    expect(calls).toEqual(registry.sources.map((item) => item.origin_url));
    expect(
      resumed.source_snapshots.every((item) => item.pages.length === 1),
    ).toBe(true);
    expect(
      (await readdir(path.join(runDir, "discovery", "sources"))).sort(),
    ).toEqual(["eatbook_deals.json", "singpromos_ongoing.json"]);
  });

  it("marks pagination caps and detail failures while merging only identical supported proposals", async () => {
    const runDir = await temporaryRun();
    const registry: SourceRegistry = {
      sources: [
        source(
          "singpromos_ongoing",
          "https://singpromos.com/bydate/ontoday/",
          1,
        ),
        source("eatbook_deals", "https://eatbook.sg/category/news/deals/", 1),
      ],
    };
    const fetchPage: FetchPage = async (url) => {
      if (url === registry.sources[0].origin_url)
        return html(
          '<article class="mh-loop-item"><a href="/cafe-a">Cafe A 1-for-1 Latte</a> valid 23 Sep to 30 Sep 2026 at participating Singapore stores</article><a rel="next" href="/bydate/ontoday/page/2/">Next</a>',
        );
      if (url === registry.sources[1].origin_url)
        return html(
          '<article class="grid-item"><a href="/cafe-a">Cafe A 1-for-1 Latte</a> valid 23 Sep to 30 Sep 2026 at participating Singapore stores</article><article class="grid-item"><a href="https://evil.example/promo">External offer</a></article>',
        );
      if (url === "https://singpromos.com/cafe-a")
        throw new Error("detail unavailable");
      return html(
        "<main>1-for-1 Latte valid 23 Sep to 30 Sep 2026 at participating Singapore stores.</main>",
      );
    };
    const result = await runDiscovery({ runDir, registry, now, fetchPage });
    expect(result.source_snapshots[0].cap_truncated).toBe(true);
    expect(result.source_snapshots[0].pagination_remaining).toBe(true);
    expect(result.source_snapshots[0].detail_failures).toBe(1);
    expect(result.source_snapshots[1].entries_seen_count).toBe(1);
    expect(result.totals.candidate_proposals).toBe(2);
    expect(result.totals.distinct_candidates).toBe(1);
    expect(result.candidates[0].occurrences).toHaveLength(2);
    expect(result.candidates[0].inspectable).toBe(true);
  });

  it("preserves the first listing observation when an interrupted detail inspection is retried", async () => {
    const runDir = await temporaryRun();
    const registry: SourceRegistry = {
      sources: [
        source("singpromos_ongoing", "https://singpromos.com/bydate/ontoday/"),
      ],
    };
    const controller = new AbortController();
    const listing = html(
      '<article class="mh-loop-item"><a href="/cafe-a">Cafe A 1-for-1 Latte</a></article>',
    );
    const partial = await runDiscovery({
      runDir,
      registry,
      now: () => "2026-09-25T00:10:00.000Z",
      signal: controller.signal,
      fetchPage: async (url) => {
        if (url === registry.sources[0].origin_url) return listing;
        controller.abort();
        return new Promise(() => {});
      },
    });
    expect(partial.source_snapshots[0].listing_evidence).toHaveLength(1);
    expect(partial.candidates).toHaveLength(0);
    const resumed = await runDiscovery({
      runDir,
      registry,
      now: () => "2026-09-25T00:20:00.000Z",
      fetchPage: async (url) =>
        url === registry.sources[0].origin_url
          ? listing
          : html(
              "<main>1-for-1 Latte valid 23 Sep to 30 Sep 2026 at participating Singapore stores.</main>",
            ),
    });
    expect(resumed.candidates).toHaveLength(1);
    expect(resumed.candidates[0].first_seen_at).toBe(
      "2026-09-25T00:10:00.000Z",
    );
    expect(resumed.candidates[0].seen_at).toBe("2026-09-25T00:20:00.000Z");
  });

  it("keeps stale and distant cards as evidence while proposing current, upcoming, and newly changed offers", async () => {
    const registry: SourceRegistry = {
      sources: [
        source("singpromos_ongoing", "https://singpromos.com/bydate/ontoday/"),
      ],
    };
    const card = (slug: string, title: string, dates: string) =>
      `<article class="mh-loop-item"><a href="/${slug}">${title}</a> ${dates} at participating Singapore stores</article>`;
    const listing = html(
      [
        card("old", "Old Cafe 20% off meals", "valid 1 Sep to 5 Sep 2026"),
        card("kfc", "KFC", "20% off meals valid 23 Sep to 30 Sep 2026"),
        card("soon", "Soon Cafe 1-for-1 Coffee", "valid 1 Oct to 5 Oct 2026"),
        card("late", "Late Cafe 1-for-1 Coffee", "valid 20 Oct to 25 Oct 2026"),
      ].join(""),
    );
    const first = await runDiscovery({
      runDir: await temporaryRun(),
      registry,
      now,
      fetchPage: async (url) =>
        url === registry.sources[0].origin_url
          ? listing
          : html("<main>Offer at participating Singapore stores.</main>"),
    });
    expect(first.source_snapshots[0].cards_evaluated).toBe(4);
    expect(first.source_snapshots[0].cards_skipped_stale).toBe(1);
    expect(first.source_snapshots[0].cards_outside_horizon).toBe(1);
    expect(first.candidates.map((item) => item.merchant).sort()).toEqual([
      "KFC",
      "Soon Cafe",
    ]);
    expect(
      first.candidates.find((item) => item.merchant === "KFC"),
    ).toMatchObject({
      start_date: "2026-09-23",
      end_date: "2026-09-30",
      location: "participating Singapore stores",
      temporal_basis: "current",
    });
    expect(
      first.candidates.find((item) => item.merchant === "Soon Cafe")
        ?.temporal_basis,
    ).toBe("upcoming");
    const changed = listing.body.replace(
      "Old Cafe 20% off meals",
      "Old Cafe 25% off meals",
    );
    const second = await runDiscovery({
      runDir: await temporaryRun(),
      registry,
      previous: first,
      now: () => "2026-09-26T00:10:00.000Z",
      fetchPage: async (url) =>
        url === registry.sources[0].origin_url
          ? { ...listing, body: changed }
          : html("<main>Offer at participating Singapore stores.</main>"),
    });
    expect(
      second.candidates.find((item) => item.merchant === "Old Cafe")
        ?.temporal_basis,
    ).toBe("new_or_updated");
  });

  it("keeps untraversed Great World category tabs and unknown dates visibly incomplete", async () => {
    const registry: SourceRegistry = {
      sources: [
        source(
          "great_world_promotions",
          "https://shop.greatworld.com.sg/happenings/promotions/",
        ),
      ],
    };
    const result = await runDiscovery({
      runDir: await temporaryRun(),
      registry,
      now,
      fetchPage: async (url) =>
        url === registry.sources[0].origin_url
          ? html(
              '<a href="/happenings/promotions/dine/">Dine</a><a href="/happenings/promotions/shop/">Shop</a><div class="promotionboxwrap"><a href="/promotion/cafe">Cafe A 1-for-1 Latte</a></div>',
            )
          : html("<main>1-for-1 Latte at Great World.</main>"),
    });
    expect(result.source_snapshots[0].status).toBe("partial");
    expect(result.source_snapshots[0].incomplete_reasons).toContain(
      "registered_category_or_tab_routes_not_traversed",
    );
    expect(result.source_snapshots[0].incomplete_reasons).toContain(
      "candidate_temporal_ambiguous",
    );
    expect(result.source_snapshots[0].cards_temporal_ambiguous).toBe(1);
    expect(result.candidates).toHaveLength(0);
  });

  it("enumerates captured same-page directories without inventing detail URLs or generic code merchants", async () => {
    const ids = [
      "jewel_student_privileges",
      "jewel_ticket_privileges",
      "singapore_river_festival",
      "grab_promo_codes",
      "ordinary_patrons_news",
    ];
    const registry: SourceRegistry = {
      sources: ids.map(
        (id) =>
          structuredClone(
            registryFile.sources.find((item) => item.source_id === id),
          ) as Source,
      ),
    };
    const fixture: Record<string, string> = {
      jewel_student_privileges: `
        <div class="item"><p>Student Privileges at Jewel Changi Airport</p><table>
          <tr><td>ActionCity Cafe</td><td>#04-223</td><td>30% off total bill</td></tr>
          <tr><td>ActionCity Cafe</td><td>#04-223</td><td>10% off student meals</td></tr>
          <tr><td>Nasty Cookie</td><td>#03-207</td><td>10% off</td></tr>
        </table></div>`,
      jewel_ticket_privileges: `
        <div class="item"><p>Collect your discount card at Jewel Changi Airport.</p>
          <p>Enjoy 20% off total bill at participating stores till 31 Oct 2026.</p>
          <table><tr><th>Store Name</th><th>Unit Number</th></tr>
            <tr><td>Cafe Kitsune</td><td>#01-K209</td></tr>
            <tr><td>Dian Xiao Er</td><td>#B2-229</td></tr>
          </table></div>`,
      singapore_river_festival: `
        <main><h3>Exclusive deals along the Singapore River [1–30 September 2026]</h3>
          <div class="sqs-stack-container"><div class="stack-child-container" id="offer-one">
            <div class="sqs-html-content">Harry's Boat Quay</div>
            <div class="sqs-html-content">Boat Quay</div>
            <div class="sqs-html-content">1-for-1 Brooklyn Pilsner</div>
          </div></div>
          <div class="sqs-stack-container"><div class="stack-child-container" id="offer-two">
            <div class="sqs-html-content">Harry's Boat Quay</div>
            <div class="sqs-html-content">Boat Quay</div>
            <div class="sqs-html-content">20% off total bill</div>
          </div></div></main>`,
      grab_promo_codes: `
        <table><thead><tr><th>GrabFood Promos</th></tr></thead>
          <tbody><tr><td>Delivery</td><td>$5 off delivery</td><td>FOOD5</td><td>Until 30 Sep 2026</td></tr></tbody></table>
        <table><thead><tr><th>Dine Out Promos</th></tr></thead><tbody>
          <tr><th>New Users</th><td>$5 off for new Dine Out users</td><td>DINEOUTNEW</td><td>Until 31 Dec 2026</td></tr>
          <tr><th>Jalan Besar</th><td>Extra 20% off at selected merchants</td><td>JB20</td><td>Until 30 Sep 2026</td></tr>
        </tbody></table>`,
      ordinary_patrons_news: `
        <nav><h1 class="wp-block-heading">Navigation headline</h1></nav>
        <div class="nv-content-wrap entry-content">
          <h2 class="wp-block-heading">Cafe A 20% off lunch</h2>
          <p>Offer valid 23 Sep to 30 Sep 2026 at participating Singapore stores.</p>
          <h2 class="wp-block-heading">Cafe B opens a new outlet</h2>
          <p>Regular menu, no special offer.</p>
        </div>`,
    };
    const seen: string[] = [];
    const result = await runDiscovery({
      runDir: await temporaryRun(),
      registry,
      now,
      fetchPage: async (url) => {
        seen.push(url);
        const item = registry.sources.find((entry) => entry.origin_url === url);
        if (!item) throw new Error(`Unexpected detail fetch: ${url}`);
        return html(fixture[item.source_id]);
      },
    });
    expect(seen).toEqual(registry.sources.map((item) => item.origin_url));
    expect(
      result.source_snapshots.map((item) => item.entries_seen_count),
    ).toEqual([3, 2, 2, 2, 2]);
    const [student, ticket, festival, grab, patrons] = result.source_snapshots;
    expect(student.listing_evidence.map((card) => card.title)).toEqual([
      "ActionCity Cafe 30% off",
      "ActionCity Cafe 10% off",
      "Nasty Cookie 10% off",
    ]);
    expect(new Set(student.listing_evidence.map((card) => card.url)).size).toBe(
      3,
    );
    expect(student.status).toBe("partial");
    expect(student.incomplete_reasons).toContain(
      "candidate_temporal_ambiguous",
    );
    expect(ticket.listing_evidence.map((card) => card.title)).toEqual([
      "Cafe Kitsune 20% off",
      "Dian Xiao Er 20% off",
    ]);
    expect(ticket.detail_inspections).toHaveLength(2);
    expect(
      ticket.detail_inspections.every(
        (detail) => detail.raw_file === ticket.pages[0].raw_file,
      ),
    ).toBe(true);
    expect(festival.listing_evidence.map((card) => card.url)).toEqual([
      `${festival.pages[0].url}#offer-one`,
      `${festival.pages[0].url}#offer-two`,
    ]);
    expect(grab.listing_evidence.map((card) => card.excerpt)).toEqual([
      expect.stringContaining("DINEOUTNEW"),
      expect.stringContaining("JB20"),
    ]);
    expect(grab.status).toBe("partial");
    expect(grab.incomplete_reasons).toContain(
      "campaign_table_does_not_identify_physical_merchants",
    );
    expect(grab.detail_inspections).toHaveLength(0);
    expect(
      result.candidates.some((item) => item.source_id === "grab_promo_codes"),
    ).toBe(false);
    expect(patrons.listing_evidence.map((card) => card.title)).toEqual([
      "Cafe A 20% off lunch",
      "Cafe B opens a new outlet",
    ]);
  });

  it("compares same-page offers by row when unrelated page content changes", async () => {
    const registry: SourceRegistry = {
      sources: [
        structuredClone(
          registryFile.sources.find(
            (item) => item.source_id === "jewel_student_privileges",
          ),
        ) as Source,
      ],
    };
    const listing = (benefit: string, footer: string) =>
      html(`<div class="item"><table>
        <tr><td>Cafe A</td><td>#01-100</td><td>${benefit}</td></tr>
        <tr><td>Cafe B</td><td>#01-200</td><td>10% off total bill</td></tr>
      </table></div><footer>${footer}</footer>`);
    const observe = async (
      body: ReturnType<typeof html>,
      previous?: Awaited<ReturnType<typeof runDiscovery>>,
    ) =>
      runDiscovery({
        runDir: await temporaryRun(),
        registry,
        now,
        previous,
        fetchPage: async () => body,
      });
    const first = await observe(listing("20% off total bill", "First footer"));
    const unchanged = await observe(
      listing("20% off total bill", "Updated footer"),
      first,
    );
    expect(first.candidates).toHaveLength(0);
    expect(unchanged.candidates).toHaveLength(0);
    const changed = await observe(
      listing("25% off total bill", "Updated footer"),
      unchanged,
    );
    expect(changed.candidates.map((candidate) => candidate.merchant)).toEqual([
      "Cafe A",
    ]);
    expect(changed.candidates[0].temporal_basis).toBe("new_or_updated");
  });

  it("retries public 429 and 5xx responses within a bounded fixture-only request budget", async () => {
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response("limited", {
          status: 429,
          headers: { "content-type": "text/html", "retry-after": "0" },
        }),
      )
      .mockResolvedValueOnce(
        new Response("unavailable", {
          status: 503,
          headers: { "content-type": "text/html", "retry-after": "0" },
        }),
      )
      .mockResolvedValueOnce(
        new Response("<html><body>Fixture source</body></html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        }),
      );
    const registry: SourceRegistry = {
      sources: [
        source(
          "ordinary_patrons_news",
          "https://ordinarypatrons.com/fb-news-and-deals/",
          1,
        ),
      ],
    };
    const result = await runDiscovery({
      runDir: await temporaryRun(),
      registry,
      now,
    });
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(result.source_snapshots[0].pages).toHaveLength(1);
    expect(result.source_snapshots[0].listing_failure).toBe(false);
  });
});
