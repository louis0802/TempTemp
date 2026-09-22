# Requirements
1. Initial/manual browsing says Map area and counts loaded promotion records after current filters, with singular/plural wording. Explicit places say their name; successful geolocation says Near you; these use “deals in this area”. Corpus retains its full-list behavior.
2. User pan/zoom clears named context; automatic fitting does not. Exact user coordinates are never persisted.
3. Compact keyboard-accessible Location info exposes the provenance disclaimer. Preserve map notice and source links.
4. One search offers labelled Merchants, Deals, Promotion locations and Places. Search structured merchant/title/benefit/outlet/source location/address fields, never source body. Search all eligible artifact records independent of viewport.
5. Aggregate merchants with only apostrophe/case/trim normalization. Deterministic ranking: exact merchant, merchant prefix, exact location, title/benefit, substrings, external places. Limit each kind to five.
6. Merchant selection fits all eligible locations and visibly filters/highlights related deals, with a clear removal control. Deal selection fits all locations and opens the exact detail. Locations retain neighbourhood navigation and set explicit context. Records without coordinates remain selectable in corpus without inventing pins.
7. Reuse existing eligibility and production preview gating. Source-text flag cannot affect search. Debounce 250 ms, abort stale work, clear old results immediately; distinguish partial address failure from total failure.
8. Verify desktop/mobile, grouping/count distinction, outside-viewport search, lifecycle modes, production gating, source privacy and stale request handling.
No unresolved product decisions. Merchant context is a separate filter, not a place label; its heading stays Map area.
