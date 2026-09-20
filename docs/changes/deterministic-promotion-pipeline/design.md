# Design
Add server-side src/ingestion/resolution modules: types, patterns/dates, parser, cache, directory provider, place resolver, participation resolver, eligibility and orchestration. Use existing Zod promotionSchema/publicationIssues at the boundary; retain audit alongside candidate data, never inside public outlet fields except flattened evidence.

Genki adapter consumes official Singapore static locator and fails closed on layout/pagination uncertainty. Provider snapshots expose traversal/count evidence, branch status and exclusions. Google Places Text Search enriches identity/address/location; OneMap exact postal search provides building coordinates, never merchant participation. Network calls use fixed provider origins and bounded timeouts. Unsupported directories fail closed.

Stable UUIDs derive from normalized merchant and physical address/unit plus coordinates; changing physical identity cannot move an existing outlet. Existing app.outlets persists published identities and rejects relocation. Cache is process-local with bounded TTL and request coalescing; restart causes revalidation. Source page cache is reusable by adapters; arbitrary source URLs are not fetched automatically.

Pipeline output carries deterministic classification, promotion or suggestion, and full audit. Raw processing integrates with existing candidate writes and transactional reconciliation; no changes to approved JSON or review API contracts. LLM fallback is injected, Zod validated and extractive only; unverified output retains blockers. No model credentials required.

## Final integration details

Raw resolution runs before publication transactions. Under transaction, lock existing candidates and backing source post, recheck latest revision/completed review state, and recheck current validity. Approved results reuse `cleanCandidate`, offer fingerprint/reconciliation and `savePromotion`; the persisted candidate audit records the reconciled decision and canonical ID. Unresolved/excluded results preserve their full source-derived suggestion and audit. Entire raw revisions containing completed candidates are preserved on parser upgrades to prevent duplicate recreation after splitting changes.

The all-outlet audit records authoritative/traversal/count metadata independently of `complete`; eligibility checks both counts and evidence. Selected participation is obtained through an injected promotion-specific provider keyed by source URL. There is no generic web/LLM trust shortcut. Branch UUIDs use custom UUIDv8 SHA-256-derived identities from normalized merchant plus exact physical address/coordinates. Existing database guards remain authoritative if an identity conflicts.

Caches have a one-hour TTL, maximum 1,000 entries and in-flight request coalescing. Google/OneMap calls use fixed endpoints and 10-second timeouts. Missing terms do not prevent reusable outlet research unless participation/ownership itself is ambiguous. Last-order, conflicting or multiple windows stay unresolved while retaining original terms. No API contract or public schema change was needed.

## Google discovery follow-on design
Add GoogleOutletDiscovery as a generic fallback to PromotionParticipationResolver when no merchant adapter exists. Google discovery text-search transport uses strict response validation, a Singapore location restriction, requested address components, bounded token pagination and one-hour cache. Named lookup matches merchant and branch/address/unit deterministically across returned results; missing or multiple matches block approval. Operating status and a Singapore country component are required. Country filtering supplements coordinate bounds.

Discovery returns branches plus already-resolved Google location evidence, avoiding a second geocoding request. Participation evidence still comes from source text or a verified selected list. Named/selected searches can complete their bounded participation scope. Merchant-wide discovery returns authoritative=false and fullyTraversed=false regardless of search pagination; all-outlet eligibility keeps the complete-chain requirement. Supported official merchant adapters retain preference. Missing Google credentials return a specific unresolved reason.

The generic discovery response carries pre-resolved place evidence on internal branch records. Named branches preserve their source unit; Google address components can supply a unit omitted by its formatted address. Each branch references the hash/timestamp of its actual result page. The parser now keeps comma-separated branch/unit pairs together, fixing a lookahead backtracking bug exposed by the complete Google path.


2026-09-20 user-directed policy update: Generic T&Cs / more-info links are retained verbatim in description and rendered as clickable HTTP(S) links. They do not independently block approval or imply linked pages were verified. Missing dates, unresolved participation, explicit material conflicts and unread media still require review. Parser version v6 applies this policy on subsequent processing; no operational replay is performed by this change.
