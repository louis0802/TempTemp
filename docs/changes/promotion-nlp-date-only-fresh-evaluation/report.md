# Fresh date-first extraction experiment

Requested model: gpt-6-luna; reasoning: medium; fork_context=false; maximum four open agents. Backend identity and token usage unavailable. One fresh first answer per whole source; no retries or repairs.

## Separate cohort metrics

### regression

```json
{
  "sources": 49,
  "execution": {
    "completed": {
      "numerator": 49,
      "denominator": 49,
      "percent": 100
    },
    "missingOrFailed": {
      "numerator": 0,
      "denominator": 49,
      "percent": 0
    },
    "explicitTextRefusals": {
      "numerator": 0,
      "denominator": 49,
      "percent": 0
    },
    "parseFailure": {
      "numerator": 1,
      "denominator": 49,
      "percent": 2.04
    },
    "schemaPass": {
      "numerator": 48,
      "denominator": 49,
      "percent": 97.96
    },
    "contractPass": {
      "numerator": 23,
      "denominator": 49,
      "percent": 46.94
    },
    "uncertain": {
      "numerator": 2,
      "denominator": 49,
      "percent": 4.08
    }
  },
  "identity": {
    "economicRecognition": {
      "numerator": 34,
      "denominator": 38,
      "percent": 89.47
    },
    "economicBenefitMatch": {
      "numerator": 30,
      "denominator": 38,
      "percent": 78.95
    },
    "falseEconomicOnDefiniteNonoffer": {
      "numerator": 1,
      "denominator": 8,
      "percent": 12.5
    },
    "safeAbstention": {
      "numerator": 5,
      "denominator": 11,
      "percent": 45.45
    },
    "allSourceClassificationCorrect": {
      "numerator": 41,
      "denominator": 49,
      "percent": 83.67
    },
    "classificationMatrix": {
      "ambiguous": {
        "economic_offer": 1,
        "contest_or_chance": 2
      },
      "economic": {
        "economic_offer": 34,
        "missing_or_malformed": 1,
        "uncertain": 1,
        "contest_or_chance": 1,
        "product_launch": 1
      },
      "non_economic": {
        "uncertain": 1,
        "service_information": 2,
        "store_announcement": 1,
        "product_launch": 3,
        "economic_offer": 1
      }
    }
  },
  "dates": {
    "allEndpointOutcomes": {
      "correct_known": {
        "numerator": 30,
        "denominator": 98,
        "percent": 30.61
      },
      "correct_unknown": {
        "numerator": 64,
        "denominator": 98,
        "percent": 65.31
      },
      "omitted": {
        "numerator": 0,
        "denominator": 98,
        "percent": 0
      },
      "wrong": {
        "numerator": 2,
        "denominator": 98,
        "percent": 2.04
      },
      "unavailable": {
        "numerator": 2,
        "denominator": 98,
        "percent": 2.04
      }
    },
    "knownCorrect": {
      "numerator": 30,
      "denominator": 32,
      "percent": 93.75
    },
    "knownOmitted": {
      "numerator": 0,
      "denominator": 32,
      "percent": 0
    },
    "unknownCorrect": {
      "numerator": 64,
      "denominator": 66,
      "percent": 96.97
    }
  },
  "locations": {
    "roles": {
      "participating": {
        "correct": {
          "numerator": 10,
          "denominator": 11,
          "percent": 90.91
        },
        "omitted": {
          "numerator": 1,
          "denominator": 11,
          "percent": 9.09
        },
        "wrong": {
          "numerator": 2,
          "denominator": 12,
          "percent": 16.67
        },
        "reversals": 0,
        "unavailableSources": {
          "numerator": 1,
          "denominator": 49,
          "percent": 2.04
        }
      },
      "excluded": {
        "correct": {
          "numerator": 3,
          "denominator": 7,
          "percent": 42.86
        },
        "omitted": {
          "numerator": 4,
          "denominator": 7,
          "percent": 57.14
        },
        "wrong": {
          "numerator": 0,
          "denominator": 3,
          "percent": 0
        },
        "reversals": 0,
        "unavailableSources": {
          "numerator": 1,
          "denominator": 49,
          "percent": 2.04
        }
      }
    },
    "scopeMatch": {
      "numerator": 47,
      "denominator": 49,
      "percent": 95.92
    }
  },
  "validatorLeakage": {
    "wrongDateFacts": 0,
    "wrongOutletFacts": 2,
    "wrongScopeFacts": 1
  },
  "coreCompleteAllSources": {
    "numerator": 3,
    "denominator": 49,
    "percent": 6.12
  },
  "coreCompleteEconomicSources": {
    "numerator": 3,
    "denominator": 38,
    "percent": 7.89
  },
  "blockerCounts": {
    "missing_start_date": 32,
    "missing_end_date": 32,
    "physical_participation_unresolved": 32,
    "classification_not_correct": 8,
    "economic_identity_incomplete": 8,
    "missing_or_non_source_quote:merchant": 10,
    "nonverbatim_merchant": 16,
    "not_confirmed_economic_offer": 12,
    "missing_title": 8,
    "missing_benefit": 12,
    "missing_merchant": 9,
    "nonverbatim_benefit": 8,
    "benefit_exceeds_publication_limit": 8,
    "non_economic_facts": 5,
    "malformed_date_only_output": 1,
    "unavailable_startDate": 1,
    "unavailable_endDate": 1,
    "physical_annotation_incomplete": 4,
    "benefit_qualifier_incomplete": 1,
    "unstated_year:startDate": 1,
    "unstated_year:endDate": 1,
    "missing_or_non_source_quote:benefit": 1,
    "missing_or_non_source_quote:classification": 2,
    "omitted_participating_outlets": 1,
    "description_exceeds_publication_limit": 1,
    "omitted_excluded_outlets": 1,
    "all_scope_without_explicit_wording": 2
  },
  "descriptionCopiedExactlyByCode": {
    "numerator": 49,
    "denominator": 49,
    "percent": 100
  },
  "storage": {
    "limits": {
      "description": 5000,
      "title": 250,
      "merchant": 150,
      "benefit": 60
    },
    "blockedSources": {
      "numerator": 9,
      "denominator": 49,
      "percent": 18.37
    }
  },
  "latency": {
    "available": 49,
    "denominator": 49,
    "minimumMs": 5761,
    "medianMs": 8394,
    "maximumMs": 75331,
    "basis": "reservation to saved first response; includes orchestration"
  },
  "usage": "unavailable"
}
```

### holdout

```json
{
  "sources": 20,
  "execution": {
    "completed": {
      "numerator": 20,
      "denominator": 20,
      "percent": 100
    },
    "missingOrFailed": {
      "numerator": 0,
      "denominator": 20,
      "percent": 0
    },
    "explicitTextRefusals": {
      "numerator": 0,
      "denominator": 20,
      "percent": 0
    },
    "parseFailure": {
      "numerator": 0,
      "denominator": 20,
      "percent": 0
    },
    "schemaPass": {
      "numerator": 20,
      "denominator": 20,
      "percent": 100
    },
    "contractPass": {
      "numerator": 15,
      "denominator": 20,
      "percent": 75
    },
    "uncertain": {
      "numerator": 2,
      "denominator": 20,
      "percent": 10
    }
  },
  "identity": {
    "economicRecognition": {
      "numerator": 15,
      "denominator": 16,
      "percent": 93.75
    },
    "economicBenefitMatch": {
      "numerator": 15,
      "denominator": 16,
      "percent": 93.75
    },
    "falseEconomicOnDefiniteNonoffer": {
      "numerator": 1,
      "denominator": 2,
      "percent": 50
    },
    "safeAbstention": {
      "numerator": 1,
      "denominator": 4,
      "percent": 25
    },
    "allSourceClassificationCorrect": {
      "numerator": 17,
      "denominator": 20,
      "percent": 85
    },
    "classificationMatrix": {
      "non_economic": {
        "economic_offer": 1,
        "store_announcement": 1
      },
      "economic": {
        "economic_offer": 15,
        "uncertain": 1
      },
      "ambiguous": {
        "uncertain": 1,
        "economic_offer": 1
      }
    }
  },
  "dates": {
    "allEndpointOutcomes": {
      "correct_known": {
        "numerator": 2,
        "denominator": 40,
        "percent": 5
      },
      "correct_unknown": {
        "numerator": 38,
        "denominator": 40,
        "percent": 95
      },
      "omitted": {
        "numerator": 0,
        "denominator": 40,
        "percent": 0
      },
      "wrong": {
        "numerator": 0,
        "denominator": 40,
        "percent": 0
      },
      "unavailable": {
        "numerator": 0,
        "denominator": 40,
        "percent": 0
      }
    },
    "knownCorrect": {
      "numerator": 2,
      "denominator": 2,
      "percent": 100
    },
    "knownOmitted": {
      "numerator": 0,
      "denominator": 2,
      "percent": 0
    },
    "unknownCorrect": {
      "numerator": 38,
      "denominator": 38,
      "percent": 100
    }
  },
  "locations": {
    "roles": {
      "participating": {
        "correct": {
          "numerator": 2,
          "denominator": 9,
          "percent": 22.22
        },
        "omitted": {
          "numerator": 7,
          "denominator": 9,
          "percent": 77.78
        },
        "wrong": {
          "numerator": 6,
          "denominator": 8,
          "percent": 75
        },
        "reversals": 0,
        "unavailableSources": {
          "numerator": 0,
          "denominator": 20,
          "percent": 0
        }
      },
      "excluded": {
        "correct": {
          "numerator": 8,
          "denominator": 8,
          "percent": 100
        },
        "omitted": {
          "numerator": 0,
          "denominator": 8,
          "percent": 0
        },
        "wrong": {
          "numerator": 0,
          "denominator": 8,
          "percent": 0
        },
        "reversals": 0,
        "unavailableSources": {
          "numerator": 0,
          "denominator": 20,
          "percent": 0
        }
      }
    },
    "scopeMatch": {
      "numerator": 11,
      "denominator": 20,
      "percent": 55
    }
  },
  "validatorLeakage": {
    "wrongDateFacts": 0,
    "wrongOutletFacts": 5,
    "wrongScopeFacts": 3
  },
  "coreCompleteAllSources": {
    "numerator": 0,
    "denominator": 20,
    "percent": 0
  },
  "coreCompleteEconomicSources": {
    "numerator": 0,
    "denominator": 16,
    "percent": 0
  },
  "blockerCounts": {
    "nonverbatim_benefit": 2,
    "missing_start_date": 19,
    "missing_end_date": 19,
    "physical_participation_unresolved": 11,
    "classification_not_correct": 3,
    "benefit_exceeds_publication_limit": 1,
    "non_economic_facts": 2,
    "not_confirmed_economic_offer": 3,
    "missing_benefit": 2,
    "missing_title": 1,
    "missing_merchant": 1,
    "omitted_participating_outlets": 6,
    "omitted_physical_scope": 5,
    "physical_annotation_incomplete": 10,
    "economic_identity_incomplete": 1,
    "nonverbatim_location:all outlets except Temasek Poly and Tampines Kiosk": 1
  },
  "descriptionCopiedExactlyByCode": {
    "numerator": 20,
    "denominator": 20,
    "percent": 100
  },
  "storage": {
    "limits": {
      "description": 5000,
      "title": 250,
      "merchant": 150,
      "benefit": 60
    },
    "blockedSources": {
      "numerator": 1,
      "denominator": 20,
      "percent": 5
    }
  },
  "latency": {
    "available": 20,
    "denominator": 20,
    "minimumMs": 8931,
    "medianMs": 10765,
    "maximumMs": 15910,
    "basis": "reservation to saved first response; includes orchestration"
  },
  "usage": "unavailable"
}
```

