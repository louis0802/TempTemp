# Design

## Existing boundaries

scripts/research/build-merchant-source-map.ts pins the reviewed corpus, frozen corrected signals and direct audit. scripts/research/merchant-source-map/build.ts owns normalization and reporting. The direct registry contains seven source definitions (two enabled, five shadow), while the batch assessment records CS Foods as blocked without an adapter. The existing 139 rows include 138 historical merchants and one registry-only operator; unresolved records remain outside rows.

## Ledger

Replace single-source selection with all explicitly matching registry sources plus research tracks. Preserve old scalar presentation fields against their representative direct source (enabled first, then source ID); source_tracks is authoritative for the multi-source view. Derive automation_progress, stages, acquisition/publication/review flags, main_blocker, remaining_path and next_action across tracks. Source definitions are counted independently of merchant rows and distinct adapter implementation names. Explicit captured Paradise linkage remains the only operator-to-brand mapping; no fuzzy aliases. Kris+ declares issuer_platform in the existing trusted definition; its acquisition/publication activation does not change.

Read social inventory/reviews as optional local inputs for legacy callers; the canonical generation command requires the checked artifacts. Inventory consumes corrected audit offer links and canonical candidate URLs, keeps accountless content identities separately, and joins only exact normalized merchant labels or explicit research-reviewed signal identities. Source track candidates never confer runtime authority.

## Social trust and research

Add a small source-scope module shared by transport and publication validation. Source definitions optionally declare sourceKind and socialScope. Instagram account-scoped paths require exact account. Accountless /p, /reel and /tv paths require an independently evidenced content binding in trusted server configuration. A social hostname in a legacy web definition fails closed. Keep website return objects compatible; emit optional social provenance fields only for social sources.

Ownership reviews refer to captured official backlink pages and explicitly reviewed merchant-controlled domains. A deterministic checker validates exact hyperlinks and identity/conflicts. Research captures public HTML only through the existing bounded, public-address transport, without cookie headers or persistence. Stop at access/login/challenge responses and retain status/hash plus safe public bytes, not response cookies. A conservative offline probe reports visible identities and unresolved boundary rather than reverse-engineering embedded private API state. Text semantics are evaluated separately from acquisition and cannot publish.

The four verified accounts' public linked-post standard metadata supplies exact account/native-ID bindings. Conflicting canonical/author/account metadata fails closed. Captions come from the associated public Open Graph title, while publication times come only from explicit publication/time metadata. Three profiles expose links and show-more continuation; one is a profile shell. None is acquisition-complete, so all four research assessments are blocked on bounded coverage/permission and no runtime social adapter/source is created. The evaluator remains outside the direct runtime dependency closure.

No database migration, source-ID expansion or publication processor bump is needed while no social adapter qualifies. Existing candidates, outlet resolution and origin-agnostic publication reconciliation remain authoritative.

## Rollback and determinism

All new outputs are local/research artifacts. Frozen audits and baseline captures are not edited. Provenance pins hashes; output ordering and unique-count bases are deterministic. Revert this slice's files to restore the old report. Runtime changes are restricted to compatible trust/provenance validation, with website/legacy regressions checked.
