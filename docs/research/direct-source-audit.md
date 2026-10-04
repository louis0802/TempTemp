# Research-only direct-source audit

This slice follows the [source-origin audit](source-origin-audit.md). It changes research reporting and adds a separate offline direct-source review layer. It does not resume revision-6 source-substitution work or build/activate production adapters.

Source-origin records now preserve `resolved_url` as legacy transport evidence and add `transport_final_url`, `transport_final_domain`, `canonical_candidate_url`, `candidate_domain` and `canonicalization_basis`. The reporting alias `resolved_domain` and domain/family metrics use the candidate. Only an adjacent recognized Instagram `/p/`, `/reel/`, `/tv/` URL or Facebook `/share/p/`, `/share/r/`, `/reel/`, `/<account>/posts/` content URL followed by the exact Facebook `/unsupportedbrowser` endpoint can recover identity. Unsupported fallback without that pattern has no canonical candidate and remains a resolved unknown destination. Every hop and exact transport final remain intact. Production resolver/security/classification are unchanged. No social ownership is inferred.

The direct-source CLI reads corrected `audit.json` and a researcher-reviewed capture bundle; it performs **no network requests or new resolution**. Selection is restricted to resolved promotion records with offer association and merchant_web_candidate, issuer_or_platform_candidate or app_or_deep_link class. It deduplicates exact signal ID + canonical URL, preserving all source-origin indexes and records. Same-domain offers remain distinct; unique domain-pattern counts are separate.

```sh
node --import tsx scripts/research/direct-source-audit.ts \
  --input .local/source-origin-audit/2026-09-30-social-corrected-offline/audit.json \
  --evidence .local/direct-source-audit/2026-09-30-captured-evidence/reviewed-evidence-final.json \
  --output .local/direct-source-audit/NEW-UNUSED-RUN
```

Capture/review is intentionally a bounded research operation, not a production collector/parser. Each public capture records retrieval time/method/status, artifact path and content SHA-256. Field findings cite capture IDs. The CLI validates artifact hashes before writing and rejects artifact path escapes, conflicting findings and missing references. Verified ownership needs explicit successful evidence plus established categorical confidence; official roles require verified ownership. Enumeration requires an observed listing reference and remains independent of ownership/extraction. Unknowns remain unknown. App-only handoffs cannot imply an enumerable web source. Related public platform directories are recorded separately in app findings.

Outputs: `candidates.json`, `audit.json`, `report.md`, `report.csv`. Output must be a new child of `.local/direct-source-audit/`; existing runs and symlink aliases are rejected. The input and evidence are read-only. Semantic output is byte-stable for identical input/evidence. CSV quotes nested observations and guards spreadsheet formula prefixes.

For this run, direct candidate bodies were fetched once through bounded public HTTP GET with redirects disabled. Relevant observed corporate/listing surfaces were separately requested; no recursive crawler, publisher article following, app login/private API or anti-bot bypass. Captured 403s remain inaccessible. The Paradise PDF was inspected with native text extraction and a rendered table check, with no OCR. Exact campaign facts absent from text/images were not invented. Operator policy/corporate link evidence is separate from hostname/name resemblance.

See [the change verification](../changes/direct-source-candidate-audit/verification.md) for exact files, actual artifacts, counts, recommendation conditions and protected-tree checks. No DB operation, production ingestion import/runtime, registry write, source monitor, Telegram recollection, commit or push is authorized by this workflow.