## Decision

The predeclared rule fails. Keep research-only; correct contract/evaluation gaps before recommending a candidate-organization trial.

## Historical comparison

V4 routed/local-evidence outputs versus new whole-source answers. Paired only for exact source and one economic campaign; not causal model comparison. 28/34 cannot be compared with whole-source rates.
Comparable pairs: 28; full pair ledger is in results.json. Old 28/34 is historical reference only.

## High-risk per-source evidence

### pepper_lunch_sg-student-meal

Findings: unsafe_boundary_commitment.

Frozen source-review basis: Independent whole-source identities or unresolved activity prevent safe single-output extraction; expect uncertain.

Complete original source:

```text
Student Meal Students, this is for you! Indulge in our exclusive Student Meal featuring the mouthwatering Chicken Cheese Creamy Brown Risotto! Bursting with creamy, cheesy flavours & sizzle them with the chicken for a power packed meal. Don’t miss our incredible student deals! Enjoy flavorful choices like Salmon and Chicken Pepper Rice and Diced Cut Beef Steak with Egg, all at prices you can't resist! Get a 15% OFF any main dish from the main menu after 5pm. Available on weekdays only, excluding public holidays and eve of Lunar New Year. One main dish per valid Student Card presented by the student himself/herself at the cashier. Valid at Pepper Lunch restaurants only. Dine-in only (Applicable for Student Meal Dishes only, Mon-Fri, opening till 5pm). Please note that we do not take reservation at all our Restaurants or Express stores. Kindly walk-in to dine-in and enjoy your sizzling hot meal.
```

First raw model answer:

```text
{"classification":{"value":"economic_offer","quote":"Get a 15% OFF any main dish from the main menu after 5pm."},"merchant":{"value":"Pepper Lunch","quote":"Valid at Pepper Lunch restaurants only."},"title":{"value":"15% OFF any main dish from the main menu after 5pm","quote":"Get a 15% OFF any main dish from the main menu after 5pm."},"benefit":{"value":"15% OFF any main dish from the main menu","quote":"Get a 15% OFF any main dish from the main menu after 5pm."},"startDate":{"value":null,"quote":null},"endDate":{"value":null,"quote":null},"locationScope":{"value":null,"quote":null},"locationRules":[]}
```

Validator result:

```json
{
  "contractValid": true,
  "issues": [],
  "unresolved": [
    "missing_start_date",
    "missing_end_date",
    "physical_participation_unresolved"
  ]
}
```

Independent pre-frozen expected facts:

```json
{
  "id": "pepper_lunch_sg-student-meal",
  "author": "parent-agent-reviewed-before-model-run; not human gold",
  "kind": "ambiguous",
  "acceptableClassifications": [
    "uncertain"
  ],
  "economicIdentityIds": [
    "student_before5",
    "after5"
  ],
  "singleCampaignComparable": false,
  "startDate": null,
  "endDate": null,
  "locationScope": null,
  "participating": [],
  "excluded": [],
  "benefitAny": [
    "Student Meal",
    "15% OFF"
  ],
  "merchantAny": [
    "Pepper Lunch"
  ],
  "qualifiers": [],
  "review": "Independent whole-source identities or unresolved activity prevent safe single-output extraction; expect uncertain."
}
```

### pepper_lunch_sg-uper-value-deal

Findings: benefit_identity_mismatch.

Frozen source-review basis: Full source reviewed against retained benchmark; only campaign dates/physical roles, no clocks or conditions structured.

Complete original source:

```text
$uper Value Deal $uper Value Deal is here at Pepper Lunch Express! Enjoy sizzling Australian Chilled Beef MB2+ Steak Bites served on a hot teppan with rice, miso soup, and your choice of side dish from just $9.90. Choose your perfect portion: - 120g – $9.90 (U.P. $14.70) - 160g – $11.90 (U.P. $17.70) ★ Recommended - 200g – $13.90 (U.P. $20.70) Each set comes complete with: ✔ Rice ✔ Miso Soup ✔ Choice of 1 Side Dish (Mashed Potato, Sweet Corn Bowl, or Broccoli in Sesame Dressing) Enjoy savings of up to 32% off for a limited time only. Available from 1 September to 31 October 2026. Image(s) for illustration purposes only. Not valid with other promotions, vouchers and mobile payment with rebates or discounts.
```

First raw model answer:

```text
{"classification":{"value":"economic_offer","quote":"Enjoy sizzling Australian Chilled Beef MB2+ Steak Bites served on a hot teppan with rice, miso soup, and your choice of side dish from just $9.90."},"merchant":{"value":"Pepper Lunch Express","quote":"$uper Value Deal is here at Pepper Lunch Express!"},"title":{"value":"$uper Value Deal","quote":"$uper Value Deal"},"benefit":{"value":"from just $9.90","quote":"from just $9.90"},"startDate":{"value":"2026-09-01","quote":"Available from 1 September to 31 October 2026."},"endDate":{"value":"2026-10-31","quote":"Available from 1 September to 31 October 2026."},"locationScope":{"value":null,"quote":null},"locationRules":[]}
```

Validator result:

```json
{
  "contractValid": true,
  "issues": [],
  "unresolved": [
    "physical_participation_unresolved"
  ]
}
```

Independent pre-frozen expected facts:

```json
{
  "id": "pepper_lunch_sg-uper-value-deal",
  "author": "parent-agent-reviewed-before-model-run; not human gold",
  "kind": "economic",
  "acceptableClassifications": [
    "economic_offer"
  ],
  "economicIdentityIds": [
    "offer"
  ],
  "singleCampaignComparable": true,
  "startDate": "2026-09-01",
  "endDate": "2026-10-31",
  "locationScope": null,
  "participating": [],
  "excluded": [],
  "benefitAny": [
    "Steak Bites",
    "32%",
    "120g",
    "160g",
    "200g"
  ],
  "merchantAny": [
    "Pepper Lunch"
  ],
  "qualifiers": [
    {
      "anchor": "32%",
      "required": [
        "up to"
      ]
    },
    {
      "anchor": "from just $9.90",
      "required": [
        "from"
      ]
    }
  ],
  "review": "Full source reviewed against retained benchmark; only campaign dates/physical roles, no clocks or conditions structured."
}
```

### pepper_lunch_sg-weekday-lunch

Findings: missing_or_non_source_quote:merchant, nonverbatim_merchant, benefit_identity_mismatch.

Frozen source-review basis: Full source reviewed against retained benchmark; only campaign dates/physical roles, no clocks or conditions structured.

Complete original source:

```text
Weekday Lunch Elevate your weekdays with our Tempting Weekday Lunch Deals! Pick from delectable selections such as Striploin Steak and Beef Pepper Yakiudon, available at a deal you simply can't resist! 1. Image(s) for illustration purposes only. 2. For Dine-In only. 3. Promotion is only valid from Mondays to Fridays, excluding Public Holidays. 4. Choice of miso soup or seasonal soup, subject to availability. 5. Not valid with other promotions and coupons. While stocks last.
```

First raw model answer:

```text
{"classification":{"value":"economic_offer","quote":"available at a deal you simply can't resist!"},"merchant":{"value":"Pepper Lunch","quote":null},"title":{"value":"Weekday Lunch Deals","quote":"Tempting Weekday Lunch Deals"},"benefit":{"value":"a deal","quote":"available at a deal"},"startDate":{"value":null,"quote":null},"endDate":{"value":null,"quote":null},"locationScope":{"value":null,"quote":null},"locationRules":[]}
```

Validator result:

```json
{
  "contractValid": false,
  "issues": [
    "missing_or_non_source_quote:merchant",
    "nonverbatim_merchant"
  ],
  "unresolved": [
    "missing_start_date",
    "missing_end_date",
    "physical_participation_unresolved"
  ]
}
```

Independent pre-frozen expected facts:

```json
{
  "id": "pepper_lunch_sg-weekday-lunch",
  "author": "parent-agent-reviewed-before-model-run; not human gold",
  "kind": "economic",
  "acceptableClassifications": [
    "economic_offer"
  ],
  "economicIdentityIds": [
    "offer"
  ],
  "singleCampaignComparable": true,
  "startDate": null,
  "endDate": null,
  "locationScope": null,
  "participating": [],
  "excluded": [],
  "benefitAny": [
    "Weekday Lunch",
    "Lunch Deals"
  ],
  "merchantAny": [
    "Pepper Lunch"
  ],
  "qualifiers": [],
  "review": "Full source reviewed against retained benchmark; only campaign dates/physical roles, no clocks or conditions structured."
}
```

### shake_shack_sg-100-angus-beef-just-for-you

Findings: json_parse_failure, classification_mismatch, economic_identity_omitted.

Frozen source-review basis: Full source reviewed against retained benchmark; only campaign dates/physical roles, no clocks or conditions structured.

Complete original source:

```text
100% Angus Beef – Just for You 100% Angus Beef – Just for You At Shake Shack, we don’t cut corners—especially when it comes to our beef. That’s why our burgers start with 100% Angus beef, freshly ground and packed with flavor. And this September, we’re giving you even more reasons to sink your teeth into it. Here’s the Deal From 23 – 26 September, when you order our Say Cheese (Burger) Bundle, we’ll treat you to a complimentary ShackBurger(Single). That’s right—more Angus beef, more flavor, all in one bundle. Here’s what’s in the bundle (From $28.90): ● Choice of 1 Burger ● Complimentary ShackBurger (Single) ● Choice of Fries ● Choice of Bites ● Choice of 2 Drinks Don’t Miss Out This offer is available 23 – 26 September across all Shacks and Happy Point Singapore in-app orders. Come hungry, bring a friend, and taste the difference that 100% Angus beef makes. Terms and Conditions Offer is available across all Shake Shack outlets in Singapore from 23-26 September 2025 only. Offer is valid for dine-in and take-away. The offer is valid in the Shack and Happy Point Singapore in-app orders. Offer not valid for orders made through third-party delivery apps. Offer is not valid in conjunction with any other vouchers. Offer is non-refundable, non-extendable, non-exchangeable for cash or for any other menu items. Shake Shack Singapore reserves the right to vary and amend these terms and conditions at any time without prior notice. Visuals are for illustration purposes only.
```

First raw model answer:

```text
{"classification":{"value":"economic_offer","quote":"From 23 – 26 September, when you order our Say Cheese (Burger) Bundle, we’ll treat you to a complimentary ShackBurger(Single)."},"merchant":{"value":"Shake Shack","quote":"At Shake Shack, we don’t cut corners—especially when it comes to our beef."},"title":{"value":"Say Cheese (Burger) Bundle with a complimentary ShackBurger (Single)","quote":"when you order our Say Cheese (Burger) Bundle, we’ll treat you to a complimentary ShackBurger(Single)."},"benefit":{"value":"complimentary ShackBurger(Single)","quote":"we’ll treat you to a complimentary ShackBurger(Single)."},"startDate":{"value":"2025-09-23","quote":"Offer is available across all Shake Shack outlets in Singapore from 23-26 September 2025 only."},"endDate":{"value":"2025-09-26","quote":"Offer is available across all Shake Shack outlets in Singapore from 23-26 September 2025 only."},"locationScope":{"value":"all_outlets","quote":"Offer is available across all Shake Shack outlets in Singapore from 23-26 September 2025 only."},"locationRules":[{"role":"participating","names":["Shake Shack outlets in Singapore"],"quote":"Offer is available across all Shake Shack outlets in Singapore from 23-26 September 2025 only."}]}"}
```

