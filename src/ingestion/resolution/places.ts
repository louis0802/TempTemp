import { z } from "zod";
import { ResolutionCache, fetchText } from "./cache";
import type { MerchantBranch, PlaceResolver, ResolvedPlace } from "./types";
const coordinates = z.object({
  lat: z.number().min(1.15).max(1.5),
  lng: z.number().min(103.6).max(104.1),
});
const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const googleUrl = "https://places.googleapis.com/v1/places:searchText";
const googleSchema = z.object({
  places: z
    .array(
      z.object({
        id: z.string(),
        displayName: z.object({ text: z.string() }),
        formattedAddress: z.string(),
        location: z.object({ latitude: z.number(), longitude: z.number() }),
        businessStatus: z.string(),
      }),
    )
    .default([]),
});
const oneMapSchema = z.object({
  totalNumPages: z.number(),
  results: z.array(
    z.object({
      ADDRESS: z.string(),
      POSTAL: z.string(),
      LATITUDE: z.string(),
      LONGITUDE: z.string(),
    }),
  ),
});
export class ApiPlaceResolver implements PlaceResolver {
  constructor(
    private cache: ResolutionCache,
    private config: { googleKey?: string; oneMapToken?: string } = {},
    private fetcher: typeof fetch = fetch,
  ) {}
  async resolve(
    merchant: string,
    branch: MerchantBranch,
  ): Promise<ResolvedPlace> {
    const key = `${normalize(merchant)}:${normalize(branch.name)}:${normalize(branch.address)}`;
    return (
      await this.cache.get(
        "branch:" + key,
        "https://www.onemap.gov.sg/",
        3600_000,
        () => this.lookup(merchant, branch, key),
      )
    ).value;
  }
  private async lookup(
    merchant: string,
    branch: MerchantBranch,
    key: string,
  ): Promise<ResolvedPlace> {
    if (this.config.googleKey) {
      // Transport failure can fall back; an explicit closure is a material conflict.
      const response = await this.cache
        .get("google:" + key, googleUrl, 3600_000, async () =>
          googleSchema.parse(
            JSON.parse(
              await fetchText(
                googleUrl,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "X-Goog-Api-Key": this.config.googleKey!,
                    "X-Goog-FieldMask":
                      "places.id,places.displayName,places.formattedAddress,places.location,places.businessStatus",
                  },
                  body: JSON.stringify({
                    textQuery: `${merchant} ${branch.name} ${branch.address} Singapore`,
                    regionCode: "SG",
                  }),
                },
                this.fetcher,
              ),
            ),
          ),
        )
        .catch(() => null);
      if (response) {
        const identityMatches = response.value.places.filter(
          (p) =>
            normalize(p.displayName.text).includes(normalize(merchant)) &&
            branch.postalCode &&
            p.formattedAddress.includes(branch.postalCode),
        );
        if (identityMatches.some((p) => p.businessStatus !== "OPERATIONAL"))
          throw new Error("place_business_status_conflict");
        const matches = response.value.places.filter(
          (p) =>
            normalize(p.displayName.text).includes(normalize(merchant)) &&
            branch.postalCode &&
            p.formattedAddress.includes(branch.postalCode) &&
            (!branch.unit ||
              normalize(p.formattedAddress).includes(normalize(branch.unit))),
        );
        if (matches.some((p) => p.businessStatus !== "OPERATIONAL"))
          throw new Error("place_business_status_conflict");
        if (matches.length === 1) {
          const p = matches[0];
          const point = coordinates.parse({
            lat: p.location.latitude,
            lng: p.location.longitude,
          });
          return {
            ...point,
            address: branch.address,
            placeId: p.id,
            businessStatus: p.businessStatus,
            coordinatePrecision: "building",
            coordinateEvidence: [
              {
                url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(merchant + " " + branch.name)}&query_place_id=${encodeURIComponent(p.id)}`,
                checkedAt: response.checkedAt,
                sourceHash: response.sourceHash,
                summary:
                  "Google Places identity matched merchant, postal code and unit. Entrance precision not established.",
              },
            ],
          };
        }
        if (matches.length > 1) throw new Error("ambiguous_google_place");
      }
    }
    if (!branch.postalCode) throw new Error("missing_postal_code_for_onemap");
    const url = new URL("https://www.onemap.gov.sg/api/common/elastic/search");
    url.search = new URLSearchParams({
      searchVal: branch.postalCode,
      returnGeom: "Y",
      getAddrDetails: "Y",
      pageNum: "1",
    }).toString();
    const response = await this.cache.get(
      "onemap:" + branch.postalCode,
      url.href,
      3600_000,
      async () =>
        oneMapSchema.parse(
          JSON.parse(
            await fetchText(
              url.href,
              {
                headers: this.config.oneMapToken
                  ? { Authorization: `Bearer ${this.config.oneMapToken}` }
                  : {},
              },
              this.fetcher,
            ),
          ),
        ),
    );
    const matches = response.value.results.filter(
      (p) => p.POSTAL === branch.postalCode,
    );
    if (response.value.totalNumPages !== 1 || !matches.length)
      throw new Error("unresolved_onemap_postal_code");
    const points = matches.map((p) =>
      coordinates.parse({ lat: Number(p.LATITUDE), lng: Number(p.LONGITUDE) }),
    );
    if (new Set(points.map((p) => `${p.lat},${p.lng}`)).size !== 1)
      throw new Error("ambiguous_onemap_coordinates");
    return {
      ...points[0],
      address: branch.address,
      coordinatePrecision: "building",
      coordinateEvidence: [
        {
          url: url.href,
          checkedAt: response.checkedAt,
          sourceHash: response.sourceHash,
          summary: `OneMap exact postal code ${branch.postalCode}; building coordinate, unit retained from official directory.`,
        },
      ],
    };
  }
}
