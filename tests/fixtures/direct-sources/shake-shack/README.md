# Shake Shack captured source evidence

Immutable bounded public GET captures from 1 October 2026. `capture-provenance.json` records URL, UTC capture timestamp, SHA-256, byte length, HTTP status and purpose. `manifest.json` provides DB-free replay; it covers four archive pages and representative details, not every archived article. Full-archive replay intentionally stays partial when details are absent or the existing 20-detail cap is reached.

`promotion.html`: National Cheeseburger Day, campaign 14–18 September 2026, article published September 9.
`editorial.html`: Our French Onion Menu, ordinary menu descriptions without an offer/terms.
`opening-promotion.html`: Hello Parkway Parade includes a real discount; never label it pure editorial.
`chicken-bundle-promotion.html`: All About Chickens includes a real bundle; its title cannot classify it as editorial.
`missing-expiry.html`, `named-location.html`, `weekdays.html`: real incomplete validity/scope/restriction cases.
`outlets.html`: count=12, ten cards and twelve independently rendered map links.
`one-fullerton.html`, `parkway-parade.html`: the exact two missing card addresses, fetched only from directory links.
`legal.pdf`, `legal-native.txt`, `ownership.json`: independent operator declaration, preserving source spelling “Ptd Ltd”; native text only, no OCR.

Synthetic listing edits in tests are labelled test scenarios, never production or live evidence. Future previews write to a new ignored directory and never replace these fixtures.
