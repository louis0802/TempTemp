# Arm C

conditional quality GIVEN perfect reviewed upstream input (reviewed benchmark oracle). This is not end-to-end pipeline recall or A2 authorization.

Agents 59; completed 59; JSON/schema malformed 0; contract-invalid 0. Fresh gpt-6-luna, medium, fork_context=false, at most four active, one response per task, no retries/fallback.

Frozen raw seal: `8779acc3dc61f0caa4d2a4f5036f79d914661c8cafe5d435e540d3f40e3026fb`. Tasks, launches, first raw records and reproducible scores: `/Users/louis/Documents/Projects/vibe coding/PromotionAroundYou/.local/promotion-nlp-oracle-ablation/2026-10-04T05-18-15-735Z-15c90400-7932-4942-a8e8-65d1e9fbf341/arm-c/`.

```json
{
  "arm": "c",
  "conditionalQuality": "conditional quality GIVEN perfect reviewed upstream input (reviewed benchmark oracle)",
  "agents": 59,
  "tasks": 59,
  "completed": 59,
  "malformed": 0,
  "contractInvalid": 0,
  "confusion": {
    "economic_offer": {
      "economic_offer": 36,
      "contest_or_chance": 0,
      "editorial": 0,
      "product_launch": 0,
      "store_announcement": 0,
      "service_information": 0,
      "event_or_activity": 0,
      "uncertain": 7,
      "missing": 0
    },
    "contest_or_chance": {
      "economic_offer": 0,
      "contest_or_chance": 2,
      "editorial": 0,
      "product_launch": 0,
      "store_announcement": 0,
      "service_information": 0,
      "event_or_activity": 0,
      "uncertain": 0,
      "missing": 0
    },
    "editorial": {
      "economic_offer": 0,
      "contest_or_chance": 0,
      "editorial": 1,
      "product_launch": 0,
      "store_announcement": 0,
      "service_information": 0,
      "event_or_activity": 0,
      "uncertain": 1,
      "missing": 0
    },
    "product_launch": {
      "economic_offer": 0,
      "contest_or_chance": 0,
      "editorial": 0,
      "product_launch": 0,
      "store_announcement": 0,
      "service_information": 0,
      "event_or_activity": 0,
      "uncertain": 6,
      "missing": 0
    },
    "store_announcement": {
      "economic_offer": 0,
      "contest_or_chance": 0,
      "editorial": 0,
      "product_launch": 0,
      "store_announcement": 2,
      "service_information": 0,
      "event_or_activity": 0,
      "uncertain": 0,
      "missing": 0
    },
    "service_information": {
      "economic_offer": 0,
      "contest_or_chance": 0,
      "editorial": 0,
      "product_launch": 0,
      "store_announcement": 0,
      "service_information": 2,
      "event_or_activity": 0,
      "uncertain": 1,
      "missing": 0
    },
    "event_or_activity": {
      "economic_offer": 0,
      "contest_or_chance": 0,
      "editorial": 0,
      "product_launch": 0,
      "store_announcement": 0,
      "service_information": 0,
      "event_or_activity": 0,
      "uncertain": 0,
      "missing": 0
    },
    "uncertain": {
      "economic_offer": 0,
      "contest_or_chance": 0,
      "editorial": 0,
      "product_launch": 0,
      "store_announcement": 0,
      "service_information": 0,
      "event_or_activity": 0,
      "uncertain": 1,
      "missing": 0
    }
  },
  "economicPrecision": {
    "numerator": 36,
    "denominator": 36,
    "value": 1
  },
  "economicRecall": {
    "numerator": 36,
    "denominator": 43,
    "value": 0.8372093023255814
  },
  "falseEconomic": 0
}
```

No false economic classification, both contest controls correct, but seven economic offers abstain and all six product_launch controls return uncertain. The reviewed minimum graph often contains a bare menu name without explicit launch prose; these results do not prove inability to recognize launches from full source text. Neutral other hints deliberately prevent taxonomy answers upstream.

Critical cases and source-supported unannotated output review are in source-review.json and decision.md. Frozen scores were not edited.
