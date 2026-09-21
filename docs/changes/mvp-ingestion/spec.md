# MVP ingestion specification

1. Every source produces one or more auditable records with stable identity, original child terms, merchant/content, validity, location scope and readiness reasons.
2. Ready requires a genuine promotion, known merchant/title/benefit, valid start and end dates, and at least one operational Singapore Google Place with coordinates. Category and strict evidence are irrelevant to this decision.
3. Named restrictions resolve only named locations. Other physical scopes use observed merchant locations. Preserve selected/excluded restrictions and visibly explain that merchant pins do not certify participation. Online-only records are excluded.
4. Now and Today use the original Singapore post date. Explicit single days and bounded recurring ranges resolve. Independently owned multiple windows split; ambiguous ownership remains needs_validity. Missing expiry is not parse failure.
5. Store historical records; derive lifecycle by Singapore date. Live queries return only active ready records. Dedicated development preview includes expired ready records.
6. Copy the 180-candidate benchmark into tests only. Map every candidate by source and section/content identity, report differences explicitly and account for every runtime offer.
7. Build command emits deterministic artifact, metrics, and exact non-ready reasons. Tests mock Google; offline artifacts never fabricate locations. Preserve strict approval and database behavior.

Acceptance: all seven requirements have focused/corpus coverage; unit, integration, corpus, typecheck, lint and build checks are recorded. Runtime offer count may increase only for documented source-owned splits. No product decisions remain open. Live provider availability is an environmental prerequisite, not assumed verified coverage.
