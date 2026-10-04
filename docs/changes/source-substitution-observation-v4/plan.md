# Plan
- [x] Inspect service, protocol, discovery, review and historical evidence; capture preservation hashes.
- [x] Write consistent intent/spec/design/plan before implementation.
- [x] Add revision 4 assets and revision-aware lifecycle.
- [x] Implement scheduled Telegram slot evidence and coverage, retaining revision 3 behavior.
- [x] Implement explicit source cadence, durable multipass discovery, occurrence merge and daily freeze.
- [x] Add stable design tracker and read-only human/JSON command with shared evidence summaries.
- [x] Add fixture regression tests mapped to specification items 1–6.
- [x] Separate revision-4 gate counts from historical scored intervals and test a mixed-revision fixture.
- [x] Run required checks, inspect diff, verify preservation hashes, record evidence and sample output.

Risks: boundary/restart races, falsely scoring incomplete capture, frozen seal compatibility, stale active state, unknown sample sufficiency. Keep raw timestamps and conservative gaps; no live network is needed for validation.

## Review findings resolved
- Kept historical revision selection explicit; tested revision-3 resume and next-day revision-4 transition.
- Resume an interrupted midnight pass with its original source set even after another publisher slot begins; overdue observations remain late.
- Already running midnight transitions tolerate scheduling jitter; fresh late starts remain partial.
- Tracker uses frozen evidence for reviewed cases and validates assignments; merchant coincidence never becomes offer recovery.
- No justified numeric benchmark sample size exists, so the sample gate remains researcher review rather than invented completion.
- Forward revision-4 gate progression must exclude otherwise valid earlier-revision scored days.

See verification.md for executed checks, immutable-file hashes and a dated real-state command sample.
