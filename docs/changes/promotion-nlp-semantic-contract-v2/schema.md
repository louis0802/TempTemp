# promotion-nlp-schema-v2

Research-only strict envelope. primaryProposition title/benefit have value and exact quote; benefit is verbatim. Schedules, scope, location rules and restrictions have explicit association evidence. Promotion requires a primary quote at validation; non-promotions emit no facts. Syntactic validity does not prove semantic entailment.

```json
{
  "type": "object",
  "properties": {
    "classification": {
      "type": "object",
      "properties": {
        "value": {
          "type": "string",
          "enum": [
            "promotion",
            "non_promotion",
            "uncertain"
          ]
        },
        "quote": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 20000
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "value",
        "quote"
      ],
      "additionalProperties": false
    },
    "primaryProposition": {
      "type": "object",
      "properties": {
        "quote": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 20000
            },
            {
              "type": "null"
            }
          ]
        },
        "title": {
          "type": "object",
          "properties": {
            "value": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 4000
                },
                {
                  "type": "null"
                }
              ]
            },
            "quote": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 20000
                },
                {
                  "type": "null"
                }
              ]
            }
          },
          "required": [
            "value",
            "quote"
          ],
          "additionalProperties": false
        },
        "benefit": {
          "type": "object",
          "properties": {
            "value": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 4000
                },
                {
                  "type": "null"
                }
              ]
            },
            "quote": {
              "anyOf": [
                {
                  "type": "string",
                  "minLength": 1,
                  "maxLength": 20000
                },
                {
                  "type": "null"
                }
              ]
            }
          },
          "required": [
            "value",
            "quote"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "quote",
        "title",
        "benefit"
      ],
      "additionalProperties": false
    },
    "merchant": {
      "type": "object",
      "properties": {
        "value": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 4000
            },
            {
              "type": "null"
            }
          ]
        },
        "quote": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 20000
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "value",
        "quote"
      ],
      "additionalProperties": false
    },
    "startDate": {
      "type": "object",
      "properties": {
        "value": {
          "anyOf": [
            {
              "type": "string",
              "maxLength": 100
            },
            {
              "type": "null"
            }
          ]
        },
        "quote": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 20000
            },
            {
              "type": "null"
            }
          ]
        },
        "associationQuote": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 20000
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "value",
        "quote",
        "associationQuote"
      ],
      "additionalProperties": false
    },
    "endDate": {
      "type": "object",
      "properties": {
        "value": {
          "anyOf": [
            {
              "type": "string",
              "maxLength": 100
            },
            {
              "type": "null"
            }
          ]
        },
        "quote": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 20000
            },
            {
              "type": "null"
            }
          ]
        },
        "associationQuote": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 20000
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "value",
        "quote",
        "associationQuote"
      ],
      "additionalProperties": false
    },
    "weekdays": {
      "type": "object",
      "properties": {
        "value": {
          "anyOf": [
            {
              "maxItems": 7,
              "type": "array",
              "items": {
                "type": "integer",
                "minimum": -9007199254740991,
                "maximum": 9007199254740991
              }
            },
            {
              "type": "null"
            }
          ]
        },
        "quote": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 20000
            },
            {
              "type": "null"
            }
          ]
        },
        "associationQuote": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 20000
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "value",
        "quote",
        "associationQuote"
      ],
      "additionalProperties": false
    },
    "hours": {
      "type": "object",
      "properties": {
        "value": {
          "anyOf": [
            {
              "type": "string",
              "maxLength": 500
            },
            {
              "type": "null"
            }
          ]
        },
        "quote": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 20000
            },
            {
              "type": "null"
            }
          ]
        },
        "associationQuote": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 20000
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "value",
        "quote",
        "associationQuote"
      ],
      "additionalProperties": false
    },
    "locationScope": {
      "type": "object",
      "properties": {
        "value": {
          "anyOf": [
            {
              "type": "string",
              "enum": [
                "all_outlets",
                "selected_outlets",
                "named_outlets"
              ]
            },
            {
              "type": "null"
            }
          ]
        },
        "quote": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 20000
            },
            {
              "type": "null"
            }
          ]
        },
        "associationQuote": {
          "anyOf": [
            {
              "type": "string",
              "minLength": 1,
              "maxLength": 20000
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [
        "value",
        "quote",
        "associationQuote"
      ],
      "additionalProperties": false
    },
    "locationRules": {
      "maxItems": 100,
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "role": {
            "type": "string",
            "enum": [
              "participating",
              "excluded"
            ]
          },
          "names": {
            "minItems": 1,
            "maxItems": 100,
            "type": "array",
            "items": {
              "type": "string",
              "minLength": 1,
              "maxLength": 4000
            }
          },
          "quote": {
            "anyOf": [
              {
                "type": "string",
                "minLength": 1,
                "maxLength": 20000
              },
              {
                "type": "null"
              }
            ]
          },
          "associationQuote": {
            "anyOf": [
              {
                "type": "string",
                "minLength": 1,
                "maxLength": 20000
              },
              {
                "type": "null"
              }
            ]
          }
        },
        "required": [
          "role",
          "names",
          "quote",
          "associationQuote"
        ],
        "additionalProperties": false
      }
    },
    "restrictions": {
      "maxItems": 100,
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "text": {
            "type": "string",
            "minLength": 1,
            "maxLength": 4000
          },
          "role": {
            "type": "string",
            "enum": [
              "eligibility",
              "purchase_requirement",
              "redemption_channel",
              "social_requirement",
              "timing_requirement",
              "item_restriction",
              "exclusion",
              "general_term"
            ]
          },
          "quote": {
            "anyOf": [
              {
                "type": "string",
                "minLength": 1,
                "maxLength": 20000
              },
              {
                "type": "null"
              }
            ]
          },
          "associationQuote": {
            "anyOf": [
              {
                "type": "string",
                "minLength": 1,
                "maxLength": 20000
              },
              {
                "type": "null"
              }
            ]
          }
        },
        "required": [
          "text",
          "role",
          "quote",
          "associationQuote"
        ],
        "additionalProperties": false
      }
    }
  },
  "required": [
    "classification",
    "primaryProposition",
    "merchant",
    "startDate",
    "endDate",
    "weekdays",
    "hours",
    "locationScope",
    "locationRules",
    "restrictions"
  ],
  "additionalProperties": false
}
```