Validator result:

```json
{
  "contractValid": false,
  "issues": [
    "malformed_date_only_output"
  ],
  "unresolved": []
}
```

Independent pre-frozen expected facts:

```json
{
  "id": "shake_shack_sg-100-angus-beef-just-for-you",
  "author": "parent-agent-reviewed-before-model-run; not human gold",
  "kind": "economic",
  "acceptableClassifications": [
    "economic_offer"
  ],
  "economicIdentityIds": [
    "offer"
  ],
  "singleCampaignComparable": true,
  "startDate": "2025-09-23",
  "endDate": "2025-09-26",
  "locationScope": "all_outlets",
  "participating": [],
  "excluded": [],
  "benefitAny": [
    "complimentary ShackBurger",
    "Complimentary ShackBurger"
  ],
  "merchantAny": [
    "Shake Shack"
  ],
  "qualifiers": [
    {
      "anchor": "$28.90",
      "required": [
        "From"
      ]
    }
  ],
  "review": "Full source reviewed against retained benchmark; only campaign dates/physical roles, no clocks or conditions structured."
}
```

### shake_shack_sg-all-about-chickens

Findings: benefit_identity_mismatch, wrong_participating_outlets.

Frozen source-review basis: Full source reviewed against retained benchmark; only campaign dates/physical roles, no clocks or conditions structured.

Complete original source:

```text
All About Chickens At Shake Shack, we’re all about doing things the right way—and that includes our chicken. We’re celebrating the kind that’s raised with care, not cages. Our 100% cage-free chicken isn’t just good, it’s part of our promise to support better animal welfare and a more responsible food system. Because when your chicken’s raised right, you can taste the difference—and feel good about it too. Here’s what’s in the bundle (From $30.80): Choice of 1 Burger Complimentary Chicken Shack Choice of Fries Choice of Bites Choice of 2 Drinks TERMS & CONDITIONS: Offer is available across all Shake Shack outlets in Singapore on 7 July 2025 only. Offer is valid for dine-in and take-away. Offer is valid in the Shack and via the Happy Point app. Offer not valid for orders made through third-party delivery apps. Offer is not valid in conjunction with any other vouchers. Offer is non-refundable, non-extendable, non-exchangeable for cash or for any other menu items. Shake Shack Singapore reserves the right to vary and amend these terms and conditions at any time without prior notice. Visuals are for illustration purposes only.
```

First raw model answer:

```text
{"classification":{"value":"economic_offer","quote":"Here’s what’s in the bundle (From $30.80): Choice of 1 Burger Complimentary Chicken Shack Choice of Fries Choice of Bites Choice of 2 Drinks"},"merchant":{"value":"Shake Shack","quote":"Shake Shack"},"title":{"value":"All About Chickens","quote":"All About Chickens"},"benefit":{"value":"From $30.80","quote":"(From $30.80)"},"startDate":{"value":"2025-07-07","quote":"Offer is available across all Shake Shack outlets in Singapore on 7 July 2025 only."},"endDate":{"value":"2025-07-07","quote":"Offer is available across all Shake Shack outlets in Singapore on 7 July 2025 only."},"locationScope":{"value":"all_outlets","quote":"Offer is available across all Shake Shack outlets in Singapore on 7 July 2025 only."},"locationRules":[{"role":"participating","names":["all Shake Shack outlets in Singapore"],"quote":"Offer is available across all Shake Shack outlets in Singapore on 7 July 2025 only."}]}
```

Validator result:

```json
{
  "contractValid": true,
  "issues": [],
  "unresolved": []
}
```

Independent pre-frozen expected facts:

```json
{
  "id": "shake_shack_sg-all-about-chickens",
  "author": "parent-agent-reviewed-before-model-run; not human gold",
  "kind": "economic",
  "acceptableClassifications": [
    "economic_offer"
  ],
  "economicIdentityIds": [
    "offer"
  ],
  "singleCampaignComparable": true,
  "startDate": "2025-07-07",
  "endDate": "2025-07-07",
  "locationScope": "all_outlets",
  "participating": [],
  "excluded": [],
  "benefitAny": [
    "Complimentary Chicken Shack"
  ],
  "merchantAny": [
    "Shake Shack"
  ],
  "qualifiers": [
    {
      "anchor": "$30.80",
      "required": [
        "From"
      ]
    }
  ],
  "review": "Full source reviewed against retained benchmark; only campaign dates/physical roles, no clocks or conditions structured."
}
```

### shake_shack_sg-concrete-craze

Findings: unsafe_boundary_commitment.

Frozen source-review basis: Independent whole-source identities or unresolved activity prevent safe single-output extraction; expect uncertain.

Complete original source:

```text
Concrete Craze Summer heat is coming real hot this year so let’s chill out with something sweet! No one REALLY knows how special our frozen custard and concretes are and we’re here to hit you with all the cool custard facts you need to know. Check out our digital edition of Concrete Craze to learn: What makes our frozen custard special Hall of fame for our local partners Some fun activities that you can participate in to get a concrete of your choice* Get the inside scoop below! *Concrete craze campaign ends on 18 August 2024 and the vouchers will be issued by 25 August 2024.
```

First raw model answer:

```text
{"classification":{"value":"contest_or_chance","quote":"Some fun activities that you can participate in to get a concrete of your choice*"},"merchant":{"value":null,"quote":null},"title":{"value":null,"quote":null},"benefit":{"value":null,"quote":null},"startDate":{"value":null,"quote":null},"endDate":{"value":null,"quote":null},"locationScope":{"value":null,"quote":null},"locationRules":[]}
```

Validator result:

```json
{
  "contractValid": true,
  "issues": [],
  "unresolved": [
    "not_confirmed_economic_offer",
    "missing_start_date",
    "missing_end_date",
    "physical_participation_unresolved",
    "missing_title",
    "missing_benefit"
  ]
}
```

Independent pre-frozen expected facts:

```json
{
  "id": "shake_shack_sg-concrete-craze",
  "author": "parent-agent-reviewed-before-model-run; not human gold",
  "kind": "ambiguous",
  "acceptableClassifications": [
    "uncertain"
  ],
  "economicIdentityIds": [],
  "singleCampaignComparable": false,
  "startDate": null,
  "endDate": null,
  "locationScope": null,
  "participating": [],
  "excluded": [],
  "benefitAny": [],
  "merchantAny": [
    "Shake Shack"
  ],
  "qualifiers": [],
  "review": "Independent whole-source identities or unresolved activity prevent safe single-output extraction; expect uncertain."
}
```

### shake_shack_sg-everything-in-our-veggie-shack

Findings: unsafe_boundary_commitment.

Frozen source-review basis: Independent whole-source identities or unresolved activity prevent safe single-output extraction; expect uncertain.

Complete original source:

```text
Everything in our Veggie Shack From Garden to Grill Born out of our Innovation Kitchen in NYC, our Veggie Shack is made from a proprietary blend of real garden vegetables and grains, seared to perfection with American cheese, pickles, crispy onions and ShackSauce all on a toasted potato bun. What’s in it? The Veggie Patty includes 11 vegetables – Portobello mushrooms, shiitake mushrooms, sweet potato, carrot, celery, leek, roasted red onion, roasted garlic, cabbage, beet, and chives. It’s also powered with whole ingredients like sunflower seeds, miso, farro, and quinoa. Want to find out more? Click here for our FAQ! Lay’em out! Let your creativity flow and stand a chance to win an unlimited supply of Veggie Shack from 1 August to 22 September! All you gotta do is start laying the fresh vegetables used in our Veggie Shack to form our burger icon! Once you’re done, snap a pic, post it in your Instagram and tag us @shakeshacksg by 30th July 2359! *Remember to make your account public for us to capture your participation! Hibiscus 50/50 A refreshing mix of our fresh lemonade and floral hibiscus tea. Its sweet-tart flavor and vibrant red color makes it perfect with a Veggie Shack, leveling up your meal with a delightful and revitalizing sip.
```

First raw model answer:

```text
{"classification":{"value":"contest_or_chance","quote":"stand a chance to win an unlimited supply of Veggie Shack"},"merchant":{"value":null,"quote":null},"title":{"value":null,"quote":null},"benefit":{"value":null,"quote":null},"startDate":{"value":null,"quote":null},"endDate":{"value":null,"quote":null},"locationScope":{"value":null,"quote":null},"locationRules":[]}
```

Validator result:

```json
{
  "contractValid": true,
  "issues": [],
  "unresolved": [
    "not_confirmed_economic_offer",
    "missing_start_date",
    "missing_end_date",
    "physical_participation_unresolved",
    "missing_title",
    "missing_benefit"
  ]
}
```

Independent pre-frozen expected facts:

```json
{
  "id": "shake_shack_sg-everything-in-our-veggie-shack",
  "author": "parent-agent-reviewed-before-model-run; not human gold",
  "kind": "ambiguous",
  "acceptableClassifications": [
    "uncertain"
  ],
  "economicIdentityIds": [],
  "singleCampaignComparable": false,
  "startDate": null,
  "endDate": null,
  "locationScope": null,
  "participating": [],
  "excluded": [],
  "benefitAny": [],
  "merchantAny": [
    "Shake Shack"
  ],
  "qualifiers": [],
  "review": "Independent whole-source identities or unresolved activity prevent safe single-output extraction; expect uncertain."
}
```

### shake_shack_sg-hello-parkway-parade

Findings: benefit_qualifier_omitted.

Frozen source-review basis: Full source reviewed against retained benchmark; only campaign dates/physical roles, no clocks or conditions structured.

Complete original source:

```text
Hello, Parkway Parade! Hello, Parkway Parade! Fellow Easties, your new neighbourhood Shack has arrived! Our 12th Shack is now officially open at Parkway Parade, bringing in our burgers, crinkle cut fries, shakes and all the Shack favorites to the heart of the neighbourhood Whether you’re an Eastie or just making your way over, we’ve got a new spot for you to grab a bite, catch up with friends and settle into some good Shack time. A Little Taste of the Coast A stone’s throw from the beach, this new Shack brings a little taste of the neighbourhood’s coastal spirit indoors. From rippling details inspired by the tide to warm timber and natural textures, spot the details that bring pieces of the shore into the space! Come Celebrate With Us Enjoy a little opening treat on us! From 11 September to 10 October, enjoy 10% OFF* with a minimum spend of $16 when you use promo code: PPOPENING. See you at Parkway Parade Shack! *Terms and conditions apply: Promo code is valid from 11 September to 10 October 2026. Promo code is applicable with minimum $16 purchase and is redeemable exclusively via the Happy Point Singapore app; the promo code is not valid on third-party delivery platforms. Redemption is valid at Parkway Parade Shake Shack Singapore outlet and is limited to one use per order. This promotion cannot be combined with any other offers or promotions. Shake Shack Singapore is not responsible for lost, stolen, expired, or misused codes, and reserves the right to amend or end the promotion without prior notice.
```

First raw model answer:

```text
{"classification":{"value":"economic_offer","quote":"From 11 September to 10 October, enjoy 10% OFF* with a minimum spend of $16 when you use promo code: PPOPENING."},"merchant":{"value":"Shake Shack Singapore","quote":"Shake Shack Singapore is not responsible for lost, stolen, expired, or misused codes"},"title":{"value":"10% OFF with promo code PPOPENING","quote":"enjoy 10% OFF* with a minimum spend of $16 when you use promo code: PPOPENING"},"benefit":{"value":"10% OFF*","quote":"enjoy 10% OFF*"},"startDate":{"value":"2026-09-11","quote":"Promo code is valid from 11 September to 10 October 2026."},"endDate":{"value":"2026-10-10","quote":"Promo code is valid from 11 September to 10 October 2026."},"locationScope":{"value":"named_outlets","quote":"Redemption is valid at Parkway Parade Shake Shack Singapore outlet"},"locationRules":[{"role":"participating","names":["Parkway Parade Shake Shack Singapore outlet"],"quote":"Redemption is valid at Parkway Parade Shake Shack Singapore outlet"}]}
```

