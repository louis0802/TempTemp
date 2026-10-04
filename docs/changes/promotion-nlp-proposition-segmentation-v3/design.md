# Design

Parallel research modules: segmentation-v3.ts, schema-v3.ts, prompt-segment-v3.ts, prompt-extract-v3.ts, validator-v3.ts and benchmark-v3.ts. Existing normalization/calendar helpers are read-only dependencies. The V3 runner is disconnected from production and provider APIs.

Strict segmentation objects retain supplied unique IDs/order, max eight; all central/supporting/unassigned strings must be individual exact normalized-source spans. Stage 1 structural/evidence rejection applies to the whole source without truncation or repair. Units remain separate strings: evidence may not cross quote boundaries.

The runner prepares allowlisted Stage-1 tasks from existing blind source projection, freezes implementation/annotation/semantic-definition bytes and capture hashes without interpreting V3 gold. Exclusive launch/response records bind task/prompt/input hashes and unique agents. Stage-1 raw seal binds manifest, launches and every record. Automatic task generation verifies the seal and projects only case ID, proposition ID, neutral hints and quotes. Extraction seal additionally binds the Stage-2 task manifest and Stage-1 seal. Gold loading occurs only in post-extraction-seal scoring. Launch registration is serialized and rejects agent reuse, fixed-configuration changes, duplicate tasks and more than four unfinished tasks. Tool denial is prompt-enforced; no mechanical tool-disable parameter or backend revision is available.

Thin local validator checks syntax/evidence and generic domain exclusions, never merchant-specific semantics or siblings. Semantic association/polarity and qualifier errors are benchmark/source-review responsibilities. Per-field rejections remain auditable separately from raw outputs. No research-to-production candidate mapping is needed.

Benchmark units use alternative exact central anchors and required/forbidden/ambiguous source clauses; field targets and identities permit source-equivalent labels. Frozen comparisons are review flags, not an entailment oracle. Parent reviews all outputs and records dispositions without changing frozen scoring or annotations. Stage-1 versus Stage-2 attribution uses sealed evidence membership.

No UI or Next application behavior changes; relevant installed Vitest guide read. No DB/integration/e2e/live tile checks needed. Rollback removes only new V3 files.

## Observed implementation/evaluation limits

Bari Salad group correlation survives one sealed unit and leaks into flat extraction timing; Stage-1 isolation cannot protect terms that Stage 1 groups incorrectly. Central-anchor gold matching misses some equivalent boundaries and this supporting-group merge. Parent review retains original scores and records explicit overlays. Generic collective place labels without coverage prefixes pass the frozen domain filter. Atomic constraints inherit whole-clause annotation limitations; semantically valid overlapping attributes are reviewed against the original definitions. These are research findings, not patched away after launch.
