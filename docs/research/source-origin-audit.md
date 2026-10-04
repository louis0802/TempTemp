# Research-only Telegram source-origin audit

Telegram / publishers / social = signals. Direct merchant / issuer sources = production evidence candidates. **More info URL ≠ necessarily original source. Resolution success ≠ authority verification.**

This independent CLI samples the latest parsed promotion signals from `sgfooddeals` and `tastesoulsg`. It reuses the existing signal parser, link extraction, authority classifier, DNS-safe no-body redirect resolver and cache. It does not use the ingestion runner, DB persistence, migration or recurring monitor. Production source classification is unchanged. The empty production merchant registry stays empty.

The [source-substitution research](source-substitution-tracker.md) and revision-6 documents/evidence are preserved as historical context. This audit does not resume replacement/recovery work or change their runtime. New research follows signal → intermediate source → candidate origin chains.

```sh
npm run research:source-origin:audit -- --sample 50
# Explicit one-off refresh, replacing (never merging with) frozen inputs:
npm run research:source-origin:audit -- --sample 50 --refresh
# Replay a frozen run using the saved redirect cache, without network:
npm run research:source-origin:audit -- --sample 50 --offline
# Replay refreshed evidence as an explicitly frozen file:
npm run research:source-origin:audit -- --sample 50 --offline --input .local/source-origin-audit/RUN/telegram-raw.json --cache .local/source-origin-audit/RUN/redirect-cache.json
```

Default input: dated `.local/source-discovery-service/runs/*/telegram-raw.json`. Latest snapshot wins duplicate channel/message identity. Publication time determines selection. The sample counts parsed offers, so a roundup may produce several. Retain non-offers encountered before the sample boundary, including editorial lists and product launches without promotional benefit/intent. An explicit deal label can qualify a research signal while benefit remains uncertain; parser issues stay visible. This is not a publication eligibility filter.

Default output: a new timestamp directory under `.local/source-origin-audit/`, with `signals.json`, `resolved-links.json`, `audit.json`, `report.md`, `report.csv`, a redirect-cache snapshot and separate timestamped `run.json`. Refresh also saves raw collected posts there. The shared research cache is `.local/source-origin-audit/redirect-cache.json`; `--cache` reads another cache without modifying it. Cache entries do not automatically expire; use a new empty cache for a deliberate fresh redirect check. Offline cache misses remain unresolved. Refresh collects at most 30 preview pages per channel across 30 days, without monitor state or scheduling. Shortfalls are explicit.

All records identify `input_mode = frozen_local | one_off_refresh`; an offline replay of saved refreshed raw evidence is now frozen-local input and deliberately has different provenance. Within the same mode/input/cache/review, `audit.json` is byte-stable. Checked-at timestamps remain outside semantic audit output.

Destination classes describe topology, not ownership. Ordinary unregistered web URLs are provisional merchant candidates; known publisher/aggregator/Telegram/hub/shortener destinations remain intermediate. `app.krisplus.com` and `app.happypointcard.com.sg` surface as app campaign candidates, still requiring ownership review. Google `/url` wrappers remain intermediate hubs when they return HTTP success without a redirect; query parameters are not followed as invented network hops. Every HTTP redirect hop is retained. An app scheme blocked by the HTTP resolver remains unresolved but visible. Publisher final destinations retain `publisher_requires_deeper_resolution`: no article-body crawling or speculative next merchant hop is included.

`adapter_family_concentration` counts distinct promotion signals within each observed family without weighting or ranking. Destination/adapter/domain counts use offer-associated promotion link records; neighboring source-post links remain separately counted context. Domains also show unique original URL counts. Shortlinks use unique original URLs; candidate/deeper/unresolved counts use distinct signals. A signal with multiple links can contribute to several groups. Non-offers never enter origin denominators. Enumerable/extraction feasibility remain `not_assessed` because no destination body is inspected.

Optional ownership review: copy [the empty template](source-origin-authority-review.template.json) to `.local/source-origin-audit/authority-review.json`, or pass `--review FILE`. An entry requires `merchant`, exact `host`, `authority` (`primary` or `strong_secondary`), production-compatible `source_kind`, and a nonempty `evidence_note`. Optional `account` matches the first path segment; optional `path` matches itself and descendants with segment boundaries. Shared social hosts require an account or non-root path. Merchant identity must match the parser hint, and conflicting reviews fail closed. Host matching is exact (including www), never suffix/fuzzy ownership matching. A review cannot turn known intermediate topology into a direct origin. Entries are explicit human evidence; the CLI does not discover or fabricate ownership.

Example entry shape (not verified evidence):

```json
{
  "merchant": "Example merchant",
  "host": "instagram.com",
  "account": "example_merchant",
  "authority": "primary",
  "source_kind": "merchant_social",
  "evidence_note": "Reviewer cites an official merchant website linking this exact account."
}
```

Research overrides never modify or populate `data/merchant-source-registry.json`. No output is written to source-discovery-service; existing runs cannot be overwritten, and output path aliases into protected trees are rejected. No worker start, production operation, commit or push occurs.

Meaningful social destination reporting now separates exact resolver transport from canonical candidate identity, preserving every redirect hop. Instagram content → Facebook unsupportedbrowser reports Instagram; recognized Facebook content → the same fallback reports the observed Facebook content URL. The fallback endpoint alone is never a Facebook source identity. Candidate metrics use meaningful destinations; `transport_final_domain_counts` remains separate diagnostics. See [direct-source research](direct-source-audit.md) for the follow-on bounded candidate review.
