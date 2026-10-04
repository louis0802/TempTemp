# Direct-source fixtures

Reduced snapshots retain relevant card/detail DOM, source text and selectors; remove global menus, scripts, popups and unrelated cards. They do not establish exhaustive current coverage. Original captures are read-only.

- Pepper listing and $uper Value Deal detail: audited 2026-09-30 captures `pepper-directory.html` and `candidate-11.html`, referenced by `.local/direct-source-audit/2026-09-30-captured-evidence/reviewed-evidence-final.json`. Listing reduced to one card duplicated to exercise canonical deduplication.
- Paradise corporate listing (one anniversary card) and Hotpot brand listing: audited `paradise-home.html` / `paradise-hotpot.html` from that bundle. Retain the real LOAD MORE button and current menu link.
- Paradise Members' Day and anniversary detail: two bounded HTTP inspections on 2026-09-30 of the exact links exposed in those captures, kept initially under `/tmp/direct-paradise-detail.html` and `/tmp/direct-paradise-anniversary.html`. Preserve `.pgh-promotions-single` content and terms.
- `paradise-menu.pdf` is a **synthetic valid single-page PDF**, used only for evidence retention, never a real campaign/menu fixture. The manifest maps the observed menu link to synthetic bytes for transport tests; no menu facts are extracted. Historical PDF URLs appear only in tests for evidence-root rejection.
- Pagination, malformed dates, network failures, outlet declarations and native-text layout examples in tests are explicitly synthetic mutations. They are not source observations.

The manifest's fixed observed time makes offline semantic outputs byte-stable. Fixture transport never falls back to network. Live output never rewrites fixtures. Native PDF extraction is not installed or invoked; the separate association helper tests explicitly supplied text and refuses multiple pages/column layouts.
