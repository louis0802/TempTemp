import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { nodeBodyTransport } from "../../../src/ingestion/direct-sources/fetch";
import { validateTarget } from "../../../src/ingestion/direct-sources/network-target";
import { instagramIdentity } from "../../../src/ingestion/direct-sources/source-scope";

/** One-off public research only. No cookies, authorization, API calls or challenge retries. */
export async function capturePublicPages(
  urls: readonly string[],
  output: string,
) {
  if (urls.length > 24) throw new Error("research_request_budget_exceeded");
  await mkdir(output, { recursive: false });
  const captures = [];
  for (const requested of [...new Set(urls)].sort()) {
    const u = validateTarget(requested);
    if (
      /(?:^|\.)instagram\.com$/.test(u.hostname) &&
      (!instagramIdentity(u.href) ||
        [...u.searchParams.keys()].some(
          (key) => !/^utm_/i.test(key) && !["hl", "img_index"].includes(key),
        ))
    )
      throw new Error("unsupported_public_social_path");
    if (
      u.protocol !== "https:" ||
      /\/(?:api|graphql|accounts|challenge)(?:\/|$)/i.test(u.pathname)
    )
      throw new Error("unsupported_research_endpoint");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const r = await nodeBodyTransport(u, controller.signal, 3_000_000);
      const sha256 = createHash("sha256").update(r.body).digest("hex");
      const file = `${sha256}.html`;
      // Redirect bodies are empty. Do not follow a redirect into login/challenge or another host.
      await writeFile(`${output}/${file}`, r.body);
      captures.push({
        requested_url: requested,
        url: requested,
        status: r.status,
        content_type: r.headers["content-type"] ?? null,
        redirect_to: r.headers.location
          ? new URL(r.headers.location, u).href
          : null,
        file,
        sha256,
        bytes: r.body.length,
        error: null,
      });
    } catch (e) {
      captures.push({
        requested_url: requested,
        url: requested,
        status: null,
        content_type: null,
        redirect_to: null,
        file: null,
        sha256: null,
        bytes: 0,
        error: e instanceof Error ? e.message : "public_transport_failure",
      });
    } finally {
      clearTimeout(timer);
    }
  }
  await writeFile(
    `${output}/manifest.json`,
    JSON.stringify(
      {
        version: 1,
        captured_at: new Date().toISOString(),
        transport:
          "public HTTPS GET; identity encoding; no cookies or authentication; no redirects followed",
        captures,
      },
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );
  return captures;
}
