import type { MvpPromotion } from "@/domain/mvp";
import type {
  DirectorySnapshot,
  LocationLookupAudit,
  MerchantBranch,
  MerchantOutletProvider,
  OutletDiscovery,
  PlaceResolver,
  ScopeResolution,
} from "@/ingestion/resolution/types";

type MvpOutlet = MvpPromotion["outlets"][number];
type Options = {
  discovery: OutletDiscovery;
  providers?: MerchantOutletProvider[];
  providerFactory?: (scope: ScopeResolution) => MerchantOutletProvider[];
  places?: PlaceResolver;
};

const identity = (value: string) =>
  value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");

function exactBranchMatch(branch: MerchantBranch, label: string) {
  const wanted = identity(label);
  return (
    !!wanted &&
    [branch.name, branch.address, branch.unit, branch.sourceLocation].some(
      (value) => value && identity(value) === wanted,
    )
  );
}

function emptyAudit(scope: ScopeResolution): LocationLookupAudit[] {
  return scope.names.map((name) => ({
    sourceLocation: name,
    merchantQuery: "",
    merchantResult: "not_attempted",
    fallbackQuery: null,
    fallbackResult: "not_attempted",
    googlePlaceIds: [],
  }));
}

function outputOutlet(
  branch: MerchantBranch,
  place: NonNullable<MerchantBranch["resolvedPlace"]>,
  sourceLocation?: string,
): MvpOutlet | null {
  const googlePlaceId = place.placeId;
  if (!googlePlaceId || !place.address || !branch.name) return null;
  if (
    !Number.isFinite(place.lat) ||
    !Number.isFinite(place.lng) ||
    place.lat < 1.15 ||
    place.lat > 1.5 ||
    place.lng < 103.6 ||
    place.lng > 104.1 ||
    place.businessStatus === "CLOSED_PERMANENTLY"
  )
    return null;
  const sourceBased =
    branch.coordinateBasis === "google_source_location" ||
    !!branch.sourceLocation ||
    place.businessStatus !== "OPERATIONAL" ||
    branch.address.trim() !== place.address.trim();
  const sourceLabel =
    branch.sourceLocation ??
    sourceLocation ??
    (sourceBased ? branch.address : null);
  return {
    googlePlaceId,
    name: branch.name,
    address: sourceBased ? (sourceLabel ?? branch.address) : place.address,
    latitude: place.lat,
    longitude: place.lng,
    businessStatus: sourceBased ? null : "OPERATIONAL",
    coordinateBasis: sourceBased
      ? "google_source_location"
      : "google_merchant_place",
    sourceLocation: sourceBased ? sourceLabel : null,
    ...(sourceBased
      ? {
          googleFormattedAddress:
            branch.googleFormattedAddress ?? place.address,
        }
      : {}),
  };
}

function auditFor(snapshot: DirectorySnapshot): LocationLookupAudit[] {
  return snapshot.locationAudit ?? [];
}

