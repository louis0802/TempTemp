# Specification

## Scope and journeys

1. Replay saved origin signals and redirect cache offline into a new run. Distinguish exact transport final URL from canonical candidate identity. Only exact supported social unsupported-browser transitions can recover a prior meaningful URL. All hops and transport evidence remain unchanged; ownership stays unknown without separate evidence.
2. Select resolved, offer-associated promotion records in merchant_web_candidate, issuer_or_platform_candidate or app_or_deep_link. Deduplicate exact signal ID + candidate URL; preserve distinct offers on a shared domain and Telegram/source-record provenance.
3. Inspect public direct candidates and bounded, relevant ownership/listing surfaces. Capture evidence for deterministic offline replay. Record ownership, source role, enumeration boundaries, extraction field availability, access constraints and reusable technical patterns separately. No name/hostname-based verification, numeric scores or automatic publication.
4. Produce candidates.json, audit.json, report.md and report.csv in a new direct-source research run. The report covers scope, inventory, authority, enumeration, extraction, apps, platforms, patterns, evidence-only sources, monitoring suitability and open questions. Identify supported next families, with conditions where evidence is incomplete.

## Acceptance criteria

- A1: Instagram post/reel → exact Facebook unsupportedbrowser recovers the adjacent observed Instagram URL, reports Instagram candidate domain and social class, retaining exact Facebook transport and complete chain. Genuine Facebook and normal Instagram remain unchanged. Arbitrary Facebook redirects cannot rewrite to Instagram. Facebook public post/reel → exact same fallback can recover that Facebook identity; unsupported fallback alone has no candidate.
- A2: Candidate filtering/deduplication follows the scope above; repeated domain offers remain separate, unique domain pattern counts do not inflate.
- A3: Unreviewed ownership defaults unverified; verified ownership requires captured explicit evidence. Enumerable and extraction categories are independent. App-only and inaccessible observations are retained conservatively.
- A4: Actual candidate inspection uses captured public evidence, no OCR or bypass; app campaign ID/web fallback/public index/auth observations are explicit and unknowns remain unknown.
- A5: Offline replay is stable and all three protected input trees/files stay byte-identical. No production/DB or monitor runtime import path.
- A6: Focused tests, typecheck, scoped lint/format and diff check pass; controlled-worker suite where feasible. Documentation records actual counts, outputs and limits.

Assumptions: candidate association follows the existing parser; hints can be malformed and are retained verbatim. Research does not assert validity/current availability of the Telegram offer. A bounded failed fetch is evidence of inspection failure, not proof the source is offline or requires login. No unresolved product decisions.
