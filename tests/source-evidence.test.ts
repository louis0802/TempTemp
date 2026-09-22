import { describe, it, expect, vi } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { extractLinks } from "../src/ingestion/source-evidence/links";
import { classifySource } from "../src/ingestion/source-evidence/registry";
import {
  SourceLinkResolver,
  publicAddress,
  type ResolverTransport,
  type HopResponse,
} from "../src/ingestion/source-evidence/resolver";
import { SourceRedirectCache } from "../src/ingestion/source-evidence/cache";
import {
  createSignals,
  buildSourceEvidence,
} from "../src/ingestion/source-evidence/pipeline";
import { readCorpus } from "../src/ingestion/mvp/corpus";
import type { SourceRegistry } from "../src/ingestion/source-evidence/types";
const checkedAt = "2026-09-22T00:00:00.000Z";
const original = "https://short.example/a";
const final = "https://merchant.example/promo";
const registry: SourceRegistry = {
  version: 1,
  merchants: {
    "merchant a": {
      primaryDomains: ["merchant.example"],
      primarySocialAccounts: [{ host: "instagram.com", account: "merchant_a" }],
      secondaryDomains: [{ host: "mall.example", kind: "mall_website" }],
    },
  },
};
function fixture(
  responses: Record<string, HopResponse> = {
    [original]: { status: 302, location: final },
    [final]: { status: 200 },
  },
) {
  return {
    lookup: vi.fn(async () => [{ address: "93.184.216.34", family: 4 }]),
    request: vi.fn(async (url: URL) => {
      const response = responses[url.href];
      if (!response) throw new Error("fixture_missing");
      return response;
    }),
  };
}
function resolver(
  transport: ResolverTransport,
  allowed = [original],
  timeout = 1000,
) {
  return new SourceLinkResolver(
    new Set(allowed),
    transport,
    () => checkedAt,
    timeout,
  );
}
describe("source links", () => {
  it("collapses bare/explicit duplicates and retains original evidence; removes self/channel links", () => {
    const links = extractLinks(
      "tco.sg/abc (http://tco.sg/abc) https://t.me/sgfooddeals https://t.me/sgfooddeals/42 ftp://bad.example/a mailto:user@bad.example/a",
      "https://t.me/sgfooddeals/42",
    );
    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({
      normalizedUrl: "http://tco.sg/abc",
      originalRepresentations: ["tco.sg/abc", "http://tco.sg/abc"],
    });
  });
  it("preserves query distinctions, path case and explicit scheme distinctions", () => {
    expect(
      extractLinks(
        "https://a.example/A?q=1 https://a.example/A?q=2 http://a.example/A?q=1 https://a.example/a?q=1",
        "https://t.me/sgfooddeals/42",
      ),
    ).toHaveLength(4);
  });
});
it("separates adjacent Telegram export link wrappers", () => {
  const links = extractLinks(
    "(http://tco.sg/first)tco.sg/second (http://tco.sg/second) (https://tco.sg/third)Cai-Cai",
    "https://t.me/sgfooddeals/42",
  );
  expect(links.map((l) => l.normalizedUrl)).toEqual([
    "http://tco.sg/first",
    "http://tco.sg/second",
    "https://tco.sg/third",
  ]);
});
describe("authority", () => {
  it("requires exact merchant ownership, handles social account isolation and known discovery", () => {
    expect(classifySource(final, "Merchant A", registry).authority).toBe(
      "primary",
    );
    for (const url of [
      final.replace("merchant.example", "merchant.example.evil.com"),
      "https://unregistered.example/promo",
    ])
      expect(classifySource(url, "Merchant A", registry).authority).toBe(
        "unknown",
      );
    expect(classifySource(final, "Merchant B", registry).authority).toBe(
      "unknown",
    );
    expect(
      classifySource("https://mall.example/promo", "Merchant A", registry)
        .authority,
    ).toBe("strong_secondary");
    expect(
      classifySource("https://mall.example/promo", "Merchant B", registry)
        .authority,
    ).toBe("unknown");
    for (const channel of ["sgfooddeals", "tastesoulsg"])
      expect(
        classifySource(`https://t.me/${channel}/123`, "Merchant A", registry)
          .authority,
      ).toBe("discovery");
    expect(
      classifySource("https://eatbook.sg/promo", "Merchant A", registry)
        .authority,
    ).toBe("discovery");
    expect(
      classifySource(
        "https://instagram.com/merchant_a/p/123",
        "Merchant A",
        registry,
      ).authority,
    ).toBe("primary");
    for (const path of ["other_account", "merchant_a_evil", "p/123"])
      expect(
        classifySource(`https://instagram.com/${path}`, "Merchant A", registry)
          .authority,
      ).toBe("unknown");
    expect(
      classifySource(
        "https://merchant.example@evil.com/promo",
        "Merchant A",
        registry,
      ).authority,
    ).toBe("unknown");
  });
});
describe("safe redirects", () => {
  it("preserves original, chain, fixed timestamp and pins a public DNS answer", async () => {
    const transport = fixture();
    expect(await resolver(transport).resolve(original)).toMatchObject({
      originalUrl: original,
      finalUrl: final,
      redirectChain: [original, final],
      checkedAt,
      status: "resolved",
    });
    expect(transport.request.mock.calls[0][0].href).toBe(original);
  });
  it("rejects URLs not in the curated allowlist without DNS/network", async () => {
    const transport = fixture();
    expect((await resolver(transport, []).resolve(original)).reason).toBe(
      "not_curated_outbound_link",
    );
    expect(transport.lookup).not.toHaveBeenCalled();
    expect(transport.request).not.toHaveBeenCalled();
  });
  it.each([
    "http://localhost/a",
    "http://foo.localhost/a",
    "http://127.0.0.1/a",
    "http://[::1]/a",
    "http://10.1.2.3/a",
    "http://172.16.0.1/a",
    "http://192.168.1.1/a",
    "http://169.254.169.254/a",
    "http://168.63.129.16/a",
    "http://169.254.1.2/a",
    "http://100.100.100.200/a",
    "http://0.0.0.0/a",
    "http://[fc00::1]/a",
    "http://[fe80::1]/a",
    "http://[::ffff:127.0.0.1]/a",
    "http://2130706433/a",
    "http://0177.0.0.1/a",
    "https://user:pass@public.example/a",
    "file:///etc/passwd",
    "https://public.example:8080/a",
  ])("blocks %s before network, including redirect hops", async (target) => {
    const transport = fixture({
      [original]: { status: 302, location: target },
    });
    expect((await resolver(transport, [target]).resolve(target)).status).toBe(
      "blocked",
    );
    expect(transport.request).not.toHaveBeenCalled();
    const result = await resolver(transport).resolve(original);
    expect(result.status).toBe("blocked");
    expect(result.redirectChain).toHaveLength(2);
    expect(transport.request).toHaveBeenCalledTimes(1);
  });
  it("rejects mixed DNS answers and DNS rebinding destinations without a request", async () => {
    const transport = fixture();
    transport.lookup.mockResolvedValue([
      { address: "93.184.216.34", family: 4 },
      { address: "10.0.0.1", family: 4 },
    ]);
    expect((await resolver(transport).resolve(original)).reason).toBe(
      "non_public_dns_address",
    );
    expect(transport.request).not.toHaveBeenCalled();
  });
  it("passes the validated address to each request and uses no second DNS result", async () => {
    const request = vi.fn(async () => ({ status: 200 }));
    const lookup = vi
      .fn()
      .mockResolvedValueOnce([{ address: "93.184.216.34", family: 4 }])
      .mockResolvedValue([{ address: "127.0.0.1", family: 4 }]);
    expect((await resolver({ lookup, request }).resolve(original)).status).toBe(
      "resolved",
    );
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0]).toEqual([
      new URL(original),
      "HEAD",
      { address: "93.184.216.34", family: 4 },
      expect.any(AbortSignal),
    ]);
  });
  it("bounds loops and redirect count", async () => {
    expect(
      (
        await resolver(
          fixture({ [original]: { status: 302, location: original } }),
        ).resolve(original)
      ).reason,
    ).toBe("redirect_loop");
    const transport = fixture(
      Object.fromEntries(
        Array.from({ length: 8 }, (_, i) => [
          `https://short.example/${i}`,
          { status: 302, location: `/${i + 1}` },
        ]),
      ),
    );
    expect(
      (
        await resolver(transport, ["https://short.example/0"]).resolve(
          "https://short.example/0",
        )
      ).reason,
    ).toBe("redirect_limit");
    expect(transport.request).toHaveBeenCalledTimes(6);
  });
  it("falls back only for unsupported HEAD and records HTTP errors", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({ status: 405 })
      .mockResolvedValueOnce({ status: 200 });
    expect(
      (await resolver({ lookup: fixture().lookup, request }).resolve(original))
        .status,
    ).toBe("resolved");
    expect(request.mock.calls.map((c) => c[1])).toEqual(["HEAD", "GET"]);
    const transport = fixture({ [original]: { status: 403 } });
    expect((await resolver(transport).resolve(original)).reason).toBe(
      "http_403",
    );
    expect(transport.request).toHaveBeenCalledTimes(1);
  });
  it("bounds DNS and response waiting with one total deadline", async () => {
    const transport = fixture();
    transport.lookup.mockImplementation(() => new Promise(() => {}));
    expect(
      (await resolver(transport, [original], 10).resolve(original)).reason,
    ).toBe("total_timeout");
    expect(transport.request).not.toHaveBeenCalled();
    const pending = {
      lookup: fixture().lookup,
      request: vi.fn(() => new Promise<HopResponse>(() => {})),
    };
    expect(
      (await resolver(pending, [original], 10).resolve(original)).reason,
    ).toBe("total_timeout");
  });
  it.each([
    "100.64.0.1",
    "192.0.2.1",
    "198.18.0.1",
    "224.0.0.1",
    "255.255.255.255",
    "2001:db8::1",
    "2002:7f00:1::",
    "3fff::1",
    "64:ff9b::7f00:1",
  ])("rejects special non-public address %s", (address) =>
    expect(publicAddress(address)).toBe(false),
  );
});
describe("signals, cache and artifact", () => {
  it.each([
    ["primary", final, "primary_found"],
    [
      "strong_secondary",
      "https://mall.example/promo",
      "strong_secondary_found",
    ],
  ] as const)(
    "roundup %s authority applies only to the offer containing the link",
    async (authority, destination, expectedState) => {
      // Same merchant, different offers: ownership alone must not imply campaign relevance.
      const signals = await createSignals([
        {
          url: "https://t.me/sgfooddeals/123",
          channel: "sgfooddeals",
          label: "Fixture roundup",
          publishedAt: checkedAt,
          text: `1. Merchant A: 1-for-1 lunch\nMore info: ${original}\n2. Merchant A: 50% off dinner`,
        },
      ]);
      expect(signals).toHaveLength(2);
      expect(signals.map((s) => s.outboundLinks[0].association)).toEqual([
        "offer",
        "source_post",
      ]);
      const transport = fixture({
        [original]: { status: 302, location: destination },
        [destination]: { status: 200 },
      });
      const result = await buildSourceEvidence(
        signals,
        registry,
        new SourceRedirectCache(),
        resolver(transport),
      );
      expect(result.records.map((r) => r.state)).toEqual([
        expectedState,
        "no_outbound_links",
      ]);
      for (const [index, record] of result.records.entries()) {
        expect(record.evidence[0]).toMatchObject({
          relation: "source_permalink",
          association: null,
        });
        expect(record.evidence[1]).toMatchObject({
          relation: "outbound_link",
          association: index === 0 ? "offer" : "source_post",
          authority,
          merchantMatch: "confirmed_registry",
          normalizedUrl: original,
          resolvedUrl: destination,
          redirectChain: [original, destination],
          resolutionStatus: "resolved",
          checkedAt,
          httpStatus: 200,
          reason: null,
        });
      }
      // The second offer's own evidence controls fallback, even with a stronger post-level source.
      const ownUrl = "https://unregistered.example/dinner";
      const withOwnLink = structuredClone(signals[1]);
      withOwnLink.outboundLinks.push({
        originalUrl: ownUrl,
        originalRepresentations: [ownUrl],
        normalizedUrl: ownUrl,
        association: "offer",
      });
      const cache = new SourceRedirectCache();
      await cache.resolve(original, resolver(transport));
      expect(
        (await buildSourceEvidence([withOwnLink], registry, cache)).records[0]
          .state,
      ).toBe("unresolved_links");
      await cache.resolve(
        ownUrl,
        resolver(fixture({ [ownUrl]: { status: 200 } }), [ownUrl]),
      );
      expect(
        (await buildSourceEvidence([withOwnLink], registry, cache)).records[0]
          .state,
      ).toBe("discovery_only");
    },
  );

  it("keeps Morganfield source identities, preserves hints and exposes shared fixture authority without merging", async () => {
    const sources = (await readCorpus()).filter((s) =>
      /\/(4902|4436)$/.test(s.url),
    );
    const signals = await createSignals(sources);
    expect(signals).toHaveLength(2);
    expect(new Set(signals.map((s) => s.id)).size).toBe(2);
    const f = JSON.parse(
      await readFile("tests/fixtures/source-evidence-redirects.json", "utf8"),
    );
    const cache = new SourceRedirectCache();
    const transport = fixture(f.responses);
    const before = JSON.stringify(signals);
    const first = await buildSourceEvidence(
      signals,
      f.registry,
      cache,
      resolver(
        transport,
        signals.flatMap((s) => s.outboundLinks.map((l) => l.normalizedUrl)),
      ),
    );
    expect(first.records.map((r) => r.state)).toEqual([
      "primary_found",
      "primary_found",
    ]);
    expect(first.records.map((r) => r.evidence[1].resolvedUrl)).toEqual([
      final,
      final,
    ]);
    expect(first.metrics.uniqueResolvedLinks).toBe(2);
    expect(JSON.stringify(signals)).toBe(before);
    const dir = await mkdtemp(join(tmpdir(), "source-cache-"));
    try {
      const path = join(dir, "cache.json");
      await cache.write(path);
      const second = await buildSourceEvidence(
        signals,
        f.registry,
        await SourceRedirectCache.read(path),
      );
      expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
  it("caches failures, reports misses and does not retry cached failures", async () => {
    const cache = new SourceRedirectCache();
    const transport = fixture({});
    expect((await cache.resolve(original)).status).toBe("unresolved");
    const failure = await cache.resolve(original, resolver(transport));
    expect(failure.status).toBe("failed");
    expect(await cache.resolve(original, resolver(transport))).toEqual(failure);
    expect(transport.request).toHaveBeenCalledTimes(1);
  });
  it("distinguishes post-level links and does not claim shared-footer relevance", async () => {
    const sources = await readCorpus();
    const signals = await createSignals(sources);
    expect(
      signals.some((s) =>
        s.outboundLinks.some((l) => l.association === "source_post"),
      ),
    ).toBe(true);
    expect(signals.every((s) => s.sourceAuthority === "discovery")).toBe(true);
    expect(new Set(signals.map((s) => s.id)).size).toBe(signals.length);
    const empty = await buildSourceEvidence(
      signals,
      { version: 1, merchants: {} },
      new SourceRedirectCache(),
    );
    expect(empty.metrics.sourcePosts).toBe(136);
    expect(empty.records.some((r) => r.state === "no_outbound_links")).toBe(
      true,
    );
    expect(empty.metrics.authorityEvidenceNodes.primary).toBe(0);
  });
});
