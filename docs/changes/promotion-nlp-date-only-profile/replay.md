# Date-only retrospective replay

This replays sealed V4 model answers under a new user-requested product contract. It is not a new model experiment or automatic publication rate.

Inputs: 49 source envelopes, 43 historical economic identities, 34 available normalization replies from 29 sources.

| Metric | Result |
| --- | --- |
| Original V4 contract passes | 26/34 (76.47%) |
| Date-only contract passes | 28/34 (82.35%) |
| Complete source Description preserved by code | 34/34 |
| Campaign-date annotation matches, including correctly unknown dates | 31/33 |
| Physical-participation annotation matches, including unknown scope | 31/33 |
| Contract + both annotated core checks | 24 units |
| Complete retained core fields for further review | 1 units; still no directory/coordinate/publication proof |
| New prompt success / end-to-end automatic map rate | Unmeasured |

## Newly compatible historical replies

- captain_kim_sg-captain-kim-korean-bbq-hotpot-tamp-j10-2::weekday_dinner_early_bird
- captain_kim_sg-captain-kim-korean-bbq-hotpot-tamp-j10-2::weekend_lunch_dinner_early_bird

## Remaining issues and missing fields

- missing_start_date: 19
- missing_end_date: 19
- physical_participation_unresolved: 22
- missing_title: 1
- nonverbatim_benefit: 5
- benefit_exceeds_publication_limit: 10
- physical_participation_annotation_mismatch: 2
- unmatched_or_unannotated_economic_identity: 1
- missing_or_non_source_quote:merchant: 1
- nonverbatim_merchant: 1
- campaign_date_annotation_mismatch: 2

## Named failure examples

### captain_kim_sg-captain-kim-delivery::offer_1

Original accepted=true; date-only contract=true; dates match=true; participation match=true.

Issues: none. Missing fields: missing_start_date, missing_end_date, physical_participation_unresolved.

Complete Description:

```text
Flash this page to enjoy 20% OFF All Regular Items - Takeaway only!
```

### captain_kim_sg-captain-kim-korean-bbq-hotpot-tamp-j10-2::weekday_dinner_early_bird

Original accepted=false; date-only contract=true; dates match=true; participation match=true.

Issues: none. Missing fields: physical_participation_unresolved.

Complete Description:

```text
EARLY BIRD PROMO Mon – Fri Lunch: $14.9++/pax [11:30am-12pm Timeslots Only] Mon – Fri Dinner: $21.9++/pax [5:30pm Timeslots Only] Sat – Sun Lunch & Dinner: $21.9++/pax [5pm-5:30pmTimeslots Only] Guest coming for Early Bird Promo MUST prebook on web link and key in “EB” under Reservation Notes.Prior to entry guests have to inform host that they are using the promo before entering. Once verified by restaurant staff, diners will be given the early bird promo pricing written on the bill chit. Guests MUST follow our Facebook / Instagram to enjoy the promo. All Guests have to follow our FB/IG page to enjoy the promo. Limited to 80mins dining time. Min 2 paying pax to dine in. Lunch discount is only applicable during 11:30am – 12pm timeslots. Dinner discount is only applicable during Weekday 5:30pm timeslots (Weekends & PH 5pm – 5:30pm). Not applicable with other promos, vouchers & discounts. Valid from 1 – 31 Oct 2026.
```

### captain_kim_sg-captain-kim-korean-bbq-hotpot-tamp-j10-2::weekend_lunch_dinner_early_bird

Original accepted=false; date-only contract=true; dates match=true; participation match=true.

Issues: none. Missing fields: physical_participation_unresolved.

Complete Description:

```text
EARLY BIRD PROMO Mon – Fri Lunch: $14.9++/pax [11:30am-12pm Timeslots Only] Mon – Fri Dinner: $21.9++/pax [5:30pm Timeslots Only] Sat – Sun Lunch & Dinner: $21.9++/pax [5pm-5:30pmTimeslots Only] Guest coming for Early Bird Promo MUST prebook on web link and key in “EB” under Reservation Notes.Prior to entry guests have to inform host that they are using the promo before entering. Once verified by restaurant staff, diners will be given the early bird promo pricing written on the bill chit. Guests MUST follow our Facebook / Instagram to enjoy the promo. All Guests have to follow our FB/IG page to enjoy the promo. Limited to 80mins dining time. Min 2 paying pax to dine in. Lunch discount is only applicable during 11:30am – 12pm timeslots. Dinner discount is only applicable during Weekday 5:30pm timeslots (Weekends & PH 5pm – 5:30pm). Not applicable with other promos, vouchers & discounts. Valid from 1 – 31 Oct 2026.
```

### bari_bari_steak_sg-promotions-2::p1

Original accepted=true; date-only contract=true; dates match=true; participation match=true.

Issues: none. Missing fields: missing_start_date, missing_end_date.

Complete Description:

```text
Enjoy 23% Off Free-Flow Salad Bar at Bari Bari Steak! Treat yourself to unlimited fresh greens with Bari Bari Steak’s Free-Flow Salad Bar! For a limited time, enjoy 23% savings and pile your bowl high with crisp veggies, tasty toppings, and delicious dressings for just $12.90++ (U.P. $16.90++). Whether you are looking for an all-day dining feast or a refreshing mid-day bite, we’ve got you covered across selected outlets from Monday to Thursday: All-Day Free-Flow Salad Bar: Available at Tampines 1 and VivoCity. Tea-Time Free-Flow Salad Bar (2 PM – 5 PM): Available at Junction 8 and Great World. Terms & Conditions: Valid exclusively for dine-in. Not valid in conjunction with other ongoing promotions, discounts, vouchers, or privileges. Image(s) for illustration purposes only. The Management reserves the right to amend or terminate the offer without prior notice.
```

## Limits

- No fresh model call: archived answers were produced with the old V4 prompt and routing.
- Only available downstream answers are revalidated; upstream lost identities are not recovered.
- Original full source Description is copied by code; that preservation rate is not an LLM accuracy score.
- Null dates can match unknown gold while still blocking campaign validity.
- Physical annotation matches do not verify authoritative directories, coordinates or source policy.
- No application database, map, source activation or recurring process was changed.
