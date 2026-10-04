# Plan

1. [x] Inspect adapters, publication, review, migrations and Next.js route guidance; record preservation hashes (A1–A9).
2. [x] Add isolated migration and registry policy; pure mapping/gate and outlet bridge (A1–A4).
3. [x] Implement transactional persistence, health, revisions, autonomous update and generic dedupe (A2,A5,A6,A8).
4. [x] Add direct review endpoint, normalized union and minimal UI dispatch (A7).
5. [x] Add explicit CLI and merchant onboarding documentation (A8).
6. [x] Test captured fixtures and real disposable DB; run legacy suite, typecheck, scoped ESLint/Prettier, diff review and preservation checks (A9).

Risks: no currently verified Pepper directory provider exists in legacy infrastructure; preserve conservative unresolved-outlet disposition unless source-specific verification establishes it. Frozen domain-file hash must become explicit backward-compatibility coverage because source shape extension is required. Do not change other baseline hashes or tests/timeouts to mask failures.

Implementation findings: a source-specific Pepper outlet provider now uses the captured official directory and existing geocoder/participation infrastructure; no promotion adapter was added. Network helper dependency isolation was tightened after closure verification exposed signal types. Legacy runtime/source evidence files remain byte-identical. The historical September inbox integration test now supplies its original observation date and separately checks October expiry, preserving all audit assertions and default timeouts. UI verification uses intercepted admin APIs and real local test sign-in, avoiding shared application-table writes.

Final evidence: 577 units, 47 real PostgreSQL/PostGIS integrations, 2 desktop/mobile UI checks; typecheck, scoped ESLint/Prettier, diff check and 3704-file preservation comparison passed. Original seven-offer replay queues all seven and fabricates nothing. All acceptance criteria A1–A9 are covered; details and operational limits are in verification.md. No production/shared ingestion, commit or push.
