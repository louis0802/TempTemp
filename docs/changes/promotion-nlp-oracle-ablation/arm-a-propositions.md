# Arm A

conditional quality GIVEN perfect reviewed upstream input (reviewed benchmark oracle). This is not end-to-end pipeline recall or A2 authorization.

Agents 49; completed 49; JSON/schema malformed 0; contract-invalid 0. Fresh gpt-6-luna, medium, fork_context=false, at most four active, one response per task, no retries/fallback.

Frozen raw seal: `7be5f35373de05ffbbf6eb593759947dc3d61d65bcff731771b52f646939b95e`. Tasks, launches, first raw records and reproducible scores: `/Users/louis/Documents/Projects/vibe coding/PromotionAroundYou/.local/promotion-nlp-oracle-ablation/2026-10-04T05-18-15-735Z-15c90400-7932-4942-a8e8-65d1e9fbf341/arm-a/`.

```json
{
  "arm": "a",
  "conditionalQuality": "conditional quality GIVEN perfect reviewed upstream input (reviewed benchmark oracle)",
  "agents": 49,
  "tasks": 49,
  "completed": 49,
  "malformed": 0,
  "contractInvalid": 0,
  "propositionRecall": {
    "numerator": 44,
    "denominator": 59,
    "value": 0.7457627118644068
  },
  "propositionPrecision": {
    "numerator": 48,
    "denominator": 49,
    "value": 0.9795918367346939
  },
  "economicRecall": {
    "numerator": 37,
    "denominator": 43,
    "value": 0.8604651162790697
  },
  "nonEconomicRecall": {
    "numerator": 7,
    "denominator": 16,
    "value": 0.4375
  },
  "harmfulMerges": 1,
  "harmfulEconomicMerges": 1,
  "harmfulSplits": 1,
  "unmatchedPropositions": 0
}
```

Identity recall counts independent one-to-one reviewed identities. Student Meal is a confirmed merge; Bari separates correctly. Local Faves weekly split is a minimum-annotation cardinality mismatch, not proof that the four source-supported weekly offers are economically false. Non-economic identity recall is only 7/16. No post-result prompt tuning.

Critical cases and source-supported unannotated output review are in source-review.json and decision.md. Frozen scores were not edited.
