# Design

## Repository evidence

Cheerio and Zod already exist. Use Cheerio for production HTML; no new HTML dependency. Existing SourceLinkResolver intentionally discards bodies and existing fetchText does not stream-bound body size, so neither is reused as the crawler. Next project-structure guide was read; this slice lives outside app routes and changes no Next APIs.

Audited captures: .local/direct-source-audit/2026-09-30-captured-evidence/reviewed-evidence-final.json and referenced pepper-directory.html, candidate-11.html, paradise-home.html, paradise-hotpot.html. Pepper uses .promo__container .promo__item, main .page__header h2, main .section__01 .column_container and .terms .answer__div. Paradise uses .pgh-promotions-carousel__slide and .pgh-promotions-list__item. Current Hotpot MENU links Viewing-All-you-can-eat-90mins_6pp.pdf, not the historical August 2025 PDF.

## Boundary and flow

Source definition holds identity, operator, explicit authority/provenance, exact origin/hosts, listing roots and adapter key. Adapter separates enumerate(context), optional fetchDetail(entry, context), extract(entry, detail, context). Shared primitives cover safe bounded HTTP, canonical URLs, DOM whitespace/card enumeration/pagination, evidence hashing, direct date helpers and candidate construction. Adapters own selectors, merchant semantics and coverage assertions.

A per-source context grants URLs only from successfully fetched parent evidence and exact registered roots. Listing pagination must satisfy source-specific path rules; detail/evidence targets must be discovered in narrow selectors. Offer HTML may expose direct menu/terms PDFs; evidence cannot authorize arbitrary HTML recursion. Response bodies stream into a byte-limited buffer; manual redirects remain host-checked with a hop/request budget. Timeout covers retrieval/body consumption. Preserve request attempts and redirect edges.

Candidate v1 identity hashes schema version, source ID, canonical offer URL and optional stable native ID, never title/text/Telegram metadata. Canonicalization removes fragments and known tracking keys, sorts retained query keys and does not alias unrelated paths. Facts cite evidence IDs plus selectors and source text. Evidence hashes raw bytes; evidence identity includes source, URL, relation and hash. Cross-source evidence is rejected.

PDFs are evidence objects, never listing roots. Keep native-text parsing separate and optional, conservatively rejecting ambiguous layout/offer association; unavailable native extractor reports unknowns. No OCR, private API or browser automation.

## Shadow output and gates

Runner catches source-level and per-detail acquisition/extraction errors without erasing successful evidence or entries. CLI writes only new child directories under ignored .local/direct-source-preview (including --output), rejects existing/symlink destinations and fixture path escapes, and imports only this new boundary and Node utilities. Fixture manifests carry fixed fetched/observed time and URL/body mappings; no network fallback.

Per-source report separates ownership_verified, enumeration_complete, listing_fetch_success, detail_fetch_success, deterministic_extraction, candidate_count, candidate_issues and acquisition blockers. Fixtures never establish live readiness.

## Later integration, intentionally unimplemented

DirectSourceAdapter → DirectPromotionCandidate → candidate reconciliation → outlet resolution → Promotion → DB persistence/publication. Later work must remove Telegram-only source/revision identities, promotion URL schema and evidence persistence assumptions. Do not convert HTML into emoji Telegram text or feed PostOfferParser: it would make source semantics and publication safety depend on an unrelated signal format.

## Final implementation details

Default per-source limits: 40 total HTTP requests (redirects included), 5 listing pages, 20 offer-detail pages, 8 menu/terms evidence pages, 3,000,000 bytes per response, 12 seconds per acquisition including DNS/body, 3 redirects. Native HTTP GET pins one DNS answer after checking every answer against the existing publicAddress policy. Response headers are bounded to 16 KB, compression is refused, and no caller-supplied authentication/cookies/headers are accepted. SourceLinkResolver itself is never called. Only its stateless public-target validators are reused.

`BoundedDirectFetch.discover` parses anchors from a retrieved parent body; callers cannot invent an authorization grant. Non-listing parents can expose only menu/terms evidence, not recursive detail or listing traversal. Registered exact hosts include verified www/non-www forms; arbitrary redirect targets outside them are refused. No extra official evidence host was needed in this slice.

`facts` holds evidenceIds, selector and source quote for every populated field; cross-source/missing fact evidence is rejected by Zod. `locationWording` retains source declarations and exceptions independently of physical outlet identities. Multi-brand Paradise pages remain a page-level candidate with raw text/terms, unknown offer-specific benefit/validity/locations and `multi_offer_page_requires_association`; only explicitly page-wide first-term membership/Monday conditions are structured. Splitting brand offers is future work.

PDF evidence is retained when within the byte cap. `associatedNativePdfText` accepts separately supplied native text only when an exact heading associates a single-column, single-page block; it is not a native PDF decoder and is not invoked with fabricated text in live extraction. No production PDF fact parser/OCR dependency was added.

Live evidence timestamps use the run observation time consistently for this slice; they identify the acquisition observation, not independently measured per-page completion timestamps. Raw bytes and request attribution are preserved. Native size refusals now retain known HTTP status in the request failure; the original live menu refusal occurred before that metadata refinement, so its original status remains null rather than being invented.
