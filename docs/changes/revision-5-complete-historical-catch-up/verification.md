# Verification

## Outcome

Revision 5 now has proof-based complete historical catch-up for the three highest-value dated enumerable archives:

- `confirmgood_deals`
- `eatbook_deals`
- `everydayonsales_food`

The frozen revision-5 protocol and registry were not edited. Runtime capability upgrades only these three adapters.

`singpromos_ongoing` remains partial because an active/current-offer index does not prove publications made during downtime. `mustsharenews_deals` remains partial because stale/cache/order ambiguity prevents deterministic historical traversal proof. Other sources retain partial or unsupported runtime capability according to their enumerability and frozen constraints.

## Implemented proof

Listing evidence carries source-backed publication timestamps for the three dated archives. A durable research-root checkpoint records the last successful live observation, newest/oldest publication timestamps, URL + content-hash overlap identities, observed pages, terminal state, and cap state.

Recovery can be `complete` only when a supported dated-archive traversal:

- has a durable live checkpoint,
- preserves non-increasing publication order,
- crosses the checkpoint publication boundary,
- verifies a prior URL + content-hash overlap identity,
- consumes one deterministic page beyond the overlap when pagination is available, or reaches the terminal page,
- avoids cap truncation, repeated page bodies, pagination URL loops, unresolved pagination, and listing failure.

Detail-fetch and semantic-extraction failures remain separate from historical enumeration proof.

Checkpoint persistence occurs only after a successful revision-5 **live** tiered pass. Catch-up passes never advance it. Existing research directories can seed a missing checkpoint from their latest persisted successful live pass.

## State transition

The intended recovery transition is:

`successful live pass → durable checkpoint → service offline → immutable cadence gaps → restart → dated archive traversal → checkpoint boundary crossed + overlap verified → content recovery complete`

The original scheduled gaps remain visible. A recovered interval may therefore become replacement-eligible while remaining temporally ineligible:

`replacement_scoring_eligible = true`

`temporal_scoring_eligible = false`

Recovered benchmark recall remains available, while lead/lag timing excludes catch-up observations.

## Verification results

- `npm run research:monitor:test` — passed: 11 test files, 92 tests.
- `npm run typecheck` — passed.
- Scoped ESLint on the changed research TypeScript/test files — passed.
- Scoped Prettier check on changed TypeScript, test, tracker, and change-document files — passed.
- `git diff --check` — passed.
- Revision-5 protocol SHA-256 remains `0720d14d4213f592fde4b8da7eae273f2fcf75c26a33a482581d0cca9b19114c`.
- Revision-5 registry SHA-256 remains `3cc285b4e3192eb52f5d54405876270e87bf1e4b3e03ced5a5268f22c2fa57aa`.

The rev5 regression coverage includes successful complete traversal for all three dated archives, cap-before-checkpoint partial recovery, repeated-page rejection, publication-order rejection, unproven listing success remaining non-complete, recovery idempotence, replacement/temporal scoring separation, cadence-gap preservation, and pinned-hash checks.

## Protocol revision

No new protocol revision is required. This change implements runtime adapter capability and proof while preserving the frozen revision-5 semantic assets and hashes.
