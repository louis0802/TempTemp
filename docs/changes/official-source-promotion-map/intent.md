# Intent — official-source promotion map

Status: design settled with the product owner on 2026-10-07; not implemented. Supersedes the multi-path direction (strict publication, Telegram MVP, direct-source review) for new work.

## Problem and value

The map should show Singapore food and drink promotions taken from merchants' own sources. Today three paths coexist (strict DB publication, Telegram-based MVP, direct-source ingestion). Each carries different rules, and none reaches useful coverage.

- Only 2 of 138 historical merchants are auto-enabled ([merchant-automation-progress.md](../../research/merchant-automation-progress.md)).
- The source-observed MVP artifact replays 200 frozen Telegram records and 7 Pepper Lunch captures. Only 36 of 207 records are ready (`data/mvp-promotions-source-observed.json`).
- Earlier research gates treated every inference as a blocker. The product owner now accepts that risk, provided users can check the original source.

Telegram is no longer a runtime source. Its frozen history has two uses: it seeds the list of merchants to follow, and it is the answer key for measuring coverage.

## Expected outcome

One pipeline: official source → daily fetch → LLM reads text and images with quoted evidence → code computes dates, schedules and outlets → map.

- **Sources:** merchant websites, Instagram, Facebook and TikTok. Aggregator platforms such as Grab and Kris+ are out of scope.
- **What is a promotion:** discounts and deals, events and food festivals, and everyday low prices. Product launches, editorial features, channel ads and quizzes are not.
- **Inference is allowed and recorded internally:**
  - A missing year or month comes from the anchor date. The anchor is the posted date, or the first-seen date when no posted date exists.
  - An offer with no end date is open-ended.
  - An offer that names no outlets applies to all outlets.
  - An exclusion that cannot be matched leaves the other outlets mapped.
- **Display:** each promotion shows a short summary, the fixed line "Summary only. Check the source before you go.", the full official source text and a link. There are no assumption badges.
- **No review gate:** rules decide what reaches the map. A human spot-check measures the error rate.
- **LLM provider:** pluggable, so the owner can use their own API and model. Development uses subagents on the cheapest model.

## Success measures

- **Coverage:** at least 95% of the promotions in the frozen Telegram answer key are automatically mapped from an official source. Non-promotions are excluded from the denominator first.
- **Accuracy:** on a random sample reviewed by a human (default 50 offers), the error rate on offer, dates and outlets is at most X%. X is open; see spec O2.
- Coverage and accuracy are reported per source type (website, Instagram, Facebook, TikTok) and per failure reason.

## Scope and constraints

- **Scheduled refresh is in scope.** A daily scheduled job is approved as part of this design. Each environment where it runs still needs an explicit enablement step.
- **Legacy paths are retired, not deleted.** The strict publication path, the Telegram worker and the Telegram MVP artifact are retired as runtime paths. Their code and research artifacts stay until a separate cleanup change.
- **Platform terms are followed.** Social content is acquired only through a method the acquisition spike shows to be workable and compliant with the platform's terms. No logins and no private APIs.
- **AGENTS.md and `docs/architecture.md` must change before implementation.** Several of their current rules contradict this design; see design.md §10. Those edits need owner approval.
- **Demo data stays fictional and labelled.** Database credentials stay in server modules.

## Main risks

- **Instagram access:** 58% of sampled Telegram links land on social accounts ([source-origin-audit verification](../source-origin-audit/verification.md)). If no workable acquisition method exists, coverage is capped well below 95%.
- **Historical availability:** the answer key covers Aug–Sep 2026. Website promotion pages may have removed those offers. Instagram posts usually persist, but that is unverified.
- **Unassessed merchants:** 106 merchants have no source assessment yet, and 67 Telegram records have unresolved merchant identity.
- **Error rate:** a rules-only gate with accepted inference can map wrong outlets or dates. The spot-check measures this; it does not prevent it.
