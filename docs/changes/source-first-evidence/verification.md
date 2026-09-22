# Verification — 2026-09-22

## Baseline and scope

Verified branch `feat/production-evidence-coverage`, HEAD `255aa03`. Initial working tree contained only the user's `next-env.d.ts` modification. No existing application/parser/publication/Google code was edited. No remote operations, canonical merging, fact replacement or scheduling were performed.

The requested Next build automatically rewrote `next-env.d.ts` to production type paths. Its exact original development-path bytes were recovered using the pre-task SHA-256 as a guard; no git restore was used. Final SHA-256 matches the pre-task file (`0f70629890b72a0a82e91972cc032c04b658b26c265373cb711cf576bfbf8fcc`). It is excluded from the task commit.

## Delivered model

`PromotionSignal`: stable ID, parser offer key, sourcePostUrl, fixed discovery/telegram_feed classification, merchant/title/benefit hints, nullable date hints, location hints, parser/date issues, outbound SourceLinks. Each link preserves original spellings, normalized URL and offer/source-post association. Links only present elsewhere in a roundup are explicitly source-post associations, not proven campaign links.

`PromotionSourceEvidence`: stable ID + signalId, source_permalink/outbound_link relation, original/normalized/resolved URLs, redirect chain, checkedAt, resolutionStatus, reason, HTTP status, authority, kind and merchantMatch. Evidence state does not replace the underlying failures. Source permalink nodes are classified from the known feed identity without pretending they were fetched.

Authority: primary, strong_secondary, discovery, unknown. Registry schema: `{version: 1, merchants: {[normalizedMerchant]: {primaryDomains: string[], primarySocialAccounts: {host, account}[], secondaryDomains: {host, kind}[]}}}`. Production registry is intentionally empty. Tests use synthetic registered merchant domains/accounts; no synthetic ownership enters production data. Exact host matching deliberately excludes unlisted subdomains. Social URLs without account identity, such as `/p/<shortcode>`, stay unknown.

## Commands

- `npm run analyze:mvp-sources` or `-- --offline`: fixed curated corpus and registry; local cache replay; explicit misses; writes `data/mvp-source-evidence.json`.
- `npm run analyze:mvp-sources -- --network`: explicitly enables bounded requests for extracted curated links; caches successes and failures in `.local/source-evidence/redirect-cache.json`.
- `npm run analyze:mvp-sources -- --fixture`: synthetic transport over the same corpus, frozen time and fixture registry; writes only `.local/source-evidence-fixture/`.
- `npm run analyze:mvp-sources -- --fixture --offline`: replay that fixture cache without transport.

No live external redirects were requested during verification. The real artifact therefore reports unresolved destinations honestly. Fixture destinations are demonstrations, not observations of merchant pages. All uncaptured fixture links report `synthetic_fixture_missing`, rather than invented responses.

## Coverage and determinism

| Metric | Production offline artifact | Synthetic fixture replay |
|---|---:|---:|
| Curated source posts | 136 | 136 |
| Parser-level signals | 181 | 181 |
| Posts with outbound links | 135 | 135 |
| Signals with outbound links | 180 | 180 |
| Unique outbound URLs | 190 | 190 |
| Unique resolved starting URLs | 0 | 2 |
| Primary evidence nodes | 0 | 2 |
| Strong secondary evidence nodes | 0 | 0 |
| Discovery evidence nodes | 181 | 181 |
| Unknown evidence nodes | 465 | 463 |
| Unresolved outbound nodes | 465 | 0 |
| Failed outbound nodes | 0 | 463 |

Evidence-node counts include repeated post-level links attached to multiple distinct signals; they are not unique-URL counts. The 181 parser offers are intentionally distinct from the existing 200 MVP records after MVP-specific window splitting.

Two repeated offline builds were byte-identical: SHA-256 `2a97fe43c9fc57709f434d63cc005e9c3bfdb4cfab7fbddbbdbe570b15efa4f7`. Fixture transport build and disk-cache-only replay were byte-identical: `3efa246e1bd9f77020eea82e8a2af441dfc65a3bf12c65669e60d8c5d0e4d220`. A unit test also writes and reloads a temporary on-disk cache before comparing the complete artifact.

Morganfield's:

- `https://t.me/sgfooddeals/4902`: distinct signal, `http://tco.sg/api30jmn2`, real destination unresolved offline.
- `https://t.me/tastesoulsg/4436`: distinct signal, `http://bit.ly/4hLYxMq`, real destination unresolved offline.
- Synthetic fixture sends both to `https://merchant.example/promo` with registry-confirmed fixture authority; two signals and two complete redirect chains remain. Different start-date hints remain unchanged. No merge or fact reconciliation occurs.

## Safety verification

44 focused tests cover extraction including adjacent export wrappers, self/channel exclusions, duplicate spellings, query/path/scheme distinctions, merchant and social isolation, known discovery and secondary classification, allowlist rejection, unsafe initial and redirect destinations, mixed public/private DNS, address pinning, loops, redirect limits, HEAD→GET fallback, HTTP errors, total DNS/response deadlines, cache failures/misses, graph identity and reproducible replay.

