# Specification: Singapore promotion map

Status: Implementation baseline. Input: [Intent](intent.md).

## Visitor journey
1. Open a Singapore map and matching promotion list.
2. Search an area or optionally share current location.
3. Filter by category and validity.
4. Select an outlet and inspect its offers.
5. Read conditions, view the source, or open directions.

## Requirements and acceptance criteria
- **AC1 — Discovery:** Map and list display the same results for the chosen area and filters. Browsing remains usable when location permission is denied.
- **AC2 — Offer details:** Each published offer displays merchant, offer description, participating outlet, known validity, redemption restrictions, and original source link. Unknown values are labelled rather than invented.
- **AC3 — Location accuracy:** An offer may apply to multiple confirmed outlets. Ambiguous locations stay unpublished. “Selected outlets” never implies all branches. “All outlets” requires a verified participating branch list before pins are published.
- **AC4 — Validity:** Expired offers are excluded from active results. Specific dates, weekday schedules, time windows, and public-holiday exclusions are respected in Singapore time. Relative dates refer to the source post date. Ambiguous dates require review. Unknown end dates are labelled and assigned a review date rather than presumed permanently valid.
- **AC5 — Content selection:** Roundups may produce multiple offers. Restaurant articles, product launches without a promotional benefit, and unrelated announcements do not become promotion pins. Online-only offers stay off the physical map. In-store offers requiring an app remain eligible when participating outlets are confirmed.
- **AC6 — Duplicates and corrections:** Reimporting a post does not duplicate listings. The same verified offer from both channels can share one listing retaining both references. Conflicting dates or conditions require review. Edits affecting published facts return the offer for review; administrators can withdraw an offer.
- **AC7 — Administration:** Only authorised administrators can approve, edit, or withdraw listings. Imported items with confirmed offer details, validity, and participating locations can publish automatically. Incomplete, ambiguous, or conflicting items enter a review inbox and stay off the map until resolved.
- **AC8 — Traceability:** Published listings retain the original post reference and last verification time. A failed import must not appear as a successful refresh.

## Confirmed collection and launch behaviour
- **AC9 — Hourly incremental collection:** Check both sources every hour, independently tracking the last successful check. Collect new messages since that checkpoint, store them durably, and avoid duplicates on retry. A failed check must not advance the successful checkpoint or prevent the other source from progressing.
- **AC10 — Ongoing promotions first:** Initial collection examines available historical posts for still-ongoing offers; posting age alone does not establish expiry. The initial history depth remains to be selected and coverage must be reported honestly. Future, expired, and unverified-validity offers do not appear in the default map. Ongoing means the promotion date range includes today in Singapore; offers restricted to particular hours or weekdays show their schedule and are not labelled redeemable now outside those windows.
- **AC11 — Database to map:** Validated ongoing promotions are published automatically from database records and visible on the next map data refresh. An open map refreshes at least once per minute (proposed implementation default). Expiry is enforced when reading results, even if collection fails. Uncertain records remain stored for review without producing guessed pins.
- The hourly interval is a collection target, not a guarantee during outages or review. Show last successful source check separately from offer verification.

## Examples to support testing
- A post naming three malls produces pins only at the three confirmed branches.
- A Saturday-only deal is not presented as redeemable on Tuesday.
- A source post saying “today” from a previous month does not become a current offer when imported.
- A restaurant profile without a discount or other offer is excluded.
- Two posts advertising the same merchant offer retain both source references without duplicate cards.

## Proposed non-functional acceptance targets
The [system design](design.md#1-requirements) specifies proposed performance, freshness, integrity, availability/recovery, security, operability and cost targets (NFR1–NFR7), with capacity assumptions and verification methods. These are planning targets, not measured results or agreed service guarantees. Hourly collection remains confirmed. Budget, retention and backup-service selection must be resolved before production commitment.

## Open product decisions
- Confirm food-and-beverage-only pilot scope.
- Set unknown-expiry review interval and maximum stale age. Import frequency is decided: hourly.
- Default map is decided: verified ongoing promotions only. Future and unknown-validity offers remain outside the initial map scope; additional filters can be considered later.
- Public viewing is verified for both channels; no administrator access is required for that. Select the automated ingestion method and establish permitted reuse separately.

Next: [Design](design.md).

## Implementation assumptions and gated acceptance
Food and beverage is the pilot scope. The user requested configurability: BACKFILL_DAYS defaults to 30 and UNKNOWN_EXPIRY_REVIEW_DAYS defaults to 7, each configurable from 1 to 3650 days. These defaults are not a production policy commitment. Demo mode is explicit and never reports real source freshness. Production returns a dependency error without a configured database. Live AC9/AC10 coverage and the pilot require an approved source adapter and verified listings. All other acceptance criteria can be exercised with synthetic fixtures.

## Local acceptance boundary
Local Docker services replace hosted services for implementation verification, as requested. Administrator review supports a JSON record editor, approval, correction, withdrawal, provenance and audit. Approved structured imports are implemented; arbitrary source text is routed to review. Source-specific extraction, live channel collection, verified pilot content and production NFR targets remain unfinished. See [verification.md](verification.md) for acceptance evidence.

## Follow-on acceptance criteria
- **F1:** A real Singapore basemap can be used without a paid key; map failure keeps discovery usable. Provider attribution remains visible on mobile. Automated tests do not download public map tiles.
- **F2:** Curators edit merchant, offer, validity, terms, sources and participating outlet evidence through labelled form fields. Incomplete records cannot publish. They can dismiss non-offer candidates with an audit reason.
- **F3:** Curators can page through offers and current review candidates without the previous 200-record ceiling; source health includes pending/review/retry counts.
- **F4:** Overnight schedules are supported: weekday restrictions refer to the window's starting day, holiday exclusion applies to the redemption calendar day, and the overall inclusive date range still ends at local midnight on its last date. Equal start/end times remain ambiguous and invalid.
- **F5:** Approved raw text produces review suggestions with preserved conditions and extraction issues. Explicit full-year ranges and source-relative “today” can be suggested; ambiguous years, locations and image-dependent terms remain unverified. Raw extraction alone never publishes. Obvious non-offers may be flagged for dismissal, but evidence remains available.
- **F6:** Complete approved JSON exports can be submitted in the curator UI; outcomes are per source and failures do not masquerade as successful refreshes. File-size limits and authentication apply.

These extend the original acceptance criteria without asserting that synthetic parser fixtures establish real-channel coverage. Live-source feasibility, production capacity/recovery targets and provider-specific paid setup remain gated.

- **F7:** Following the user's instruction to proceed, implement public-preview collection for the two selected usernames with bounded requests, timeouts, pagination and explicit coverage metadata. A missing/inaccessible/malformed page must fail without advancing the checkpoint. First-run backfill depth remains configurable. Refresh posts backing active offers when accessible, and report edit/deletion limitations. All raw imports enter curator review; no guessed outlet can publish.

## Follow-on acceptance status
F1–F7 are implemented and verified locally as recorded in verification.md. Public-preview coverage is explicitly limited; no complete archive, deletion detection, image OCR, or automatic publication of raw unverified posts is promised. Raw date suggestions retain inference flags and require curator verification. Human approval is still needed before live posts can become visitor listings. The optional hourly worker is implemented and tested, but starting it is separate from implementation.
