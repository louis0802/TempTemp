# Verification — 30 September 2026

Implemented the independent research CLI `research:source-origin:audit`, using the existing production signal/link/redirect/cache/classification abstractions unchanged. No ingestion or application implementation changed. Full document workflow: [intent.md](intent.md), [spec.md](spec.md), [design.md](design.md), [plan.md](plan.md).

## Actual sample and reports

Frozen-first network-enabled run: `.local/source-origin-audit/2026-09-30T13-07-09-620Z/`. It inspected 16 posts, retained 8 non-offers, parsed 8 promotion signals, resolved 8 shortlinks and exposed 7 social plus 1 Kris+ app candidate. All ownership remained unverified. This is below 30 signals, so an explicitly authorized one-off refresh followed.

Final refreshed report: `.local/source-origin-audit/2026-09-30T13-08-06-774Z/report.md`; structured `audit.json`, CSV, signals and redirect evidence are alongside it. The run collected 140 unique posts in a bounded public preview fetch, inspected the latest 63 to reach the requested sample, and never mixed frozen posts into refreshed input. Recorded collection pages and coverage are in that run's `telegram-raw.json`. Captured reports were reclassified offline after the final association/topology corrections; `run.json` records that replay, with original one_off_refresh provenance preserved.

| Measure                                                                   |  Result |
| ------------------------------------------------------------------------- | ------: |
| Posts inspected                                                           |      63 |
| Parsed promotion signals                                                  |      50 |
| Retained non-offer signals                                                |      27 |
| Signals with outbound / offer-associated links                            | 50 / 50 |
| Unique shortlinks resolved / unresolved                                   |  48 / 3 |
| Signals reaching direct merchant/issuer/app/social candidates             |      45 |
| Social candidate signals                                                  |      29 |
| App/deep-link candidate signals                                           |       2 |
| Signals requiring deeper publisher resolution                             |       1 |
| Signals with unresolved offer links                                       |       3 |
| Successfully resolved unknown destinations                                |       0 |
| Unique resolved domains                                                   |      15 |
| Verified official source URLs                                             |       0 |
| Neighboring source-post context link records, excluded from origin counts |      89 |

The three unresolved URLs return HTTP 403: two Grab-related bit.ly links and a BBRC Cafe tco.sg link. Successful Google /url wrapping is intermediate, not a verified merchant origin. Social, Happy Point and Kris+ hosts are candidate topology only. No authority review entries were fabricated.

## Destination classes

Counts use offer-associated link records, not neighboring roundup links. The 56 records include one duplicate Facebook association and several Telegram contextual links attached to the relevant offer. Non-offers are excluded.

| Class                                                                  | Count |
| ---------------------------------------------------------------------- | ----: |
| official_social_candidate                                              |    29 |
| merchant_web_candidate                                                 |    13 |
| telegram                                                               |     5 |
| unknown (failed resolution, not unknown successful final destinations) |     3 |
| app_or_deep_link                                                       |     2 |
| issuer_or_platform_candidate                                           |     2 |
| link_hub                                                               |     1 |
| publisher                                                              |     1 |

## Adapter families and concentration

No weighted ranking. Family counts count offer-associated link records; concentration counts distinct signal IDs within each family and may overlap across families.

| Family                 | Link records | Signal concentration |
| ---------------------- | -----------: | -------------------: |
| official_social        |           29 |                   29 |
| merchant_campaign_page |           13 |                   12 |
| link_hub               |            6 |                    4 |
| unresolved             |            3 |                    3 |
| app_deep_link          |            2 |                    2 |
| issuer_platform        |            2 |                    2 |
| publisher_article      |            1 |                    1 |

No promotion_directory or merchant_news_or_blog family was observed. This sample is dominated by unverified social links. Twelve signals expose provisional merchant campaign pages, two issuer/platform and two app candidates. Enumeration, extraction feasibility, ownership and publication readiness are not established. Only one publisher destination requires deeper resolution in this sample; no merchant hop was invented beyond that article.

## Resolved domains

