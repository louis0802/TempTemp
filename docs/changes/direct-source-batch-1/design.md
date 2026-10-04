# Repository-grounded design

Existing direct-source components live in src/ingestion/direct-sources: registry/types, DirectSourceAdapter, BoundedDirectFetch, evidence/candidate utilities, runner, publication, persistence and review. New adapters use these contracts and keep merchant semantics local. No persistence or migration redesign is needed. direct-source-v2 remains the shared processor version.

## Phase A

Discover narrowly relevant official pages, then use the existing bounded HTTP transport with separate DEFAULT_LIMITS budgets for each merchant. Preserve immutable responses/manifests and request/error ledgers under tests/fixtures/direct-sources/{fairprice,kris-plus,dian-xiao-er,cs-foods}/. Research definitions are not runtime registration. Stop at challenges; research may verify operator linkage independently without attempting alternate acquisition bypasses.

Inspect public HTML and inline JSON actually delivered by the public page. Do not reverse-engineer undocumented FairPrice APIs or private mobile endpoints. Wix collection state and public web directory transports are eligible only when their page association and public boundary are demonstrated. Record unresolved structures rather than guessing.

## Phase B checkpoint

Update this design and plan from research decisions before application edits. Register only justified adapters or explicit source definitions. Refactor sourceAdapter to an exhaustively typed explicit factory map with unknown-value rejection; preserve existing adapter instances/behavior. Keep outlet dispatch unchanged unless new adapters require merchant-aware factories; never introduce a generic provider or infer platform partners from operator identity.

Candidate provenance cites exact listing/detail evidence. Existing campaign date helpers may parse explicit campaign wording only. Missing/image-only/app-only facts remain null with issues. Source blockers populate activationReview and disable enabled/autoPublish. Candidate disposition still uses the generic lifecycle/gate; no source bypass.

Research reporting stays outside runtime imports. Regenerate the merchant map from readMapInputs/frozenMapInputs and final registry, with a narrow research-only overlay if necessary to present blocked sources without production adapters. Preserve frozen audit/history and unrelated rows.

## Verification and rollback

Capture a pre-task file hash snapshot and merchant-map baseline; compare all prior evidence, next-env.d.ts, migration and .local/source-discovery-service after work. Fixture replay uses captured transport and synthetic adverse cases; never live tiles or operational seeds. Enabled sources require existing disposable local DB integration; shadows reject before persistence. Removal/disablement of new registry entries rolls back onboarding without schema changes. No deployment is in scope.

## Phase A implementation decisions

Research is complete for all four; see research.md and source-decisions.json. FairPrice, Kris+ and Dian Xiao Er receive disabled shadow adapters; CS Foods receives no runtime registration. No count-budget increase or migration is justified. No outlet provider is added/refactored: publication is disabled for all new sources and the existing unresolved-scope/provider behavior suffices.

- FairPriceAdapter reads only the public weekly root's validated __NEXT_DATA__.props.pageProps.promoDetail.layouts publications collection. Match every native ID/URL/title/period to its exact DOM card. Preserve catalogue dates using merchant-specific shorthand normalization followed by campaignDates. Ignore product state and JSON-LD entirely. Campaign product/detail/participation coverage remains unresolved; catalogue metadata is useful review evidence. No viewer-shell/backend crawl or detail facts are invented. Canonical campaign URLs remain exact advertised URLs, so existing runner detail success remains false for this listing-only adapter. A UNITY catalogue retains an unknown promoted merchant with a blocking issue.
- KrisPlusAdapter discovers only exact /en/sg/promotions/<slug>-<hash> cards, then bounded public details. Validate one PromotionDetail article and exact card/header title/subtitle correspondence. Use own public header benefit and explicitly labelled partner identity only; multi-merchant scope stays one review object. Preserve article text but never attribute dates/terms of embedded offers to the overall candidate. Always report unresolved load-more/partial directory until a permitted backend boundary is established. No JS evaluation, mobile request or private API.
- DianXiaoErAdapter reads the exact slideshow/card DOM. Validate ghost identities and the known mirrored current slide against image URI/dimensions/own text; conflicting/duplicate identities fail. Canonical URL stays /promo with native gallery/image identity. Store image metadata as evidence notes, use own title/caption, keep benefit/validity/terms unknown, parse exact selected names only from own card. Counter mismatch and unresolved lightbox collection keep acquisition partial.
- Source factories are an exhaustive Record keyed by adapter type. Unknown values and adapter/source mismatches throw rather than falling through to Paradise.
- Research-only blocked merchant assessments may override the selected CS Foods row's current ownership/operator/blockers/evidence references while keeping adapter=none. They are separate labelled batch evidence in map provenance, never imports from runtime or edits to frozenMapInputs. Other 138 rows change only through the final registry; compare every unrelated row byte-semantically.

No unresolved consequential implementation decision remains. These limitations are deliberately reflected in disabled policies and candidate issues; they are not assumed activation approval.
