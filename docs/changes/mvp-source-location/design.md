# Design

Extend GoogleOutletDiscovery with an explicitly opt-in MVP method, reusing Text Search, Singapore country/bounds checks, pagination and ResolutionCache. Strict discover stays isolated. Merchant lookup runs first; completed unsuccessful searches may fall back. Cache/network errors retain exact codes instead of negative evidence.

Use deterministic normalized venue equality with limited generic suffix/abbreviation normalization, and exact street number/range plus street identity. Query-only unit/floor removal retains source text. Venue results must identify the venue, not merely share its address. Reject unresolved ranges rather than guessing an endpoint. Preserve ambiguity/pagination failures.

Add MVP provenance to discovery snapshots/branches and generated outlets. Address anchors may lack businessStatus: represent this explicitly, never invent OPERATIONAL. Separate source location and Google formatted address. Source anchors have coordinate evidence and no merchant existence evidence. Extend MVP adapter/detail presentation without changing strict promotion schemas.

Persist per-location lookup audit for a reproducible ledger. Local Google cache stays ignored; capture representative Google fixtures for tests. No database migration. Version artifact if required; code/data roll back together. Pin artifact evaluation time for before/after metrics and report current live eligibility separately.

## Implemented matching and cache contract

The explicit `discoverMvp` entry point is selected only by MvpPipeline. Strict `discover` retains its original required business-status schema, matching, field mask and cache keys. MVP lookup uses separate process-cache keys. Fallback requests add `places.types`; their disk cache keys include the field mask, preventing older responses without types from being reused as typed evidence. Merchant disk-cache keys remain backward compatible. Live transport/HTTP failures now abort the build before replacing the previous artifact.

Venue identity uses exact normalized names (apostrophes/punctuation, T3/Terminal 3, and Shopping Centre/Center suffix). A supermarket suffix can match the exact store name only when Google explicitly classifies that store as a supermarket. This resolved Isetan Scotts without inventing a tenant identity. Street matching prefers the structured street number and full route; formatted names expand only the fixed Rd/St/Ave/Blvd abbreviations. Small explicit ranges match only the complete ordered numeric set: 47–49 equals 47,48,49, never 47 alone or 47,49. Contradictory formatted street identity cannot be overridden by a display name.

At an already exact street address, a unique Google premise/street_address/shopping_mall/plaza/business_center without a subpremise outranks tenant entries. Multiple matching anchors remain ambiguous. This selects CHIJMES and Capital Tower Urban Plaza, without treating their tenants as the promoted merchant. Bus stops, parking, routes, neighbourhoods and other broad geographic results cannot supply venue fallback. Missing businessStatus is stored as null for source anchors only; merchant results still require OPERATIONAL. All returned coordinates come from captured Google payloads.

The artifact remains version 2 with backward-compatible defaults for legacy merchant-only records. Regenerated outlets always include coordinateBasis, sourceLocation and googleFormattedAddress. Required source-anchor invariants are checked by the promotion schema. Deploy or roll back code and artifact together. Outlet display IDs include the source label so two units at one Google building remain distinct. Per-location audit and unresolved reasons remain present even on partially map-ready records.
