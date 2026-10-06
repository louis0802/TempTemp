import { readFile } from "node:fs/promises";
import {
  PepperOutletProvider,
  pepperOutletUrl,
} from "../direct-sources/adapters/pepper-outlets";
import { ShakeShackOutletProvider } from "../direct-sources/adapters/shake-shack-outlets";
import { GourmetCarouselVenueProvider } from "../direct-sources/adapters/gourmet-carousel-outlets";
import { fixtureTransport } from "../direct-sources/fixtures";
import type {
  MerchantOutletProvider,
  ScopeResolution,
} from "../resolution/types";

/** Offline build only: captured providers cannot fall through to live transport. */
export async function capturedMvpDirectoryProviders() {
  const pepperMetadata = JSON.parse(
    await readFile(
      "tests/fixtures/direct-sources/pepper-outlets.metadata.json",
      "utf8",
    ),
  );
  const pepperBody = await readFile(
    "tests/fixtures/direct-sources/pepper-outlets.html",
  );
  const shake = await fixtureTransport(
    "tests/fixtures/direct-sources/shake-shack/manifest.json",
  );
  const gourmet = await fixtureTransport(
    "tests/fixtures/direct-sources/gourmet-carousel/manifest.json",
  );
  const preserveCapture = (
    provider: MerchantOutletProvider,
    at: string,
  ): MerchantOutletProvider => ({
    supports: (m) => provider.supports(m),
    getSingaporeBranches: async (m) => {
      const snapshot = await provider.getSingaporeBranches(m);
      return {
        ...snapshot,
        pages: snapshot.pages.map((p) => ({ ...p, checkedAt: at })),
        branches: snapshot.branches.map((b) => ({
          ...b,
          existenceEvidence: b.existenceEvidence.map((e) => ({
            ...e,
            checkedAt: at,
          })),
        })),
      };
    },
  });
  const shakeProvider = preserveCapture(
    new ShakeShackOutletProvider(shake.transport),
    shake.observedAt,
  );
  const gourmetProvider = preserveCapture(
    new GourmetCarouselVenueProvider(gourmet.transport),
    gourmet.observedAt,
  );
  return (scope: ScopeResolution): MerchantOutletProvider[] => [
    preserveCapture(
      new PepperOutletProvider(scope.raw || null, async (url) => {
        if (url.href !== pepperOutletUrl)
          throw new Error("uncaptured_official_directory_url");
        return {
          status: 200,
          headers: { "content-type": "text/html" },
          body: pepperBody,
        };
      }),
      pepperMetadata.capturedAt,
    ),
    shakeProvider,
    gourmetProvider,
  ];
}
