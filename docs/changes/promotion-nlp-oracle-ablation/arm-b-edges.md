# Arm B

conditional quality GIVEN perfect reviewed upstream input (reviewed benchmark oracle). This is not end-to-end pipeline recall or A2 authorization.

Agents 49; completed 49; JSON/schema malformed 0; contract-invalid 0. Fresh gpt-6-luna, medium, fork_context=false, at most four active, one response per task, no retries/fallback.

Frozen raw seal: `e3edf85866bb27cf46bce629eff73a4b1f1628006ca6b376372f3a6b1fba71a0`. Tasks, launches, first raw records and reproducible scores: `/Users/louis/Documents/Projects/vibe coding/PromotionAroundYou/.local/promotion-nlp-oracle-ablation/2026-10-04T05-18-15-735Z-15c90400-7932-4942-a8e8-65d1e9fbf341/arm-b/`.

```json
{
  "arm": "b",
  "conditionalQuality": "conditional quality GIVEN perfect reviewed upstream input (reviewed benchmark oracle)",
  "agents": 49,
  "tasks": 49,
  "completed": 49,
  "malformed": 0,
  "contractInvalid": 0,
  "materialEdgeRecall": {
    "numerator": 251,
    "denominator": 339,
    "value": 0.7404129793510325
  },
  "criticalPrecision": {
    "numerator": 251,
    "denominator": 339,
    "value": 0.7404129793510325
  },
  "wrongTargetEdges": 74,
  "publicationCriticalWrongTargetEdges": 4,
  "wrongRelationEdges": 31,
  "missingMaterialEdges": 88,
  "sharedEvidenceRecall": {
    "numerator": 31,
    "denominator": 31,
    "value": 1
  }
}
```

Material recall is 251/339 (74.04%); actual nonempty-target benchmark precision is 251/277 (90.61%). Frozen criticalPrecision 251/339 (74.04%) also counts abstention rows as wrong-target predictions; it is an assignment diagnostic, not positive-edge precision. Of 74 frozen wrongTarget flags, 70 are empty-target abstentions, four are real nonempty target mismatches; two Student Meal cross-offer errors are definite unsafe ownership. Missing material edges=88; wrong relations=31; shared targets=31/31. See source-review.json for all four target mismatches and interpretation.

Critical cases and source-supported unannotated output review are in source-review.json and decision.md. Frozen scores were not edited.
