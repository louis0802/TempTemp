# Official-source feasibility and remaining evidence

Inspected 20 September 2026. Ranked by observed missing-directory offers only; no business ranking or approval quota.

## Papi's Tacos — implemented (2 offers)
https://www.papis-tacos.com/ explicitly declares four locations. Complete HTML contains four address/hours cards and the same four unique location navigation entries. The provider validates those independent structural checks, explicit count, full document, no pagination, unique addresses/names, audited URL/hash and branch status before claiming authority/completeness. Runtime fetch rejects redirects. Fixture metadata records exact bytes and retrieval time. This source lists all Singapore branches, but does not establish a specific selected promotion's participation or coordinates.

The source spells one address `149 Tyrwhitt Roard, 207562`. Preserve it. Exact matching against the original offer's `149 Tyrwhitt Road` remains unresolved. The contact page https://www.papis-tacos.com/contact uses Road, and the rewards-directory page https://papis-tacos.eber.co/stores also differs on the Seah Street unit (#01-01 versus the homepage/contact #01-00). Do not silently merge conflicting addresses/units or change stable physical identity. The provider uses the fixed primary homepage, not the third-party rewards platform. Multi-source reconciliation is not implemented.

## Shiok Burger — deferred (2 offers)
https://www.shiokburger.com/find-us exposes an image and office address in retrieved web text, not a provably complete branch directory. Direct HTML retrieval failed with TLS SSL_ERROR_SYSCALL. This does not establish that the site is permanently inaccessible; it establishes no safe traversal contract for this task. No provider fabricated. McDonald's/Subway are not top missing-directory opportunities at the fixed corpus evaluation time and were not prioritized just because they are golden examples.

## Coordinate review
ApiPlaceResolver preserves source address/unit, rejects multiple Google identity matches and explicit business-status conflicts, uses exact postal OneMap matches only when one page yields a unique coordinate, and reports building precision. Physical outlet UUID still includes the unchanged source address/coordinate tuple. Added Papi-specific regressions for ambiguous Google results, Google status conflicts, OneMap ambiguity and preservation of full address/unit/building precision. No coordinate matching rules were relaxed; no live coordinate quality claim is made.

## Selected-outlet review — no safe production adapter added
The four observed selected-list blockers remain unresolved. Read-only HTTPS redirect inspection retained original corpus source and short-link linkage:

| Corpus post | Link | Final destination / outcome |
| --- | --- | --- |
| sgfooddeals/4926 | https://tco.sg/72KaXgJub | https://www.sukiya.com.sg/new-sukiya-breakfast (with campaign query parameters), HTTP 200 |
| tastesoulsg/4459 | https://bit.ly/4cT7aBo | https://www.instagram.com/p/Dcr3iiOEbWj/ (with campaign parameters), HTTP 200 headers; content unavailable through web retrieval |
| tastesoulsg/4445 | https://bit.ly/4iuUX9C | https://www.instagram.com/p/Dce4JKeDTb3/ (with campaign parameters), HTTP 200 headers; content unavailable through web retrieval |
| tastesoulsg/4421 | https://bit.ly/4zcyiot | https://www.starbucks.com.sg/menu/beverages/unicorn-frappuccino (with campaign parameters), HTTP 404 |

The Sukiya page does expose breakfast availability names, grouped into 8am and 5am starts. The corpus post says 8am–11am, lacks validity and does not establish a promotional benefit. This current menu page does not establish a dated, historically complete promotion-specific participant contract, and no exact authoritative Sukiya branch identity reconciliation exists here. Therefore no list is fed into production as verified participation. A future adapter needs source/version linkage, full list semantics, material-hours conflict handling and exact branch reconciliation together. An HTTP success or a current menu list alone does not satisfy those requirements. Instagram media was not read; Starbucks destination is missing. No fallback to the whole chain.

## Temporal limit
The 20 September capture cannot prove 17 September historical branch availability. `compare:evidence` is explicitly an offline coverage sensitivity comparison, separate from the unchanged conservative corpus. It produces no approvals and never publishes data.
