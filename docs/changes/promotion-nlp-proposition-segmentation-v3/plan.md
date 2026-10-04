# Plan

1. [x] Inspect existing guidance, V1/V2 research architecture and 49 source cases; snapshot existing bytes.
2. [x] Write intent/spec/design/plan before code, state assumptions and document checkpoint.
3. [x] Implement parallel segmentation, extraction, prompts and thin validator (AC2–3).
4. [x] Annotate/review 49 captured cases, equivalent boundaries and semantic definitions; implement scorer and two-seal runner (AC1–4).
5. [x] Add meaningful isolation/integrity/semantic regressions and run every prelaunch check; freeze files (AC5).
6. [x] Execute 49 first-response segmentation agents, persist and seal; automatically generate/execute one fresh extraction agent per usable unit, persist and seal (AC2).
7. [x] Score only after both seals, review all outputs, compare V2 and critical families; record honest A/A2 decision (AC4).
8. [x] Verify both seals, unique configurations, captured/prior/protected byte hashes; synchronize evidence/documents and review diff (AC1, AC5).

Risks: free-form JSON syntax failure, semantically wrong Stage-1 attachment, omission/oversegmentation and still-wrong local fact roles. No retry or semantic repair is allowed. All 49 sources stay in source denominators; all generated units stay in extraction reliability denominators. Optional gold-stage review is deferred until both seals to strengthen blindness.

## Execution evidence and deviations

Completed 49 segmentation and78 extraction agents, maximum four simultaneous, with fixed model/settings and first responses only. Two exact-span source rejects and ten malformed extraction responses were preserved. Actual unit count78 was derived automatically, never predetermined. Gold scoring followed both seals. Automated anchor/whole-clause flags required parent source review; frozen code/annotations were preserved, and the overlay is separately labelled. Semantic readiness remains A. Complete evidence is in evaluation.md, source-review.json and verification.md.
