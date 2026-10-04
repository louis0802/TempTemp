import type {
  PromotionSignal,
  ResolvedSourceLink,
  SourceAuthority,
  SourceKind,
} from "../../../src/ingestion/source-evidence/types";

export type InputMode = "frozen_local" | "one_off_refresh";
export type DestinationClass =
  | "merchant_web_candidate"
  | "official_social_candidate"
  | "issuer_or_platform_candidate"
  | "app_or_deep_link"
  | "publisher"
  | "deal_aggregator"
  | "telegram"
  | "link_hub"
  | "url_shortener"
  | "unknown";
export type AdapterFamily =
  | "promotion_directory"
  | "merchant_campaign_page"
  | "merchant_news_or_blog"
  | "official_social"
  | "issuer_platform"
  | "app_deep_link"
  | "publisher_article"
  | "link_hub"
  | "unresolved";
export interface AuditPost {
  channel: "sgfooddeals" | "tastesoulsg";
  message_id: number;
  published_at: string;
  text: string;
  input_mode: InputMode;
  input_file: string;
  input_sha256: string;
}
export interface AuditSignal {
  post: AuditPost;
  signal: PromotionSignal;
  signal_class: "promotion_signal" | "non_offer_signal";
  sampling_basis: string;
}
export interface AuditRecord {
  signal_id: string;
  channel: string;
  telegram_message_id: number;
  telegram_url: string;
  published_at: string;
  input_mode: InputMode;
  signal_class: AuditSignal["signal_class"];
  merchant_hint: string;
  title_hint: string;
  benefit_hint: string;
  outbound_original_url: string | null;
  outbound_normalized_url: string | null;
  outbound_representations: string[];
  association: "offer" | "source_post" | null;
  resolved_url: string | null;
  transport_final_url: string | null;
  transport_final_domain: string | null;
  canonical_candidate_url: string | null;
  candidate_domain: string | null;
  canonicalization_basis: string;
  redirect_chain: string[];
  resolved_domain: string | null;
  resolution_status: ResolvedSourceLink["status"];
  resolution_reason: string | null;
  http_status: number | null;
  authority: SourceAuthority;
  source_kind: SourceKind;
  authority_basis: string;
  destination_class: DestinationClass;
  adapter_family: AdapterFamily;
  resolution_depth: number;
  origin_chain: {
    url: string;
    role: string;
    destination_class: DestinationClass;
  }[];
  official_source_url: string | null;
  source_origin_status:
    | "intermediate"
    | "authoritative_candidate"
    | "needs_authority_review"
    | "unresolved"
    | "unknown_destination"
    | "non_offer_signal"
    | "no_outbound_source_signal";
  enumerable: "not_assessed";
  extraction_feasibility: "not_assessed";
  manual_review_reasons: string[];
}
export interface AuditResult {
  version: 1;
  provenance: {
    input_mode: InputMode;
    inputs: { file: string; sha256: string }[];
    authority_review_sha256: string | null;
    production_registry_sha256: string;
  };
  summary: {
    requested_sample: number;
    available_input_posts: number;
    input_posts: number;
    parsed_promotion_signals: number;
    non_offer_signals: number;
    sample_shortfall: number;
    signals_with_outbound_links: number;
    signals_with_offer_links: number;
    source_post_context_link_records: number;
    resolved_shortlinks: number;
    unresolved_shortlinks: number;
    direct_or_authoritative_candidates: number;
    intermediate_publisher_destinations: number;
    social_candidates: number;
    app_deep_link_candidates: number;
    unknown_destinations: number;
    unresolved_signals: number;
    no_outbound_source_signals: number;
    publisher_requires_deeper_resolution: number;
    unique_resolved_domains: string[];
    adapter_family_counts: Record<string, number>;
    adapter_family_concentration: Record<string, number>;
    destination_class_counts: Record<string, number>;
    resolved_domain_counts: Record<string, number>;
    candidate_domain_counts: Record<string, number>;
    transport_final_domain_counts: Record<string, number>;
    repeated_domain_counts: Record<string, number>;
    unique_url_domain_counts: Record<string, number>;
  };
  records: AuditRecord[];
}
