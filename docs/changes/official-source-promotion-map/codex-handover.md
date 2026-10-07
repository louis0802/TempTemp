# Codex handover: official-source promotion map

You are taking over implementation of the official-source promotion map. Read this file completely before touching code. It tells you what to read, what is decided, what conflicts to resolve, the work order, and when to stop and ask the owner.

## 0. Ground rules

- **Owner:** Louis Liu. The owner makes product decisions; you implement them. Never reopen a decision listed in §2.
- **AGENTS.md applies**, including the Next.js notice: read `node_modules/next/dist/docs/` before writing Next.js code.
- **Branch:** work on `feat/official-source-pipeline`, created from `docs/official-source-promotion-map`.
  - Commit at the end of each phase, with the phase number in the message.
  - Do not push, merge or force-push unless the owner asks.
- **Follow the SDLC format already used in `docs/changes/*`.** This change folder already has intent, spec, design, plan and architecture. Add `verification.md` when Phase 1 starts. After each phase, append its real evidence: commands run, pass/fail counts, limits.
- **Never claim a check you did not run.** If a check fails, record the exact failure.
- **Do not regenerate frozen artifacts to make tests pass:**
  - `tests/corpus/mvp-conformance-reviewed.json`
  - research seals under `docs/changes/promotion-nlp-*`
  - `data/mvp-promotions.json` (pinned SHA-256 `e49d9e12ce6fb2c22e1b5c6f936e1025a6ab7f00d688438d9fae36d310e3844b`)
    - Hash the committed blob, not the working copy: `git show HEAD:data/mvp-promotions.json | sha256sum`. A Windows checkout with `core.autocrlf=true` converts line endings, so hashing the file on disk gives a different value.
- **No live side effects without owner approval:**
  - no hosted databases or scheduler enablement;
  - no paid LLM calls on the owner's key beyond the budget the owner sets;
  - no social-platform automation outside the method chosen in O1.
- **Tests use captured fixtures and recorded readings.** `npm test` makes no live LLM, website, social, Google or tile calls.

## 1. Read in this order

1. `AGENTS.md`
2. [architecture.md](architecture.md): **the authoritative target design.**
3. [intent.md](intent.md): why, the success measures, the risks.
4. [spec.md](spec.md): rules S1–S29 and acceptance criteria A1–A12. Where it conflicts with the architecture, §3 below says which wins.
5. [design.md](design.md) and [plan.md](plan.md): earlier drafts. The architecture and §5 below supersede them where they differ.
6. Background, read only when the task needs it:
   - `docs/architecture.md` (current, to be replaced)
   - `docs/changes/mvp-offer-lifecycle/{spec,verification}.md` (the date/schedule policy you will refactor)
   - `docs/changes/promotion-nlp-oracle-ablation/decision.md` and `docs/changes/promotion-nlp-date-only-fresh-evaluation/decision.md` (why "LLM reads, code computes")
   - `docs/changes/source-origin-audit/verification.md` and `docs/changes/direct-source-candidate-audit/verification.md` (where Telegram links lead)
   - `docs/research/all-merchant-sources-2026-10-06.md` (merchant inventory)

## 2. Owner decisions (fixed)

1. **One pipeline**, official merchant source → map. The strict DB publication path, the Telegram MVP artifacts and the Telegram worker are retired from serving. Their code is preserved.
2. **Telegram is offline only.** It seeds the merchant list and is the answer key. It is never fetched at runtime.
3. **Sources:** merchant websites, Instagram, Facebook and TikTok. Not Grab, GrabFood, foodpanda, Kris+, banks or publishers.
4. **A vision LLM reads poster images.**
5. **No review gate.** Rules decide what is mapped. A human spot check measures the error rate.
6. **Counted kinds:** deals, events and food festivals, everyday low prices. Product launches are not counted.
7. **Dates:**
   - The anchor is the reliable posted date, otherwise the first-seen date.
   - A missing year or month is filled from the anchor.
   - Only end dates roll forward.
   - No start date means start = anchor.
8. **Open-ended offers:** undated, "Now" and "while stocks last" offers are open-ended. They go stale 14 days after they were last seen (7 for limited time) and are then hidden.
9. **Outlets:**
   - Named outlets: only those.
   - None named: all outlets, from the official directory, else Google.
   - An exclusion that cannot be matched leaves the rest mapped, and its text stays visible in the source text.
