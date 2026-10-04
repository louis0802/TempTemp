# Revision 5 specification

Content backfill is allowed; observation backfill is forbidden. Hourly Telegram slots retain five-minute tolerance; publisher passes remain every three hours and directory/campaign passes daily. Acquisition remains target-blind and manual review precedes scoring.

Acceptance criteria:

- A: Complete live days can qualify for both replacement and temporal scoring after review.
- B–D: Downtime recovery retains missing slots/passes, publication time, actual first-seen/recovery time and catch-up provenance. Offer matches count for replacement only when content completeness is proven; catch-up never supplies timing.
- E: Recovery reports complete, partial, unsupported or failed with explicit limitations. A successful current listing alone never proves historical completeness.
- F: Restarts reuse durable checkpoints without duplicate posts/candidates/occurrences.
- G: Elapsed revision-5 calendar days reconcile, freeze partial reasons and recovered content by supported publication/event day, then open the current day.
- H: Historical revision-3/4 assets and sealed evidence remain unchanged. Active revision 4 remains pinned; new intervals default to revision 5.

Strict scoring_eligible retains temporal requirements. Revision-5 replacement denominators are distinct from legacy strict metrics. Tracker and metrics commands remain read-only. Unknown source publication dates do not justify assigning content to a historical day. Existing generic adapters may recover visible content but cannot prove full historical enumeration; expose that limitation rather than inventing adapters.

Recovered offer validity is reviewed against its supported logical day; an offer that expired before receipt may still be a valid offer for that day. Validity dates alone never establish historical publication or availability.
