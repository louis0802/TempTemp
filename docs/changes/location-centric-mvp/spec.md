# Specification
- Group returned physical outlets by shared Google Place ID or effectively identical coordinates; never by venue name or broad proximity. Count unique promotion IDs, including each multi-outlet promotion at each distinct location.
- A single-offer pin is a dot; multiple-offer pins show the promotion count. Accessible labels name the location and count. Clicking any pin opens all included promotions for that location; each row opens existing detail. Selecting an offer highlights all its locations. Both renderers behave alike.
- Preserve source wording, unit, dates, lifecycle, readiness, schedule, provenance, directions and external source links.
- Live view includes only active, fully resolved, map-ready physical records. Development includeExpired=true additionally includes equally ready expired records, respecting viewport bounds. It never includes unresolved, online-only or upcoming records.
- Development /corpus remains all 200 records, including incomplete records; only usable coordinates get pins. Production /corpus is unavailable.
- Raw Telegram description and duplicate terms are absent by default on MVP/corpus. Development showSourceText=true reveals one labelled source section. Production ignores both preview flags server-side. Stored fields remain unchanged. This developer flag is not an authentication boundary for a network-exposed development server.

Acceptance: focused grouping/selection tests; fixed-date eligibility/bounds tests; desktop/mobile checks of six requested URLs and shared Suntec/Morganfield interaction; production gates; full requested verification commands. No unresolved product decisions.