Validator result:

```json
{
  "contractValid": true,
  "issues": [],
  "unresolved": []
}
```

Independent pre-frozen expected facts:

```json
{
  "id": "shake_shack_sg-hello-parkway-parade",
  "author": "parent-agent-reviewed-before-model-run; not human gold",
  "kind": "economic",
  "acceptableClassifications": [
    "economic_offer"
  ],
  "economicIdentityIds": [
    "offer"
  ],
  "singleCampaignComparable": true,
  "startDate": "2026-09-11",
  "endDate": "2026-10-10",
  "locationScope": "named_outlets",
  "participating": [
    {
      "identity": "Parkway Parade",
      "labels": [
        "Parkway Parade",
        "Parkway Parade Shake Shack Singapore outlet"
      ],
      "quote": "Redemption is valid at Parkway Parade Shake Shack Singapore outlet and is limited to one use per order."
    }
  ],
  "excluded": [],
  "benefitAny": [
    "10% OFF"
  ],
  "merchantAny": [
    "Shake Shack"
  ],
  "qualifiers": [
    {
      "anchor": "10%",
      "required": [
        "$16"
      ]
    }
  ],
  "review": "Full source reviewed against retained benchmark; only campaign dates/physical roles, no clocks or conditions structured."
}
```

### shake_shack_sg-this-ones-for-your-mom

Findings: nonverbatim_benefit, unstated_year:startDate, unstated_year:endDate, wrong_campaign_startDate, wrong_campaign_endDate.

Frozen source-review basis: Full source reviewed against retained benchmark; only campaign dates/physical roles, no clocks or conditions structured.

Complete original source:

```text
This One’s For Your Mom This year, skip the flower bouquets and go straight for the burgers. On May 11, we’re serving up a Mother’s Day Bundle that’s stacked with everything she loves—because nothing says “I appreciate you” like burgers, bites, and a little extra on the house. Here’s what’s in the bundle (From $30.80): Choice of 1 Burger Complimentary ShackBurger or Chicken Shack Choice of Fries Choice of Bites Choice of 2 Drinks It’s stacked, it’s sharable, and it’s made with 100% Angus beef and premium ingredients. TERMS & CONDITIONS: •⁠ ⁠Offer is available across all Shake Shack outlets in Singapore on 11 May only. •⁠ ⁠Offer is valid for dine-in only. •⁠ ⁠Offer not valid for orders made through third-party delivery apps. •⁠ ⁠Limited to 1 order per person and transaction. •⁠ ⁠Offer is not valid in conjunction with any other vouchers. •⁠ ⁠Offer is non-refundable, non-extendable, non-exchangeable for cash or for any other menu items. •⁠ ⁠Shake Shack Singapore reserves the right to vary and amend these terms and conditions at any time without prior notice. •⁠ ⁠Visuals are for illustration purposes only.
```

First raw model answer:

```text
{"classification":{"value":"economic_offer","quote":"Here’s what’s in the bundle (From $30.80):"},"merchant":{"value":"Shake Shack","quote":"all Shake Shack outlets in Singapore"},"title":{"value":"Mother’s Day Bundle","quote":"Mother’s Day Bundle"},"benefit":{"value":"From $30.80: Choice of 1 Burger Complimentary ShackBurger or Chicken Shack Choice of Fries Choice of Bites Choice of 2 Drinks","quote":"From $30.80): Choice of 1 Burger Complimentary ShackBurger or Chicken Shack Choice of Fries Choice of Bites Choice of 2 Drinks"},"startDate":{"value":"2026-05-11","quote":"Offer is available across all Shake Shack outlets in Singapore on 11 May only."},"endDate":{"value":"2026-05-11","quote":"Offer is available across all Shake Shack outlets in Singapore on 11 May only."},"locationScope":{"value":"all_outlets","quote":"Offer is available across all Shake Shack outlets in Singapore on 11 May only."},"locationRules":[]}
```

Validator result:

```json
{
  "contractValid": false,
  "issues": [
    "nonverbatim_benefit",
    "unstated_year:startDate",
    "unstated_year:endDate"
  ],
  "unresolved": [
    "benefit_exceeds_publication_limit"
  ]
}
```

Independent pre-frozen expected facts:

```json
{
  "id": "shake_shack_sg-this-ones-for-your-mom",
  "author": "parent-agent-reviewed-before-model-run; not human gold",
  "kind": "economic",
  "acceptableClassifications": [
    "economic_offer"
  ],
  "economicIdentityIds": [
    "offer"
  ],
  "singleCampaignComparable": true,
  "startDate": null,
  "endDate": null,
  "locationScope": "all_outlets",
  "participating": [],
  "excluded": [],
  "benefitAny": [
    "Complimentary ShackBurger",
    "From $30.80"
  ],
  "merchantAny": [
    "Shake Shack"
  ],
  "qualifiers": [
    {
      "anchor": "$30.80",
      "required": [
        "From"
      ]
    }
  ],
  "review": "Full source reviewed against retained benchmark; only campaign dates/physical roles, no clocks or conditions structured."
}
```

### bari_bari_steak_sg-promotions-4

Findings: wrong_participating_outlets.

Frozen source-review basis: Full source reviewed against retained benchmark; only campaign dates/physical roles, no clocks or conditions structured.

Complete original source:

```text
Beat the Crowd & Save 15% ! Beat the dinner rush and enjoy a sizzling deal at Bari Bari Steak! From 5pm to 6pm daily, get 15% OFF your total bill with our Early Bird Dinner Promo. Gather your friends, head over to our Tampines 1 outlet, and dig into your favorite steaks for less. Daily, 5PM – 6PM (1-hour dining time) Exclusively at Bari Bari Steak, Tampines 1 Terms & Conditions: Valid exclusively for dine-in at the Tampines 1 outlet only. Available daily from 5pm to 6pm only (excluding Public Holidays)*. Customers must be seated and have orders placed within this window to enjoy the discount. Discount is applied to the total bill prior to the addition of GST and service charge. Not valid in conjunction with any other ongoing promotions, discounts, vouchers, or privileges. Image(s) for illustration purposes only. The management reserves the right to amend or terminate the offer without prior notice.
```

First raw model answer:

```text
{"classification":{"value":"economic_offer","quote":"get 15% OFF your total bill with our Early Bird Dinner Promo"},"merchant":{"value":"Bari Bari Steak","quote":"at Bari Bari Steak"},"title":{"value":"Early Bird Dinner Promo","quote":"Early Bird Dinner Promo"},"benefit":{"value":"15% OFF your total bill","quote":"get 15% OFF your total bill"},"startDate":{"value":null,"quote":null},"endDate":{"value":null,"quote":null},"locationScope":{"value":"named_outlets","quote":"Valid exclusively for dine-in at the Tampines 1 outlet only."},"locationRules":[{"role":"participating","names":["Bari Bari Steak, Tampines 1"],"quote":"Exclusively at Bari Bari Steak, Tampines 1"}]}
```

Validator result:

```json
{
  "contractValid": true,
  "issues": [],
  "unresolved": [
    "missing_start_date",
    "missing_end_date"
  ]
}
```

Independent pre-frozen expected facts:

```json
{
  "id": "bari_bari_steak_sg-promotions-4",
  "author": "parent-agent-reviewed-before-model-run; not human gold",
  "kind": "economic",
  "acceptableClassifications": [
    "economic_offer"
  ],
  "economicIdentityIds": [
    "offer"
  ],
  "singleCampaignComparable": true,
  "startDate": null,
  "endDate": null,
  "locationScope": "named_outlets",
  "participating": [
    {
      "identity": "Tampines 1",
      "labels": [
        "Tampines 1"
      ],
      "quote": "Valid exclusively for dine-in at the Tampines 1 outlet only."
    }
  ],
  "excluded": [],
  "benefitAny": [
    "15% OFF"
  ],
  "merchantAny": [
    "Bari Bari Steak"
  ],
  "qualifiers": [],
  "review": "Full source reviewed against retained benchmark; only campaign dates/physical roles, no clocks or conditions structured."
}
```

### mcdonalds_sg-McSaver

Findings: wrong_physical_scope.

Frozen source-review basis: Full source reviewed against retained benchmark; only campaign dates/physical roles, no clocks or conditions structured.

Complete original source:

```text
McSaver™ meals save the day! More savings, more deliciousness! Treat yourself and your wallet with the McSaver™ meals at just $5! Choose between familiar favourites like Smoky Beef, Filet-O-Fish® or McChicken® Meals Order Now Filet-O-Fish® Meal Dive into our Filet-O-Fish®! This popular fish sandwich uses sustainably sourced fish. Topped with melty cheese and creamy McDonald’s tartar sauce between soft, steamed buns. Allergen information: Egg, fish, milk, soybean, wheat Food sensitivities: Gluten McChicken® Meal An evergreen favourite, McChicken® has been winning fans with its wholesome great taste – crisp, tender chicken patty layered with shredded lettuce, plus just the right touch of mayo in a soft sesame bun. Allergen information: Egg, soybean, wheat Food sensitivities: Gluten Smoky Beef Meal What’s not to love? A classic favourite beef burger, elevated with a smoky mayo sauce. 100% beef patty, cheese, lettuce, and onions, in a soft bun. That’s a real treat. Allergen information: Egg, Milk, Soybeans and Wheat Food sensitivities: Gluten Promotional price is available after breakfast hours and while stocks last. Visuals are for illustration purposes only. McDonald’s reserves the right to change the promotional price without prior notice. Terms and Conditions apply. For more information, visit https://www.mcdonalds.com.sg/McSaver. The promotional price is not available via delivery and in the following outlets: Lido, Gardens by the Bay and Changi Airport (Jewel, T2, T3). Locate Us
```

First raw model answer:

```text
{"classification":{"value":"economic_offer","quote":"McSaver™ meals at just $5!"},"merchant":{"value":"McDonald’s","quote":"McDonald’s reserves the right to change the promotional price without prior notice."},"title":{"value":"McSaver™ meals","quote":"McSaver™ meals save the day!"},"benefit":{"value":"McSaver™ meals at just $5","quote":"McSaver™ meals at just $5!"},"startDate":{"value":null,"quote":null},"endDate":{"value":null,"quote":null},"locationScope":{"value":"selected_outlets","quote":"The promotional price is not available via delivery and in the following outlets: Lido, Gardens by the Bay and Changi Airport (Jewel, T2, T3)."},"locationRules":[{"role":"excluded","names":["Lido","Gardens by the Bay","Changi Airport (Jewel, T2, T3)"],"quote":"The promotional price is not available via delivery and in the following outlets: Lido, Gardens by the Bay and Changi Airport (Jewel, T2, T3)."}]}
```

Validator result:

```json
{
  "contractValid": true,
  "issues": [],
  "unresolved": [
    "missing_start_date",
    "missing_end_date",
    "physical_participation_unresolved"
  ]
}
```

Independent pre-frozen expected facts:

