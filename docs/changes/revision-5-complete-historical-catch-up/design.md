# Design

Keep revision-5 semantic assets frozen. Complete-recovery capability is an implementation property of the research adapter, so it is represented in runtime recovery/checkpoint evidence rather than by editing source-registry-revision-5.json.

ListingCard carries an optional normalized publication timestamp extracted from the listing itself. ConfirmGood and EverydayOnSales use their time.entry-date.published datetime values; Eatbook uses the dated archive card label. Historical proof never uses promotion start/end dates.

A durable checkpoint is stored outside sealed interval evidence under the research data root. It records the source, last successful live observation, newest/oldest publication timestamps observed, overlap URL/content-hash identities, page count, and terminal/cap state. Existing successful live pass snapshots may seed the checkpoint when upgrading an already-running research directory.

Recovery supplies the dated adapter with the durable target. The normal listing traversal verifies non-increasing publication order, detects repeated page bodies and URL loops, and records each page. Once an overlap identity at or beyond the checkpoint boundary is seen, traversal consumes one additional deterministic page when available and may stop without treating the intentionally unvisited older archive tail as truncation. If the checkpoint is not reached before the registered safety cap, the proof remains partial.

recovery.json stores an explicit proof. complete requires the supported dated strategy, a durable checkpoint, checkpoint crossing, overlap verification, verified ordering, deterministic pagination through the overlap page, no listing failure, no repeated page, and no cap truncation. Extraction/detail failures are reported separately and do not change this historical-enumeration proof.

Runtime capability mapping upgrades only confirmgood_deals, eatbook_deals, and everydayonsales_food. SINGPromos is still an active-offer index without publication-history proof. MustShareNews retains its documented stale/cache ambiguity, so both remain partial.

summarizeRev5Acquisition continues to treat cadence and content separately. A complete recovery may satisfy content coverage for a gap window, but summarizeDiscoveryPasses retains the original missed slots. Evaluation therefore keeps replacement and temporal eligibility independent.
