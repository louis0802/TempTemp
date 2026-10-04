# Design

Extend DirectSourceDefinition with an optional acquisitionLimits type containing only four count budgets. BoundedDirectFetch merges trusted configuration over unchanged DEFAULT_LIMITS; explicit limits take the minimum, preserving network ceilings. runDirectSource exposes effective budgets; CLI paths both invoke it unchanged.

ShakeShackAdapter.enumerate records a typed deterministic classification ledger/counts for every deduplicated archive entry, marking failures/structure mismatches unresolved. Enumeration completeness and acquisitionReady require equality and zero unresolved. Captured bodies still use the existing terms-plus-economic-proposition classifier.

DirectResolvedContext gains mandatory asOf; singaporeObservationDate converts a supplied observation instant, with no implicit clock. A shared directCampaignLifecycle preflight uses validated explicit provenance and rejects ambiguous validity from expiry exclusion. Full evaluation returns exclude before outlet/publication checks. Persistence preflights before resolving, then persists excluded status through its existing transaction without touching promotions. Existing review/ready behavior remains.

Bump DIRECT_SOURCE_PROCESSOR_VERSION to direct-source-v2. Preserve directRevisionHash. Distinguish automatic expiry exclusions from reviewer exclusions when deciding processor replay; the same processor also re-evaluates an unchanged active/review candidate when the explicit as-of date crosses its expiry; no new migration required because excluded is an existing status. Source revision changes re-enter normal evaluation. Semantic replay excludes mode-only diagnostics and retains deterministic observation/provenance.

New fixture child under tests/fixtures/direct-sources/shake-shack preserves original captures. Live run is one-shot and registry-bounded; no live coordinate calls. Directory proof uses official captured surface and deterministic mocked coordinate checks. Activation is a registry flip only after all proof; map uses existing frozen-input builder, with registry-derived presentation updated proportionally. Rollback disables the policy; no production ingestion or deployment occurs here.

## Recorded activation and map presentation

Registry activationReview records complete enumeration, no remaining source-level blockers, and references to this verification and immutable capture. It is presentation evidence only: runtime acquisition still proves ownership, listings, article classifications and details on every run. The merchant map reads that registry evidence alongside the unchanged historical review input; original source observations remain historical. No runtime imports the research map.

The obsolete Shake-specific extra check that rejected a terminal archive exactly at its listing budget was removed. enumerateListings already fails on an exposed page beyond the budget; a fully traversed terminal page at the configured bound is permitted. Detail classification remains independently capped, and the gate fails for any unresolved article.
