# Revision 6 intent

Make the source-substitution study usable after several hours of local downtime while preserving evidence integrity. Revision 5 proved safe content recovery but required complete historical recovery across the entire 19-source registry, so any partial or unsupported supplemental source could make an otherwise recoverable day unscorable.

Revision 6 freezes a production-like primary replacement cohort before observing revision-6 benchmark outcomes:

- `confirmgood_deals`
- `eatbook_deals`
- `everydayonsales_food`

These sources are independently enumerable and have deterministic dated-archive recovery with durable checkpoint overlap. The other sixteen registered sources remain supplemental evidence. Supplemental discoveries and failures remain visible, but they cannot block primary replacement scoring, rescue a core miss, improve core fact completeness, or enter primary timing metrics.

The critical invariant is unchanged: content backfill is allowed; observation backfill is not. Catch-up can restore replacement content only when the existing strict recovery proof succeeds. Scheduled cadence gaps remain historical facts and keep temporal scoring ineligible.

Success means an offline interval can become primary replacement-eligible when all three frozen core sources and Telegram benchmark content are complete and required reviews are complete, even if supplemental sources remain historically incomplete. Existing revision-3/4/5 assets, intervals, sealed evidence, and semantics remain immutable. No production ingestion, database write, scheduling, commit, or push is in scope.

Operational delivery keeps the worker stopped: the code defaults future intervals to rev6 when the service is next started through the existing lifecycle. Verification uses controlled local fixtures and read-only inspection of existing evidence; it does not collect new live benchmark outcomes or deploy the study.