```json
{
  "id": "mcdonalds_sg-McSaver",
  "author": "parent-agent-reviewed-before-model-run; not human gold",
  "kind": "economic",
  "acceptableClassifications": [
    "economic_offer"
  ],
  "economicIdentityIds": [
    "offer"
  ],
  "singleCampaignComparable": true,
  "startDate": null,
  "endDate": null,
  "locationScope": null,
  "participating": [],
  "excluded": [
    {
      "identity": "Lido",
      "labels": [
        "Lido"
      ],
      "quote": "The promotional price is not available via delivery and in the following outlets: Lido, Gardens by the Bay and Changi Airport (Jewel, T2, T3)."
    },
    {
      "identity": "Gardens by the Bay",
      "labels": [
        "Gardens by the Bay"
      ],
      "quote": "The promotional price is not available via delivery and in the following outlets: Lido, Gardens by the Bay and Changi Airport (Jewel, T2, T3)."
    },
    {
      "identity": "Changi Airport (Jewel, T2, T3)",
      "labels": [
        "Changi Airport (Jewel, T2, T3)",
        "Changi Airport",
        "Jewel",
        "T2",
        "T3"
      ],
      "quote": "The promotional price is not available via delivery and in the following outlets: Lido, Gardens by the Bay and Changi Airport (Jewel, T2, T3)."
    }
  ],
  "benefitAny": [
    "$5"
  ],
  "merchantAny": [
    "McDonald’s",
    "McDonald's"
  ],
  "qualifiers": [],
  "review": "Full source reviewed against retained benchmark; only campaign dates/physical roles, no clocks or conditions structured."
}
```

### mcdonalds_sg-bfmcsaver

Findings: classification_mismatch, economic_identity_omitted.

Frozen source-review basis: Meal is economic; contest dates do not belong to meal; exclusions are physical, not positive scope.

Complete original source:

```text
Fuel your mornings with protein-packed goodness! Wrap up your workout with a McSaver™ Meal Wrap up your workout with a McSaver™ Meal Take on exciting fitness challenges, rack up your steps, and stand a chance to win rewards. Then fuel up with a wholesome Breakfast Wrap McSaver™ Meal for just $6.50. Take on exciting fitness challenges, rack up your steps, and stand a chance to win rewards. Then fuel up with a wholesome Breakfast Wrap McSaver™ Meal for just $6.50. Order Now Your route could lead to rewards! Think you've got what it takes to create the perfect Golden Arches? Map and complete an M-shaped route with a minimum distance of 2km using any fitness or activity-tracking app. Then share a screenshot of your route on your Instagram Story with the date visible as proof of entry. Tag @mcdsg and include #WrapUpYourWorkout. The top 5 M-shaped routes with the closest resemblance to our Golden Arches will win $100 McDonald’s vouchers each. Think you've got what it takes to create the perfect Golden Arches? Map and complete an M-shaped route with a minimum distance of 2km using any fitness or activity-tracking app. Then share a screenshot of your route on your Instagram Story with the date visible as proof of entry. Tag @mcdsg and include #WrapUpYourWorkout. The top 5 M-shaped routes with the closest resemblance to our Golden Arches will win $100 McDonald’s vouchers each. Contest Submission Period: 1 October to 15 October 2026 Winner Notification: Selected winners will be notified via email by 19 October 2026 Contest Submission Period: 1 October to 15 October 2026 Winner Notification: Selected winners will be notified via email by 19 October 2026 While stocks last. View the full terms and conditions here.​ Terms and Conditions apply. By submitting an entry and/or participating in the Challenge, each participant confirms that they have read, understood and agreed to be bound by these Terms and Conditions.​ The qualifying run must be completed in a single activity session between 1 October 2026, 0000hrs to 15 October 2026, 2359hrs. Participants must select a safe and lawful route, comply with all traffic and pedestrian rules and avoid trespassing. Participants should exercise responsibly, taking into consideration their health, fitness level, weather conditions and route conditions. McDonald’s will not be responsible for any injury, loss or damage arising from or in connection with participation in the Challenge.​ Each participant may submit multiple entries during the Challenge period. However, only the participant’s highest-scoring valid entry will be considered for judging and prize allocation.​ All valid entries will be assessed by a judging panel appointed by McDonald’s based on the recorded route’s visual resemblance to the letter “M” or McDonald’s Golden Arches. The five highest-scoring valid entries will be selected as the winners. In the event of a tie, the tied entries will be reassessed by the judging panel, whose decision will be final.​​ Each winner will receive SGD100 worth of physical McDonald’s vouchers (“Prize”), subject to the validity period, redemption requirements and other terms stated on or accompanying the vouchers. Prizes are non-transferable, cannot be exchanged for cash or any other item, and will not be replaced if lost, damaged, misused or allowed to expire.​​ McDonald’s reserves the right to amend, suspend or cancel the Challenge without prior notice.​ Breakfast Wrap Chicken Sausage Breakfast Wrap Chicken Sausage A hearty breakfast wrap filled with savoury chicken sausage, eggs, and cheese. A breakfast favourite, made for mornings that need a satisfying start and a reward at the finish line! Allergens: Egg, Milk, Soybean, Wheat Food sensitivities: Gluten Breakfast Wrap Chicken Ham Breakfast Wrap Chicken Ham A tasty breakfast wrap with chicken ham, eggs and cheese. A satisfying breakfast favourite, that delivers the fuel you need to keep your morning going! Allergens: Egg, Milk, Soybean, Wheat Food sensitivities: Gluten Chicken Muffin Chicken Muffin Toasty wholegrain muffins meets crispy, juicy chicken patty, paired with mayo and a slice of cheese, it's a must-have for chicken fans! Allergens: Egg, Milk, Soybean, Wheat Food sensitivities: Gluten Sausage McMuffin® Sausage McMuffin® So simple, yet oh-so-tasty! Enjoy a juicy chicken sausage and melty cheese nestled between our classic toasted, wholegrain muffins. Allergens: Milk, Soybean, Wheat Food sensitivities: Gluten Egg McMuffin® Egg McMuffin® Egg-traordinary mornings begin with this delightful combo of a round egg, savoury chicken ham and melty cheese in a lightly toasted, wholegrain muffin. Allergens: Egg, Milk, Soybean, Wheat Food sensitivities: Gluten Breakfast McSaver™ Meal includes McCafé® Premium Roast Coffee or Tea, and a Hash Brown or Corn Cup. Promotional price is available during breakfast hours and while stocks last. Visuals are for illustration purposes only. McDonald’s reserves the right to change the promotional mechanics & period without prior notice. Terms & Conditions apply. Promotional price is not available via Delivery nor at the following locations: Mandai Wildlife East, Lido, Gardens by the Bay and Changi Airport (Jewel, T2, T2 Transit, T3). Locate Us
```

First raw model answer:

```text
{"classification":{"value":"uncertain","quote":null},"merchant":{"value":null,"quote":null},"title":{"value":null,"quote":null},"benefit":{"value":null,"quote":null},"startDate":{"value":null,"quote":null},"endDate":{"value":null,"quote":null},"locationScope":{"value":null,"quote":null},"locationRules":[]}
```

Validator result:

```json
{
  "contractValid": true,
  "issues": [],
  "unresolved": [
    "not_confirmed_economic_offer",
    "missing_start_date",
    "missing_end_date",
    "physical_participation_unresolved",
    "missing_title",
    "missing_benefit",
    "description_exceeds_publication_limit"
  ]
}
```

Independent pre-frozen expected facts:

```json
{
  "id": "mcdonalds_sg-bfmcsaver",
  "author": "parent-agent-reviewed-before-model-run; not human gold",
  "kind": "economic",
  "acceptableClassifications": [
    "economic_offer"
  ],
  "economicIdentityIds": [
    "offer"
  ],
  "singleCampaignComparable": true,
  "startDate": null,
  "endDate": null,
  "locationScope": null,
  "participating": [],
  "excluded": [
    {
      "identity": "Mandai Wildlife East",
      "labels": [
        "Mandai Wildlife East"
      ],
      "quote": "Promotional price is not available via Delivery nor at the following locations: Mandai Wildlife East, Lido, Gardens by the Bay and Changi Airport (Jewel, T2, T2 Transit, T3)."
    },
    {
      "identity": "Lido",
      "labels": [
        "Lido"
      ],
      "quote": "Promotional price is not available via Delivery nor at the following locations: Mandai Wildlife East, Lido, Gardens by the Bay and Changi Airport (Jewel, T2, T2 Transit, T3)."
    },
    {
      "identity": "Gardens by the Bay",
      "labels": [
        "Gardens by the Bay"
      ],
      "quote": "Promotional price is not available via Delivery nor at the following locations: Mandai Wildlife East, Lido, Gardens by the Bay and Changi Airport (Jewel, T2, T2 Transit, T3)."
    },
    {
      "identity": "Changi Airport (Jewel, T2, T2 Transit, T3)",
      "labels": [
        "Changi Airport (Jewel, T2, T2 Transit, T3)",
        "Changi Airport",
        "Jewel",
        "T2",
        "T3",
        "T2 Transit"
      ],
      "quote": "Promotional price is not available via Delivery nor at the following locations: Mandai Wildlife East, Lido, Gardens by the Bay and Changi Airport (Jewel, T2, T2 Transit, T3)."
    }
  ],
  "benefitAny": [
    "$6.50"
  ],
  "merchantAny": [
    "McDonald’s",
    "McDonald's"
  ],
  "qualifiers": [],
  "review": "Meal is economic; contest dates do not belong to meal; exclusions are physical, not positive scope."
}
```

### sushiro_sg-to-the-moon-and-back

Findings: nonverbatim_benefit, classification_mismatch.

Frozen source-review basis: Full source reviewed against retained benchmark; only campaign dates/physical roles, no clocks or conditions structured.

Complete original source:

```text
To the moon and back! Part 2 Let your taste buds journey to the moon and back from 23 Sep – 6 Oct! 🌕✨ Indulge in a moonlit moment of luxury with our Lunar Tuna with Uni ($6.9++) — bringing together the fresh delicate tuna paired together with creamy rich uni for a savoury finish~ 🍣 Meet our Lunar Seaweed Imo-Mochi with Honey Butter (2.3++) — crispy on the outside, delightfully chewy within, and finished with a luscious drizzle of sweet, buttery goodness! 🍯🧈 Lastly, don’t miss out on the Crab and Salmon Roe Mountain Wrap ($3.9++), — loaded with sweet crab and crowned with glistening salmon roe that is sure to bring you a delicious burst of flavour in a single bite. 🦀🤤 Come discover the next chapter of lunar favourites at SUSHIRO. 🌙❤️ Available while stocks last. *Prices vary at Sushiro Mandai Wildlife Reserve (Digiro outlet).⁠ For more updates, follow us on Facebook, Instagram and TikTok @SushiroSingapore
```

First raw model answer:

```text
{"classification":{"value":"economic_offer","quote":"Let your taste buds journey to the moon and back from 23 Sep – 6 Oct!"},"merchant":{"value":"SUSHIRO","quote":"Come discover the next chapter of lunar favourites at SUSHIRO."},"title":{"value":"To the moon and back! Part 2","quote":"To the moon and back! Part 2"},"benefit":{"value":"Lunar Tuna with Uni ($6.9++); Lunar Seaweed Imo-Mochi with Honey Butter (2.3++); Crab and Salmon Roe Mountain Wrap ($3.9++)","quote":"Indulge in a moonlit moment of luxury with our Lunar Tuna with Uni ($6.9++) — bringing together the fresh delicate tuna paired together with creamy rich uni for a savoury finish~ 🍣 Meet our Lunar Seaweed Imo-Mochi with Honey Butter (2.3++) — crispy on the outside, delightfully chewy within, and finished with a luscious drizzle of sweet, buttery goodness! 🍯🧈 Lastly, don’t miss out on the Crab and Salmon Roe Mountain Wrap ($3.9++), — loaded with sweet crab and crowned with glistening salmon roe that is sure to bring you a delicious burst of flavour in a single bite."},"startDate":{"value":null,"quote":null},"endDate":{"value":null,"quote":null},"locationScope":{"value":null,"quote":null},"locationRules":[]}
```

