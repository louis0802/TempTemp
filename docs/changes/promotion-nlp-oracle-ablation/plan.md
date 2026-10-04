# Plan

- [x] Read attached request, repository guidance, V4 contracts, reviewed benchmark and sealed-run evidence. Snapshot preexisting bytes.
- [x] Write intent/spec/design/plan and fixed methodology/contracts before application/research implementation.
- [x] Implement deterministic inventory, private oracle projection, equivalence scorer, O0, sealed-V4 ceilings and independent tasks.
- [x] Add focused integrity/blindness/equivalence/span/lifecycle/isolation regressions. Run focused, all NLP, full unit, typecheck, scoped lint, formatting and diff checks.
- [x] Repair scorer/projection/interpretation only until O0 is perfect. Compute span coverage and ceilings. Freeze all experimental inputs and implementation before any model.
- [x] Execute exactly one fresh agent per A/B/C/D/E task, <=4 active; exclusively persist first raw before parsing; no retry/fallback/judge. Independently seal each arm.
- [x] Score frozen outputs, inspect all normalization/critical outputs against source, document benchmark minimum-annotation limits, verification, critical diagnostics and decision.
- [x] Verify seals/configuration/uniqueness/no leakage/reprojection and prior/protected bytes. Deliver complete report without commit/push.

Checks map to spec 1/2/5 with projection/span/scorer tests, spec 3 with ceilings audit, spec 4/6 with lifecycle/seals/blindness tests and post-run verification, spec 7/8 with frozen thresholds/results/decision. Main risks are minimum-annotation equivalence collisions, model contract malformation, absent tool-level mechanical denial, and infrastructure failure; report each without weakening acceptance criteria.

Completed 4 October 2026 (Singapore). All249 experimental agents completed and closed. Five seals/protected bytes verified; fixed research gates fail, recommendation STOP_AUTONOMOUS_EXTRACTION, A2 unauthorized. Post-seal review clarifies minimum-annotation split flags, field-versus-array retention, positive-edge precision excluding abstention, and identity-contract versus complete-annotation loss ledgers; frozen artifacts unchanged. No production or release deviations.
