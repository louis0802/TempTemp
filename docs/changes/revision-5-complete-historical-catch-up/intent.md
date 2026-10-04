# Intent

Revision 5 already separates content recovery from temporal observation coverage, but independent-source catch-up cannot currently prove a bounded downtime window complete. Every enumerable source is therefore reported as partial even when a dated archive can be traversed back to a durable live checkpoint.

This change adds research-only, inspectable recovery proof for the highest-value dated publishers so recovered content can satisfy replacement evidence without repairing missed scheduled passes. The first complete-capable sources are confirmgood_deals, eatbook_deals, and everydayonsales_food.

Success means a recovery is complete only after deterministic reverse-chronological traversal reaches a durable publication checkpoint, verifies overlap, preserves ordering, and avoids pagination ambiguity, repeated pages, failures, and safety-cap truncation. Scheduled cadence gaps remain unchanged and temporal scoring remains ineligible for recovered downtime.

Constraints:

- Do not invoke or change production ingestion or production source-evidence behavior.
- Do not write the production database.
- Do not mutate revision-3, revision-4, or pinned revision-5 protocol/registry assets or hashes.
- Preserve sealed historical evidence.
- Preserve unrelated dirty files.
- Do not commit or push.

SINGPromos and MustShareNews are evaluated but remain partial unless their existing public routes can prove publication-history completeness without inventing timing from validity dates.
