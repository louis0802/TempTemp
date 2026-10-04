# Specification

## Observable requirements

1. Recovery evidence persists a source-level proof containing the strategy, durable publication checkpoint, traversal bounds, oldest publication observed, checkpoint crossing, overlap, terminal/cap state, ordering, pagination completeness, and explanatory reasons.
2. SourceRecovery.status is derived from that proof. A successful current listing request alone never produces complete.
3. Successful live observations of supported dated archives persist a durable source checkpoint containing observation time, newest/oldest publication time observed, overlap identities, and traversal boundary/cap state. Restarts are idempotent.
4. confirmgood_deals, eatbook_deals, and everydayonsales_food can produce complete after reverse-date traversal reaches the prior checkpoint and consumes one bounded overlap page without ordering/pagination/fetch/cap failures.
5. Publication dates, not promotion validity dates, define the historical traversal boundary.
6. Detail/extraction failures remain distinct from historical enumeration completeness. A listing traversal may prove historical completeness while extraction remains incomplete under existing source rules.
7. singpromos_ongoing remains partial because the current/active index does not establish downtime publication history. mustsharenews_deals remains partial while archive freshness/cache ordering cannot be proven by the existing adapter.
8. A checkpoint not reached before the safety cap, a repeated page/pagination loop, an ordering violation, or a listing failure can never produce complete.
9. A complete recovery covering every independent-source cadence gap may make acquisition content complete while the cadence gaps remain visible. Replacement scoring may become eligible; temporal scoring stays ineligible.
10. Re-running an already persisted recovery performs no additional fetches and creates no duplicate candidates or occurrences.
11. The tracker exposes per-source runtime catch-up capability, latest durable checkpoint, latest recovery status/window, checkpoint crossing, pagination completeness, and limitation. It keeps the statement that content recovery does not restore live coverage.
12. Revision-3/4 and pinned revision-5 hashes remain unchanged.

## Acceptance scenarios

- ConfirmGood, Eatbook, and EverydayOnSales fixtures cross a live checkpoint plus overlap and return complete.
- Cap-before-checkpoint, repeated-page, inconsistent-order, and listing-without-proof fixtures remain partial/failed.
- An offline-day fixture with complete Telegram content recovery, complete independent-source recovery, and completed manual review has replacement scoring eligible, temporal scoring ineligible, benchmark recall populated, no lead/lag, and visible observation gaps.
- Repeated restart reuses immutable recovery evidence without refetching.
