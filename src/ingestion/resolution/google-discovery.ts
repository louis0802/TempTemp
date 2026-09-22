import { z } from "zod";
import {
  streetIdentity,
  sourceLocationQuery,
  sameSourceLocation,
  usableSourceLocation,
} from "../mvp/source-location";
import { ResolutionCache, fetchText } from "./cache";
import type {
  DirectorySnapshot,
  Evidence,
  MerchantBranch,
  OutletDiscovery,
} from "./types";
const endpoint = "https://places.googleapis.com/v1/places:searchText";
const placeSchema = z.object({
  id: z.string().min(1),
  displayName: z.object({ text: z.string().min(1) }),
  formattedAddress: z.string().min(1),
  businessStatus: z.string(),
  location: z.object({ latitude: z.number(), longitude: z.number() }),
  addressComponents: z
    .array(
      z.object({
        longText: z.string(),
        shortText: z.string().optional(),
        types: z.array(z.string()).default([]),
      }),
    )
    .default([]),
});
const responseSchema = z.object({
  places: z.array(placeSchema).default([]),
  nextPageToken: z.string().optional(),
});
const mvpPlaceSchema = placeSchema.extend({
  businessStatus: z.string().optional(),
  types: z.array(z.string()).optional(),
});
const mvpResponseSchema = responseSchema.extend({
  places: z.array(mvpPlaceSchema).default([]),
});
type GooglePlace = z.infer<typeof mvpPlaceSchema>;
const words = (s: string) =>
  s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
const contains = (value: string, phrase: string) =>
  !!words(phrase) && ` ${words(value)} `.includes(` ${words(phrase)} `);

