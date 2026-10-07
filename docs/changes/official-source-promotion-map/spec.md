# Specification — official-source promotion map

Input: [intent.md](intent.md). Rules marked *(carried)* keep behaviour from [mvp-offer-lifecycle/spec.md](../mvp-offer-lifecycle/spec.md); everything else is new or changed.

## Usage scenarios

- **Map user:** opens the map and sees active promotions with a short summary. Opening one shows its schedule, its outlets, the line "Summary only. Check the source before you go.", the full official source text and a link to the source.
- **Operator:** runs the daily job (or a one-shot run), sees per-source fetch health, and reads the coverage and error reports.
- **Product owner:** plugs in their own LLM endpoint without code changes.

## Merchants and sources

- **S1.** A merchant registry lists each merchant's sources. A source is one of: website promotion page or listing, Instagram account, Facebook page, TikTok account. Each source records:
  - its URL;
  - its ownership signals;
  - how it was discovered (`seed_telegram_link`, `web_search`, `manual`);
  - when it was accepted.
- **S2.** The registry is seeded from the frozen Telegram history: 138 merchants in [merchants.json](../../research/merchants.json), plus resolved short links. The seed is offline and one-time; Telegram is never fetched at runtime.
- **S3.** For each merchant without an accepted source, the LLM proposes candidates using web search. A candidate is auto-accepted only if at least one ownership signal holds:
  - the site's domain links to the social account, or the social account's bio links to the site;
  - the platform shows a verified badge;
  - the domain matches the merchant's registered operator name.

  Rejected candidates and their reasons are kept.
- **S4.** Aggregator platforms are never accepted as a merchant source, and are removed from the seed: Grab/GrabFood, foodpanda, Kris+ (including the existing `kris_plus_sg` registry entry), banks and publishers. Their Telegram records stay in the answer key, attributed to the underlying merchant when one is named; otherwise they get the miss reason `platform_only`.

## Acquisition

- **S5.** A daily job fetches every accepted source. Website fetches reuse the bounded fetcher and SSRF guard. Social sources use the acquisition method chosen in O1. Each fetch stores:
  - the text;
  - up to N images with their hashes;
  - the post or page URL;
  - the posted date when the source exposes one;
  - the fetch time.

  Images are capped at 10 per post or page and 5 MB each. A posted date is *reliable* only when the platform or page states it for that specific post or offer: a social post timestamp, a dated listing item, or `article:published_time` on the offer's own page. A site-wide CMS date does not count.
- **S5b.** Backfill mode fetches a historical window, from 2026-08-01 onward, for evaluation against the answer key. Social sources list posts in that window. Websites use the method chosen in O3. Backfilled snapshots use their posted date as the anchor and never count as current sightings.
- **S6.** The result of a fetch is one of `complete`, `partial`, `failed`. Only a `complete` fetch can renew an open-ended offer or withdraw one that has disappeared *(carried, S8–S10)*. A failed or partial fetch changes nothing.
- **S7.** Website pages that render only through JavaScript are fetched with a headless renderer only if O4 approves it. Otherwise they are recorded as `js_only` and excluded from the coverage numerator.

## Reading (LLM)

- **S8.** A `PromotionReader` receives source text, images, URL and posted date. It returns zero or more offers. Each offer has:
  - `kind`: `deal`, `event`, `everyday_price` or `not_promotion`;
  - `merchant`, `title`, `benefit`;
  - date phrases, each with a role: `start`, `end`, `single`, `month` or `period`;
  - schedule phrases;
  - outlet scope (`named`, `all`, `unspecified`), with included and excluded outlet phrases;
  - `onlineOnly`;
  - `limitedTime`: the source says "limited time", "while stocks last", or similar;
  - `openEndedWording`: the source says "Now", "Now – end date unspecified", "until further notice", or similar.

  Every non-null field carries a quote.
