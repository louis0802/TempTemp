# Revision 5 design

Extend pinned protocol loading with immutable revision-5 assets and hashes. Keep revision-3/4 branches compatible. Telegram uses its existing paginated preview collector from the persisted complete-through checkpoint; successful traversals establish bounded content coverage, never scheduled coverage. Persist provenance on posts and polls.

Use a separate discovery/recovery directory per logical interval and recovery window, with immutable result metadata and existing per-source capture checkpoints. Never write catch-up work into historical scheduled pass paths. Merge recovered occurrences with actual receipt times; publication/event timestamps, when available, determine historical assignment. Undated recovered offers remain in recovery evidence with explicit day-assignment limitations. Generic listing infrastructure cannot prove historical continuity: enumerable sources are partial, probes unsupported, fetch failures failed.

Freeze content completeness separately from cadence coverage. Reconcile overdue revision-5 intervals before freezing, and reuse durable recovery results on restart. Evaluate replacement records independently, retaining legacy strict scoring_records for temporal-eligible intervals. Live timing uses explicit live occurrence/post provenance only. Report separate cumulative revision-5 replacement and temporal families and read-only tracker capability summaries. No new source-specific adapters or production dependencies.

Reliable timezone-bearing detail publication metadata also permits retaining offers that expired during downtime. Review uses the supported logical day, while receipt/recovery timestamps remain unchanged. A historical validity window alone is insufficient for day assignment.

The research-only Telegram wrapper reuses the strict preview paginator/parser and retains already fetched posts when the cutoff cannot be reached. Such polls remain failed scheduled observations with `recovery_status: partial`; their channel complete-through checkpoint never advances. Revision-3/4 collection still uses the original strict collector.
