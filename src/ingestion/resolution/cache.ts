import { createHash } from "node:crypto";
export const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export interface Cached<T> {
  value: T;
  checkedAt: string;
  sourceUrl: string;
  sourceHash: string;
}
/** Bounded process cache; failures are never cached, concurrent requests coalesce. */
export class ResolutionCache {
  private entries = new Map<
    string,
    { expires: number; data: Cached<unknown> }
  >();
  private pending = new Map<string, Promise<Cached<unknown>>>();
  constructor(
    private now = () => Date.now(),
    private maxEntries = 1000,
  ) {}
  async get<T>(
    key: string,
    sourceUrl: string,
    ttlMs: number,
    fetcher: () => Promise<T>,
  ): Promise<Cached<T>> {
    const hit = this.entries.get(key);
    if (hit && hit.expires > this.now())
      return structuredClone(hit.data) as Cached<T>;
    const running = this.pending.get(key);
    if (running) return structuredClone(await running) as Cached<T>;
    const promise = (async () => {
      const value = await fetcher();
      const data = {
        value,
        checkedAt: new Date(this.now()).toISOString(),
        sourceUrl,
        sourceHash: digest(value),
      };
      if (this.entries.size >= this.maxEntries)
        this.entries.delete(this.entries.keys().next().value!);
      this.entries.set(key, { expires: this.now() + ttlMs, data });
      return data;
    })();
    this.pending.set(key, promise);
    try {
      return structuredClone(await promise);
    } finally {
      this.pending.delete(key);
    }
  }
}
export async function fetchText(
  url: string,
  init: RequestInit = {},
  fetcher: typeof fetch = fetch,
) {
  const response = await fetcher(url, {
    ...init,
    redirect: "error",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Provider HTTP ${response.status}`);
  const body = await response.text();
  if (body.length > 2_000_000) throw new Error("Provider response too large");
  return body;
}