- **S9.** A text quote must appear verbatim in the source text, or the field is rejected. An image quote must name the image it came from. Image quotes cannot be string-matched, so they are accepted and recorded as `evidence: image`.
- **S10.** Only `deal`, `event` and `everyday_price` reach the map. Product launches, editorial features, channel ads, quizzes and news are `not_promotion`.
- **S11.** Providers are selected by configuration:
  - a subagent provider for development, on the cheapest available model;
  - an HTTP provider for the owner's own endpoint, configured with base URL, API key, model and protocol.

  The pipeline code is identical for both.
- **S12.** When an offer's fields cannot be attributed to it (several offers mixed, ownership unclear), the reader returns the offer with those fields null. It never borrows a neighbouring offer's facts.

## Computing (code)

- **S13.** Anchor date: the source's posted date when reliable, otherwise first-seen. Computed in Singapore time; never reset by a replay *(carried, S1)*.
- **S14.** Missing year or month is filled from the anchor. Only end dates roll forward, by the missing unit, until they are not earlier than the anchor or the start date. Explicit values are never rewritten. An impossible date stays unresolved *(carried, S3–S6)*.
- **S15.** No start date: start = anchor. An inferred start never goes past an explicit end; when the anchor is after the end, the start stays null and the end alone decides the lifecycle. Explicit dates that contradict each other stay unresolved; code never "fixes" them.
- **S16.** Validity: `dated` when an end date resolves. Otherwise `open_ended`, whether or not a weekly pattern exists and whether or not `openEndedWording` or `limitedTime` is present. This changes carried S7, and also carried S11 (limited time with no dates used to stay `needs_validity`).
- **S17.** Weekdays, hours, "opening until", last-order times, public-holiday and holiday-eve exclusions are parsed from the quoted schedule phrases. Unparsed phrases stay as source text only *(carried, S12–S15)*.

## Outlets

- **S18.** Scope `named` maps only the named outlets. If a named outlet cannot be found, that offer's location stays unresolved; it never widens to all outlets *(carried, S17)*.
- **S19.** Scope `all` or `unspecified` maps every outlet. The official directory is used when one exists; otherwise Google merchant locations. The basis is recorded.
- **S20.** Excluded outlets are removed when they can be matched. An exclusion that cannot be matched leaves the other outlets mapped, and the exclusion text stays in the displayed source text (this changes carried behaviour, which blocked the offer).
- **S21.** `onlineOnly` offers get no pins. Pins always need real coordinates; coordinates are never made up *(carried, S17)*.

## Lifecycle and display

- **S22.** Open-ended offers are active while a complete fetch of a current-list source still finds them. They go stale 14 days after the last complete sighting, or 7 days when `limitedTime` is set. Stale offers are hidden from the live map. Withdrawal follows S6.
- **S22a.** Current-list sources:
  - A registry website listing page whose enumeration is complete is a current list.
  - A social account's post list is **not** a current list, because posts are never taken down when an offer ends (this keeps carried S8). An open-ended social offer is active from its anchor for M days, then expires unless the same offer is posted again. M is open (O6, default 30).
- **S23.** Dated offers are upcoming, active or expired by date. Expired offers stay in the archive and in the evaluation set.
- **S24.** The detail view shows:
  - a short summary;
  - the schedule;
  - the live status: Within listed offer hours, Outside listed offer hours, or Check source *(carried, S19)*;
  - the outlets;
  - "Summary only. Check the source before you go.";
  - the full official source text, always shown, including social captions;
  - the source link.

  No assumption badges or icons. Audit details (first observed, date-fragment quotes, bases) are not shown. The current `OfferPolicyDetails` audit rows are removed from the public view. A single "last seen on source DATE" may appear in the schedule line.
- **S25.** The internal audit stores each fact's quote and evidence kind, plus:
  - `anchorBasis`, `yearBasis`, `startBasis`;
  - `participationBasis`, `directoryBasis`;
  - unmatched exclusions;
  - first seen, last complete sighting, provider and model.

  None of it is shown as badges.

## Evaluation

