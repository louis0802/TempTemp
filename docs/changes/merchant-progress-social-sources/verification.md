# Verification and final report

## Delivered outcome

The generated canonical control surface is `docs/research/merchant-automation-progress.md`. Full independent source tracks, acquisition/publication/review flags, stages, remaining paths, next actions and filtered cohorts are in the JSON/CSV output. Regenerate with `npm run research:merchant-progress -- --output .local/merchant-source-map/<new-run>`; the command is frozen offline replay and does not acquire or ingest.

Final local report: `.local/merchant-source-map/merchant-progress-social-2026-10-02-verified/merchants.json`, `report.md`, `report.csv`. Social inventory, checked ownership review and acquisition review are `docs/research/social-source-inventory.json`, `social-source-authority-review.json`, `social-source-acquisition-review.json`. All four change documents and research.md are in this directory; changed-files.json enumerates this slice only.

| Historical coverage / status | Count |
| --- | ---: |
| Historical TG merchants (percentage denominator) | 138 |
| Registry-only merchants (excluded from denominator) | 1 |
| Total merchant rows | 139 |
| Unresolved historical TG records (separate) | 67 |
| Auto-enabled historical merchants | 2 |
| Shadow-only historical merchants | 5 |
| Blocked historical merchants | 5 |
| Source-candidate historical merchants | 13 |
| Not-assessed historical merchants | 113 |
| Auto-enabled historical coverage | 1.45% |

All status totals equal the 138 row-derived historical denominator. Exact auto merchants: Pepper Lunch, Shake Shack. Their autonomous acquisition, complete-candidate auto-publication and incomplete-candidate review flags are independently true.

Exact historical shadow merchants: Dian Xiao Er, FairPrice, Gourmet Carousel, Kris+, Paradise Hotpot. Paradise Group is also shadow, but is the registry-only row and never enters the historical denominator. These six merchant rows represent five shadow source definitions/adapters, not six adapters.

Exact blocked merchants: Ajumma's Korean Restaurant, CS Foods, SHINRAI, Sinpopo Brand, Starbucks. CS Foods retains its existing blocked/no-adapter website assessment. The four social assessments are blocked on unestablished bounded enumeration/access permission; their publicly accessible captions are not misrepresented as login failures.

Exact social-candidate merchant rows (16): Ajumma's Korean Restaurant; Bari Bari Steak; Beard Papa's; BOMUL Samgyetang; D'Cuisine; Kei Kaisendon; Marche; McDonald's; Pizza Hut; Poke Theory; SHINRAI; Sinpopo Brand; Starbucks; Sushiro; The Coffee Bean & Tea Leaf; Tofu G Gelato. Merchant label variants are normalized only by the unchanged exact punctuation/case rules.

Source counts: two enabled source definitions, five shadow source definitions, two distinct enabled adapters, five distinct shadow adapters, five blocked research assessments (one website + four social), and five exact social platform/account candidates. Instagram exact accounts: four candidates, four independently verified, zero known exact unverified accounts. Eleven additional merchant rows have unverified Instagram content candidates with exact account **unknown**; these are not silently counted as zero social evidence. Sixteen account-unresolved social content records remain separately auditable. The fifth exact account is unverified TikTok `dcuisines.restaurant`.

Instagram structurally tested accounts: `ajummasg`, `shinrai.sg`, `sinpopobrand`, `starbuckssg`. Four profiles and four linked posts returned public HTTP 200; three profiles exposed item links, one did not. Four exact post/account associations and public captions were established through independently captured standard metadata, including two reel identities. No complete chronological/current-feed boundary or continuation was established. Bounded autonomous Instagram enumeration remains **unproven**, and sustained permitted autonomous access is also unestablished. Zero Instagram runtime adapters, zero enabled social sources, zero registered social shadow sources. All four tested accounts remain blocked research tracks; untested/unverified candidates remain candidates.

## Next-action cohorts

- already_auto_enabled: Pepper Lunch; Shake Shack.
- shadow_needs_one_blocker: none (do not collapse multiple documented blockers into an invented score).
- verified_social_needs_enumeration: Ajumma's Korean Restaurant; SHINRAI; Sinpopo Brand; Starbucks.
- unverified_social_candidate: Bari Bari Steak; Beard Papa's; BOMUL Samgyetang; D'Cuisine; Kei Kaisendon; Marche; McDonald's; Pizza Hut; Poke Theory; Sushiro; The Coffee Bean & Tea Leaf; Tofu G Gelato.
- direct_source_candidate_not_onboarded: Grab. Already enabled/shadow merchants do not enter this next-batch cohort solely because they have an additional optional app/source candidate.
- blocked: the five names above.
- no_source_assessed: 113 names, fully enumerated by the generated JSON/Markdown rather than manually repeated here.

