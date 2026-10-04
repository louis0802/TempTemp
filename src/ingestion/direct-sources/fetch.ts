import { load } from "cheerio";
import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import type { LookupFunction } from "node:net";
import { publicAddress, validateTarget } from "./network-target";
import { makeEvidence } from "./evidence";
import { assertSourceScope } from "./source-scope";
import type {
  DirectSourceDefinition,
  EvidenceRelation,
  FetchedPage,
} from "./types";

export const USER_AGENT =
  "PromotionAroundYou-DirectSourcePreview/1.0 (bounded public acquisition)";
export const DEFAULT_LIMITS = {
  maxRequests: 40,
  maxListingPages: 5,
  maxDetailPages: 20,
  maxEvidencePages: 8,
  maxBytes: 3_000_000,
  timeoutMs: 12_000,
  maxRedirects: 3,
};
export type FetchLimits = typeof DEFAULT_LIMITS;
export interface TransportResponse {
  status: number;
  headers: Record<string, string | undefined>;
  body: Buffer;
}
export type DirectTransport = (
  url: URL,
  signal: AbortSignal,
  maxBytes: number,
) => Promise<TransportResponse>;
export class AcquisitionFailure extends Error {
  constructor(
    code: string,
    readonly httpStatus: number,
    readonly contentType: string,
  ) {
    super(code);
  }
}
export const nodeBodyTransport: DirectTransport = async (
  url,
  signal,
  maxBytes,
) => {
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  signal.throwIfAborted();
  if (!addresses.length || addresses.some((a) => !publicAddress(a.address)))
    throw new Error("non_public_dns_address");
  return new Promise((resolve, reject) => {
    const address = addresses[0];
    const pinned: LookupFunction = (_host, options, callback) => {
      if (options.all) callback(null, [address]);
      else callback(null, address.address, address.family);
    };
    const req = (url.protocol === "https:" ? httpsRequest : httpRequest)(
      url,
      {
        method: "GET",
        signal,
        lookup: pinned,
        agent: false,
        maxHeaderSize: 16384,
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/pdf;q=0.9",
          "Accept-Encoding": "identity",
        },
      },
      (response) => {
        const headers = Object.fromEntries(
          Object.entries(response.headers).map(([key, value]) => [
            key,
            Array.isArray(value) ? value.join(", ") : value,
          ]),
        );
        const status = response.statusCode ?? 0;
        const fail = (code: string) => {
          response.destroy();
          req.destroy();
          reject(
            new AcquisitionFailure(code, status, headers["content-type"] ?? ""),
          );
        };
        if ([301, 302, 303, 307, 308].includes(status)) {
          response.destroy();
          req.destroy();
          resolve({ status, headers, body: Buffer.alloc(0) });
          return;
        }
        if (Number(headers["content-length"] ?? 0) > maxBytes) {
          fail("response_too_large");
          return;
        }
        if (
          headers["content-encoding"] &&
          headers["content-encoding"] !== "identity"
        ) {
          fail("unsupported_content_encoding");
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > maxBytes) fail("response_too_large");
          else chunks.push(chunk);
        });
        response.on("error", reject);
        response.on("end", () =>
          resolve({ status, headers, body: Buffer.concat(chunks) }),
        );
      },
    );
    req.on("error", reject);
    req.end();
  });
};