10. **Display:** a short summary, the line "Summary only. Check the source before you go.", the full official source text and a link. No badges or icons.
11. **A daily scheduled refresh.**
12. **Pluggable LLM provider** (the owner's own API and model). During development, use subagents on the cheapest model.
13. **Merchant source discovery:** LLM plus web search, auto-accepted when the ownership signals hold.
14. **Success:**
    - ≥95% of past answer-key promotions are auto-mapped from official sources; expired offers count.
    - The spot-check error rate is at most X% (O2).

## 3. Conflicts between documents: the architecture wins

| Topic | Older text | Use instead (architecture.md) |
| --- | --- | --- |
| Lifecycle | spec S6, S22, S22a (current-list capability, withdrawal, M-day social window) | §4.9: one freshness rule. A sighting is a complete fetch that still contains the offer (website), or the post timestamp (social). Active until last sighting + W. No withdrawal state. Archive-like website sources count only first appearance. |
| Image facts | spec S9 (image quotes accepted unverified) | §4.3–4.5: transcribe each image first, read text only, and locate every quote in code |
| Reader output | spec S8 (`openEndedWording`, no `uncertain`) | §4.4: add `uncertain` (never mapped) and `brand`; drop `openEndedWording`. The reader receives no dates. |
| Unresolvable date phrase | spec S16 (becomes open-ended) | §4.6: becomes `unresolved` and is hidden. Roll-forward cap of 120 days (O7). |
| Backfill window | spec S5b, from 2026-08-01 | §4.2: from 2026-07-01 |
| Evaluation | spec S26–S29 | §9: campaign units; a human labels every unit; 30% merchant holdout; ceiling trace first; organic enumeration arm; a human confirms every match; Wilson intervals; a reader-config shadow gate |
| Fetcher | design §3, reuse `BoundedDirectFetch` | §4.2: a new small fetcher on `validateTarget` and `nodeBodyTransport` |
| Hand-written adapters | design §2, kept | §12: retired. Keep only the `*-outlets.ts` directory providers. |
| Subagent reader | design §4, polling ledger | §4.4: `read --export` / `read --import`; nothing polls; scheduled runs refuse it |
| Storage | design §8, `data/promotions-official.json` (tracked) | §7: `PIPELINE_DATA_DIR` (git-ignored), immutable generations behind a `current.json` pointer |
| Scheduler | design §12, `hourlyLoop` | §10: a one-shot `pipeline -- run`, triggered by an external scheduler, with a lock and idempotent per Singapore date |
| Work order | plan.md (evaluation last) | §5 below (evaluation tooling and ceiling trace first) |

Phase 1 aligns spec, design and plan with the architecture, so these conflicts disappear from the documents.

## 4. Current state (2026-10-07)

- **Base branch:** `research/source-substitution-pilot`. Its latest code commit is `a31bcbb`; the docs branch is on top of it.
- **Map today:** the MVP serves a Telegram replay. In `data/mvp-promotions-source-observed.json`, 36 of 207 records are ready, and all of them have expired. Only Pepper Lunch and Shake Shack have enabled direct sources.
- **Merchants:** 138 merchants in total; 106 have no source assessment, and 67 Telegram records have unresolved merchant identity.
- **Link audit:** offer-associated social links were Instagram 26, Facebook 2, TikTok 1 (`docs/changes/direct-source-candidate-audit/verification.md:17`). Merchant-website links were 13 of 50 signals.
- **Reusable code:** see architecture §12, "Reused". Key entry points:
  - `src/ingestion/mvp/date-policy.ts:215` (`normalizeMvpDates`)
  - `src/ingestion/mvp/schedule.ts:141,296`
  - `src/ingestion/mvp/outlets.ts:101`
  - `src/ingestion/direct-sources/network-target.ts:43`
  - `src/ingestion/direct-sources/fetch.ts:46` (`nodeBodyTransport`)
  - `src/ingestion/source-evidence/cache.ts:68` (`atomicJson`)
  - `src/domain/mvp.ts:30,158`
  - `src/server/mvp.ts:26,38`
- **Known parser defects to avoid reproducing:**
  - "2nd Venti" was read as a date.
  - "$200" was read as a schedule.
  - "L1" / "Level 5" were read as outlet names.
  - A single time became "17:30–17:30".

## 5. Work order

Each phase lists its deliverables, its acceptance and when to stop. Finish each phase's verification before starting the next.

### Phase 1: Documents and rules

1. Align spec.md, design.md and plan.md with architecture.md (§3). Keep the A1–A12 IDs, adding A13+ only if needed. Mark superseded text rather than silently deleting decisions.
2. Replace `docs/architecture.md` with the change-folder architecture.md (fix relative links).
3. Update the ingestion rules in AGENTS.md to architecture §11. Keep the Next.js notice and the unchanged rules.

**Stop:** this phase changes agent rules, so the owner approves it through PR review. Commit, then tell the owner it is ready to review.

### Phase 2: Answer key and ceiling trace (architecture §9.1–9.3)

1. `scripts/eval/answer-key.ts`:
   - Group the 200 pinned records into campaign units.
   - Pre-label merchant and kind with a model family different from the reader's.
   - Emit a human labelling worksheet (CSV or JSON) for every unit.
   - Seed the worksheet from the existing `offerStructure` labels in the conformance file.
2. Merchant hash split: 70% dev, 30% holdout. Freeze it before any tuning.
3. `scripts/eval/trace.ts`: emit a worksheet for the human ceiling trace. For each unit it records where the merchant published it (website, Instagram, Facebook, TikTok, none, platform only, removed) and the URL. Trace URLs never enter the registry.
4. Write the frozen key, the split and the worksheets under `evaluation/` with their hashes.

**Stop:** a human must fill in both worksheets. Hand them to the owner, then continue with Phases 3–4, which do not depend on the labels.

### Phase 3: Spikes (decide O1, O3, O4)

Social acquisition on about 10 merchant accounts, Instagram first, then one Facebook and one TikTok account. Test:
- a plain fetch of post URLs (Open Graph metadata);
- Meta Graph API Business Discovery, which needs the owner's Meta app;
- a third-party provider, only if the owner allows it.

Record for each:
- the caption, images and timestamp returned;
- whether posts from 2026-07 onward are still reachable;
- rate limits;
- whether the platform's terms permit it.

Also test:
- JS-only sites (Shiok Burger, The Coffee Bean & Tea Leaf, 4Fingers): plain fetch versus a headless renderer;
- web-archive availability for 20 website offers.

Write `evaluation/spike-report.md`.

**Stop:** the owner decides O1, O3 and O4. Never use logins or private APIs.

### Phase 4: Reader and verification (architecture §4.3–4.5; A3, A4)

1. `src/ingestion/official/read/`:
   - the `ReaderProvider` interface;
   - the strict zod output schema (new; do not reuse the research schemas);
   - a versioned prompt file;
   - nonce-delimited untrusted input.

   The reader has no tools and receives no dates.
2. `transcribe` for images, cached by `(imageSha256, tuple)`.
3. `HttpReader`, configured by `READER_BASE_URL`, `READER_API_KEY`, `READER_MODEL` and `READER_PROTOCOL`. Start with one protocol.
4. Subagent provider through `read --export` / `--import`. Development uses the cheapest model available in whichever agent tool answers the tasks.
5. `src/ingestion/official/verify/`:
   - locate every quote verbatim;
   - date phrases need a cue word;
   - a currency amount is never a time;
   - a single time is never a range;
   - quotes shared across sibling offers are dropped;
   - `not_promotion` and `uncertain` stop here.
6. Fixture tests from captured official pages: Shake Shack, Pepper Lunch, Bari Bari, Captain Kim and FairPrice, under `tests/fixtures/direct-sources/` and the replay sources. Include image-only facts, mixed-offer pages, non-promotions and the known defects in §4 above.

### Phase 5: Compute and outlets (architecture §4.6–4.7; A5, A6)

1. Refactor `normalizeMvpDates` into fragment parsing and resolution. Add `computeOfferDates(phrases, anchor)`, with:
   - the roll-forward cap (120 days);
   - start = min(anchor, end);
   - `dated`, `open_ended` and `unresolved` validity.
2. Parse schedules one phrase at a time with `parseMvpSchedule`.
3. In `resolveMvpOutlets`, an unmatched exclusion maps the rest and is recorded, replacing the "suppress all pins" return. A named lookup failure never widens to all outlets.
4. Carry over the `mvp-offer-lifecycle` regression tables, adjusted only where an owner decision changed a rule. Note every changed case in verification.

### Phase 6: Registry and discovery (architecture §4.1; A1)

1. Seed `data/merchant-registry.json`: roots only, platforms removed, a trust anchor per source.
2. `npm run registry -- discover`:
   - the LLM proposes; code fetches the evidence through the network guard and applies the anchor rules, the Singapore scope check and the linked-from rule;
   - acceptances and rejections go to the append-only acceptance ledger;
   - add the suppress list.
3. Report merchants by source type and status.

**Stop:** budget. Before running discovery on all merchants, report the estimated LLM call count and wait for the owner.

### Phase 7: Acquisition (architecture §4.2; A2)

1. Website fetcher on `validateTarget` + `nodeBodyTransport`:
   - HTML, PDF and images, with the image allowlist and caps;
   - listing links selected by index.
2. `SocialAcquirer` using the O1 method. Drop posts whose owner is not the registered account.
3. A `FetchRecord` ledger with complete, partial and failed outcomes, plus `structure_changed`.
4. A normalised revision hash.
5. Backfill with `--since 2026-07-01`.

### Phase 8: Identity, freshness, build, serving (architecture §4.8–4.10, §7, §8; A7, A8, A11)

1. `offerId` from `(merchantId, itemKey, economicSignature)`. Clusters across sources and re-posts.
2. Rewrite `evaluateMvpLifecycle` for the freshness rule, computed per request. Rename `ttlDays` to `freshnessDays`.
3. A pure build into `PIPELINE_DATA_DIR/generations/` with the `current.json` pointer, the publish guards, and `rollback` / `hold` / `release`.
4. Serving: `readCurrentGeneration()`. Remove the `MVP_OFFER_POLICY`, `MVP_DATA_PATH`, `MVP_POLICY_DATA_PATH` and `PROMOTION_DATA_SOURCE` switches.
5. UI: in `OfferPolicyDetails`, set the §8 order and always show the source text. Remove the public audit rows and the `mvp-badges` block. Run desktop and mobile e2e on port 3100 with intercepted tiles.
6. Retire the old paths from serving (§12). Delete nothing.

### Phase 9: Coverage run and spot check (architecture §9.4–9.7; A9, A10)

Prerequisites: the owner has returned the labelled worksheets from Phase 2, and the O1 method is built.

1. Organic arm: run the pipeline from 2026-07-01 through the registry roots only. An optional seeded arm uses the traced permalinks.
2. Matching starts in code; the LLM proposes pairs whose deal terms differ; emit a human adjudication worksheet for every claimed match and every `offer_not_found_on_source`.
3. Report coverage with Wilson intervals, per source type and per miss reason, for dev and holdout.
4. Spot-check worksheet: stratified, sized from X (O2).
5. Iterate on dev only. Score the holdout once per release.

### Phase 10: Daily job (architecture §10; A2, A12)

1. `npm run pipeline -- run`:
   - one-shot, with a lock that goes stale after a configured age;
   - idempotent per Singapore date;
   - writes a run manifest, enforces the budgets, and raises the §10 alerts as an exit code plus a log line.
2. `status`, `reread --shadow`, `rollback`, `release`.
3. A document explaining how to enable it in an external scheduler.

**Stop:** do not enable any schedule. The owner enables it per environment.

## 6. Verification for every phase

Run the following and record the real output in `verification.md`:

- `npm run typecheck`
- `npm run lint`: the 5 errors in ignored `.local/source-substitution-pilot/*` already existed; report them, don't fix them.
- `npm test`: one historical failure on the `next-env.d.ts` hash already exists; report it, don't rewrite that seal.
- `npm run test:corpus`, if ingestion or MVP code changed.
- `npm run test:e2e`, if UI or serving changed. Assert the app heading on `http://127.0.0.1:3100` first.

## 7. Open decisions and their defaults

| ID | Decision | Default until the owner decides |
| --- | --- | --- |
| O1 | Social acquisition method | Social sources are registered but not fetched (`social_not_acquired`) |
| O2 | Spot-check error target X (point estimate or upper bound) | none: ask |
| O3 | Website backfill from web archives | Misses count as `source_removed` |
| O4 | Headless rendering for JS-only sites | `js_only` |
| O5 | Store location when the job and the web server don't share a disk | Same host |
| O6 | Freshness window W for social and archive sources | 14 days |
| O7 | Roll-forward cap | 120 days |
| O8 | Second transcription for image digits | Off |
| O9 | Thresholds: publish-drop guard, budgets, alerts | architecture §4.10 and §10 |
| O10 | Google domain check | Off |
| O11 | Show transcriptions publicly | No |

## 8. Reporting back

At each stop, give the owner:
- what changed (files);
- the checks run, with real results;
- the decisions needed, each with your recommendation;
- the next phase.

Keep it short and lead with the result.