Native transport test verifies fixed headers, original TLS hostname, pinned lookup behavior (single/all-address Node callbacks), agent isolation, 16 KiB header cap, bounded GET Range request and immediate stream destruction without body consumption. Publicly numbered Azure platform IP `168.63.129.16` is explicitly blocked, in addition to private, loopback, link-local, CGNAT, multicast, reserved, documentation and IPv6 transition ranges. Public IPv6 is conservatively restricted to global unicast excluding special ranges. See design.md for the complete safety model. Range is only a request hint; immediate stream destruction, not server cooperation with Range, prevents body accumulation.

## Requested regression checks

| Check | Result |
|---|---|
| `npm test` | PASS — 15 files, 307 tests (44 new focused tests) |
| `npm run test:integration` | PASS — 19 tests against isolated local database |
| `npm run test:corpus` | PASS — 3 files, 4 tests; 136 sources / 181 parser offers; no failures |
| `npm run analyze:mvp` | PASS — 200 runtime records, 86 map-ready; benchmark 180 candidates, 0 unmatched, 1 extra, 34 existing differences |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS — warning in unchanged `src/server/mvp.ts` about dynamic filesystem tracing |
| `npx playwright test tests/e2e/mvp.spec.ts` | PASS — 30 desktop/mobile tests |
| Source analysis fixture and offline modes | PASS — byte-identical replay |
| `git diff --check` | PASS |

Initial integration and Playwright attempts hit sandbox EPERM restrictions on local sockets; authorized escalated reruns passed without modifying tests or services.

## Public isolation proof

`data/mvp-promotions.json` is byte-identical to pre-task SHA-256 `e49d9e12ce6fb2c22e1b5c6f936e1025a6ab7f00d688438d9fae36d310e3844b`: 200 records, 86 map-ready. No existing public component, route, server loader, parser, Google resolver, admin flow or strict publication file is in the diff. Public modules do not import the new builder or read its artifact.

The unchanged MVP browser suite passes `/mvp`, includeExpired and showSourceText combinations, `/corpus`, API expiry/detail behavior, map grouping, search, privacy, cancellation and source-location presentation. With unchanged runtime code and input bytes, evidence generation does not affect those outputs. No authority badges were added.

## Review and limitations

Self-review completed against all spec requirements; no independent agent review was requested. Inspection of real corpus output found adjacent parenthesized links; extraction was corrected and covered by a regression test before regenerating artifacts. Native transport limits and cloud-platform address rejection were additionally tested. The full four-document workflow preceded implementation.

This is provenance only. No production official ownership has yet been curated, and real redirect success rates remain unmeasured. Raw parentheses delimit export URLs; percent-encoded parentheses are retained. No HTML/meta-refresh/JavaScript redirect, arbitrary page metadata, Google search or campaign fact extraction is attempted. Cache has no automatic expiry; deliberate reviewed entry removal enables a retry. Concurrent CLI writers are not supported. Future canonical matching can consume shared official campaign/T&C URLs but must still reconcile relevance and conflicting claims.

## Follow-up verification: offer association (2026-09-22)

Verified baseline `feat/production-evidence-coverage` at `3fc3860`, with only the pre-existing next-env.d.ts modification. Small fix: evidence now retains association (`offer` / `source_post`, null for source_permalink). Every evidence state checks only outbound links associated with the current offer. Post-level links still retain their IDs, authority, resolved destination, redirect chain, timestamp, status and diagnostics. Aggregate evidence metrics still count all retained nodes.

The parameterized regression parses one real-shaped roundup into two offers from the same merchant. Offer A contains the linked official source; Offer B only inherits it at source-post scope. Using the same merchant prevents ownership isolation from hiding relevance leakage. Both primary and strong-secondary variants failed against the baseline with an incorrectly promoted Offer B, then passed after the fix. Tests assert all retained resolution/classification fields and null source-permalink association. Offer B falls back to no_outbound_links, unresolved_links or discovery_only according to its own links, even when strong post-level evidence exists.

Checks actually rerun:

- Focused source evidence + native transport: 46 tests passed.
- npm test: 309 tests passed across 15 files.
- npm run typecheck and npm run lint: passed.
- npm run test:integration: 19 tests passed against the isolated local database.
- npm run test:corpus: 4 tests passed across 3 files.
- npm run analyze:mvp: passed; 200 records and 86 map-ready, unchanged benchmark metrics.
- npm run analyze:mvp-sources -- --offline: two runs byte-identical, SHA-256 `8b61de49ff4a370e3d1e12ebe3221d8eeb84ba31dbb9f92c8131492e592f4fda` (supersedes the initial implementation artifact hash above).
- git diff --check: passed.

A structural comparison with the baseline artifact proves every complete PromotionSignal and all existing evidence fields/IDs are unchanged. Only the new association fields and four state corrections (unresolved_links → no_outbound_links for signals without offer-associated links) differ. Metrics remain 136 posts / 181 signals, with 190 unique outbound URLs. Registry is still empty and byte-identical (`84aff82b3a6f6cd9c6157abc8092387ae1dd9c693659b999113c8bdff7a6a833`). MVP artifact and next-env.d.ts both match their pre-task hashes recorded above. next-env.d.ts was not edited or regenerated during this follow-up and is excluded from the fix commit.

No public code, redirect resolver, network safeguards, registry semantics, canonical identity or dedup behavior changed. Build and Playwright were not rerun for this isolated follow-up; their earlier results above belong to the original implementation. In particular, avoiding a new Next build preserves the user-owned next-env.d.ts bytes without regeneration. No live external network resolution or remote Git changes were performed. Self-review confirmed the diff matches the requested association boundary.
