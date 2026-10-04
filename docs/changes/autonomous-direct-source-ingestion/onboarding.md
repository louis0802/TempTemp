# Merchant onboarding and operation

Telegram is merchant/source discovery only. Manual discovery is equally valid. Once a merchant adapter is enabled, Telegram is no longer required for that merchant. Direct candidates do not need a Telegram counterpart. The direct-source registry is the production source map, not a dynamically inferred hostname list.

1. Discover the merchant and identify the official source.
2. Verify operator ownership using independent official legal/operator evidence; record the reviewed evidence in the source definition.
3. Audit the listing boundary, pagination, detail structure and source restrictions. Unresolved load-more, partial corporate coverage and refused oversized evidence block acquisition readiness.
4. Implement that merchant's adapter for listing selectors, pagination semantics, structured detail facts, location semantics and exceptional behavior. Reuse bounded HTTP/DNS security, hashing, HTML/date utilities and revision/publication services. Do not implement a crawler that guesses arbitrary sites.
5. Validate captured fixtures, enumeration proof, adverse transport cases and a bounded live structural observation when necessary. Promotion completeness and acquisition completeness are separate checks.
6. Establish an authoritative physical directory and exact participation semantics. Reuse the existing participation resolver and place resolver; Google is never a branch enumeration or participation authority. Unresolved exact participants remain review work.
7. Explicitly enable publicationPolicy with stable merchant/category and outlet strategy only after evidence supports production authority. Probable merchants are not eligible. Review registry changes; enabling an adapter is not permission to fill campaign gaps.
8. Apply the additive migration before using updated admin routes or ingestion. Run explicit source ingestion in the intended environment. Complete authoritative candidates auto-publish or update; incomplete/ambiguous ones enter the independent direct review queue.

## Pepper foundation slice

`pepper_lunch_sg` is enabled. `paradise_group_sg` remains disabled/shadow: corporate coverage partial, unresolved Hotpot load-more, refused oversized menu PDF and incomplete enumeration proof. None of those blockers were relaxed. No new merchant adapter or scheduler was added.

One-shot DB integration: `npm run direct-sources:ingest -- --source pepper_lunch_sg`. It reads server-only INGEST_DATABASE_URL (from the existing environment or .env.local), crawls the registered adapter, requires acquisition readiness, stores bounded evidence/revisions, evaluates every candidate and prints sourceId/observed/unchanged/newRevisions/autoPublished/updated/needsReview/conflicts. Production-writing --all is rejected. This command was not executed against production or shared DBs during implementation.

DB-free acquisition remains `npm run direct-sources:preview -- --source pepper_lunch_sg`; existing fixture mode and preview --all remain research-only and do not import persistence or publication services. Preview gates continue to report acquisition readiness only, with production_active=false; that preview field is not the server publication policy.

No worker, scheduler or application startup invokes ingestion. Source absence never withdraws or changes an unobserved offer. Missing-offer lifecycle is deferred. Health has no bigint checkpoint; last_success advances only after the complete persistence transaction commits. Direct health is available to administrators only.

## Review and ownership

The inbox combines legacy and direct rows for display without combining their storage. Direct rows link to the official canonical URL and dispatch to /api/admin/direct-candidates/[id]/review. Administrator completion is explicitly verified data; server code replaces submitted source identity/URLs with registry and DB provenance. Approvals require current source revisions; exclusion retains all evidence. Admin-corrected facts cannot be overwritten automatically.

Generic dedupe exists only against the promotions table after a complete Promotion draft exists. Exact published fingerprint attaches direct provenance regardless of prior origin. Exact merchant/title with differing facts enters review; no fuzzy match, legacy provenance query or implicit merge. Existing legacy references are retained as historical provenance.

## Merchant expansion — 1 October 2026

The offline [merchant source map](../../research/merchant-source-map.md) uses frozen reviewed/captured inputs for discovery only. It does not feed the runtime registry. At the initial shadow onboarding checkpoint, Pepper was the only enabled autonomous source.