Validator result:

```json
{
  "contractValid": false,
  "issues": [
    "nonverbatim_benefit"
  ],
  "unresolved": [
    "missing_start_date",
    "missing_end_date",
    "physical_participation_unresolved",
    "benefit_exceeds_publication_limit"
  ]
}
```

Independent pre-frozen expected facts:

```json
{
  "id": "sushiro_sg-to-the-moon-and-back",
  "author": "parent-agent-reviewed-before-model-run; not human gold",
  "kind": "non_economic",
  "acceptableClassifications": [
    "product_launch",
    "uncertain"
  ],
  "economicIdentityIds": [],
  "singleCampaignComparable": false,
  "startDate": null,
  "endDate": null,
  "locationScope": null,
  "participating": [],
  "excluded": [],
  "benefitAny": [],
  "merchantAny": [
    "Sushiro"
  ],
  "qualifiers": [],
  "review": "Full source reviewed against retained benchmark; only campaign dates/physical roles, no clocks or conditions structured."
}
```

### shake_shack_sg-meet-our-collab-partners

Findings: classification_mismatch, economic_identity_omitted.

Frozen source-review basis: Full source reviewed against retained benchmark; only campaign dates/physical roles, no clocks or conditions structured.

Complete original source:

```text
Meet Our Collab Partners Meet the artist! Introduction I am a Singaporean visual artist illustrating my way through sprawling wall murals and artist-brand collaborations. My artworks are often bold, striking and inspired by traditional Asian motifs with playful nuance that reflects both my heritage and personality. Inspiration The main inspiration from this collaboration stems from Singapore’s heritage and iconic orchid to create something that feels traditional with a modern twist from with my art lens and style. Why work with Shake Shack Ever since the Great World Shake Shack opening, I’ve always been grateful to Shake Shack for giving me a chance to be the 6th local artist to adorn the Shack, as a young artist back then and an older artist now. Working with Shake Shack offers a unique opportunity to blend creativity with community connection. As an artist, it’s inspiring to collaborate with a brand that values local voices and vibrant storytelling. Their willingness to embrace local culture and support creative expression makes them an ideal partner for any artist looking to make a positive, lasting impact. Favorite food from the limited time offer menu As a die hard fan of the 50/50, the Buah Long Long lemonade is an easy favorite for me! His Work In celebration of Singapore culture, we’ve teamed up with local artist tobyato to design an exclusive range of merchandise. Known for his bold and illustrative designs often inspired by Asian motifs, did you know that he’s also painted our mural at Great World Shack, 2021? This time, he has designed a collaborative emblem in tribute to familiar local icons from orchids to Peranakan tiles, which will adorn enamel mugs, scarves, t-shirts and even tiffin carriers, otherwise known as tingkats. The chefs behind the Zi Char inspired menu! Introduction We are a family-run Zi Char restaurant in Singapore, known for its rich heritage and hearty, wok-fried dishes. With over 50 years of history, KEK has become a local icon, serving up signature dishes like the famous Moonlight Hor Fun and Chilli Crab. This Michelin Guide-recommended spot is celebrated for its authentic flavors, warm hospitality, and a legacy that spans three generations, making it a go-to destination for food lovers seeking the true taste of Singapore. Inspiration Our origin dates back to Hainan, China learning all the Chinese dishes from our 1st generation. After 3 generations, we evolved very much to our Singaporean culture getting inspired by our local palette yet staying true to heritage. Why work with Shake Shack Not just a regular burger joint. Quality and value had been very similar to KEK, with the philosophy of people first. Favorite food from the Zi Char inspired menu Tough one here honestly, can we say all? If we need to pick : Wayne: White Pepper Beef 🍔 Paul: Coffee-glazed Chicken 🍔 Here’s a little treat! Get complimentary White pepper fries* on us when you put your knowledge about our local collab to the test, click here to find out!
```

First raw model answer:

```text
{"classification":{"value":"contest_or_chance","quote":"Get complimentary White pepper fries* on us when you put your knowledge about our local collab to the test, click here to find out!"},"merchant":{"value":null,"quote":null},"title":{"value":null,"quote":null},"benefit":{"value":null,"quote":null},"startDate":{"value":null,"quote":null},"endDate":{"value":null,"quote":null},"locationScope":{"value":null,"quote":null},"locationRules":[]}
```

Validator result:

```json
{
  "contractValid": true,
  "issues": [],
  "unresolved": [
    "not_confirmed_economic_offer",
    "missing_start_date",
    "missing_end_date",
    "physical_participation_unresolved",
    "missing_title",
    "missing_benefit"
  ]
}
```

Independent pre-frozen expected facts:

```json
{
  "id": "shake_shack_sg-meet-our-collab-partners",
  "author": "parent-agent-reviewed-before-model-run; not human gold",
  "kind": "economic",
  "acceptableClassifications": [
    "economic_offer"
  ],
  "economicIdentityIds": [
    "fries"
  ],
  "singleCampaignComparable": true,
  "startDate": null,
  "endDate": null,
  "locationScope": null,
  "participating": [],
  "excluded": [],
  "benefitAny": [
    "complimentary White pepper fries"
  ],
  "merchantAny": [
    "Shake Shack"
  ],
  "qualifiers": [],
  "review": "Full source reviewed against retained benchmark; only campaign dates/physical roles, no clocks or conditions structured."
}
```

### shake_shack_sg-more-perks-less-fuss

Findings: missing_or_non_source_quote:merchant, nonverbatim_merchant, non_economic_facts, classification_mismatch, economic_identity_omitted.

Frozen source-review basis: Full source reviewed against retained benchmark; only campaign dates/physical roles, no clocks or conditions structured.

Complete original source:

```text
MORE PERKS, LESS FUSS To our Shack Fans, we’ve heard you loud and clear — and we’ve been busy giving our Happy Point App a glow-up. Think of a fresh new look, cooler perks, and way easier ways to enjoy your Shack favorites. Here’s what’s new and waiting for you: New Look We’ve had a little makeover! The app’s now smoother, brighter, and easier to use. Whether you’re ordering on the go, checking out your vouchers, or finding the nearest Shack, everything’s right at your fingertips. Happy Dollars Points are out, Happy Dollars are in! Earn 2% back on what you spend, and use your Happy Dollars on your next Shack order. Simple and rewarding. More Perks Level up as you dine more! With our new tier system, the higher you climb, the more perks you unlock. Because who doesn’t love an upgrade? Ready to dive in? Download the Happy Point App and check out what’s new!
```

First raw model answer:

```text
{"classification":{"value":"product_launch","quote":"Here’s what’s new and waiting for you: New Look"},"merchant":{"value":"Shake Shack","quote":null},"title":{"value":"Happy Point App glow-up","quote":"we’ve been busy giving our Happy Point App a glow-up"},"benefit":{"value":null,"quote":null},"startDate":{"value":null,"quote":null},"endDate":{"value":null,"quote":null},"locationScope":{"value":null,"quote":null},"locationRules":[]}
```

Validator result:

```json
{
  "contractValid": false,
  "issues": [
    "missing_or_non_source_quote:merchant",
    "nonverbatim_merchant",
    "non_economic_facts"
  ],
  "unresolved": [
    "not_confirmed_economic_offer",
    "missing_start_date",
    "missing_end_date",
    "physical_participation_unresolved",
    "missing_benefit"
  ]
}
```

Independent pre-frozen expected facts:

```json
{
  "id": "shake_shack_sg-more-perks-less-fuss",
  "author": "parent-agent-reviewed-before-model-run; not human gold",
  "kind": "economic",
  "acceptableClassifications": [
    "economic_offer"
  ],
  "economicIdentityIds": [
    "offer"
  ],
  "singleCampaignComparable": true,
  "startDate": null,
  "endDate": null,
  "locationScope": null,
  "participating": [],
  "excluded": [],
  "benefitAny": [
    "2% back"
  ],
  "merchantAny": [
    "Shake Shack"
  ],
  "qualifiers": [],
  "review": "Full source reviewed against retained benchmark; only campaign dates/physical roles, no clocks or conditions structured."
}
```

### fairprice_sg-xtra-wine-flash-sale

Findings: missing_or_non_source_quote:merchant, nonverbatim_merchant, benefit_identity_mismatch.

Frozen source-review basis: Full source reviewed against retained benchmark; only campaign dates/physical roles, no clocks or conditions structured.

Complete original source:

```text
Xtra Wine Flash Deals for September 24 to 27 September 2026
```

First raw model answer:

```text
{"classification":{"value":"economic_offer","quote":"Xtra Wine Flash Deals"},"merchant":{"value":"FairPrice","quote":null},"title":{"value":"Xtra Wine Flash Deals","quote":"Xtra Wine Flash Deals"},"benefit":{"value":"Flash Deals","quote":"Flash Deals"},"startDate":{"value":"2026-09-24","quote":"September 24 to 27 September 2026"},"endDate":{"value":"2026-09-27","quote":"September 24 to 27 September 2026"},"locationScope":{"value":null,"quote":null},"locationRules":[]}
```

Validator result:

```json
{
  "contractValid": false,
  "issues": [
    "missing_or_non_source_quote:merchant",
    "nonverbatim_merchant"
  ],
  "unresolved": [
    "physical_participation_unresolved"
  ]
}
```

Independent pre-frozen expected facts:

```json
{
  "id": "fairprice_sg-xtra-wine-flash-sale",
  "author": "parent-agent-reviewed-before-model-run; not human gold",
  "kind": "economic",
  "acceptableClassifications": [
    "economic_offer"
  ],
  "economicIdentityIds": [
    "offer"
  ],
  "singleCampaignComparable": true,
  "startDate": "2026-09-24",
  "endDate": "2026-09-27",
  "locationScope": null,
  "participating": [],
  "excluded": [],
  "benefitAny": [
    "Wine Flash Deals"
  ],
  "merchantAny": [
    "FairPrice"
  ],
  "qualifiers": [],
  "review": "Full source reviewed against retained benchmark; only campaign dates/physical roles, no clocks or conditions structured."
}
```

### holdout-tastesoulsg-4486

Findings: nonverbatim_benefit, classification_mismatch.

Frozen source-review basis: Product sharing tea pack; price alone does not establish economic deal.

Complete original source:

```text
🧋 Koi Thé 🧋

➡️ NEW 3L Sharing Tea Pack ($52)
➡️ Flavours incl. Green Milk Tea, Peach Green Tea, Oolong Milk Tea & more
➡️ + $8 for topping

📆 Now
📍 Online
❗️ T&Cs apply.
👉 More info: bit.ly/4gTTqJh (http://bit.ly/4gTTqJh)

@tastesoulsg (https://t.me/tastesoulsg)
[Media attached: verify image/video conditions.]
```

First raw model answer:

```text
{"classification":{"value":"economic_offer","quote":"NEW 3L Sharing Tea Pack ($52)"},"merchant":{"value":"Koi Thé","quote":"🧋 Koi Thé 🧋"},"title":{"value":"3L Sharing Tea Pack","quote":"NEW 3L Sharing Tea Pack"},"benefit":{"value":"3L Sharing Tea Pack ($52) + $8 for topping","quote":"NEW 3L Sharing Tea Pack ($52)\n➡️ Flavours incl. Green Milk Tea, Peach Green Tea, Oolong Milk Tea & more\n➡️ + $8 for topping"},"startDate":{"value":null,"quote":null},"endDate":{"value":null,"quote":null},"locationScope":{"value":null,"quote":null},"locationRules":[]}
```

