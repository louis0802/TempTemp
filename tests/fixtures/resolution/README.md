# Resolution fixtures

`genki-locator.html` was retrieved on 17 September 2026 from https://www.genkisushi.com.sg/locate-us/ using a read-only HTTP request. It contains 22 static outlet cards with matching map-tab containers, not a separately advertised official count. This is a parser regression fixture, not a production directory seed. Tests must not fetch its embedded images, scripts or maps.

Google/OneMap test responses and integration coordinates are synthetic. They demonstrate API mapping and publication boundaries, not verified live coordinates. Representative Telegram source text is read from the unchanged exported inbox; tests never apply that export to an operational database.

## Papi's Tacos homepage
`papis-home.html` is the unmodified public HTML retrieved from https://www.papis-tacos.com/ on 2026-09-20 at 15:33:49 UTC. It contains four complete server-rendered location cards, an explicit four-location heading and matching location navigation. It is a contemporary directory fixture, not evidence of historical branch availability or promotion participation. Preserve the source spelling `149 Tyrwhitt Roard, 207562`; do not silently fix it. Runtime uses live official HTML; tests use this capture and mocked transport only. Parser evidence uses the existing `digest` convention (SHA-256 of JSON-encoded source text).
