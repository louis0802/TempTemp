# Plan — official-source promotion map

Inputs: [intent.md](intent.md), [spec.md](spec.md), [design.md](design.md). Each phase ends with its own verification entry in `verification.md`, created when implementation starts.

## Phase 0 — Rules and decisions (gate before code)

1. [ ] Owner approves the design §10 rule changes. Apply them to AGENTS.md and `docs/architecture.md`.
2. [ ] Owner sets the spot-check error target X% (O2) and the social active window M (O6).

## Phase 1 — Spikes (decide O1, O4)

1. [ ] Social acquisition spike on about 10 merchant accounts (Instagram first, plus one Facebook and one TikTok). Try a plain fetch of post URLs and Meta Business Discovery. A third-party provider is tried only if the owner allows it. Record:
   - whether the caption, images and posted date come back;
   - rate limits;
   - whether the method is permitted by the platform's terms;
   - whether historical posts from Aug–Sep 2026 are still reachable.
2. [ ] JS-only site spike on 3 merchants (Shiok Burger, The Coffee Bean & Tea Leaf, 4Fingers): plain fetch versus a headless renderer.
3. [ ] Historical availability check: for 20 answer-key promotions, is the offer still on the official source, and is a web archive snapshot available? This feeds O3.
4. [ ] Owner decides O1, O3 (website backfill) and O4 from the spike reports.

## Phase 2 — Reader (A3, A4)

1. [ ] Define the `PromotionReader` schema (kind, quoted facts, date roles, schedule phrases, outlet scope, image evidence) and the versioned prompt.
2. [ ] Add quote verification and the untrusted-output validator.
3. [ ] Build `SubagentReader` with the task/response file ledger, on the cheapest model.
4. [ ] Build `HttpReader` with `openai` and `anthropic` protocols, configured by env vars, with image support.
5. [ ] Write fixture tests with captured official pages from the replay sources (Shake Shack, Pepper Lunch, Bari Bari, Captain Kim, FairPrice), including image-only facts, mixed-offer pages and non-promotions.

## Phase 3 — Computing and outlets (A5, A6)

1. [ ] Write `computeOfferDates` on top of the existing date arithmetic, with reader roles as input.
2. [ ] Run phrase-level schedule parsing, and add the undated → open-ended rule.
3. [ ] Change outlet resolution so an unmatched exclusion keeps the other outlets mapped.
4. [ ] Carry the mvp-offer-lifecycle tables over as regression tests, and add the new cases.

## Phase 4 — Registry and discovery (A1)

1. [ ] Seed `data/merchant-registry.json` from the research inventory and the existing registry, dropping platform entries (S4).
2. [ ] Discovery script: reader plus web search proposes sources; code applies the S3 signals and records evidence. Run it for the 106 unassessed merchants and the 67 unresolved identities.
3. [ ] Report: merchants by source type and status.

## Phase 5 — Acquisition (A2)

1. [ ] Generic website listing step and snapshot storage, on the bounded fetcher.
2. [ ] Implement `SocialAcquirer` with the O1 method.
3. [ ] Record complete, partial and failed outcomes per fetch.
4. [ ] Backfill mode (S5b): social posts since 2026-08-01, and websites via the O3 method.

## Phase 6 — Pipeline, serving, UI (A7, A8, A11)

1. [ ] Assemble the steps: snapshot → read → verify → compute → outlets → lifecycle → `data/promotions-official.json`, with a reading cache.
2. [ ] Lifecycle (S22, S22a):
   - add the `current_list` capability for complete website listings;
   - add the M-day social expiry and re-post extension;
   - add open-ended offers without a weekly pattern;
   - add the 7-day `limitedTime` stale threshold.
3. [ ] Serve only the official artifact. Remove the `MVP_OFFER_POLICY` and `PROMOTION_DATA_SOURCE` switches. Retire the strict feed, the Telegram MVP artifacts and the worker from serving.
4. [ ] UI: summary, schedule, live status, outlets, the "Summary only…" line, full source text (always) and link. Remove the public audit rows and badges. Desktop/mobile e2e with intercepted tiles.

## Phase 7 — Evaluation (A9, A10)

1. [ ] Build the answer key from the pinned 200 records (S26). Use a model or prompt different from the pipeline reader. A person reviews every `not_promotion` exclusion.
2. [ ] Coverage report: matches, misses with one reason each, per source type.
3. [ ] Spot-check sample of 50 mapped offers reviewed by a person; record the error rate.
4. [ ] Iterate on prompt, discovery and acquisition until A9 and A10 pass, or report the gap with reasons.

## Phase 8 — Daily job (A2, A12)

1. [ ] `npm run pipeline:daily`: 24-hour loop, single-instance lock, health report, clean shutdown.
2. [ ] Enable explicitly per environment; document how to run and stop it.

## Risks and checks

- **O1 failing:** if no permitted social method works, coverage is capped. Report the ceiling from Phase 1 before building Phases 5–7 at full scale.
- **Removed offers:** historical offers may be gone from official sources (O3), which could make A9 unreachable as stated.
- **Development cost:** reading cost is bounded by caching readings per snapshot hash and model, and by using the cheapest model.
- **Preserved artifacts:** existing research seals, frozen corpora and `tests/corpus/mvp-conformance-reviewed.json` are not regenerated to make tests pass.
- **Every phase:** typecheck, lint, unit tests, plus the affected e2e and corpus tests, before marking the phase done.
