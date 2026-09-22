# Specification

1. Prefer existing unique acceptable Singapore merchant/branch Place. Only MVP opt-in may fall back.
2. Remove units/floors for coordinate queries, retaining original location for display. Require the same building identity, or street number/range and street identity. No proximity or arbitrary fuzzy matching.
3. Reject ambiguity, foreign or closed/unavailable places, incomplete searches and vague locations. Missing cache differs from not-found. An address anchor lacking business status is not merchant operational evidence.
4. Store Google Place ID, original Google formatted address, coordinates, source location and coordinate basis per outlet. Source anchors do not establish merchant existence, unit verification or participation.
5. With resolved content/validity and at least one safely resolved outlet, status/mapStatus become ready. Retain per-location audit for partial coverage. Preserve existing scope and eligibility ordering.
6. Detail UI explains source-location pins and shows source units alongside separate Google evidence; cards stay concise.
7. Exactly 28 original IDs appear once in a ledger: source URL, merchant, source location, old reason, both lookup outcomes, final basis/status. Report cache-refresh resolutions as a separately labelled subset when applicable.
8. Live build and byte-identical offline replay, existing corpus baseline, focused unit/browser coverage, integration, typecheck, lint and build must be verified; report actual blockers.

No unresolved product decisions. Partial outlet success follows existing MVP behavior with explicit audit. Validity/content resolution and strict-provider changes are excluded.