/** MVP identity equivalence permits spacing/diacritics, never fuzzy branch addresses. */
function mvpMerchantMatch(value: string, merchant: string) {
  const normalize = (s: string) =>
    words(s.normalize("NFKD").replace(/\p{M}/gu, ""));
  const tokens = normalize(value).split(" "),
    target = normalize(merchant).replace(/ /g, "");
  return tokens.some((_, i) =>
    tokens
      .slice(i)
      .some((_, j) => tokens.slice(i, i + j + 1).join("") === target),
  );
}
const unitOf = (s: string) =>
  s
    .match(/#?\b(?:B\d|\d{1,2})-[\w/-]+/i)?.[0]
    .replace(/^#/, "")
    .toLowerCase() ?? "";
function inSingapore(p: GooglePlace) {
  return (
    p.location.latitude >= 1.15 &&
    p.location.latitude <= 1.5 &&
    p.location.longitude >= 103.6 &&
    p.location.longitude <= 104.1 &&
    p.addressComponents.some(
      (c) =>
        c.types.includes("country") &&
        (c.shortText === "SG" || c.longText === "Singapore"),
    )
  );
}
function namedMatch(p: GooglePlace, name: string) {
  const requestedUnit = unitOf(name);
  const label = name.replace(/,?\s*#?\b(?:B\d|\d{1,2})-[\w/-]+/i, "").trim();
  const unit =
    p.addressComponents.find((c) => c.types.includes("subpremise"))?.longText ??
    unitOf(p.formattedAddress);
  return (
    (contains(p.displayName.text, label) ||
      contains(p.formattedAddress, label)) &&
    (!requestedUnit || words(unit) === words(requestedUnit))
  );
}
function toBranch(
  p: GooglePlace,
  name: string,
  evidence: Evidence,
): MerchantBranch {
  const postalCode =
    p.addressComponents.find((c) => c.types.includes("postal_code"))
      ?.longText ??
    p.formattedAddress.match(/\b\d{6}\b/)?.[0] ??
    "";
  const unit =
    p.addressComponents.find((c) => c.types.includes("subpremise"))?.longText ??
    unitOf(p.formattedAddress);
  const address =
    unit && unitOf(p.formattedAddress) !== unit.replace(/^#/, "").toLowerCase()
      ? `#${unit.replace(/^#/, "")}, ${p.formattedAddress}`
      : p.formattedAddress;
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.displayName.text)}&query_place_id=${encodeURIComponent(p.id)}`;
  const status =
    p.businessStatus === "OPERATIONAL"
      ? "operating"
      : p.businessStatus === "CLOSED_PERMANENTLY"
        ? "closed"
        : "temporarily_unavailable";
  return {
    name,
    address,
    postalCode,
    unit,
    status,
    existenceEvidence: [
      {
        ...evidence,
        url,
        summary: `Google Places identity ${p.id}; business status ${p.businessStatus}; Singapore address.`,
      },
    ],
    resolvedPlace: {
      address,
      lat: p.location.latitude,
      lng: p.location.longitude,
      placeId: p.id,
      businessStatus: p.businessStatus,
      coordinatePrecision: "building",
      coordinateEvidence: [
        {
          ...evidence,
          url,
          summary: `Google Places ${p.id} coordinates; entrance precision not established.`,
        },
      ],
    },
  };
}
/** Search provides branch evidence, never an authoritative chain enumeration. */
export class GoogleOutletDiscovery implements OutletDiscovery {
  constructor(
    private cache: ResolutionCache,
    private key?: string,
    private fetcher: typeof fetch = fetch,
    private mvpIdentity = false,
  ) {}
  private async search(query: string, mvp = false, sourceLocation = false) {
    if (!this.key) throw new Error("google_places_api_key_missing");
    return this.cache.get(
      `google-discovery:${mvp ? "mvp:" : ""}${sourceLocation ? "source:" : ""}${words(query)}`,
      endpoint,
      3600_000,
      async () => {
        const places = new Map<string, GooglePlace>(),
          placeEvidence: Record<string, Evidence> = {},
          pages: Evidence[] = [],
          tokens = new Set<string>();
        let token: string | undefined;
        for (let page = 0; page < 3; page++) {
          const cached = await this.cache.get(
            `google-discovery-page:${mvp ? "mvp:" : ""}${sourceLocation ? "source:" : ""}${words(query)}:${page}`,
            endpoint,
            3600_000,
            async () =>
              (mvp ? mvpResponseSchema : responseSchema).parse(
                JSON.parse(
                  await fetchText(
                    endpoint,
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "X-Goog-Api-Key": this.key!,
                        "X-Goog-FieldMask":
                          "places.id,places.displayName,places.formattedAddress,places.businessStatus,places.location,places.addressComponents,nextPageToken" +
                          (sourceLocation ? ",places.types" : ""),
                      },
                      body: JSON.stringify({
                        textQuery: query,
                        regionCode: "SG",
                        languageCode: "en",
                        pageSize: 20,
                        locationRestriction: {
                          rectangle: {
                            low: { latitude: 1.15, longitude: 103.6 },
                            high: { latitude: 1.5, longitude: 104.1 },
                          },
                        },
                        ...(token ? { pageToken: token } : {}),
                      }),
                    },
                    this.fetcher,
                  ),
                ),
              ),
          );
          pages.push({
            url: endpoint,
            summary: `Google Text Search: ${query}; result page ${page + 1}. Search is not authoritative enumeration.`,
            checkedAt: cached.checkedAt,
            sourceHash: cached.sourceHash,
          });
          for (const place of cached.value.places) {
            const previous = places.get(place.id);
            if (previous && JSON.stringify(previous) !== JSON.stringify(place))
              throw new Error("google_place_conflicting_results");
            places.set(place.id, place);
            placeEvidence[place.id] = pages.at(-1)!;
          }
          token = cached.value.nextPageToken;
          if (!token)
            return {
              places: [...places.values()],
              placeEvidence,
              pages,
              paginationComplete: true,
            };
          if (tokens.has(token))
            throw new Error("google_search_pagination_cycle");
          tokens.add(token);
        }
        return {
          places: [...places.values()],
          placeEvidence,
          pages,
          paginationComplete: false,
        };
      },
    );
  }
  /** Explicit MVP-only coordinate fallback; strict discover never calls this method. */
  async discoverMvp(
    merchant: string,
    names?: string[],
  ): Promise<DirectorySnapshot> {
    const snapshot: DirectorySnapshot = {
      branches: [],
      authoritative: false,
      fullyTraversed: false,
      pages: [],
      officialCount: null,
      issues: [],
      locationAudit: [],
    };
    for (const name of names ?? [""]) {
      const audit = {
        sourceLocation: name || null,
        merchantQuery: `${merchant} ${name} Singapore`.replace(/\s+/g, " "),
        merchantResult: "",
        fallbackQuery: null as string | null,
        fallbackResult: "not_attempted",
        googlePlaceIds: [] as string[],
      };
      snapshot.locationAudit!.push(audit);
      try {
        const response = await this.search(audit.merchantQuery, true);
        snapshot.pages.push(...response.value.pages);
        if (!response.value.paginationComplete) {
          audit.merchantResult = "google_search_pagination_incomplete";
          snapshot.issues.push(audit.merchantResult);
          continue;
        }
        const identities = response.value.places.filter(
          (p) =>
            inSingapore(p) &&
            mvpMerchantMatch(p.displayName.text, merchant) &&
            (!name || namedMatch(p, name)),
        );
        const matches = identities.filter(
          (p) => p.businessStatus === "OPERATIONAL",
        );
        if (matches.length && (!name || matches.length === 1)) {
          audit.merchantResult = "google_merchant_place_resolved";
          for (const p of matches) {
            const branch = toBranch(
              p,
              name || p.displayName.text,
              response.value.placeEvidence[p.id],
            );
            snapshot.branches.push({
              ...branch,
              coordinateBasis: "google_merchant_place",
              sourceLocation: name || undefined,
              googleFormattedAddress: p.formattedAddress,
            });
            audit.googlePlaceIds.push(p.id);
          }
          continue;
        }
        audit.merchantResult = matches.length
          ? "merchant_place_ambiguous"
          : identities.length
            ? "merchant_place_closed_or_unavailable"
            : "merchant_place_match_failed";
        if (!name) {
          audit.fallbackResult = "no_usable_source_location";
          snapshot.issues.push(audit.merchantResult, audit.fallbackResult);
          continue;
        }
        const query = sourceLocationQuery(name);
        if (!usableSourceLocation(query)) {
          audit.fallbackResult = "source_location_too_vague";
          snapshot.issues.push(`${audit.fallbackResult}:${name}`);
          continue;
        }
        audit.fallbackQuery = `${query} Singapore`;
        const fallback = await this.search(audit.fallbackQuery, true, true);
        snapshot.pages.push(...fallback.value.pages);
        if (!fallback.value.paginationComplete) {
          audit.fallbackResult = "source_location_pagination_incomplete";
        } else {
          let candidates = fallback.value.places.filter(
            (p) =>
              inSingapore(p) &&
              !(p.types ?? []).some((t) =>
                [
                  "bus_stop",
                  "transit_stop",
                  "parking",
                  "country",
                  "locality",
                  "sublocality",
                  "neighborhood",
                  "route",
                  "postal_code",
                ].includes(t),
              ) &&
              sameSourceLocation(
                query,
                p.displayName.text,
                p.formattedAddress,
                p.addressComponents,
                p.types,
              ),
          );
          if (streetIdentity(query)) {
            // A uniquely identified building/address outranks its tenant listings.
            // Type only ranks candidates already matching the exact street identity.
            const anchors = candidates.filter(
              (p) =>
                (p.types ?? []).some((t) =>
                  [
                    "premise",
                    "street_address",
                    "shopping_mall",
                    "plaza",
                    "business_center",
                  ].includes(t),
                ) &&
                !unitOf(p.formattedAddress) &&
                !p.addressComponents.some((c) =>
                  c.types.includes("subpremise"),
                ),
            );
            if (anchors.length) candidates = anchors;
          }
          // Count all identity matches before status filtering: closure does not resolve ambiguity.
          if (candidates.length > 1)
            audit.fallbackResult = "source_location_ambiguous";
          else if (!candidates.length)
            audit.fallbackResult = "source_location_not_found";
          else {
            const p = candidates[0];
            if (p.businessStatus && p.businessStatus !== "OPERATIONAL")
              audit.fallbackResult = "source_location_closed_or_unavailable";
            else {
              const branch = toBranch(
                p,
                query,
                fallback.value.placeEvidence[p.id],
              );
              snapshot.branches.push({
                ...branch,
                address: name,
                unit: unitOf(name),
                status: "operating",
                existenceEvidence: [],
                coordinateBasis: "google_source_location",
                sourceLocation: name,
                googleFormattedAddress: p.formattedAddress,
                resolvedPlace: { ...branch.resolvedPlace!, address: name },
              });
              audit.fallbackResult = "source_location_coordinate_resolved";
              audit.googlePlaceIds.push(p.id);
            }
          }
        }
        if (audit.fallbackResult !== "source_location_coordinate_resolved")
          snapshot.issues.push(`${audit.fallbackResult}:${name}`);
      } catch (error) {
        const reason =
          error instanceof Error ? error.message : "google_search_failed";
        if (audit.fallbackQuery) audit.fallbackResult = reason;
        else audit.merchantResult = reason;
        snapshot.issues.push(`${reason}${name ? ":" + name : ""}`);
      }
    }
    return snapshot;
  }
  async discover(
    merchant: string,
    names?: string[],
  ): Promise<DirectorySnapshot> {
    const snapshot: DirectorySnapshot = {
      branches: [],
      authoritative: false,
      fullyTraversed: false,
      pages: [],
      officialCount: null,
      issues: [],
    };
    const identities = new Set<string>();
    for (const name of names ?? [""]) {
      try {
        const response = await this.search(
          `${merchant} ${name} Singapore`.replace(/\s+/g, " "),
        );
        snapshot.pages.push(...response.value.pages);
        if (!response.value.paginationComplete)
          snapshot.issues.push("google_search_pagination_incomplete");
        const matches = response.value.places.filter(
          (p) =>
            inSingapore(p) &&
            (!this.mvpIdentity || p.businessStatus === "OPERATIONAL") &&
            (this.mvpIdentity
              ? mvpMerchantMatch(p.displayName.text, merchant)
              : contains(p.displayName.text, merchant)) &&
            (!name || namedMatch(p, name)),
        );
        if (name && matches.length !== 1) {
          snapshot.issues.push(
            `google_branch_${matches.length ? "ambiguous" : "not_found"}:${name}`,
          );
          continue;
        }
        for (const p of matches) {
          if (identities.has(p.id)) {
            if (name)
              snapshot.issues.push(`duplicate_participating_place:${name}`);
            continue;
          }
          identities.add(p.id);
          // Preserve requested branch label; source participation remains separate from Google evidence.
          const branchName = name
            ? name
                .split(/,\s*/)[0]
                .replace(/\s+#?[\w]+-[\w/-]+$/, "")
                .trim()
            : p.displayName.text;
          snapshot.branches.push(
            toBranch(p, branchName, response.value.placeEvidence[p.id]),
          );
        }
      } catch (error) {
        snapshot.issues.push(
          error instanceof Error ? error.message : "google_search_failed",
        );
      }
    }
    if (!names)
      snapshot.issues.push("google_search_not_authoritative_enumeration");
    return snapshot;
  }
}
