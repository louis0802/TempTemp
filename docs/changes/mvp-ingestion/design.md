# MVP ingestion design

Add a separate MvpPromotion domain and pipeline beside the strict resolution pipeline. Reuse PostOfferParser, DateResolver, OutletScopeResolver and GoogleOutletDiscovery/ResolutionCache. MVP-specific text normalization and unambiguous window extraction must not alter strict approval semantics. Preserve the complete owned source span as description and terms. Reuse resolvedPlace identities/coordinates; do not invoke a second geocoder.

A corpus builder reads the existing original-text export (never benchmark classifications), writes a versioned JSON artifact and a per-record audit. Default offline mode records missing provider credentials; explicit Google mode uses configured server credentials. Provider errors become needs_location, not swallowed success. Historical artifact lifecycle uses an explicit reproducible evaluation date; serving recomputes it on each request.

Server artifact reader validates the separate schema. MVP list/detail routes support geographic filtering, stable pagination and active-only serving. A development-only corpus route exposes historical ready records. Explorer accepts an explicit MVP source; shared listing presentation allows nullable category without weakening Promotion schema. UI labels merchant locations and does not assert verification or availability at pins.

Benchmark conformance lives in test/build-report tooling, maps by source URL and child ownership, and records field disagreements with source-based explanations. Strict routes and publication transactions remain intact. Artifact replacement is reversible; no database migration is needed. Deployments must provision the generated artifact. Google search is capped by the existing supported page traversal and is never described as exhaustive.

## Implemented details

The artifact is `data/mvp-promotions.json`, replaced atomically. Google HTTP response caching is persisted under ignored `.local/mvp-google/`; live refresh has a one-hour TTL and offline historical replay performs no network requests. Missing cache entries produce needs_location. Opt-in merchant normalization treats spacing/diacritics as equivalent while keeping strict discovery defaults unchanged. Google address-component types may be absent; country evidence remains mandatory.

Readiness decisions are separate from scheduling availability. Cards retain schedules/terms but do not claim current outlet-level redemption. `/api/mvp/promotions` and its detail route recalculate lifecycle; `/corpus` and includeExpired are development-only. The reviewed test baseline normalizes ready/needs_location to a location-candidate stage only for product conformance; provider tests independently verify actual readiness gates. The four-document acceptance criteria and original strict checks remain intact.
