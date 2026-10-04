import { readFile } from "node:fs/promises";
import { runDirectSource } from "@/ingestion/direct-sources/runner";
import { sourceDefinition } from "@/ingestion/direct-sources/registry";
import { fixtureTransport } from "@/ingestion/direct-sources/fixtures";
import { createDirectOutletResolver } from "@/ingestion/direct-sources/outlet-resolution";
import {
  PepperOutletProvider,
  pepperOutletUrl,
} from "@/ingestion/direct-sources/adapters/pepper-outlets";

/** Captured source replay; injected scope/edits are synthetic test scenarios, never operational data. */
export async function capturedPepperRun(
  options: {
    complete?: boolean;
    observedAt?: string;
    edit?: (body: string, url: URL) => string;
  } = {},
) {
  const fixture = await fixtureTransport(
    "tests/fixtures/direct-sources/manifest.json",
  );
  return runDirectSource(sourceDefinition("pepper_lunch_sg"), {
    mode: "fixture",
    observedAt: options.observedAt ?? fixture.observedAt,
    transport: async (url, signal, maxBytes) => {
      const response = await fixture.transport(url, signal, maxBytes);
      let body = response.body.toString("utf8");
      if (options.complete && url.pathname !== "/promo/")
        body = body
          .replace(
            "Available from 1 September",
            "Available only at JEM.<br>Available from 1 September",
          )
          .replace(
            "Enjoy sizzling Australian Chilled Beef MB2+ Steak Bites served on a hot teppan with rice, miso soup, and your choice of side dish from just $9.90.",
            "Enjoy savings of up to 32% off for a limited time only.",
          );
      body = options.edit?.(body, url) ?? body;
      return { ...response, body: Buffer.from(body) };
    },
  });
}
export function capturedOutletResolver() {
  return createDirectOutletResolver({
    providers: [
      new PepperOutletProvider(null, async (url) => {
        if (url.href !== pepperOutletUrl)
          throw new Error("No live directory in tests");
        return {
          status: 200,
          headers: { "content-type": "text/html" },
          body: await readFile(
            "tests/fixtures/direct-sources/pepper-outlets.html",
          ),
        };
      }),
    ],
    places: {
      resolve: async (_merchant, branch) => ({
        address: branch.address,
        lat: 1.333292,
        lng: 103.743371,
        coordinatePrecision: "building",
        coordinateEvidence: [
          {
            url: "https://www.onemap.gov.sg/",
            checkedAt: "2026-09-30T14:00:00.000Z",
            summary: "Synthetic test coordinates; no live geocoding.",
          },
        ],
      }),
    },
  });
}

/** Complete bounded acquisition, separate from the historical twenty-detail evidence. */
export const completeShakeManifest =
  "tests/fixtures/direct-sources/shake-shack/complete-2026-10-01-network-enabled/manifest.json";
export async function capturedShakeRun() {
  return runDirectSource(sourceDefinition("shake_shack_sg"), {
    ...(await fixtureTransport(completeShakeManifest)),
    mode: "fixture",
  });
}
export async function capturedShakeOutletResolver() {
  const { ShakeShackOutletProvider } =
    await import("@/ingestion/direct-sources/adapters/shake-shack-outlets");
  const fixture = await fixtureTransport(
    "tests/fixtures/direct-sources/shake-shack/manifest.json",
  );
  return createDirectOutletResolver({
    providers: [new ShakeShackOutletProvider(fixture.transport)],
    places: {
      resolve: async (_merchant, branch) => ({
        address: branch.address,
        lat: 1.3,
        lng: 103.8,
        coordinatePrecision: "building",
        coordinateEvidence: [
          {
            url: "https://maps.google.com",
            checkedAt: fixture.observedAt,
            summary: "Synthetic fixture coordinates only; no live geocoding.",
          },
        ],
      }),
    },
  });
}
