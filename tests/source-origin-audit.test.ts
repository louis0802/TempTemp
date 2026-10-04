import { afterEach, describe, expect, it, vi } from "vitest";
import {
  mkdtemp,
  mkdir,
  readFile,
  realpath,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { SourceRedirectCache } from "../src/ingestion/source-evidence/cache";
import {
  SourceLinkResolver,
  type HopResponse,
  type ResolverTransport,
} from "../src/ingestion/source-evidence/resolver";
import { classifySource } from "../src/ingestion/source-evidence/registry";
import type { SourceRegistry } from "../src/ingestion/source-evidence/types";
import { auditSignals } from "../scripts/research/source-origin-audit/audit";
import {
  authorityReviewSchema,
  matchingReview,
} from "../scripts/research/source-origin-audit/classification";
import {
  frozenPosts,
  mergePosts,
  parseRaw,
  sampleSignals,
  sha256,
} from "../scripts/research/source-origin-audit/input";
import {
  runAudit,
  assertResearchOutput,
} from "../scripts/research/source-origin-audit/run";
import {
  csvReport,
  markdownReport,
} from "../scripts/research/source-origin-audit/report";
import type { AuditPost } from "../scripts/research/source-origin-audit/types";

const registry: SourceRegistry = { version: 1, merchants: {} };
const checked = "2026-09-30T01:00:00.000Z";
const short = "http://tco.sg/example";
const merchant = "https://merchant.example/campaign/sale";
const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(
    dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});
function post(
  id = 1,
  text = `Merchant A: 1-for-1 Lunch\nFind out more: ${short}`,
  channel: AuditPost["channel"] = "sgfooddeals",
): AuditPost {
  return {
    channel,
    message_id: id,
    published_at: checked,
    text,
    input_mode: "frozen_local",
    input_file: "fixture/2026-09-30/telegram-raw.json",
    input_sha256: "fixture-hash",
  };
}
function transport(final = merchant, middle?: string) {
  const responses: Record<string, HopResponse> = {
    [short]: { status: 302, location: middle ?? final },
    [final]: { status: 200 },
  };
  if (middle) responses[middle] = { status: 302, location: final };
  return {
    lookup: vi.fn(async () => [{ address: "93.184.216.34", family: 4 }]),
    request: vi.fn(async (url: URL) => {
      if (!responses[url.href]) throw new Error("fixture_missing");
      return responses[url.href];
    }),
  };
}
async function audit(
  posts = [post()],
  network: ResolverTransport = transport(),
  review = { version: 1 as const, entries: [] } as ReturnType<
    typeof authorityReviewSchema.parse
  >,
  cache = new SourceRedirectCache(),
  offline = false,
) {
  const sampled = await sampleSignals(posts, 50);
  const allowed = new Set(
    sampled.selected
      .filter((s) => s.signal_class === "promotion_signal")
      .flatMap((s) => s.signal.outboundLinks.map((l) => l.normalizedUrl)),
  );
  return auditSignals({
    ...sampled,
    sample: 50,
    registry,
    registryHash: "empty",
    cache,
    review,
    resolver: offline
      ? undefined
      : new SourceLinkResolver(allowed, network, () => checked, 25),
  });
}
async function fixtureRoot() {
  const root = await realpath(await mkdtemp(join(tmpdir(), "source-origin-")));
  dirs.push(root);
  await mkdir(join(root, "data"));
  await writeFile(
    join(root, "data/merchant-source-registry.json"),
    JSON.stringify(registry),
  );
  await mkdir(join(root, ".local/source-discovery-service/runs/2026-09-30"), {
    recursive: true,
  });
  await writeFile(
    join(
      root,
      ".local/source-discovery-service/runs/2026-09-30/telegram-raw.json",
    ),
    JSON.stringify({ posts: [post()] }),
  );
  await writeFile(
    join(root, ".local/source-discovery-service/seal.json"),
    '{"sealed":true}\n',
  );
  return root;
}
async function treeHash(root: string): Promise<string> {
  const entries: string[] = [];
  for (const item of (await readdir(root, { withFileTypes: true })).sort(
    (a, b) => a.name.localeCompare(b.name),
  )) {
    const path = join(root, item.name);
    entries.push(
      item.name +
        ":" +
        (item.isDirectory()
          ? await treeHash(path)
          : sha256(await readFile(path, "utf8"))),
    );
  }
  return sha256(entries.join("\n"));
}

