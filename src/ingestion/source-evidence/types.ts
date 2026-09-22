export type SourceAuthority =
  "primary" | "strong_secondary" | "discovery" | "unknown";
export type SourceKind =
  | "merchant_website"
  | "merchant_social"
  | "official_terms"
  | "partner_website"
  | "mall_website"
  | "platform_campaign"
  | "telegram_feed"
  | "deal_aggregator"
  | "unknown_web";
export interface SourceLink {
  originalUrl: string;
  originalRepresentations: string[];
  normalizedUrl: string;
  association: "offer" | "source_post";
}
export interface PromotionSignal {
  id: string;
  offerKey: string;
  sourcePostUrl: string;
  sourceAuthority: "discovery";
  sourceKind: "telegram_feed";
  merchantHint: string;
  titleHint: string;
  benefitHint: string;
  startDateHint: string | null;
  endDateHint: string | null;
  locationHints: string[];
  issues: string[];
  outboundLinks: SourceLink[];
}
export interface ResolvedSourceLink {
  originalUrl: string;
  finalUrl: string | null;
  /** Includes the initial URL and every destination, including a blocked final hop. */
  redirectChain: string[];
  checkedAt: string | null;
  status: "resolved" | "unresolved" | "blocked" | "failed";
  reason: string | null;
  httpStatus: number | null;
}
export interface Classification {
  authority: SourceAuthority;
  kind: SourceKind;
  merchantMatch: "confirmed_registry" | "not_applicable" | "unknown";
}
export interface PromotionSourceEvidence extends Classification {
  id: string;
  signalId: string;
  relation: "source_permalink" | "outbound_link";
  originalUrl: string;
  normalizedUrl: string;
  resolvedUrl: string | null;
  redirectChain: string[];
  checkedAt: string | null;
  resolutionStatus: ResolvedSourceLink["status"];
  reason: string | null;
  httpStatus: number | null;
}
export interface SourceRegistry {
  version: 1;
  merchants: Record<
    string,
    {
      primaryDomains: string[];
      primarySocialAccounts: { host: string; account: string }[];
      secondaryDomains: {
        host: string;
        kind: "partner_website" | "mall_website" | "platform_campaign";
      }[];
    }
  >;
}
export type EvidenceState =
  | "primary_found"
  | "strong_secondary_found"
  | "discovery_only"
  | "unresolved_links"
  | "no_outbound_links";
