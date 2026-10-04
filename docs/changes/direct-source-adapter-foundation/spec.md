# Specification

## Scope and journey

A developer selects one verified source or both, optionally supplies a local fixture manifest, and receives run, enumeration, candidate, evidence and Markdown report artifacts. No production data is written. Every request belongs to a registered listing surface, observed pagination link or explicitly discovered offer/evidence link. No arbitrary traversal or authentication.

## Acceptance criteria

- A1: Only pepper_lunch_sg and paradise_group_sg are registered, with explicit verified authority/operator evidence.
- A2: HTTP(S), exact hosts, public targets, page/response/time/redirect bounds and a named user agent protect every request. Unregistered and undiscovered URLs fail closed. Failures remain visible.
- A3: Pepper enumerates observed /promo/ cards and exposed bounded pagination; canonical duplicate cards collapse. Unresolved pagination or changed structure prevents complete enumeration and readiness.
- A4: Paradise enumerates corporate and Hotpot cards plus directly linked menus, retains PDFs as evidence and always reports partial corporate coverage. Historical PDFs are not roots.
- A5: Candidates have source-specific deterministic identity, nullable facts and explicit missing/unparsed issues. Publication metadata never fills campaign dates. Source-declared outlet scope is separate from resolved outlets; no absent restriction implies all outlets.
- A6: Every populated fact cites same-source page evidence; exact URL, relation, time, hash, MIME, status and selectors/quotes survive. Listing completeness and extraction completeness are independent.
- A7: Offline replay is deterministic. Live one-shot runs for each source record requested pages, counts, issues, coverage and activation gates. Production-adapter-ready requires proven Pepper coverage, ownership and no acquisition blocker; Paradise may remain partial. Neither status activates publication.
- A8: Existing Telegram ingestion/domain schema, merchant registry and research/discovery artifacts remain unchanged. CLI dependency closure contains no DB or Telegram collection path.

Missing validity, outlet scope, eligibility or redemption is an acquisition result, not grounds for inventing facts. Native PDF extraction is optional; without an explicitly associated unambiguous native text block retain evidence and report an issue. Image facts are unknown; no OCR. No consequential product decisions remain open within this scope.
