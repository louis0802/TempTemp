# Plan
1. [x] Verify baseline and inspect routes, model, map, dialog, tests and installed Next page guidance.
2. [x] Implement explicit serving modes, environment gates and raw response presentation.
3. [x] Implement deterministic grouping, both renderers and accessible location selection.
4. [x] Add grouping, fixed-date serving, production gating and desktop/mobile regression tests.
5. [x] Run npm test, integration, corpus, analyze:mvp, typecheck, lint, build, targeted Playwright and diff check. Inspect UI screenshots and acceptance criteria.
6. [x] Record counts, Suntec example, results and limitations; commit only related files and verify preserved next-env.d.ts.


Verification evidence and remaining limits are recorded in verification.md. No source data or conformance expectations were regenerated. The audit script only changes its serving selector argument from false to "live" to match the explicit mode type. Added the narrowly scoped loopback development configuration after a reproducible hydration failure; no production configuration was relaxed.
