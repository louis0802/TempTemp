# Temporal contract (frozen before execution)

Dates: actual YYYY-MM-DD calendar dates, explicit four-digit source year in the evidence quote; no year inferred from hints, capture date or current date. Monday=1 through Sunday=7, unique integers; availability only, never announcement/check/release weekdays.

Time constraints are exactly four kinds: range {start,end,quote}, before {time,quote}, after {time,quote}, opening_to {end,quote}. Times are 24-hour HH:mm, ranges ordered. Opening to 5PM means opening_to/end=17:00 or conservative omission, never midnight. Generic validation requires numeric endpoints copied/normalized from quoted clock expressions and representation-compatible before/after/opening wording. Vague opening/breakfast periods remain unknown or verbatim constraints. No new scheduling language or implied operational hours.
