# Design

Registry publicationPolicy is trusted server configuration (enabled, merchant, category, outletStrategy, autoPublish). It is separate from the DB-free adapter runner. Production persistence resolves source configuration again by ID rather than trusting caller-supplied policy.

Add 002_direct_sources.sql with isolated health, item/revision/artifact/candidate/direct provenance tables, constraints and admin/ingest grants; public role has no direct access. Keep 001 and legacy tables intact. Evidence revision hashes sort relation, canonical/requested URL, byte hash, content type and HTTP status, excluding all timestamps. Artifact checks enforce the existing 3 MB cap and byte hash in service and DB.

Pure mapper/gate operates on DirectPromotionCandidate and resolved acquisition/outlet context. Reuse Promotion schema, publicationIssues, fingerprint, transactional savePromotion and authoritative participation/place infrastructure without importing the legacy parser/pipeline. Merchant directory acquisition belongs to Pepper source behavior. Missing verified directory proof produces review, never Google enumeration or invented participants. Lookups complete before publication transaction.

A source health row serializes ingestion, an item lock checks current revision, and promotion locks plus promotion-table serialization coordinate generic dedupe with all existing writers. Replays preserve terminal reviewer decisions. Current pointer may revisit an older byte revision without creating a duplicate historical revision; stale timestamp runs cannot rewind current state. Source-derived updates retain legacy references and inject only registry-validated HTTPS direct provenance. Admin completion sets admin_corrected.

Direct review locks source health, candidate and item, verifies current revision, then uses the same generic publication service. Normalized inbox combines rows using UNION ALL with a single UUID cursor; direct data contains a partial Promotion suggestion plus raw candidate/audit for evidence. Admin UI keeps current form and separate endpoint dispatch by origin.

CLI is one-shot, no scheduler/startup wiring. Preview imports no persistence module. Deployment needs additive migration before updated admin routes. Rollback disables Pepper policy/ingest invocation; retain tables/artifacts. No absent-source expiry policy here.

## Verified implementation details

The linked official Pepper location page was inspected once using the existing bounded DNS-pinned direct transport: HTTPS /location/ returned 200, 433270 bytes. The provider checks Singapore cards against the native static marker declaration and branch-type navigation, including sequential unique marker IDs, exact addresses and absence of unresolved directory pagination. The captured boundary contains 24 identities, of which 9 are restaurant-format branches. Explicit all-restaurants wording may restrict that verified directory to PLR; decorative promotion branch tags never establish participation. Marker coordinates (including zeroes) are not used. Existing deterministic name normalization reconciles only card/marker punctuation; source names/addresses are preserved and named-participation matching retains the existing resolver rules. Tampines One never becomes Tampines 1 by a fuzzy alias.

Direct fetch previously imported security helpers from source-evidence/resolver, which transitively exposed PromotionSignal types. To remove that dependency completely while leaving the legacy module byte-identical, direct-sources/network-target.ts contains the same public-address/target policy within the independent direct transport tree. Existing SSRF/transport fixtures cover it. Domain Promotion remains shared only for schema/publication semantics and compatible legacy provenance.

A processor update supersedes older unresolved processor candidates on the same source revision; it does not create a revision. Reviewer-resolved/excluded decisions survive identical revision replay. Revision evidence sorting uses code-point ordering, independent of locale and crawl time. The migration checks artifact length/hash in PostgreSQL as well as in the persistence service.

The existing ordinary offer-edit endpoint reconstructs direct references from promotion_direct_sources plus trusted source configuration and preserves historical legacy references. Direct source fields are read-only in the existing form. Generic exact attachments during administrator completion retain administrator ownership; autonomous provenance attachment does not alter facts or revision.

Latest direct provenance advances even for an incomplete or admin-blocked authoritative revision; published facts remain unchanged. Historical immutable revisions retain prior evidence. The review candidate records the new draft and prior Promotion, so linkage freshness is distinct from fact replacement.

Selected scope with an explicit participating-name list is bridged to the existing exact named-outlet resolver, never to a discovery query. Selected scope without names remains unresolved. Health updates are observation-order guarded: an older rejected crawl cannot replace the status of a newer successful attempt. Last-success advancement remains transactional.
