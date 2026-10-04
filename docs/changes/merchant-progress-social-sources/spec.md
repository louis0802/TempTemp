# Specification

## Observable requirements

S1. Every normalized historical merchant appears once; historical signal/offer fields remain. Coverage denominator includes only positive historical signal counts. Registry-only merchants and unresolved historical records are separately reported without guessing identity.

S2. Each row retains independent website/social/platform source tracks with ownership, enumeration, extraction, adapter, activation, publication, blockers and evidence. Summary precedence is enabled acquisition, shadow adapter, usable candidate, researched blocked, unassessed. A blocked track cannot hide an enabled/candidate track.

S3. Acquisition enablement is distinct from complete-candidate automatic publication and incomplete-candidate review. Stages (discovered, ownership_verified, source_boundary_known, adapter_shadow, acquisition_complete, production_enabled, blocked) are supported by recorded state. Current enabled/shadow/blocked website states remain.

S4. Generate merchants.json, report.md and report.csv plus docs/research/merchant-automation-progress.md from the same data. Summary counts, source-definition counts, distinct-adapter counts, deterministic next actions and named filtered cohorts are row-derived. Repeated replay is byte-identical.

S5. Build social inventory from canonical_candidate_url in the corrected frozen audit, retaining transport fallback and source association. Only offer-associated signals enter merchant social tracks. Exact account identities stay separate across accounts/platforms; unscoped posts remain unresolved until independent account association exists. Publisher accounts never acquire merchant authority from discovery.

S6. Independently verify account ownership through an exact backlink from a captured, reviewed merchant-controlled website/legal/official page. Branding/search labels/Telegram are insufficient. Missing, conflicting and mismatched ownership fails closed. Record evidence URLs, bytes/hashes and review notes.

S7. Shared social-host trust requires HTTPS, exact host/account and supported content paths. Accountless content URLs require explicit independent account-to-post proof. Existing direct and legacy source records stay compatible; social provenance is distinguishable. No parallel social database tables.

S8. Select approximately four to six independently verifiable accounts from the frozen cohort with useful content/venue variation, then test public profile, canonical post/reel identity, caption, association, chronology, continuation and access restrictions with the same semantics. Inaccessible semantics are recorded as unproven, not complete. No credentials or bypass.

S9. Create a shared Instagram acquisition adapter only when at least two verified accounts demonstrate equivalent safe public enumeration. Enable no social source without deterministic bounded enumeration and replay plus ownership/extraction/publication gates. Linked-post access alone is insufficient.

S10. Text-only social evaluation requires explicit promotion semantics. Publication time is not validity; image/video-only facts remain unknown. All-outlet wording may use existing authoritative directories; unnamed selected outlets require review. Existing exact-fingerprint reconciliation and conflicting-fact review remain the common publication semantics.

## Decisions and assumptions

The frozen merchant census is preserved, including unresolved historical labels. Social research may attach to an existing merchant through explicitly checked identity evidence; it will not rewrite historical records or their counts. Social accounts discovered only by independent backlinks will retain separate frozen post association status. A failed public-acquisition batch is a completed research result and creates no speculative production adapter. No consequential product decision requires approval before proceeding.
