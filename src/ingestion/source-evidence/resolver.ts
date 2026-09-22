import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import type { LookupFunction } from "node:net";
import { normalizeUrl } from "./links";
import type { ResolvedSourceLink } from "./types";

const denied = new BlockList();
for (const [ip, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const)
  denied.addSubnet(ip, prefix, "ipv4");
for (const [ip, prefix] of [
  ["2001::", 23],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["3fff::", 20],
] as const)
  denied.addSubnet(ip, prefix, "ipv6");
// Azure platform virtual IP is publicly numbered but is not a public web destination.
denied.addAddress("168.63.129.16", "ipv4");
const globalV6 = new BlockList();
globalV6.addSubnet("2000::", 3, "ipv6");
export function publicAddress(address: string): boolean {
  const family = isIP(address);
  return family === 4
    ? !denied.check(address, "ipv4")
    : family === 6 &&
        globalV6.check(address, "ipv6") &&
        !denied.check(address, "ipv6");
}
class Blocked extends Error {}
export function validateTarget(value: string): URL {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol))
    throw new Blocked("unsupported_scheme");
  if (url.username || url.password) throw new Blocked("embedded_credentials");
  if (url.port) throw new Blocked("non_default_port");
  const host = url.hostname
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "")
    .toLowerCase();
  if (
    host === "localhost" ||
    /\.(?:localhost|local|internal|test|invalid)$/.test(host) ||
    (!host.includes(".") && !isIP(host))
  )
    throw new Blocked("non_public_hostname");
  if (isIP(host) && !publicAddress(host))
    throw new Blocked("non_public_address");
  return url;
}
export interface HopResponse {
  status: number;
  location?: string;
}
export interface ResolverTransport {
  lookup(host: string): Promise<{ address: string; family: number }[]>;
  request(
    url: URL,
    method: "HEAD" | "GET",
    address: { address: string; family: number },
    signal: AbortSignal,
  ): Promise<HopResponse>;
}
/** No body is consumed. Pin DNS, retain original hostname for TLS/Host, never follow redirects here. */
export const nodeTransport: ResolverTransport = {
  lookup: (host) => lookup(host, { all: true, verbatim: true }),
  request: (url, method, address, signal) =>
    new Promise((resolve, reject) => {
      const pinned: LookupFunction = (_host, options, callback) => {
        if (options.all) callback(null, [address]);
        else callback(null, address.address, address.family);
      };
      const req = (url.protocol === "https:" ? httpsRequest : httpRequest)(
        url,
        {
          method,
          signal,
          agent: false,
          lookup: pinned,
          maxHeaderSize: 16384,
          headers:
            method === "GET"
              ? { Range: "bytes=0-1023", "Accept-Encoding": "identity" }
              : { "Accept-Encoding": "identity" },
        },
        (response) => {
          resolve({
            status: response.statusCode ?? 0,
            location: response.headers.location,
          });
          response.destroy();
          req.destroy();
        },
      );
      req.on("error", reject);
      req.end();
    }),
};
function bounded<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(new Error("total_timeout"));
    if (signal.aborted) return abort();
    signal.addEventListener("abort", abort, { once: true });
    promise
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", abort));
  });
}
export class SourceLinkResolver {
  constructor(
    private allowedUrls: ReadonlySet<string>,
    private transport: ResolverTransport = nodeTransport,
    private now = () => new Date().toISOString(),
    private timeoutMs = 10000,
    private maxRedirects = 5,
  ) {}
  async resolve(originalUrl: string): Promise<ResolvedSourceLink> {
    const result: ResolvedSourceLink = {
      originalUrl,
      finalUrl: null,
      redirectChain: [],
      checkedAt: this.now(),
      status: "failed",
      reason: null,
      httpStatus: null,
    };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      if (!this.allowedUrls.has(originalUrl))
        throw new Blocked("not_curated_outbound_link");
      let current = originalUrl;
      const visited = new Set<string>();
      for (let hops = 0; ; hops++) {
        result.redirectChain.push(current);
        const url = validateTarget(current);
        current = normalizeUrl(url.href);
        if (visited.has(current)) throw new Error("redirect_loop");
        visited.add(current);
        if (hops > this.maxRedirects) throw new Blocked("redirect_limit");
        const host = url.hostname.replace(/^\[|\]$/g, "");
        const addresses = isIP(host)
          ? [{ address: host, family: isIP(host) }]
          : await bounded(this.transport.lookup(host), controller.signal);
        if (!addresses.length) throw new Error("dns_no_addresses");
        if (
          addresses.some(
            (a) => !publicAddress(a.address) || isIP(a.address) !== a.family,
          )
        )
          throw new Blocked("non_public_dns_address");
        controller.signal.throwIfAborted();
        let response = await bounded(
          this.transport.request(url, "HEAD", addresses[0], controller.signal),
          controller.signal,
        );
        if ([405, 501].includes(response.status)) {
          controller.signal.throwIfAborted();
          response = await bounded(
            this.transport.request(url, "GET", addresses[0], controller.signal),
            controller.signal,
          );
        }
        result.httpStatus = response.status;
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          if (!response.location) throw new Error("redirect_missing_location");
          current = new URL(response.location, url).href;
          continue;
        }
        if (response.status < 200 || response.status >= 300)
          throw new Error(`http_${response.status}`);
        result.finalUrl = current;
        result.status = "resolved";
        return result;
      }
    } catch (error) {
      result.status = error instanceof Blocked ? "blocked" : "failed";
      result.reason = controller.signal.aborted
        ? "total_timeout"
        : error instanceof Error
          ? error.message
          : "resolution_failed";
      return result;
    } finally {
      clearTimeout(timer);
    }
  }
}