/** Read-only bridge for MVP map locations. It never creates a participation claim. */
export async function resolveMvpOutlets(
  merchant: string,
  scope: ScopeResolution,
  options: Options,
): Promise<{
  outlets: MvpPromotion["outlets"];
  locationAudit: LocationLookupAudit[];
  issues: string[];
  directoryBasis: "official" | "google" | "unresolved";
  directoryComplete: boolean;
}> {
  const result = (
    outlets: MvpPromotion["outlets"],
    locationAudit: LocationLookupAudit[],
    issues: string[],
    directoryBasis: "official" | "google" | "unresolved",
    directoryComplete = false,
  ) => ({
    outlets,
    locationAudit,
    issues: [...new Set(issues)],
    directoryBasis,
    directoryComplete,
  });
  if (scope.scope === "online_only")
    return result([], [], [], "unresolved", true);
  if (scope.scope === "named_outlets" && scope.names.length === 0)
    return result(
      [],
      emptyAudit(scope),
      ["named_outlet_scope_has_no_names"],
      "unresolved",
    );

  const provider = (
    options.providers ?? options.providerFactory?.(scope)
  )?.find((candidate) => candidate.supports(merchant));
  let official: DirectorySnapshot | null = null;
  const issues: string[] = [];
  if (scope.scope === "unclear")
    issues.push(
      "outlet_scope_unclear_defaulting_to_observed_merchant_locations",
    );
  if (scope.scope === "selected_outlets" && scope.names.length === 0)
    issues.push(
      "selected_outlet_names_missing_defaulting_to_observed_locations",
    );
  if (provider) {
    try {
      official = await provider.getSingaporeBranches(merchant);
    } catch {
      issues.push("official_directory_lookup_failed");
    }
  }

  const usableOfficial =
    !!official &&
    official.authoritative &&
    official.fullyTraversed &&
    official.pages.length > 0 &&
    !official.issues.length &&
    (official.officialCount === null ||
      official.officialCount === official.branches.length);
  let snapshot = official;
  let directoryBasis: "official" | "google" | "unresolved" = usableOfficial
    ? "official"
    : "unresolved";
  if (!usableOfficial) {
    const names =
      scope.scope === "named_outlets" ||
      (scope.scope === "selected_outlets" && scope.names.length > 0)
        ? scope.names
        : undefined;
    try {
      snapshot = options.discovery.discoverMvp
        ? await options.discovery.discoverMvp(merchant, names)
        : await options.discovery.discover(merchant, names);
      directoryBasis = snapshot.branches.length ? "google" : "unresolved";
    } catch {
      issues.push("google_location_lookup_failed");
    }
    if (official?.issues.length) issues.push(...official.issues);
  }
  if (!snapshot)
    return result(
      [],
      emptyAudit(scope),
      [...issues, "outlet_directory_unresolved"],
      "unresolved",
    );

  const audits = auditFor(snapshot);
  issues.push(...snapshot.issues);
  const branches = snapshot.branches.filter(
    (branch) => branch.status === "operating",
  );
  let eligible = branches;
  if (
    scope.scope === "named_outlets" ||
    (scope.scope === "selected_outlets" && scope.names.length > 0)
  ) {
    eligible = [];
    for (const name of scope.names) {
      const matches = branches.filter((branch) =>
        exactBranchMatch(branch, name),
      );
      if (matches.length !== 1) issues.push(`named_outlet_unresolved:${name}`);
      else if (!eligible.includes(matches[0])) eligible.push(matches[0]);
    }
  }

  const excluded = new Set<MerchantBranch>();
  for (const label of scope.exclusions) {
    const matches = branches.filter((branch) =>
      exactBranchMatch(branch, label),
    );
    if (matches.length === 1) excluded.add(matches[0]);
    else issues.push(`exclusion_unresolved:${label}`);
  }
  // An unmatchable exclusion could refer to any candidate; suppress all pins.
  if (issues.some((issue) => issue.startsWith("exclusion_unresolved:")))
    return result([], audits, issues, directoryBasis, false);
  eligible = eligible.filter((branch) => !excluded.has(branch));

  const outlets: MvpPromotion["outlets"] = [];
  for (const branch of eligible) {
    let resolved = branch.resolvedPlace;
    if (!resolved && options.places) {
      try {
        resolved = await options.places.resolve(merchant, branch);
      } catch {
        issues.push(`branch_coordinates_unresolved:${branch.name}`);
      }
    }
    if (
      (!resolved?.placeId || !resolved.address) &&
      options.discovery.discoverMvp
    ) {
      try {
        const lookup = await options.discovery.discoverMvp(merchant, [
          branch.address,
        ]);
        audits.push(...auditFor(lookup));
        issues.push(...lookup.issues);
        const candidate = lookup.branches.find(
          (item) =>
            item.resolvedPlace?.placeId &&
            item.sourceLocation === branch.address,
        );
        if (candidate?.resolvedPlace) {
          resolved = { ...candidate.resolvedPlace, address: branch.address };
          const output = outputOutlet(
            {
              ...branch,
              coordinateBasis: "google_source_location",
              sourceLocation: branch.address,
              googleFormattedAddress: candidate.googleFormattedAddress,
            },
            resolved,
            branch.address,
          );
          if (output) outlets.push(output);
          continue;
        }
      } catch {
        issues.push(`branch_coordinates_unresolved:${branch.name}`);
      }
    }
    if (!resolved) {
      issues.push(`branch_coordinates_unresolved:${branch.name}`);
      continue;
    }
    const output = outputOutlet(branch, resolved);
    if (output) outlets.push(output);
    else issues.push(`branch_coordinates_or_status_unverified:${branch.name}`);
  }

  const directoryComplete =
    directoryBasis === "official" &&
    !!snapshot.authoritative &&
    snapshot.fullyTraversed &&
    !snapshot.issues.length &&
    (snapshot.officialCount === null ||
      snapshot.officialCount === snapshot.branches.length) &&
    !issues.some(
      (issue) =>
        issue.startsWith("named_outlet_unresolved:") ||
        issue.startsWith("branch_coordinates_"),
    );
  if (directoryBasis === "google")
    issues.push(
      "google_locations_are_not_a_complete_directory_or_participation_proof",
    );
  return result(outlets, audits, issues, directoryBasis, directoryComplete);
}