Validator result:

```json
{
  "contractValid": false,
  "issues": [
    "nonverbatim_benefit"
  ],
  "unresolved": [
    "missing_start_date",
    "missing_end_date",
    "physical_participation_unresolved"
  ]
}
```

Independent pre-frozen expected facts:

```json
{
  "id": "holdout-tastesoulsg-4486",
  "author": "parent-agent-reviewed-before-model-run; not human gold",
  "kind": "non_economic",
  "acceptableClassifications": [
    "product_launch",
    "uncertain"
  ],
  "economicIdentityIds": [],
  "singleCampaignComparable": false,
  "startDate": null,
  "endDate": null,
  "locationScope": null,
  "participating": [],
  "excluded": [],
  "benefitAny": [],
  "merchantAny": [
    "Koi Thé"
  ],
  "qualifiers": [],
  "review": "Product sharing tea pack; price alone does not establish economic deal."
}
```

### holdout-tastesoulsg-4468

Findings: wrong_physical_scope.

Frozen source-review basis: All outlets except explicit physical exclusions. Today is not absolute validity.

Complete original source:

```text
🌯 Subway 🌯

➡️ Buy 1 Breakfast Wrap + Coffee set & get 1 FREE Breakfast Wrap
📆 Today 
🕣 Till 11am
📍 All outlets excl. Changi Airport outlets, Tanah Merah Ferry Terminal, Courts Megastore, Anchorpoint & Navy Region Centre Singapore
❗️ T&Cs apply.
👉 More info: bit.ly/4ifYdWl (http://bit.ly/4ifYdWl)

@tastesoulsg (https://t.me/tastesoulsg)
[Media attached: verify image/video conditions.]
```

First raw model answer:

```text
{"classification":{"value":"economic_offer","quote":"Buy 1 Breakfast Wrap + Coffee set & get 1 FREE Breakfast Wrap"},"merchant":{"value":"Subway","quote":"🌯 Subway 🌯"},"title":{"value":"Buy 1 Breakfast Wrap + Coffee set & get 1 FREE Breakfast Wrap","quote":"Buy 1 Breakfast Wrap + Coffee set & get 1 FREE Breakfast Wrap"},"benefit":{"value":"get 1 FREE Breakfast Wrap","quote":"get 1 FREE Breakfast Wrap"},"startDate":{"value":null,"quote":null},"endDate":{"value":null,"quote":null},"locationScope":{"value":"selected_outlets","quote":"All outlets excl. Changi Airport outlets, Tanah Merah Ferry Terminal, Courts Megastore, Anchorpoint & Navy Region Centre Singapore"},"locationRules":[{"role":"excluded","names":["Changi Airport outlets","Tanah Merah Ferry Terminal","Courts Megastore","Anchorpoint","Navy Region Centre Singapore"],"quote":"All outlets excl. Changi Airport outlets, Tanah Merah Ferry Terminal, Courts Megastore, Anchorpoint & Navy Region Centre Singapore"}]}
```

Validator result:

```json
{
  "contractValid": true,
  "issues": [],
  "unresolved": [
    "missing_start_date",
    "missing_end_date",
    "physical_participation_unresolved"
  ]
}
```

Independent pre-frozen expected facts:

```json
{
  "id": "holdout-tastesoulsg-4468",
  "author": "parent-agent-reviewed-before-model-run; not human gold",
  "kind": "economic",
  "acceptableClassifications": [
    "economic_offer"
  ],
  "economicIdentityIds": [
    "whole_campaign"
  ],
  "singleCampaignComparable": false,
  "startDate": null,
  "endDate": null,
  "locationScope": "all_outlets",
  "participating": [],
  "excluded": [
    {
      "identity": "Changi Airport outlets",
      "labels": [
        "Changi Airport outlets",
        "Changi Airport outlets"
      ],
      "quote": "📍 All outlets excl. Changi Airport outlets, Tanah Merah Ferry Terminal, Courts Megastore, Anchorpoint & Navy Region Centre Singapore"
    },
    {
      "identity": "Tanah Merah Ferry Terminal",
      "labels": [
        "Tanah Merah Ferry Terminal",
        "Tanah Merah Ferry Terminal"
      ],
      "quote": "📍 All outlets excl. Changi Airport outlets, Tanah Merah Ferry Terminal, Courts Megastore, Anchorpoint & Navy Region Centre Singapore"
    },
    {
      "identity": "Courts Megastore",
      "labels": [
        "Courts Megastore",
        "Courts Megastore"
      ],
      "quote": "📍 All outlets excl. Changi Airport outlets, Tanah Merah Ferry Terminal, Courts Megastore, Anchorpoint & Navy Region Centre Singapore"
    },
    {
      "identity": "Anchorpoint",
      "labels": [
        "Anchorpoint",
        "Anchorpoint"
      ],
      "quote": "📍 All outlets excl. Changi Airport outlets, Tanah Merah Ferry Terminal, Courts Megastore, Anchorpoint & Navy Region Centre Singapore"
    },
    {
      "identity": "Navy Region Centre Singapore",
      "labels": [
        "Navy Region Centre Singapore",
        "Navy Region Centre Singapore"
      ],
      "quote": "📍 All outlets excl. Changi Airport outlets, Tanah Merah Ferry Terminal, Courts Megastore, Anchorpoint & Navy Region Centre Singapore"
    }
  ],
  "benefitAny": [
    "1 FREE Breakfast Wrap"
  ],
  "merchantAny": [
    "Subway"
  ],
  "qualifiers": [],
  "review": "All outlets except explicit physical exclusions. Today is not absolute validity."
}
```

### holdout-tastesoulsg-4466

Findings: wrong_physical_scope.

Frozen source-review basis: Explicit exclusion; Today and metadata do not supply date.

Complete original source:

```text
🍗 4Fingers 🍗

➡️ $4 for 4pc Wings & Drumettes 
📆 Today 
📍 All outlets excl. Changi Airport 
❗️ T&Cs apply.
👉 More info: bit.ly/4gNBcI6 (http://bit.ly/4gNBcI6)

@tastesoulsg (https://t.me/tastesoulsg)
[Media attached: verify image/video conditions.]
```

First raw model answer:

```text
{"classification":{"value":"economic_offer","quote":"$4 for 4pc Wings & Drumettes"},"merchant":{"value":"4Fingers","quote":"🍗 4Fingers 🍗"},"title":{"value":"$4 for 4pc Wings & Drumettes","quote":"$4 for 4pc Wings & Drumettes"},"benefit":{"value":"$4 for 4pc Wings & Drumettes","quote":"$4 for 4pc Wings & Drumettes"},"startDate":{"value":null,"quote":null},"endDate":{"value":null,"quote":null},"locationScope":{"value":"selected_outlets","quote":"All outlets excl. Changi Airport"},"locationRules":[{"role":"excluded","names":["Changi Airport"],"quote":"All outlets excl. Changi Airport"}]}
```

Validator result:

```json
{
  "contractValid": true,
  "issues": [],
  "unresolved": [
    "missing_start_date",
    "missing_end_date",
    "physical_participation_unresolved"
  ]
}
```

Independent pre-frozen expected facts:

```json
{
  "id": "holdout-tastesoulsg-4466",
  "author": "parent-agent-reviewed-before-model-run; not human gold",
  "kind": "economic",
  "acceptableClassifications": [
    "economic_offer"
  ],
  "economicIdentityIds": [
    "whole_campaign"
  ],
  "singleCampaignComparable": false,
  "startDate": null,
  "endDate": null,
  "locationScope": "all_outlets",
  "participating": [],
  "excluded": [
    {
      "identity": "Changi Airport",
      "labels": [
        "Changi Airport",
        "Changi Airport"
      ],
      "quote": "📍 All outlets excl. Changi Airport "
    }
  ],
  "benefitAny": [
    "$4 for 4pc Wings & Drumettes"
  ],
  "merchantAny": [
    "4Fingers"
  ],
  "qualifiers": [],
  "review": "Explicit exclusion; Today and metadata do not supply date."
}
```

### holdout-tastesoulsg-4462

Findings: non_economic_facts, classification_mismatch, economic_identity_omitted.

Frozen source-review basis: Explicit participant; Sep dates lack year.

Complete original source:

```text
🍚 Kei Kaisendon 🍚

➡️ 1-for-1 Kaisendon
📆 4 - 6 Sep
📍 Great World, B1-129
❗️ T&Cs apply.
👉 More info: bit.ly/4gB5K0U (http://bit.ly/4gB5K0U)

@tastesoulsg (https://t.me/tastesoulsg)
[Media attached: verify image/video conditions.]
```

First raw model answer:

```text
{"classification":{"value":"uncertain","quote":null},"merchant":{"value":"Kei Kaisendon","quote":"🍚 Kei Kaisendon 🍚"},"title":{"value":"1-for-1 Kaisendon","quote":"1-for-1 Kaisendon"},"benefit":{"value":"1-for-1 Kaisendon","quote":"1-for-1 Kaisendon"},"startDate":{"value":null,"quote":null},"endDate":{"value":null,"quote":null},"locationScope":{"value":null,"quote":null},"locationRules":[]}
```

Validator result:

```json
{
  "contractValid": false,
  "issues": [
    "non_economic_facts"
  ],
  "unresolved": [
    "not_confirmed_economic_offer",
    "missing_start_date",
    "missing_end_date",
    "physical_participation_unresolved"
  ]
}
```

Independent pre-frozen expected facts:

```json
{
  "id": "holdout-tastesoulsg-4462",
  "author": "parent-agent-reviewed-before-model-run; not human gold",
  "kind": "economic",
  "acceptableClassifications": [
    "economic_offer"
  ],
  "economicIdentityIds": [
    "whole_campaign"
  ],
  "singleCampaignComparable": false,
  "startDate": null,
  "endDate": null,
  "locationScope": "named_outlets",
  "participating": [
    {
      "identity": "Great World, B1-129",
      "labels": [
        "Great World, B1-129",
        "Great World"
      ],
      "quote": "📍 Great World, B1-129"
    }
  ],
  "excluded": [],
  "benefitAny": [
    "1-for-1 Kaisendon"
  ],
  "merchantAny": [
    "Kei Kaisendon"
  ],
  "qualifiers": [],
  "review": "Explicit participant; Sep dates lack year."
}
```

### holdout-tastesoulsg-4458

Findings: wrong_participating_outlets.

Frozen source-review basis: Explicit five-day campaign and The Capitol venue; mechanics behind link unavailable; preserve generic source-supported benefit.

Complete original source:

```text
🥩 The doors are open, the deals are hot. Enjoy 5 days of steak promos from 1 to 5 September 2026 at The Capitol – Bari Bari Grand 

🍈 Read more: bit.ly/4ion0Yz (http://bit.ly/4ion0Yz)

@tastesoulsg (https://t.me/tastesoulsg)
[Media attached: verify image/video conditions.]
```

First raw model answer:

