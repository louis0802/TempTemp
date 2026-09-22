import type { Promotion } from "@/domain/promotion";
export type OutletScope =
  | "all_outlets"
  | "all_outlets_with_exclusions"
  | "selected_outlets"
  | "named_outlets"
  | "online_only"
  | "unclear";
export type DatePattern =
  | "today"
  | "now_to_date"
  | "explicit_range"
  | "recurring"
  | "multiple_ranges"
  | "start_only"
  | "unknown_expiry"
  | "none";
export interface Evidence {
  url: string;
  summary: string;
  checkedAt: string;
  sourceHash?: string;
}
export interface LocationLookupAudit {
  sourceLocation: string | null;
  merchantQuery: string;
  merchantResult: string;
  fallbackQuery: string | null;
  fallbackResult: string;
  googlePlaceIds: string[];
}
export interface MerchantBranch {
  coordinateBasis?: "google_merchant_place" | "google_source_location";
  sourceLocation?: string;
  googleFormattedAddress?: string;
  name: string;
  address: string;
  postalCode: string;
  unit: string;
  status: "operating" | "closed" | "coming_soon" | "temporarily_unavailable";
  existenceEvidence: Evidence[];
  resolvedPlace?: ResolvedPlace;
}
export interface DirectorySnapshot {
  locationAudit?: LocationLookupAudit[];
  branches: MerchantBranch[];
  authoritative: boolean;
  fullyTraversed: boolean;
  pages: Evidence[];
  officialCount: number | null;
  issues: string[];
}
export interface OutletDiscovery {
  discoverMvp?(merchant: string, names?: string[]): Promise<DirectorySnapshot>;
  discover(merchant: string, names?: string[]): Promise<DirectorySnapshot>;
}
export interface MerchantOutletProvider {
  supports(merchant: string): boolean;
  getSingaporeBranches(merchant: string): Promise<DirectorySnapshot>;
}
export interface ResolvedPlace {
  address: string;
  lat: number;
  lng: number;
  placeId?: string;
  businessStatus?: string;
  coordinatePrecision: "entrance" | "shop" | "building";
  coordinateEvidence: Evidence[];
}
export interface PlaceResolver {
  resolve(merchant: string, branch: MerchantBranch): Promise<ResolvedPlace>;
}
export interface ResolvedOutlet extends ResolvedPlace {
  id: string;
  name: string;
  verifiedAt: string;
  existenceEvidence: Evidence[];
  participationEvidence: Evidence[];
}
export interface ScopeResolution {
  scope: OutletScope;
  raw: string;
  names: string[];
  exclusions: string[];
}
export interface OutletAudit {
  scope: OutletScope;
  scopeEvidence: Evidence[];
  directorySource: Evidence[];
  directoryAudit: {
    authoritative: boolean;
    fullyTraversed: boolean;
    officialCount: number | null;
  };
  discoveredOutletCount: number;
  eligibleOutletCount: number;
  included: ResolvedOutlet[];
  excluded: { name: string; reason: string; evidence: Evidence[] }[];
  issues: string[];
  complete: boolean;
}
export interface SourcePost {
  text: string;
  publishedAt: string;
  url: string;
  label: string;
  channel: string;
}
export interface ProcessingResult {
  key: string;
  action: "approve" | "unresolved" | "exclude";
  reasons: string[];
  promotion: Promotion | null;
  suggestion: Record<string, unknown>;
  audit: Record<string, unknown>;
}