- **S26.** The answer key is built from the 200 records in `data/mvp-promotions.json`, pinned at SHA-256 `9856e70650b0d2b9618c4a275262627e1a5ad3314c6b6c4619be2835914fc7d5`. These are Telegram records from Aug–Sep 2026. Each record is classified with the S10 kinds, and the classification and its quotes are stored.
  - The answer key is never classified by the pipeline's own reader configuration. Use a different model or prompt version.
  - A person reviews every record classified `not_promotion` before it leaves the denominator. This is a one-time evaluation step, not a pipeline gate.
- **S27.** Coverage = answer-key promotions that the pipeline mapped from an official source, ÷ answer-key promotions. A match needs the same merchant, an equivalent benefit, and overlapping validity. The LLM proposes matches; a person reviews the matching on the spot-check sample.
- **S28.** Every unmatched answer-key promotion gets exactly one failure reason, such as:
  - `no_official_source`
  - `social_not_acquired`
  - `offer_not_found_on_source`
  - `source_removed`
  - `js_only`
  - `read_failed`
  - `outlet_unresolved`
  - `validity_unresolved`
  - `platform_only`
- **S29.** Accuracy is measured on a random sample of mapped offers (default 50) reviewed by a person against the source. Wrong offer, wrong date, wrong outlet and wrong kind are counted separately.

## Acceptance criteria

| ID | Criterion | Covers |
| --- | --- | --- |
| A1 | Registry seeded from the frozen history, with platforms removed (S4); every merchant has discovery evidence; all S3 auto-accept and reject decisions reproducible from stored evidence | S1–S4 |
| A2 | Daily job fetches all accepted sources and backfill mode covers the S5b window; complete/partial/failed outcomes recorded; failure never withdraws an offer | S5–S7, S22 |
| A3 | Reader contract enforced: every non-null text fact's quote is found verbatim; image facts name their image; unquoted facts rejected | S8–S9, S12 |
| A4 | Same pipeline output with the subagent provider and the HTTP provider on fixture inputs (schema-equal; values may differ by model) | S11 |
| A5 | Date and schedule rules pass the carried mvp-offer-lifecycle table plus the new open-ended undated cases | S13–S17 |
| A6 | Outlet rules: named-only, all via official directory then Google, unmatched exclusion keeps the others mapped, online-only gets no pins | S18–S21 |
| A7 | Lifecycle transitions (website renew, stale 14/7, withdraw, failure no-op, social M-day expiry and re-post) pass with captured fixtures | S22–S23 |
| A8 | UI desktop/mobile shows the S24 elements with no badges; official text is escaped | S24 |
| A9 | Coverage ≥ 95% on the answer key, with every miss assigned one S28 reason | S26–S28 |
| A10 | Spot-check error rate ≤ X% (O2) on ≥ 50 sampled offers | S29 |
| A11 | Retired paths no longer serve the map; their code and research artifacts are preserved | intent |
| A12 | Typecheck, lint, unit and e2e tests pass; scheduler and LLM credentials stay server-side | — |

## Open decisions

- **O1 — Social acquisition method.** Choose after a spike on about 10 accounts. Candidates are a plain fetch of post URLs (`og:` metadata), Meta Graph API Business Discovery, or a third-party provider. The chosen method must comply with the platform's terms; no logins or private APIs.
- **O2 — Spot-check error target X%.**
- **O3 — Website backfill for removed offers.** The answer key covers Aug–Sep 2026, and those offers may be gone from the merchant's website. Options:
  - count them as `source_removed`, which lowers coverage;
  - use a web archive snapshot.

  Shrinking the denominator is not an option, because it would contradict the ≥95% goal. This decides whether A9 is reachable.
- **O4 — Headless rendering for JS-only merchant sites.**
- **O5 — Storage.** File artifacts (as MVP does today) or the database tables used by direct sources. Design §8 proposes file artifacts first.
- **O6 — Active window M for undated social offers.** Default 30 days from the anchor, unless the same offer is posted again.