The initial `shake_shack_sg` registration was a shadow adapter. Ownership is independently verified by the official customer data-protection notice; exact URL, native PDF text and hashes are recorded in the [new slice research](../shake-shack-direct-source/research.md). The official directory enumerates twelve exact identities using ten cards plus the two linked missing branch details. The four-page mixed blog needs article-body classification; its 44 articles exceed the existing 20-detail limit, so acquisition is partial and enabled/autoPublish remain false. `direct-sources:preview -- --source shake_shack_sg` works; `direct-sources:ingest -- --source shake_shack_sg` rejects before environment loading or DB access. That historical partial checkpoint is superseded by the activation evidence below; new budget increases still require source review.

Publication/article dates never establish campaign dates. Only the merchant body’s explicit campaign validity is parsed; named participants are exact official directory identities. Editorial/menu articles without the deterministic terms-plus-economic-proposition boundary emit no candidate. The generic ownership gate now also requires recorded evidence URLs and a review basis; existing verified Pepper/Paradise decisions retain their behavior. No persistence/publication redesign, Paradise activation or scheduler was added. See [verification](../shake-shack-direct-source/verification.md).

## Complete mixed archives and lifecycle — activation follow-up

Mixed archives need a source-specific bounded classification budget because editorial article bodies must also be fetched before completeness can be claimed. Registry `acquisitionLimits` contains only request/listing/detail/evidence counts; preview and ingest apply it automatically. Shake Shack uses 60 total requests, 5 listing pages, 50 article details and the unchanged 8 evidence-page default. Pepper and Paradise retain every default. CLI users cannot raise budgets, and explicit test overrides only tighten. Response size (3 MB), timeout (12 seconds), redirects (3), exact hosts and DNS/SSRF protections remain unchanged. Exceeding a registered budget or unresolved structure/pagination fails closed; no recursive article crawl is permitted.

The new one-shot official archive capture observed 4 pages and 44 articles: 10 promotions, 34 editorial/non-promotions, all 44 classified and zero unresolved. Classification still requires article-body terms plus an explicit economic proposition. Captures/provenance are separate from the prior twenty-detail evidence. Full acquisition and two semantic replays passed. The authoritative twelve-branch directory proof and a captured active campaign passed the ordinary generic gate with deterministic fixture coordinates.

Processor `direct-source-v2` evaluates at the run observation's Singapore date. An explicit unambiguous end before that date is `exclude` / `expired_campaign`. It persists audit evidence and an excluded direct candidate, skips outlet/geocoding work, creates no Promotion and does not enter review. Missing/ambiguous validity remains review; upcoming campaigns may pass the normal gate, with public-query visibility unchanged. Processor interpretation is separate from source revision hashes; byte changes re-evaluate, and replay preserves completed reviewer decisions. The same bytes crossing expiry can update their automatic lifecycle disposition without a new source revision.

Shake Shack is now enabled/autoPublish true after all source-level gates passed. As of 2026-10-01 the complete replay yields 4 expired exclusions, 5 incomplete review candidates and 1 ready Parkway Parade campaign; the disposable database published that one captured active offer, using fixture coordinates. No production/shared database ingestion was run. See [activation verification](../shake-shack-autonomous-activation/verification.md) and [exact dispositions](../shake-shack-autonomous-activation/dispositions.json). Paradise remains disabled; there is no scheduler/startup hook or research/Telegram runtime dependency.

## First multi-merchant batch — 1 October 2026

`fairprice_sg`, `kris_plus_sg` and `dian_xiao_er_sg` are disabled shadow adapters; preview accepts their explicit source IDs, and ingestion rejects before environment/DB/outlet operations. FairPrice previews exact catalogue metadata; Kris+ previews the rendered public directory subset and exact public articles, preserving partner identity; Dian Xiao Er previews isolated rendered gallery cards with unknown image-only facts. All retain DEFAULT_LIMITS. `cs_foods_sg` is blocked and deliberately absent from runtime IDs/dispatch: its first linked product returned CleanTalk 403. No count budget, processor, schema, publication, outlet-provider or scheduling change was made. See the batch [research](../direct-source-batch-1/research.md) and [verification](../direct-source-batch-1/verification.md).