Every historical row has a deterministic machine next_action. Full website + social tracks, individual blockers/evidence and optional extra source paths remain visible even when a merchant already has an enabled source. A sufficient website does not require Instagram.

## Checks actually run

| Check | Result |
| --- | --- |
| Full units: npm test -- --maxWorkers=1 | 771 passed in 42 files |
| New ledger/social/compatibility tests | 45 passed in three files |
| Final focused new tests + existing batch regressions | 91 passed in four files |
| Real local PostgreSQL/PostGIS integration: npm run test:integration | 55 passed in two files; disposable databases created/removed by suites |
| Corpus: npm run test:corpus | 4 passed in three files; 136 sources, 181 offers, approved 0, excluded 37, unresolved 144, requires split 18, failed 0 |
| npm run typecheck | Passed |
| npm run build | Passed; existing src/server/mvp.ts dynamic filesystem tracing warning |
| npm run lint | Fails on five pre-existing no-explicit-any errors in .local/source-substitution-pilot/inspect.ts and upstream.ts |
| Scoped ESLint on every changed code/test file | Passed |
| Scoped Prettier --check | Passed; raw captures and deterministic generated reports deliberately retain original/generated bytes |
| git diff --check | Passed |
| Frozen hash / replay / workspace preservation | Passed; details below |

The first full unit run passed 770 and failed the old whole-row equality assertion because the requested ledger adds fields. That regression now checks **every pre-existing field** exactly against the old captured map; dedicated tests check the new fields and complete census. No fixture baseline, corpus disposition or production gate was relaxed to make tests pass. Full rerun passed 771/771. A self-review also added conflict rejection when canonical/author metadata disagrees with the scoped account.

## Acceptance evidence and practical limits

- Ledger requirements/tests 1–19: positive-signal denominator, exact census preservation, multiple sources, enabled/shadow/blocked precedence, publication separation, current merchant states, row-derived counts/cohorts, byte-identical outputs and frozen SHA-256 checks. Existing Paradise brand/operator behavior remains explicit rather than guessed.
- Inventory/ownership 20–31: canonical URL over unsupported-browser fallback, exact identity separation, context filtering, no publisher authority, independently captured exact backlink, merchant/conflict/tamper failure and no arbitrary same-name inheritance. Unknown content accounts remain separate.
- Scope/transport 32–38: both HTTP discovery/redirects and trusted publication use account/path validation; another account, unsupported scheme/path/query, missing/incorrect accountless bindings and login/challenge/continuation never establish readiness. Capture integrity and offline deterministic replay are checked. Actual execution manifests contain only supported public profile/post requests; transport does not use auth/cookie headers or retain response cookies.
- Text/outlets/reconciliation 39–48: research-only caption classification/date extraction, ordinary-post rejection, publication-time isolation, image/reel unknowns, all-outlets provider reuse and selected-outlet review. Source-agnostic fingerprint tests and real DB scenarios show web acquisition attaching to an existing compatible social provenance record without duplicates and conflicting facts entering review. No claim is made that a real social source revision has been ingested: no social source passed acquisition activation.
- Regressions 49–60: Pepper/Shake autonomous, Gourmet/Paradise/FairPrice/Kris+/Dian shadow, CS Foods blocked, direct-source-v2 unchanged, existing publication/persistence/review and legacy Telegram tests pass. Direct runtime dependency-closure tests retain collector/parser/research and legacy-table isolation. No new social runtime registry/source ID or migration was added.

This slice adds no browser-visible UI behavior, so no new browser/e2e run was required. The Markdown control surface was reviewed against generated JSON/CSV; no production social crawler is represented by the offline research evaluator. The official Terms fetch returned 429; the task does not assert verified Terms contents or platform authorization.

## Preservation and authorized scope

`frozen-inputs.json` records the before-work hashes of all pinned corrected audit/direct-audit/corpus files. They are unchanged. Of 73 files in the initial broader preservation snapshot, 68 remain byte-identical; the five intentional changes are direct types, fetch, publication, registry source-kind metadata and promotion provenance schema. Persistence, publication store/fingerprint, direct-source-v2, migrations, legacy runtime, monitor protocol, prior captures and prior audits remain unchanged. Build-generated next-env.d.ts was restored to its exact original uncommitted bytes.

No production/shared DB ingestion or migration; integration changes apply only to suite-owned temporary databases. No scheduler or worker start. No fresh Telegram collection. No login/challenge bypass, credentials, session-cookie harvesting, stealth, private social API, OCR, video/audio fact extraction, commit or push. Existing uncommitted work remains present.

Final acceptance review was self-review against S1–S10 and the original request, not an independent review. All required implementation/research artifacts are delivered; the unsuccessful autonomous Instagram enumeration gate is an evidenced research outcome, not unfinished crawler implementation.
