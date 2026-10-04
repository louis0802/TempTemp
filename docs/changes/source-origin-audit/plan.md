# Plan

- [x] Inspect source-evidence abstractions, parser, collector, local evidence and project commands; capture registry and evidence-tree hash baselines.
- [x] Write consistent intent, spec, design and plan before application/module implementation.
- [x] Implement independent input sampling, topology/authority review, cache resolution, summary and report modules plus CLI and npm script.
- [x] Add empty review template and concise research architecture/run instructions.
- [x] Test all specification cases, including immutable evidence and recursive import boundary.
- [x] Run focused/full unit checks, typecheck, lint, targeted formatting and diff checks; resolve actionable findings.
- [x] Run frozen sample 50, explicitly refresh if fewer than 30 promotions, then replay offline and verify semantic byte stability.
- [x] Compare production registry and complete source-discovery-service hashes with baseline. Review final diff and document actual metrics, limitations and changed files.

Risks: public previews may be limited, redirect endpoints can fail, URL topology cannot prove merchant identity, multi-offer posts can share source-level links. Reports expose each limitation. No production/worker/monitor/commit/push step is authorized.

## Execution discoveries

- Frozen local evidence contained 16 unique posts and only 8 promotion signals. The initial sandbox attempt could not resolve DNS. Automatic network approval was rejected, then the user explicitly approved the one-off public refresh and extracted-link resolution. Network-enabled frozen replay resolved all 8 shortlinks; refresh provided the 50-signal sample without starting the monitor.
- The captured refresh contained multi-offer roundups whose neighboring source-post links would inflate origin metrics. Keep all 89 context associations in records, but use only offer-associated links for candidate, class, family and domain counts. Add regression coverage preventing an unresolved offer from inheriting a neighboring offer's successful origin.
- Observed Google /url wrappers and Happy Point app URLs required explicit research topology rules. Reclassify captured evidence offline without another fetch. Production classification remains unchanged.
- Default concurrent unit run timed out in two existing research fixtures; one-worker execution passed without timeout/configuration changes. Repository lint includes ignored local scratch files with five pre-existing explicit-any errors. New-file lint and all non-local lint pass; do not alter historical scratch evidence or weaken lint configuration.
- Promote the captured research redirect-cache snapshot over the initial sandbox-failure cache, keeping research-only offline defaults useful. Save corrected reports with original one_off_refresh provenance and note offline semantic replay in run.json.

Acceptance evidence and exact change inventory: [verification.md](verification.md).
