# Independent review findings and disposition

Reviewer agent ID `01a111ab-eb07-7f32-a1b5-fe7daf7c7a94`; requested gpt-6-luna/medium, fork_context=false, not involved in implementation. Backend identity attestation and usage unavailable.

- P2 MVP Available-now filter incorrectly used strict redeemableNow=false: fixed policy-aware active+Within-listed-hours filter/label, desktop/mobile6/6regression.
- P1 mechanical report lacked per-row semantic review: reviewed104 changed/addition rows, retained v1/v2 exact hashes;34 boundedfact/abstention approvals,70withheld. Hash-checked review application keeps207corpus records and prevents70withheld from live.
- Four semantic examples corrected with regressions: ambiguousallmonthabstention, inclusiveweekday ranges, quotadaily separation, rhetoricalweekday recurrenceabstention. Original corpus/baselines unchanged.
- P2 outputguard could replace input/frozen JSON: now guards all reviewinputs,477protectedpaths, frozenconformance, feature-doc subtree, optionalobservations inputfolder, Googlecache and captured-provider fixtures; CLIbyte-preservation tests pass.

Final R verdict: no open actionable findings remain for reviewed guard issue; generated separate local opt-in artifact is safe to preserve, defaultlegacy unchanged. This review is independent agent review, not human gold/approval or a whole-corpus accuracy claim. Public enablement was not performed.

Detailed row conclusions: [semantic v1](evaluation/semantic-review.md), [semantic v2](evaluation/semantic-review-v2.md); checks and limits: [verification](verification.md).
