import { createHash } from "node:crypto";
import type {
  Evidence,
  MerchantBranch,
  MerchantOutletProvider,
  OutletAudit,
  OutletDiscovery,
  PlaceResolver,
  ScopeResolution,
} from "./types";
export const normalizeIdentity = (s: string) =>
  s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]/g, "");
/** Stable physical identity; include exact location so the database can never relocate a UUID. */
export function outletIdentity(
  merchant: string,
  address: string,
  lat: number,
  lng: number,
) {
  const hash = createHash("sha256")
    .update(
      JSON.stringify([normalizeIdentity(merchant), address.trim(), lat, lng]),
    )
    .digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-8${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}
export interface ParticipationList {
  names: string[];
  evidence: Evidence[];
  complete: boolean;
  sourceUrl: string;
}
export interface ParticipationProvider {
  getParticipatingOutlets(
    merchant: string,
    promotionUrl: string,
  ): Promise<ParticipationList | null>;
}
function matchesName(branch: MerchantBranch, name: string) {
  const [building, unit] = name.split(/,\s*/);
  return (
    (normalizeIdentity(branch.name) === normalizeIdentity(building) ||
      (/^\d+\s/.test(building) &&
        branch.address.toLowerCase().startsWith(building.toLowerCase()) &&
        /^(?:$|\s*,|\s+#|\s+Singapore\b|\s+\d{6}\b)/i.test(
          branch.address.slice(building.length),
        ))) &&
    (!unit || normalizeIdentity(branch.unit) === normalizeIdentity(unit))
  );
}
export class PromotionParticipationResolver {
  constructor(
    private providers: MerchantOutletProvider[],
    private places: PlaceResolver,
    private participation?: ParticipationProvider,
    private discovery?: OutletDiscovery,
  ) {}
  async resolve(
    merchant: string,
    scope: ScopeResolution,
    source: Evidence,
  ): Promise<OutletAudit> {
    const audit: OutletAudit = {
      scope: scope.scope,
      scopeEvidence: [source],
      directorySource: [],
      directoryAudit: {
        authoritative: false,
        fullyTraversed: false,
        officialCount: null,
      },
      discoveredOutletCount: 0,
      eligibleOutletCount: 0,
      included: [],
      excluded: [],
      issues: [],
      complete: false,
    };
    if (scope.scope === "unclear" || scope.scope === "online_only") {
      audit.issues.push("outlet_scope_unresolved");
      return audit;
    }
    let names = scope.names,
      participationEvidence = [source];
    if (scope.scope === "selected_outlets") {
      const list = await this.participation
        ?.getParticipatingOutlets(merchant, source.url)
        .catch(() => null);
      if (
        !list?.complete ||
        !list.names.length ||
        !list.evidence.length ||
        list.sourceUrl !== source.url
      ) {
        audit.issues.push(
          "Promotion states selected outlets but the participating-outlet list could not be verified.",
        );
        return audit;
      }
      names = list.names;
      participationEvidence = list.evidence;
    }
    const provider = this.providers.find((p) => p.supports(merchant));
    if (!provider && !this.discovery) {
      audit.issues.push("authoritative_merchant_directory_unavailable");
      return audit;
    }
    try {
      const all =
        scope.scope === "all_outlets" ||
        scope.scope === "all_outlets_with_exclusions";
      const directory = provider
        ? await provider.getSingaporeBranches(merchant)
        : await this.discovery!.discover(merchant, all ? undefined : names);
      if (!provider) audit.issues.push(...directory.issues);
      audit.directorySource = directory.pages;
      audit.directoryAudit = {
        authoritative: directory.authoritative,
        fullyTraversed: directory.fullyTraversed,
        officialCount: directory.officialCount,
      };
      audit.discoveredOutletCount = directory.branches.length;
      if (
        all &&
        (!directory.authoritative ||
          !directory.fullyTraversed ||
          !directory.pages.length ||
          directory.issues.length ||
          (directory.officialCount !== null &&
            directory.officialCount !== directory.branches.length))
      )
        audit.issues.push(
          "incomplete_all_outlet_enumeration",
          ...directory.issues,
        );
      let required = directory.branches;
      if (!all) {
        required = [];
        for (const name of names) {
          const matches = directory.branches.filter((b) =>
            matchesName(b, name),
          );
          if (matches.length !== 1)
            audit.issues.push(
              `ambiguous_or_missing_participating_branch:${name}`,
            );
          else required.push(matches[0]);
        }
      }
      const matchedExclusions = new Set<string>();
      for (const branch of required) {
        if (!branch.existenceEvidence.length) {
          audit.issues.push(`missing_existence_evidence:${branch.name}`);
          continue;
        }
        const exclusions = scope.exclusions.filter((ex) => {
          const selector = normalizeIdentity(ex.replace(/\s+outlets$/i, ""));
          return (
            !!selector &&
            (normalizeIdentity(branch.name).includes(selector) ||
              normalizeIdentity(branch.address).includes(selector))
          );
        });
        if (exclusions.length) {
          for (const exclusion of exclusions) matchedExclusions.add(exclusion);
          audit.excluded.push({
            name: branch.name,
            reason: `Promotion explicitly excludes ${exclusions.join("; ")}`,
            evidence: [source],
          });
          continue;
        }
        if (branch.status === "closed" || branch.status === "coming_soon") {
          audit.excluded.push({
            name: branch.name,
            reason: branch.status,
            evidence: branch.existenceEvidence,
          });
          if (!all)
            audit.issues.push(`named_participant_not_operating:${branch.name}`);
          continue;
        }
        if (branch.status !== "operating") {
          audit.issues.push(`temporarily_unavailable:${branch.name}`);
          continue;
        }
        audit.eligibleOutletCount++;
        if (!branch.address) {
          audit.issues.push(`missing_address:${branch.name}`);
          continue;
        }
        try {
          const place =
            branch.resolvedPlace ??
            (await this.places.resolve(merchant, branch));
          audit.included.push({
            ...place,
            id: outletIdentity(merchant, place.address, place.lat, place.lng),
            name: branch.name,
            verifiedAt: source.checkedAt,
            existenceEvidence: branch.existenceEvidence,
            participationEvidence,
          });
        } catch (error) {
          audit.issues.push(
            `place_unresolved:${branch.name}:${error instanceof Error ? error.message : "provider_failed"}`,
          );
        }
      }
      for (const ex of scope.exclusions)
        if (!matchedExclusions.has(ex))
          audit.issues.push(`unmatched_exclusion:${ex}`);
      if (
        new Set(audit.included.map((b) => b.id)).size !== audit.included.length
      )
        audit.issues.push("duplicate_branch_identity");
      audit.complete =
        !audit.issues.length &&
        audit.eligibleOutletCount > 0 &&
        audit.included.length === audit.eligibleOutletCount &&
        audit.included.every(
          (b) =>
            b.participationEvidence.length &&
            b.existenceEvidence.length &&
            b.coordinateEvidence.length,
        );
    } catch {
      audit.issues.push("merchant_directory_failed");
    }
    return audit;
  }
}
