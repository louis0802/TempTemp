# Specification

## Observable behavior

1. The profile represents campaign start/end dates separately from the full original Description. Dates are Gregorian YYYY-MM-DD, source-evidenced with explicit year, and ordered. Publication dates and unrelated contest dates are never valid substitutes. Missing dates remain unknown.
2. Description is exactly the complete supplied isolated source text, including prices, weekdays, hours, redemption, purchase, audience, holiday and reservation restrictions. The model neither supplies nor summarizes Description. If it exceeds current publication storage limits, report that limit rather than truncate.
3. Weekdays, intraday time ranges, holiday calendars and condition attributes are not required structured fields of this profile. Incorrect historical clock fields do not invalidate otherwise correct date-only data; those fields are discarded and never used for an availability claim.
4. Merchant/title/benefit and positive or excluded physical participation retain source evidence. A physical branch mention alone does not establish participation. Missing participation is review work, never inferred universal coverage. Time-dependent variants may retain one original campaign description and the source-declared participating branch sets; distinct economic offers and incompatible date windows must not silently merge.
5. All profile candidates are research-only. A research contract pass does not establish semantic truth, official directory/coordinate verification, enabled source policy, storage readiness or automatic publication.
6. Preserve all prior V1–V4/oracle files and results. Replay reports are new, separately labelled artifacts and include the input hashes and denominators. Reassessment must include historical outputs rejected by the old schedule validator, without repairing model responses.
7. Report: old versus new contract pass counts among available raw normalization responses; full source and historical economic-identity denominators; core date/physical-participation checks against existing reviewed annotations; missing-date/location/length blockers; and each named failure example. No new prompt accuracy or end-to-end automatic map rate may be inferred from this replay.
8. Provide a standalone simplified prompt and provider-neutral extraction interface that receives the complete isolated source text. No evidence-node selection is required for the new profile. No live acquisition or new model execution occurs in this scope without a configured provider.

## Acceptance

- A1: First-response archived Early Bird weekday and weekend outputs survive the removal of schedule-only requirements when their retained core facts pass; original rejection statuses remain unchanged.
- A2: Description retains Flash this page, Takeaway only, EB booking, social requirements and all-day/tea-time branch wording exactly, even when old extracted constraints omitted them.
- A3: Invalid/missing date evidence, invalid ranges, invented branches, incompatible participation roles and truncated Description cannot silently become research-ready.
- A4: Missing campaign validity and positive participation remain separately counted after a contract pass. A contest date association error is detectable in benchmark semantic scoring even if its quote passes structural checks.
- A5: Replaying the same archived inputs yields identical reports; fixtures, sealed raw responses and original score artifacts are unchanged.
- A6: Focused regression tests, existing NLP regression tests, typecheck, scoped lint/format and diff review pass. Report actual checks and limitations.

## Decisions

Confirmed: research-only reassessment first; campaign dates structured, other non-location restrictions in Description. Existing formal publication and Available now behavior are outside this change. Fresh model behavior remains unmeasured because configured hosted credentials/model are absent; the replay cannot answer the new autonomous rate.