```text
{"classification":{"value":"economic_offer","quote":"Enjoy 5 days of steak promos from 1 to 5 September 2026 at The Capitol – Bari Bari Grand"},"merchant":{"value":"Bari Bari Grand","quote":"Bari Bari Grand"},"title":{"value":"Steak promos","quote":"steak promos"},"benefit":{"value":"steak promos","quote":"steak promos"},"startDate":{"value":"2026-09-01","quote":"from 1 to 5 September 2026"},"endDate":{"value":"2026-09-05","quote":"from 1 to 5 September 2026"},"locationScope":{"value":"named_outlets","quote":"at The Capitol – Bari Bari Grand"},"locationRules":[{"role":"participating","names":["The Capitol – Bari Bari Grand"],"quote":"at The Capitol – Bari Bari Grand"}]}
```

Validator result:

```json
{
  "contractValid": true,
  "issues": [],
  "unresolved": []
}
```

Independent pre-frozen expected facts:

```json
{
  "id": "holdout-tastesoulsg-4458",
  "author": "parent-agent-reviewed-before-model-run; not human gold",
  "kind": "economic",
  "acceptableClassifications": [
    "economic_offer"
  ],
  "economicIdentityIds": [
    "whole_campaign"
  ],
  "singleCampaignComparable": false,
  "startDate": "2026-09-01",
  "endDate": "2026-09-05",
  "locationScope": "named_outlets",
  "participating": [
    {
      "identity": "The Capitol",
      "labels": [
        "The Capitol",
        "The Capitol"
      ],
      "quote": "🥩 The doors are open, the deals are hot. Enjoy 5 days of steak promos from 1 to 5 September 2026 at The Capitol – Bari Bari Grand "
    }
  ],
  "excluded": [],
  "benefitAny": [
    "steak promos"
  ],
  "merchantAny": [
    "Bari Bari Grand"
  ],
  "qualifiers": [],
  "review": "Explicit five-day campaign and The Capitol venue; mechanics behind link unavailable; preserve generic source-supported benefit."
}
```

### holdout-tastesoulsg-4453

Findings: unsafe_boundary_commitment, wrong_participating_outlets, wrong_physical_scope.

Frozen source-review basis: Different outlet-specific date windows; do not flatten into universal days/branches even though years absent.

Complete original source:

```text
🧀 Hokkaido Baked Cheese Tart 🧀

➡️ 1-for-1 Original Cheese Tart

📆 2 Sep
📍 Jurong Point, B1-K2 | Parkway Parade, 01-23B

📆 3 Sep
📍 Changi Airport T3, B2-11 | Bugis Junction, B1-K6

🕣 12pm onwards
❗️ While stocks last. T&Cs apply. 
👉 More info: bit.ly/4zR7Jpq (http://bit.ly/4zR7Jpq)

@tastesoulsg (https://t.me/tastesoulsg)
[Media attached: verify image/video conditions.]
```

First raw model answer:

```text
{"classification":{"value":"economic_offer","quote":"1-for-1 Original Cheese Tart"},"merchant":{"value":"Hokkaido Baked Cheese Tart","quote":"Hokkaido Baked Cheese Tart"},"title":{"value":"1-for-1 Original Cheese Tart","quote":"1-for-1 Original Cheese Tart"},"benefit":{"value":"1-for-1 Original Cheese Tart","quote":"1-for-1 Original Cheese Tart"},"startDate":{"value":null,"quote":null},"endDate":{"value":null,"quote":null},"locationScope":{"value":"selected_outlets","quote":"2 Sep\n📍 Jurong Point, B1-K2 | Parkway Parade, 01-23B\n\n📆 3 Sep\n📍 Changi Airport T3, B2-11 | Bugis Junction, B1-K6"},"locationRules":[{"role":"participating","names":["Jurong Point, B1-K2","Parkway Parade, 01-23B"],"quote":"Jurong Point, B1-K2 | Parkway Parade, 01-23B"},{"role":"participating","names":["Changi Airport T3, B2-11","Bugis Junction, B1-K6"],"quote":"Changi Airport T3, B2-11 | Bugis Junction, B1-K6"}]}
```

Validator result:

```json
{
  "contractValid": true,
  "issues": [],
  "unresolved": [
    "missing_start_date",
    "missing_end_date"
  ]
}
```

Independent pre-frozen expected facts:

```json
{
  "id": "holdout-tastesoulsg-4453",
  "author": "parent-agent-reviewed-before-model-run; not human gold",
  "kind": "ambiguous",
  "acceptableClassifications": [
    "uncertain"
  ],
  "economicIdentityIds": [],
  "singleCampaignComparable": false,
  "startDate": null,
  "endDate": null,
  "locationScope": null,
  "participating": [],
  "excluded": [],
  "benefitAny": [],
  "merchantAny": [
    "Hokkaido Baked Cheese Tart"
  ],
  "qualifiers": [],
  "review": "Different outlet-specific date windows; do not flatten into universal days/branches even though years absent."
}
```

### holdout-tastesoulsg-4410

Findings: nonverbatim_location:all outlets except Temasek Poly and Tampines Kiosk, wrong_participating_outlets, wrong_physical_scope.

Frozen source-review basis: Physical exclusions, 9 Aug lacks year; no inferred date from export.

Complete original source:

```text
🍟 McDonald’s 🍟

➡️ FREE Curry Sauce
➡️ Grab from the box at the order collection counter
📆 9 Aug
🕣 12pm onwards
📍 All outlets excl. Temasek Poly & Tampines Kiosk
❗️ While stocks last. T&Cs apply.
👉 More info: bit.ly/4fXyYpa (http://bit.ly/4fXyYpa)

@tastesoulsg (https://t.me/tastesoulsg)
[Media attached: verify image/video conditions.]
```

First raw model answer:

```text
{"classification":{"value":"economic_offer","quote":"FREE Curry Sauce"},"merchant":{"value":"McDonald’s","quote":"🍟 McDonald’s 🍟"},"title":{"value":"FREE Curry Sauce","quote":"FREE Curry Sauce"},"benefit":{"value":"FREE Curry Sauce","quote":"FREE Curry Sauce"},"startDate":{"value":null,"quote":null},"endDate":{"value":null,"quote":null},"locationScope":{"value":"selected_outlets","quote":"All outlets excl. Temasek Poly & Tampines Kiosk"},"locationRules":[{"role":"participating","names":["all outlets except Temasek Poly and Tampines Kiosk"],"quote":"All outlets excl. Temasek Poly & Tampines Kiosk"},{"role":"excluded","names":["Temasek Poly","Tampines Kiosk"],"quote":"All outlets excl. Temasek Poly & Tampines Kiosk"}]}
```

Validator result:

```json
{
  "contractValid": false,
  "issues": [
    "nonverbatim_location:all outlets except Temasek Poly and Tampines Kiosk"
  ],
  "unresolved": [
    "missing_start_date",
    "missing_end_date"
  ]
}
```

Independent pre-frozen expected facts:

```json
{
  "id": "holdout-tastesoulsg-4410",
  "author": "parent-agent-reviewed-before-model-run; not human gold",
  "kind": "economic",
  "acceptableClassifications": [
    "economic_offer"
  ],
  "economicIdentityIds": [
    "whole_campaign"
  ],
  "singleCampaignComparable": false,
  "startDate": null,
  "endDate": null,
  "locationScope": "all_outlets",
  "participating": [],
  "excluded": [
    {
      "identity": "Temasek Poly",
      "labels": [
        "Temasek Poly",
        "Temasek Poly"
      ],
      "quote": "📍 All outlets excl. Temasek Poly & Tampines Kiosk"
    },
    {
      "identity": "Tampines Kiosk",
      "labels": [
        "Tampines Kiosk",
        "Tampines Kiosk"
      ],
      "quote": "📍 All outlets excl. Temasek Poly & Tampines Kiosk"
    }
  ],
  "benefitAny": [
    "FREE Curry Sauce"
  ],
  "merchantAny": [
    "McDonald’s",
    "McDonald's"
  ],
  "qualifiers": [],
  "review": "Physical exclusions, 9 Aug lacks year; no inferred date from export."
}
```

## Limitations

- Regression sources participated in prompt design; not unseen.
- Holdouts selected by parent agent from retained export, not fresh collection; source family differs from website/social regression. Merchant group count includes roundup label; not a generalization claim.
- Evaluation notes are agent-authored before model calls, not human ground truth.
- One answer per source; repeated-sample stability unmeasured.
- Model/reasoning/context parameters are requested. Tool confirms agent IDs only; backend identity and usage unavailable.
- Tool abstention is prompt-enforced, not mechanically denied.
- Description preservation is deterministic copying, not LLM accuracy.
- Unknown matches are semantically valid but incomplete.
- Core completeness supplies no official directory, coordinates, source authority or map-publication proof.
- Elapsed time includes orchestration; no isolated provider-inference latency available.

## Delivery index and source-reviewed interpretation

Workflow: [intent](intent.md), [spec](spec.md), [design](design.md), [plan](plan.md). Evidence: [verification](verification.md), [decision](decision.md), [all source errors with complete raw answers and validators](error-review.md), [diagnostic JSON](error-review.json), [samples](samples.json), [pre-frozen agent-authored notes](evaluation-notes.json), [run manifest](run-manifest.json), [raw seal](raw-seal.json), [frozen results](results.json), [frozen finding records](failures.json). Per-task first texts, metadata and closure evidence are in raw/, responses/, attempts/, launches/ and closures/.

| Metric | Regression | Holdout |
| --- | --- | --- |
| Fresh first answers | 49/49 | 20/20 |
| JSON parse failures | 1/49 | 0/20 |
| Contract passes | 23/49 | 15/20 |
| Economic recognition (unambiguous economic sources) | 34/38 | 15/16 |
| Correct explicit-year date endpoints | 30/32 | 2/2 |
| Correct unknown date endpoints | 64/66 | 38/38 |
| Core complete under frozen scoring | 3/49 | 0/20 |
| Exact Description copied by code | 49/49 | 20/20 |

{"regression":{"sources":49,"economicSources":38,"dateAndPhysicalSourceEligible":8},"holdout":{"sources":20,"economicSources":16,"dateAndPhysicalSourceEligible":1}}

Only eight regression sources and one holdout source supply both explicit campaign dates and resolvable source-level positive scope within Description storage limits. This source-availability ceiling is separate from extraction performance; it does not check all merchant/title/benefit limits. The holdout 2/2 known-date result is one source, not broad date reliability. Its only date-complete venue incurs an equivalent-label scorer mismatch. Unknown dates are correct but cannot be complete.

Frozen validator-pass wrong-outlet flags are 2 regression and 5 holdout; source review identifies one collective non-branch physical label, two equivalent venue-label misses and four conservative boundary-policy flags. They are not seven invented branches. The regression selected scope inferred from exclusions alone is an unsupported positive scope; two holdout selected/all scope differences retain correct exclusions. No exclusion polarity reversal occurred. All original scores and the failed decision rule remain unchanged.

The holdout has 18 named merchants plus a multi-merchant roundup. Its source family differs from regression and some campaigns overlap in another source family. Agent-authored labels and exact-alias limitations require independent review before any reliability claim. There is no recommendation for a limited trial under the predeclared gate: holdout contract validity is 75%, below 90%, and one definite-nonoffer classification is economic. This fails even without the physical alias/boundary flags.

Median observed reservation-to-saved-answer latency is 8,394 ms regression and 10,765 ms holdout. This includes orchestration, not isolated inference. Token usage and backend model identity are unavailable. No repeated sampling occurred.

## Paired historical transitions

28 historical normalization units from 26 exact comparable sources: contract both-pass 10 / old-only 12 / new-only one / neither five; dates both-match 24 / old-only two / new-only two / neither zero; physical both-match 25 / old-only one / new-only zero / neither two. These units are correlated where several old units map to one current answer. Routed downstream selection and full-source classification/extraction differ; this is a diagnostic ledger, not a causal accuracy comparison.
