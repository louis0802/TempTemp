# Revision 5 verification

Implemented research-only content recovery with immutable scheduled gaps, explicit live/catch-up provenance, durable source checkpoints and independent replacement/temporal scoring. New intervals default to revision 5; active historical intervals remain pinned.

## Frozen hashes

- Protocol SHA-256: `0720d14d4213f592fde4b8da7eae273f2fcf75c26a33a482581d0cca9b19114c`
- Registry SHA-256: `3cc285b4e3192eb52f5d54405876270e87bf1e4b3e03ced5a5268f22c2fa57aa`
- Revision-4 protocol remains `7843360048f335be579bef859396d0c9390a133097e3f6e1a02d9c19c4164791`.
- Revision-4 registry remains `ffa84b3be3d5db779ac6ca7ceb56370f7338aacd6538ae6bf01bde0834f6b6b1`.
- Revision-3 protocol/registry pins remain unchanged and are exercised by the legacy tests.

## Verification evidence

- `npm run research:monitor:test`: 88 tests passed across 11 files. Includes A–H, complete 24-slot/54-source-pass cadence, delayed publication recovery, retained expired offers with reliable publication metadata, failed/partial Telegram traversal with exposed-post retention, repeated recovery reuse, overdue publication-day freezing and refusal to recover into historical/sealed evidence.
- `npm run typecheck`: passed.
- Scoped ESLint: passed without warnings for the nine modified research TypeScript files and three modified/new research test files.
- Scoped Prettier: passed for those TypeScript/tests, the two new JSON assets and affected documentation. Historical JSON assets were excluded from formatting.
- `git diff --check`: passed. Research work was already largely untracked at task start, so this command alone is not a full research diff review; explicit file review and scoped checks were also performed.
- Both `npm run research:monitor:tracker` and `npm run research:monitor:tracker -- --json`, plus `npm run research:monitor:metrics`, ran against existing local evidence as read-only checks.
- SHA-256 comparison of 2,138 protected files found no changes. Includes all pre-existing `.local` files, historical protocol/registry assets, `next-env.d.ts`, `AGENTS.md` and `package.json`. No historical evidence was migrated, deleted or rewritten.
- Production ingestion was not invoked. No production database connection/write was made. Runtime acquisition tests used mocked collectors/fetchers and temporary roots; no worker or continuous service was started. No commit or push.

## Offline → restart → catch-up

1. Persist actual last Telegram complete-through boundaries, source pass/checkpoint state and missing scheduled slots.
2. On restart, poll exposed Telegram history from the existing checkpoint at the actual current time. Newly recovered posts retain publication time and actual first_seen/recovered timestamps; missed 22:00/23:00 slots stay missing.
3. For source cadence gaps, enumerate registered sources without benchmark targets in a separate durable recovery namespace. A completed recovery window is reused on restart; candidate IDs and occurrences merge idempotently. Interrupted scheduled passes remain failed rather than resuming into historical success.
4. Before closing each overdue rev5 day, merge recoverable source content and assign dated recovered content to the supported logical day. Undated content is retained with historical assignment limitations, never invented publication times. Freeze explicit partial reasons and observation seals, then advance to the next day/current day. Final evaluation sealing requires reviews.
5. Complete content plus reviews can qualify replacement records. Temporal qualification additionally requires scheduled coverage, and timing uses only explicit live first-receipt evidence. Legacy strict metrics and rev5 families have separate denominators; historical evaluations cannot advance the rev5 gate.

## Current adapter limitations

Completeness refers to exposed source history, never deleted/transient content. Telegram can establish bounded traversal when its existing collector reaches the checkpoint; failed traversal remains incomplete; already fetched posts are retained as partial catch-up without advancing the checkpoint. No existing independent adapter proves full historical continuity, even when its current listing returns successfully. This intentionally blocks replacement eligibility for affected downtime windows. No production-grade adapters were added.

### Partial historical recovery

- `singpromos_ongoing`
- `confirmgood_deals`
- `eatbook_deals`
- `mustsharenews_deals`
- `everydayonsales_food`
- `great_world_promotions`
- `jewel_student_privileges`
- `jewel_ticket_privileges`
- `singapore_river_festival`
- `grab_promo_codes`
- `divedeals_food`
- `hsbc_dining`
- `syioknya_central_food`
- `ordinary_patrons_news`

### Unsupported historical recovery

- `capitaland_mall_deals`
- `jewel_general_promotions`
- `grab_full_house`
- `grab_dineout_directory`
- `misslobang_roundup`

Independent publication metadata currently supports explicit timezone-bearing `article:published_time` and `time[itemprop=datePublished]` values. Unknown dates, unsupported source routes, cap truncation, failed detail extraction and inaccessible listings remain limitations. Recovery observations do not support lead/lag. Offer validity for supported historical days is reviewed against the logical day, not shifted to the receipt date.

## Files changed for this task

- `scripts/research/source-monitor/protocol.ts`
- `scripts/research/source-monitor/telegram.ts`
- `scripts/research/source-monitor/discovery.ts`
- `scripts/research/source-monitor/recovery.ts`
- `scripts/research/source-monitor/passes.ts`
- `scripts/research/source-monitor/service.ts`
- `scripts/research/source-monitor/intervals.ts`
- `scripts/research/source-monitor/evaluation.ts`
- `scripts/research/source-monitor/tracker.ts`
- `scripts/research/source-monitor/protocol/protocol-revision-5.json`
- `scripts/research/source-monitor/protocol/source-registry-revision-5.json`
- `tests/research-v4.test.ts`
- `tests/research-v5.test.ts`
- `tests/research-tracker.test.ts`
- `docs/research/source-substitution-tracker.md`
- `docs/changes/source-substitution-recovery-v5/intent.md`
- `docs/changes/source-substitution-recovery-v5/spec.md`
- `docs/changes/source-substitution-recovery-v5/design.md`
- `docs/changes/source-substitution-recovery-v5/plan.md`
- `docs/changes/source-substitution-recovery-v5/verification.md`
