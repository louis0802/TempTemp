# Resolution fixtures

`genki-locator.html` was retrieved on 17 September 2026 from https://www.genkisushi.com.sg/locate-us/ using a read-only HTTP request. It contains 22 static outlet cards with matching map-tab containers, not a separately advertised official count. This is a parser regression fixture, not a production directory seed. Tests must not fetch its embedded images, scripts or maps.

Google/OneMap test responses and integration coordinates are synthetic. They demonstrate API mapping and publication boundaries, not verified live coordinates. Representative Telegram source text is read from the unchanged exported inbox; tests never apply that export to an operational database.