/** Remove only tracking metadata; preserve meaningful query parameters and path identity. */
export function canonicalUrl(value: string, base?: string): string {
  const url = validateTarget(new URL(value, base).href);
  url.hash = "";
  for (const key of [...url.searchParams.keys()])
    if (/^utm_/i.test(key) || ["fbclid", "gclid"].includes(key.toLowerCase()))
      url.searchParams.delete(key);
  url.searchParams.sort();
  return url.href;
}
export interface RequestAttempt {
  url: string;
  relation: EvidenceRelation;
  parentUrl: string | null;
  status: number | null;
  error: string | null;
  redirectTo: string | null;
}
export class BoundedDirectFetch {
  readonly attempts: RequestAttempt[] = [];
  private grants = new Map<
    string,
    { relation: EvidenceRelation; parentUrl: string | null }
  >();
  private pages = new Map<string, FetchedPage>();
  private counts = { listing: 0, detail: 0, evidence: 0 };
  readonly limits: FetchLimits;
  constructor(
    readonly source: DirectSourceDefinition,
    private transport: DirectTransport = nodeBodyTransport,
    private now = () => new Date().toISOString(),
    limits: Partial<FetchLimits> = {},
  ) {
    this.limits = { ...DEFAULT_LIMITS, ...source.acquisitionLimits };
    // Explicit boundary-test overrides may tighten, never expand registry/network limits.
    for (const key of Object.keys(limits) as (keyof FetchLimits)[]) {
      const value = limits[key];
      if (value !== undefined)
        this.limits[key] = Math.min(this.limits[key], value);
    }
    for (const value of Object.values(this.limits))
      if (!Number.isInteger(value) || value < 1)
        throw new Error("invalid_fetch_limit");
    for (const url of source.listingUrls)
      this.grants.set(this.checkHost(url), {
        relation: "listing",
        parentUrl: null,
      });
  }
  private checkHost(value: string): string {
    const url = canonicalUrl(value);
    if (!this.source.allowedHosts.includes(new URL(url).hostname))
      throw new Error("unregistered_host");
    assertSourceScope(this.source, url);
    return url;
  }
  /** Called only after DOM discovery from a successfully retrieved parent; not a traversal API. */
  private grantDiscovered(
    parent: FetchedPage,
    url: string,
    relation: EvidenceRelation,
  ): string {
    if (
      parent.evidence.sourceId !== this.source.id ||
      ![...this.pages.values()].includes(parent)
    )
      throw new Error("unknown_parent_evidence");
    if (
      parent.evidence.relation !== "listing" &&
      !["menu", "terms"].includes(relation)
    )
      throw new Error("recursive_detail_crawl_forbidden");
    const canonical = this.checkHost(url);
    if (!this.grants.has(canonical))
      this.grants.set(canonical, { relation, parentUrl: parent.evidence.url });
    return canonical;
  }
  discover(
    parent: FetchedPage,
    selector: string,
    relation: EvidenceRelation,
    accept: (url: URL) => boolean,
  ): string[] {
    if (
      parent.evidence.httpStatus !== 200 ||
      parent.evidence.contentType !== "text/html"
    )
      throw new Error("invalid_discovery_parent");
    const $ = load(parent.body.toString("utf8"));
    const urls: string[] = [];
    $(selector).each((_index, element) => {
      if (!("tagName" in element) || element.tagName !== "a") return;
      const href = $(element).attr("href");
      if (!href) return;
      const url = new URL(href, parent.evidence.url);
      if (accept(url))
        urls.push(this.grantDiscovered(parent, url.href, relation));
    });
    return [...new Set(urls)];
  }
  async fetch(value: string, relation: EvidenceRelation): Promise<FetchedPage> {
    const requestedUrl = this.checkHost(value);
    const grant = this.grants.get(requestedUrl);
    if (!grant || grant.relation !== relation)
      throw new Error("undiscovered_url");
    const key = `${relation}:${requestedUrl}`;
    const cached = this.pages.get(key);
    if (cached) {
      if (cached.evidence.httpStatus !== 200)
        throw new Error(`http_${cached.evidence.httpStatus}`);
      if (
        !["text/html", "application/pdf"].includes(cached.evidence.contentType)
      )
        throw new Error("unsupported_content_type");
      if (relation === "listing" && cached.evidence.contentType !== "text/html")
        throw new Error("listing_not_html");
      return cached;
    }
    const group =
      relation === "listing"
        ? "listing"
        : relation === "detail"
          ? "detail"
          : "evidence";
    const max =
      group === "listing"
        ? this.limits.maxListingPages
        : group === "detail"
          ? this.limits.maxDetailPages
          : this.limits.maxEvidencePages;
    if (this.counts[group] >= max) throw new Error(`${group}_page_limit`);
    this.counts[group]++;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.limits.timeoutMs);
    let current = requestedUrl;
    let attempt: RequestAttempt | undefined;
    const abort = new Promise<never>((_resolve, reject) =>
      controller.signal.addEventListener(
        "abort",
        () => reject(new Error("acquisition_timeout")),
        { once: true },
      ),
    );
    try {
      const visited = new Set<string>();
      for (let hops = 0; ; hops++) {
        current = this.checkHost(current);
        if (visited.has(current)) throw new Error("redirect_loop");
        visited.add(current);
        if (hops > this.limits.maxRedirects) throw new Error("redirect_limit");
        if (this.attempts.length >= this.limits.maxRequests)
          throw new Error("request_limit");
        attempt = {
          url: current,
          relation,
          parentUrl: hops ? this.attempts.at(-1)!.url : grant.parentUrl,
          status: null,
          error: null,
          redirectTo: null,
        };
        this.attempts.push(attempt);
        const response = await Promise.race([
          this.transport(
            new URL(current),
            controller.signal,
            this.limits.maxBytes,
          ),
          abort,
        ]);
        attempt.status = response.status;
        if (
          response.body.length > this.limits.maxBytes ||
          Number(response.headers["content-length"] ?? 0) > this.limits.maxBytes
        )
          throw new Error("response_too_large");
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          if (!response.headers.location)
            throw new Error("redirect_missing_location");
          attempt.redirectTo = canonicalUrl(response.headers.location, current);
          current = attempt.redirectTo;
          continue;
        }
        const contentType = (response.headers["content-type"] ?? "")
          .split(";")[0]
          .trim()
          .toLowerCase();
        const page = {
          evidence: makeEvidence(
            this.source.id,
            requestedUrl,
            current,
            relation,
            response.body,
            contentType,
            response.status,
            this.now(),
          ),
          body: response.body,
        };
        this.pages.set(key, page);
        if (response.status !== 200) throw new Error(`http_${response.status}`);
        if (!["text/html", "application/pdf"].includes(contentType))
          throw new Error("unsupported_content_type");
        if (relation === "listing" && contentType !== "text/html")
          throw new Error("listing_not_html");
        return page;
      }
    } catch (error) {
      if (attempt && error instanceof AcquisitionFailure)
        attempt.status = error.httpStatus;
      if (attempt)
        attempt.error = controller.signal.aborted
          ? "acquisition_timeout"
          : error instanceof Error
            ? error.message
            : "acquisition_failed";
      throw new Error(
        controller.signal.aborted
          ? "acquisition_timeout"
          : error instanceof Error
            ? error.message
            : "acquisition_failed",
      );
    } finally {
      clearTimeout(timer);
    }
  }
  get capturedPages(): FetchedPage[] {
    return [...this.pages.values()];
  }
}
