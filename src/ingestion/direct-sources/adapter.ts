import type { BoundedDirectFetch } from "./fetch";
import type {
  DetailResult,
  DirectPromotionCandidate,
  DirectSourceDefinition,
  EnumerationResult,
  ListingEntry,
} from "./types";
export interface DirectSourceContext {
  source: DirectSourceDefinition;
  http: BoundedDirectFetch;
  observedAt: string;
}
export interface DirectSourceAdapter {
  readonly sourceId: DirectSourceDefinition["id"];
  enumerate(ctx: DirectSourceContext): Promise<EnumerationResult>;
  fetchDetail?(
    entry: ListingEntry,
    ctx: DirectSourceContext,
  ): Promise<DetailResult>;
  extract(
    entry: ListingEntry,
    detail: DetailResult | null,
    ctx: DirectSourceContext,
  ): Promise<DirectPromotionCandidate[]>;
}