describe("research-only source-origin audit", () => {
  it("resolves an offer's full redirect chain without inventing authority", async () => {
    const result = await audit();
    expect(result.audit.records[0]).toMatchObject({
      resolution_status: "resolved",
      destination_class: "merchant_web_candidate",
      authority: "unknown",
      source_origin_status: "needs_authority_review",
      official_source_url: null,
      redirect_chain: [short, merchant],
    });
    expect(result.audit.records[0].origin_chain.map((n) => n.role)).toEqual([
      "signal_source",
      "intermediate_source",
      "source_candidate",
    ]);
    expect(result.audit.summary.resolved_shortlinks).toBe(1);
  });
  it.each([
    "confirmgood.com",
    "eatbook.sg",
    "singaporefoodie.com",
    "greatdeals.com.sg",
  ])(
    "keeps %s intermediate with a deeper-resolution requirement",
    async (host) => {
      const result = await audit(
        [post()],
        transport(`https://${host}/article`),
      );
      const row = result.audit.records[0];
      expect(row.destination_class).toBe(
        host === "greatdeals.com.sg" ? "deal_aggregator" : "publisher",
      );
      expect(row.source_origin_status).toBe("intermediate");
      expect(row.manual_review_reasons).toContain(
        "publisher_requires_deeper_resolution",
      );
      expect(result.audit.summary.publisher_requires_deeper_resolution).toBe(1);
      expect(row.official_source_url).toBeNull();
      expect(
        classifySource(`https://${host}/article`, "Merchant A", registry)
          .authority,
      ).toBe(host === "confirmgood.com" ? "unknown" : "discovery");
    },
  );
  it.each(["https://t.me/anotherchannel/42", "https://linktr.ee/merchant"])(
    "keeps %s intermediate",
    async (final) => {
      const result = await audit([post()], transport(final));
      expect(result.audit.records[0]).toMatchObject({
        adapter_family: "link_hub",
        authority: "unknown",
        source_origin_status: "intermediate",
      });
    },
  );
  it("shows social candidates without assuming account ownership", async () => {
    const result = await audit(
      [post()],
      transport("https://instagram.com/merchant_a/p/123"),
    );
    expect(result.audit.records[0]).toMatchObject({
      destination_class: "official_social_candidate",
      adapter_family: "official_social",
      authority: "unknown",
    });
  });
  it.each([
    [
      "https://www.instagram.com/p/ABC/?x=1",
      "https://www.facebook.com/unsupportedbrowser?x=1",
      "instagram.com",
      "instagram_facebook_unsupportedbrowser",
    ],
    [
      "https://www.facebook.com/share/p/123/",
      "https://www.facebook.com/unsupportedbrowser",
      "facebook.com",
      "facebook_content_unsupportedbrowser",
    ],
    [
      "https://www.instagram.com/p/ABC/",
      "https://www.facebook.com/merchant/posts/123/",
      "facebook.com",
      "transport_destination",
    ],
    [
      "https://www.instagram.com/p/ABC/",
      "https://www.facebook.com/unsupportedbrowser-other",
      "facebook.com",
      "transport_destination",
    ],
    [
      "https://instagram.com.evil.example/p/ABC/",
      "https://www.facebook.com/unsupportedbrowser",
      null,
      "unsupportedbrowser_without_meaningful_prior",
    ],
  ])(
    "separates supported social fallback from transport: %s → %s",
    async (middle, final, candidateDomain, basis) => {
      const result = await audit([post()], transport(final, middle));
      const row = result.audit.records[0];
      expect(row.transport_final_url).toBe(final);
      expect(row.resolved_url).toBe(final);
      expect(row.candidate_domain).toBe(candidateDomain);
      expect(row.resolved_domain).toBe(candidateDomain);
      expect(row.canonicalization_basis).toBe(basis);
      expect(row.canonical_candidate_url).toBe(
        candidateDomain
          ? basis === "transport_destination"
            ? final
            : middle
          : null,
      );
      expect(row.destination_class).toBe(
        candidateDomain ? "official_social_candidate" : "unknown",
      );
      expect(row.authority).toBe("unknown");
      expect(row.redirect_chain).toEqual([short, middle, final]);
      expect(row.origin_chain.map((n) => n.url)).toEqual([
        row.telegram_url,
        short,
        middle,
        final,
      ]);
      expect(result.resolvedLinks[0].redirectChain).toEqual([
        short,
        middle,
        final,
      ]);
      expect(result.resolvedLinks[0].finalUrl).toBe(final);
      expect(result.audit.summary.transport_final_domain_counts).toEqual({
        "facebook.com": 1,
      });
      expect(result.audit.summary.candidate_domain_counts).toEqual(
        candidateDomain ? { [candidateDomain]: 1 } : {},
      );
    },
  );
  it.each([
    "https://www.facebook.com/merchant/posts/123/",
    "https://www.instagram.com/p/ABC/",
  ])("preserves ordinary social final destination %s", async (final) => {
    const result = await audit([post()], transport(final));
    expect(result.audit.records[0]).toMatchObject({
      transport_final_url: final,
      canonical_candidate_url: final,
      canonicalization_basis: "transport_destination",
      destination_class: "official_social_candidate",
      authority: "unknown",
      redirect_chain: [short, final],
    });
  });
  it("does not search older Instagram hops through arbitrary redirects", async () => {
    const final = "https://www.facebook.com/unsupportedbrowser";
    const cache = new SourceRedirectCache({
      [short]: {
        originalUrl: short,
        finalUrl: final,
        redirectChain: [
          short,
          "https://instagram.com/p/ABC/",
          "https://merchant.example/unrelated",
          final,
        ],
        checkedAt: checked,
        status: "resolved",
        reason: null,
        httpStatus: 200,
      },
    });
    const result = await audit([post()], transport(), undefined, cache, true);
    expect(result.audit.records[0].canonical_candidate_url).toBeNull();
    expect(result.audit.summary.candidate_domain_counts).toEqual({});
  });
  it("upgrades scoped research ownership deterministically without changing registry", async () => {
    const review = authorityReviewSchema.parse({
      version: 1,
      entries: [
        {
          merchant: "Merchant A",
          host: "instagram.com",
          account: "merchant_a",
          authority: "primary",
          source_kind: "merchant_social",
          evidence_note: "Official merchant site explicitly links this account",
        },
      ],
    });
    const before = JSON.stringify(registry);
    const final = "https://instagram.com/merchant_a/p/123";
    const cache = new SourceRedirectCache();
    const first = await audit([post()], transport(final), review, cache);
    expect(first.audit.records[0]).toMatchObject({
      authority: "primary",
      official_source_url: final,
      source_origin_status: "authoritative_candidate",
      source_kind: "merchant_social",
    });
    const second = await audit([post()], transport(final), review, cache, true);
    expect(JSON.stringify(second.audit)).toBe(JSON.stringify(first.audit));
    expect(JSON.stringify(registry)).toBe(before);
    expect(
      matchingReview(
        "https://instagram.com/merchant_a_fake/p/123",
        "Merchant A",
        review,
      ),
    ).toBeUndefined();
    expect(matchingReview(final, "Merchant B", review)).toBeUndefined();
    expect(
      matchingReview(
        "https://instagram.com.evil.com/merchant_a/p/123",
        "Merchant A",
        review,
      ),
    ).toBeUndefined();
    expect(() =>
      authorityReviewSchema.parse({
        version: 1,
        entries: [{ ...review.entries[0], account: undefined }],
      }),
    ).toThrow();
    expect(() =>
      matchingReview(final, "Merchant A", {
        version: 1,
        entries: [review.entries[0], review.entries[0]],
      }),
    ).toThrow(/Conflicting/);
  });
  it("uses segment-bounded review paths and cannot upgrade a publisher into an origin", async () => {
    const review = authorityReviewSchema.parse({
      version: 1,
      entries: [
        {
          merchant: "Merchant A",
          host: "confirmgood.com",
          path: "/merchant",
          authority: "primary",
          source_kind: "merchant_website",
          evidence_note: "Test fixture assertion",
        },
      ],
    });
    expect(
      matchingReview(
        "https://confirmgood.com/merchant-other",
        "Merchant A",
        review,
      ),
    ).toBeUndefined();
    const result = await audit(
      [post()],
      transport("https://confirmgood.com/merchant"),
      review,
    );
    expect(result.audit.records[0]).toMatchObject({
      authority: "unknown",
      source_origin_status: "intermediate",
    });
  });
  it("resolves a shared short URL only once while preserving both associations", async () => {
    const network = transport();
    const result = await audit([post(1), post(2)], network);
    expect(network.request).toHaveBeenCalledTimes(2); // one short hop plus one final hop
    expect(result.resolvedLinks).toHaveLength(1);
    expect(result.audit.records).toHaveLength(2);
    expect(new Set(result.audit.records.map((r) => r.signal_id)).size).toBe(2);
    expect(result.audit.summary.resolved_shortlinks).toBe(1);
    expect(result.audit.summary.adapter_family_concentration).toEqual({
      merchant_campaign_page: 2,
    });
  });
  it("preserves intermediate hops before a direct candidate and surfaces Kris+", async () => {
    const final = "https://app.krisplus.com/campaign/50-off";
    const middle = "https://redirect.example/campaign";
    const result = await audit([post()], transport(final, middle));
    expect(result.audit.records[0]).toMatchObject({
      destination_class: "app_or_deep_link",
      redirect_chain: [short, middle, final],
      adapter_family: "app_deep_link",
      authority: "unknown",
    });
    expect(result.audit.summary.app_deep_link_candidates).toBe(1);
  });
  it.each([
    [
      "https://www.google.com/url?q=https://merchant.example/",
      "link_hub",
      "intermediate",
    ],
    [
      "https://app.happypointcard.com.sg/?utm_source=telegram",
      "app_or_deep_link",
      "needs_authority_review",
    ],
  ])(
    "observes captured wrapper/app topology for %s",
    async (url, kind, status) => {
      const result = await audit([post()], transport(url));
      expect(result.audit.records[0]).toMatchObject({
        destination_class: kind,
        source_origin_status: status,
        authority: "unknown",
      });
    },
  );
  it("never substitutes neighboring roundup links for an unresolved offer origin", async () => {
    const bad = "http://bit.ly/unavailable";
    const source = post(
      1,
      `1. Merchant A: 50% off Lunch\nMore info: ${short}\n2. Merchant B: 50% off Dinner\nMore info: ${bad}`,
    );
    const cache = new SourceRedirectCache({
      [short]: {
        originalUrl: short,
        finalUrl: merchant,
        redirectChain: [short, merchant],
        checkedAt: checked,
        status: "resolved",
        reason: null,
        httpStatus: 200,
      },
      [bad]: {
        originalUrl: bad,
        finalUrl: null,
        redirectChain: [bad],
        checkedAt: checked,
        status: "failed",
        reason: "http_403",
        httpStatus: 403,
      },
    });
    const result = await audit([source], transport(), undefined, cache, true);
    expect(result.audit.records).toHaveLength(4);
    expect(result.audit.summary).toMatchObject({
      parsed_promotion_signals: 2,
      direct_or_authoritative_candidates: 1,
      unresolved_signals: 1,
      source_post_context_link_records: 2,
    });
    expect(result.audit.summary.destination_class_counts).toEqual({
      merchant_web_candidate: 1,
      unknown: 1,
    });
    expect(result.audit.summary.adapter_family_concentration).toEqual({
      merchant_campaign_page: 1,
      unresolved: 1,
    });
  });
  it.each(["loop", "timeout", "private_dns", "app_scheme"])(
    "retains %s failures and still completes",
    async (mode) => {
      const network: ResolverTransport = {
        lookup: async () =>
          mode === "timeout"
            ? new Promise(() => {})
            : [
                {
                  address:
                    mode === "private_dns" ? "127.0.0.1" : "93.184.216.34",
                  family: 4,
                },
              ],
        request: async () => ({
          status: 302,
          location: mode === "app_scheme" ? "krisplus://campaign/1" : short,
        }),
      };
      const result = await audit([post()], network);
      expect(result.audit.records[0].resolution_status).toBe(
        ["private_dns", "app_scheme"].includes(mode) ? "blocked" : "failed",
      );
      expect(result.audit.records[0].resolution_reason).toBe(
        {
          loop: "redirect_loop",
          timeout: "total_timeout",
          private_dns: "non_public_dns_address",
          app_scheme: "unsupported_scheme",
        }[mode],
      );
      expect(result.audit.summary.unresolved_signals).toBe(1);
      expect(result.audit.summary.unresolved_shortlinks).toBe(1);
      expect(result.audit.records[0].source_origin_status).toBe("unresolved");
      if (mode === "app_scheme")
        expect(result.audit.records[0].destination_class).toBe(
          "app_or_deep_link",
        );
    },
  );
  it("retains editorial shoutouts and product launches but excludes them from denominators/network", async () => {
    const network = transport();
    const result = await audit(
      [
        post(
          1,
          `6 Good Thai Food Spots in Orchard\n1. A\n2. B\nMore info: ${short}\n#shoutout`,
        ),
        post(2, `LiHO: New product launch\nMore info: ${short}`),
      ],
      network,
    );
    expect(result.audit.summary).toMatchObject({
      input_posts: 2,
      non_offer_signals: 2,
      parsed_promotion_signals: 0,
      signals_with_outbound_links: 0,
      resolved_shortlinks: 0,
      direct_or_authoritative_candidates: 0,
    });
    expect(
      result.audit.records.every(
        (r) => r.source_origin_status === "non_offer_signal",
      ),
    ).toBe(true);
    expect(network.request).not.toHaveBeenCalled();
  });
  it("retains a no-outbound promotion source signal", async () => {
    const result = await audit([post(1, "Merchant A: 1-for-1 Lunch")]);
    expect(result.audit.records[0].source_origin_status).toBe(
      "no_outbound_source_signal",
    );
    expect(result.audit.summary.no_outbound_source_signals).toBe(1);
  });
  it("retains a launch labelled deals when the parser excludes every offer", async () => {
    const result = await audit([post(1, "Merchant A: Product launch #deals")]);
    expect(result.audit.summary).toMatchObject({
      input_posts: 1,
      non_offer_signals: 1,
      parsed_promotion_signals: 0,
    });
    expect(result.audit.records[0].title_hint).toContain("Product launch");
  });
  it("offline mode distinguishes missing resolution from a resolved unknown destination", async () => {
    const missing = await audit(
      [post()],
      transport(),
      undefined,
      undefined,
      true,
    );
    expect(missing.audit.records[0]).toMatchObject({
      source_origin_status: "unresolved",
      resolution_reason: "offline_cache_miss",
    });
    const cache = new SourceRedirectCache({
      [short]: {
        originalUrl: short,
        finalUrl: "https://merchant",
        redirectChain: [short, "https://merchant"],
        checkedAt: checked,
        status: "resolved",
        reason: null,
        httpStatus: 200,
      },
    });
    const unknown = await audit([post()], transport(), undefined, cache, true);
    expect(unknown.audit.records[0]).toMatchObject({
      source_origin_status: "unknown_destination",
      resolution_status: "resolved",
      destination_class: "unknown",
    });
    expect(unknown.audit.summary.unknown_destinations).toBe(1);
  });
  it("merges dates/channels, dedupes post identity, selects newest and retains prefix non-offers", async () => {
    const old = {
      ...post(1),
      input_file: "2026-09-29",
      published_at: "2026-09-29T00:00:00Z",
    };
    const edited = {
      ...old,
      input_file: "2026-09-30",
      text: "Merchant A: 50% off Lunch",
    };
    const other = {
      ...post(1, undefined, "tastesoulsg"),
      published_at: "2026-09-28T00:00:00Z",
    };
    const editorial = {
      ...post(2, "6 Good Thai Food Spots in Orchard #shoutout"),
      published_at: "2026-09-30T00:00:00Z",
    };
    const merged = mergePosts([edited, other, old, editorial]);
    expect(merged).toEqual([editorial, edited, other]);
    const sample = await sampleSignals(merged, 1);
    expect(sample.selected.map((s) => s.signal_class)).toEqual([
      "non_offer_signal",
      "promotion_signal",
    ]);
    expect(() =>
      mergePosts([post(), { ...post(2), input_mode: "one_off_refresh" }]),
    ).toThrow(/Mixed/);
    expect(() =>
      parseRaw('{"posts":[{"channel":"other"}]}', "bad", "frozen_local"),
    ).toThrow();
  });
  it("produces byte-stable artifacts and leaves frozen tree, cache input and production registry unchanged", async () => {
    const root = await fixtureRoot();
    const protectedRoot = join(root, ".local/source-discovery-service");
    const before = await treeHash(protectedRoot);
    const registryBefore = await readFile(
      join(root, "data/merchant-source-registry.json"),
      "utf8",
    );
    const cachePath = join(root, "fixture-cache.json");
    await new SourceRedirectCache({
      [short]: {
        originalUrl: short,
        finalUrl: merchant,
        redirectChain: [short, merchant],
        checkedAt: checked,
        status: "resolved",
        reason: null,
        httpStatus: 200,
      },
    }).write(cachePath);
    const cacheBefore = await readFile(cachePath, "utf8");
    const results = [];
    for (const run of ["first", "second"])
      results.push(
        await runAudit({
          repoRoot: root,
          sample: 50,
          offline: true,
          cache: cachePath,
          output: join(root, `.local/source-origin-audit/${run}`),
        }),
      );
    for (const name of [
      "audit.json",
      "signals.json",
      "resolved-links.json",
      "report.md",
      "report.csv",
    ])
      expect(await readFile(join(results[0].output, name), "utf8")).toBe(
        await readFile(join(results[1].output, name), "utf8"),
      );
    expect(await treeHash(protectedRoot)).toBe(before);
    expect(
      await readFile(join(root, "data/merchant-source-registry.json"), "utf8"),
    ).toBe(registryBefore);
    expect(await readFile(cachePath, "utf8")).toBe(cacheBefore);
    expect(
      (await frozenPosts(join(root, ".local/source-discovery-service/runs")))
        .length,
    ).toBe(1);
    expect(markdownReport(results[0].audit)).toContain(
      "adapter_family_concentration",
    );
    expect(csvReport(results[0].audit)).toContain('"signal_id"');
    await expect(
      runAudit({
        repoRoot: root,
        sample: 50,
        offline: true,
        output: results[0].output,
      }),
    ).rejects.toThrow();
  });
  it("one-off refresh replaces frozen inputs, preserves evidence and cannot run offline", async () => {
    const root = await fixtureRoot(),
      protectedRoot = join(root, ".local/source-discovery-service");
    const before = await treeHash(protectedRoot);
    const collect = vi.fn(async (channel: "sgfooddeals" | "tastesoulsg") => ({
      data: {
        source: channel,
        complete: true as const,
        coverageStart: checked,
        completeThrough: checked,
        posts: [
          {
            messageId: 99,
            publishedAt: checked,
            text: "Merchant A: 1-for-1 Lunch",
            candidates: [],
          },
        ],
      },
      pages: 1,
      unavailableActivePosts: [],
      coverage: "fixture",
    }));
    const result = await runAudit({
      repoRoot: root,
      sample: 50,
      refresh: true,
      collect,
      now: new Date(checked),
    });
    expect(collect).toHaveBeenCalledTimes(2);
    expect(
      result.audit.records.every(
        (r) =>
          r.telegram_message_id === 99 && r.input_mode === "one_off_refresh",
      ),
    ).toBe(true);
    expect(result.audit.provenance.input_mode).toBe("one_off_refresh");
    expect(await treeHash(protectedRoot)).toBe(before);
    await expect(
      runAudit({
        repoRoot: root,
        sample: 50,
        refresh: true,
        offline: true,
        collect,
      }),
    ).rejects.toThrow(/Refresh/);
  });
  it("rejects output into protected trees, traversal and symlink aliases before mutations", async () => {
    const root = await fixtureRoot();
    await expect(
      assertResearchOutput(
        root,
        join(root, ".local/source-discovery-service/new"),
      ),
    ).rejects.toThrow(/child/);
    await mkdir(join(root, ".local/source-origin-audit"));
    await symlink(
      join(root, ".local/source-discovery-service"),
      join(root, ".local/source-origin-audit/alias"),
    );
    await expect(
      assertResearchOutput(
        root,
        join(root, ".local/source-origin-audit/alias/new"),
      ),
    ).rejects.toThrow(/symlinked/);
    await expect(
      assertResearchOutput(
        root,
        join(
          root,
          ".local/source-origin-audit/../source-discovery-service/new",
        ),
      ),
    ).rejects.toThrow(/child/);
  });
  it("has no runtime import path to ingestion runner, monitor worker or DB persistence", async () => {
    const visited = new Set<string>();
    async function inspect(file: string) {
      file = resolve(file);
      if (visited.has(file)) return;
      visited.add(file);
      expect(file).not.toMatch(
        /(?:\/server\/|\/db\/|\/database\/|\/runner\.ts$|\/worker\.ts$|\/source-monitor\/|\/migrate\.ts$)/,
      );
      const source = await readFile(file, "utf8");
      expect(source).not.toMatch(
        /from\s+["'](?:pg|@supabase\/supabase-js)["']|import\s*\(/,
      );
      for (const match of source.matchAll(
        /(?:import|export)\s+(?!type\b)[\s\S]*?\bfrom\s*["']([^"']+)["']/g,
      )) {
        if (match[1].startsWith("."))
          await inspect(join(dirname(file), `${match[1]}.ts`));
      }
    }
    await inspect("scripts/research/source-origin-audit.ts");
    expect([...visited]).toContain(
      resolve("src/ingestion/source-evidence/resolver.ts"),
    );
    expect([...visited]).toContain(
      resolve("src/ingestion/source-evidence/links.ts"),
    );
  });
});