| Domain                    | Offer-associated link records | Unique original URLs |
| ------------------------- | ----------------------------: | -------------------: |
| facebook.com              |                            28 |                   27 |
| csfoods.sg                |                             7 |                    7 |
| t.me                      |                             5 |                    5 |
| grab.com                  |                             2 |                    2 |
| app.happypointcard.com.sg |                             1 |                    1 |
| app.krisplus.com          |                             1 |                    1 |
| dianxiaoer.com.sg         |                             1 |                    1 |
| eatbook.sg                |                             1 |                    1 |
| fairprice.com.sg          |                             1 |                    1 |
| google.com                |                             1 |                    1 |
| paradisegp.com            |                             1 |                    1 |
| pepperlunch.com.sg        |                             1 |                    1 |
| royalplaza.com.sg         |                             1 |                    1 |
| shakeshack.com.sg         |                             1 |                    1 |
| tiktok.com                |                             1 |                    1 |

## Checks and boundaries

- `npx vitest run tests/source-origin-audit.test.ts tests/source-evidence.test.ts`: 73 tests pass (28 new audit tests, 45 unchanged source-evidence tests).
- `npm test -- --maxWorkers=1`: 465 tests pass across 29 files. The initial concurrent `npm test` timed out in existing revision-4 and revision-6 runtime fixtures. No test timeout or check was weakened.
- `npm run typecheck`: passes.
- New-file ESLint and `npx eslint . --ignore-pattern '.local/**'`: pass. Unmodified `npm run lint` reports five pre-existing explicit-any errors in `.local/source-substitution-pilot/inspect.ts` and `upstream.ts`; those scratch files were preserved.
- Targeted Prettier check: passes for all 16 changed/added files. `git diff --check`: passes. Final self-review checked the spec and found/fixed association count inflation and the wrapper/app topology omissions. No independent review is claimed.
- Frozen offline CLI runs `offline-replay-a` and `offline-replay-b` use the same saved raw input/cache, and all five required outputs (`signals.json`, `resolved-links.json`, `audit.json`, `report.md`, `report.csv`) are byte-identical. Their audit SHA-256 is `f91dd4e73d751563502f17cd4211efe724f9af25e5d4a15f1d458917473124ad`.
- Direct same-mode offline reclassification of the captured one_off_refresh signals/cache is also byte-stable. Offline re-reading saved raw refresh evidence through `--input` deliberately labels it frozen_local, as documented; that provenance differs from the original live run.
- SHA-256 manifests of all 3,665 `.local/source-discovery-service` files match before/after. The production merchant registry hash matches before/after and its merchants object remains empty. Tests independently verify fixture-tree hashes, registry immutability and symlink/path rejection.
- Recursive runtime import-boundary test confirms no ingestion runner, DB persistence/migration, production DB client or source-monitor lifecycle dependency. No production ingestion or DB operation was run. No worker or recurring monitor was started. No commit or push occurred.
- Existing source-substitution notes, revision-6 code/evidence and unrelated dirty worktree changes were preserved. No UI/build/integration/corpus run was needed for this isolated research CLI.

## Exact files changed by this task

Modified only by adding the audit package command:

- `package.json`

Added:

- `scripts/research/source-origin-audit.ts`
- `scripts/research/source-origin-audit/types.ts`
- `scripts/research/source-origin-audit/input.ts`
- `scripts/research/source-origin-audit/classification.ts`
- `scripts/research/source-origin-audit/audit.ts`
- `scripts/research/source-origin-audit/report.ts`
- `scripts/research/source-origin-audit/run.ts`
- `tests/source-origin-audit.test.ts`
- `docs/research/source-origin-audit.md`
- `docs/research/source-origin-authority-review.template.json`
- `docs/changes/source-origin-audit/intent.md`
- `docs/changes/source-origin-audit/spec.md`
- `docs/changes/source-origin-audit/design.md`
- `docs/changes/source-origin-audit/plan.md`
- `docs/changes/source-origin-audit/verification.md`

Generated research artifacts remain ignored under `.local/source-origin-audit/`. Pre-existing `AGENTS.md`, `next-env.d.ts`, monitor scripts/package commands and other untracked research files were not changed by this task.
