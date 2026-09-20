# Around JSON export and import specification

Exported 16 September 2026 from the running local application. This document describes the **currently implemented** APIs, rather than a proposed bulk-import feature.

## 1. Files and counts

- `review-inbox.json`: all **180 current review candidates**, covering **136 source posts**. 102 candidates belong to SG Food Deals and 78 to TasteSoul. A roundup can produce several candidates, so candidate count exceeds post count.
- `import-envelope.schema.json`: JSON Schema generated from the source-post import envelope.
- `promotion.schema.json`: JSON Schema generated from the structured promotion contract.
- Resolved, excluded and superseded candidates are omitted, as are superseded source revisions. The two already approved offers are not part of this inbox export.

The export is read-only. It contains public source text and internal record IDs, not passwords, tokens or database credentials.

## 2. Review export structure

```text
{
  format: "around.review-inbox",
  version: 1,
  exportedAt: UTC ISO timestamp,
  scope: string,
  count: number,
  sourcePostCount: number,
  bySource: { channel: candidate count },
  items: [
    {
      candidateId: UUID,
      sourceRevisionId: UUID,
      candidateKey: string,
      status: "needs_review",
      issues: string[],
      suggestedPromotion: object or incomplete source-derived value,
      source: {
        postId: UUID,
        channel: "sgfooddeals" | "tastesoulsg",
        label: string,
        messageId: positive integer,
        url: original Telegram post URL,
        publishedAt: UTC ISO timestamp,
        contentHash: string,
        originalText: full stored post text
      }
    }
  ]
}
```

`suggestedPromotion` is **not a validated promotion**. It may lack category, outlet coordinates, dates, schedules or other required fields. `issues` explains why it is in review. A `locationSuggestion` is text only; it does not establish a participating branch or valid coordinates.

Keep the candidate ID, source revision, source reference and original text when editing the export. Never invent missing terms, expiry or branch participation. Multiple candidates may share one `source.postId` because they came from a roundup.

**Do not upload `review-inbox.json` directly into “Approved JSON export”.** That control accepts the different source-post format in section 4. The application does not currently have a bulk review-decision file endpoint.

## 3. Apply corrections to existing inbox candidates (recommended)

For records from this export, use the existing authenticated review API. This avoids pretending that a filtered inbox export represents a complete collection window.

### Approve one candidate

`POST /api/admin/candidates/{candidateId}/review`

Headers:

```http
Authorization: Bearer <current Supabase access token>
Content-Type: application/json
```

Body shape:

```json
{
  "action": "approve",
  "reason": "Checked the full conditions, validity and participating outlet evidence.",
  "promotion": {}
}
```

Replace `{}` with a complete promotion matching section 5. It is shown empty here deliberately and will be rejected as-is.

- `reason`: trimmed string, 3–2,000 characters.
- `promotion`: required for approval, including a valid UUID `id` and all schema fields.
- The server verifies the administrator identity and allowlist, confirms the candidate is still pending and belongs to the latest source revision, then validates publication requirements.
- The server generates the final promotion ID, sets status to `published`, revision to `1` and verification time to the current time. It uses the backing post as the source reference.
- If the supplied promotion ID already exists, use the existing-offer review endpoint below instead.
- The source record stays stored; the candidate becomes `resolved`; the approval is audited.
- Candidate approval does not automatically merge two separate cross-source candidates. Reconcile duplicates into the existing offer rather than approving them as separate offers.

### Dismiss a non-offer

Same endpoint and headers:

```json
{
  "action": "exclude",
  "reason": "This post is a restaurant article without a promotional benefit."
}
```

No `promotion` is required. The candidate becomes `excluded`, while its evidence and audit history remain.

### Correct or withdraw an existing offer

`POST /api/admin/promotions/{promotionId}/review`

```json
{
  "action": "correct",
  "expectedRevision": 1,
  "reason": "Updated the conditions using the current source.",
  "promotion": {}
}
```

`action` is `approve`, `correct` or `withdraw`; `expectedRevision` must match the current offer. For withdrawal, `promotion` can be omitted. A stale revision returns 409. Successful corrections preserve the offer identity and increment its revision.

Review request size limit: **200,000 bytes**. No passwords, database URLs or access tokens belong in the exported data or edited JSON file.

## 4. Import source-post batches (existing upload control)

Use **Curator workspace → Import source posts → Approved JSON export**, or:

`POST /api/admin/import` with the same bearer-token and content-type headers.

Alternatively, from the project directory:

```sh
APPROVED_IMPORT_FILE=/absolute/path/source-posts.json npm run ingest
```

The root is an **array** of one or two source objects:

```json
[
  {
    "source": "sgfooddeals",
    "complete": true,
    "coverageStart": "2026-08-01T00:00:00.000Z",
    "completeThrough": "2026-09-16T00:00:00.000Z",
    "posts": [
      {
        "messageId": 123,
        "publishedAt": "2026-09-15T00:00:00.000Z",
        "text": "Replace this illustrative text with the actual source post.",
        "candidates": [
          {
            "key": "stable-offer-key",
            "promotion": {}
          }
        ]
      }
    ]
  }
]
```

**Illustrative envelope only:** message ID, timestamps and text above are placeholders, not real source facts. Do not upload unchanged. The empty promotion is accepted by the envelope but cannot publish. Use `candidates: []` when supplying raw source text for extraction into review suggestions.

### Envelope requirements

| Field | Type and rules |
| --- | --- |
| Root | Array, 1–2 objects. Each source appears at most once. |
| `source` | Exactly `sgfooddeals` or `tastesoulsg`. |
| `complete` | Must literally be `true`, declaring that the provided source window is complete for its stated route. Never set this merely to pass validation. |
| `coverageStart` | UTC ISO datetime ending in `Z`. Must reach back to or before the source's current successful checkpoint; on first import, the configured backfill cutoff. |
| `completeThrough` | UTC ISO datetime ending in `Z`. Must be at or after the current checkpoint and no later than the run start. |
| `posts` | Array, maximum 10,000 posts per source. |
| `messageId` | Integer from 1 through JavaScript's safe-integer maximum, 9,007,199,254,740,991. Preserve the real Telegram post ID. |
| `publishedAt` | Original post timestamp in UTC ISO format ending in `Z`; cannot be after `completeThrough`. |
| `text` | String, maximum 50,000 characters. Preserve all material conditions. |
| `candidates` | Array, maximum 100 entries per post. Each contains `key` and `promotion`. |
| `key` | Stable nonempty string, at most 100 characters. Use distinct keys for separate offers in a roundup. |
| `promotion` | Any JSON value is accepted by the envelope; only a complete valid object can publish. Invalid or incomplete objects enter review. |

Maximum file/request size: **10,000,000 bytes**. JSON must use normal JSON syntax: double-quoted keys/strings, no comments, trailing commas, `NaN` or `undefined`.

### Collection and replay effects

- A review-inbox subset cannot honestly be labelled a complete source window. Use the candidate review API for the exported inbox records.
- Checkpoints can advance between export and re-import. Do not change coverage timestamps unless you have actually collected the claimed window.
- Source and message ID identify the stored post. Identical replay does not create another post.
- Changed text **or candidate content** creates a source revision. Linked published offers can be suspended for review. Source-post import is not an in-place bulk approval mechanism.
- The ingestion pipeline recomputes publication status; supplying `status: "published"` does not bypass checks, and supplying `withdrawn` is not a withdrawal command.
- Existing promotion IDs are held for review instead of silently overwriting records. Equivalent verified offers may merge source references; conflicts are held for review.
- Each source commits independently. HTTP 207 contains both success and failure outcomes if one source fails. Inspect every `results` entry.
- Collection success means posts were stored and the source checkpoint advanced. It does **not** mean every candidate was approved or published; processing may enter review or retry.

## 5. Complete promotion object

All fields below are required by `promotion.schema.json`, even when their value may be `null`. The source-post envelope permits incomplete data, but the promotion validation stage and approval endpoints enforce this structure.

| Field | Type / constraints |
| --- | --- |
| `id` | Valid UUID. Use a new UUID for a new offer; keep existing identity when correcting an existing offer. |
| `merchant` | String, 1–150 characters. |
| `title` | String, 1–250 characters. |
| `category` | `Meals`, `Cafés`, `Drinks` or `Desserts`. |
| `benefit` | String, 1–60 characters. Preserve qualifiers such as “up to”, “from” and “++”. |
| `description` | String, 1–5,000 characters. |
| `terms` | 1–30 nonempty strings, each at most 2,000 characters. Include exclusions, minimum spend, app/membership requirements and other material restrictions. |
| `startDate`, `endDate` | Real calendar date `YYYY-MM-DD`, or `null`. Both must be known and start ≤ end before publication. |
| `weekdays` | `null` for no day restriction, otherwise a nonempty array of ISO weekday integers: Monday=1 through Sunday=7. |
| `hours` | `null` when unknown, otherwise `{ "start": "HH:mm", "end": "HH:mm" }` using 24-hour time. Start and end cannot be equal. |
| `scheduleLabel` | String, 1–200 characters, describing the actual redemption schedule. |
| `excludePublicHolidays` | Boolean. |
| `holidayDates` | Array of valid `YYYY-MM-DD` strings, maximum 100. Use an empty array if no holiday exclusions apply. |
| `holidayCalendarThrough` | Valid date or `null`. When excluding public holidays, verified calendar coverage must reach at least the offer end date. |
| `outlets` | 1–500 confirmed outlet objects, defined below. |
| `sources` | 1–30 objects `{ "label": string, "url": string }`. Label: 1–100 characters. URL: HTTPS `t.me` post URL with pathname `/sgfooddeals/<digits>` or `/tastesoulsg/<digits>`. |
| `verifiedAt` | UTC ISO datetime ending in `Z`, or `null`. Verification must be present before automatic publication. Candidate approval sets the final verification time server-side after validation. |
| `reviewDueAt` | UTC ISO datetime ending in `Z`, or `null`. Unknown expiry is assigned a review date during processing. |
| `status` | `published`, `needs_review` or `withdrawn`. Server/pipeline rules govern the final state. |
| `revision` | Positive integer. Existing-offer corrections require the current expected revision. |

### Outlet object

| Field | Type / constraints |
| --- | --- |
| `id` | Valid UUID. Reuse only for the same verified outlet identity. |
| `name` | Branch name, 1–200 characters. |
| `address` | Full address including unit where known, 1–500 characters. |
| `lat` | JSON number, 1.15–1.5. |
| `lng` | JSON number, 103.6–104.1. |
| `evidence` | Participation/location evidence, 1–2,000 characters. A coordinate alone does not prove participation. |
| `verifiedAt` | UTC ISO datetime ending in `Z`. |

The database rejects attempts to move an existing outlet ID to different coordinates/address. A new or different branch needs its own identity and evidence. “All outlets” or “selected outlets” is not an outlet object; establish the participating branches before publishing pins.

### Time and publication rules

- Evaluate dates and schedules in **Asia/Singapore**.
- Date-only end dates are inclusive until local midnight. Future, expired, withdrawn and unverified-validity offers stay off the default map.
- Hour windows have an exclusive closing time. End earlier than start means overnight; weekdays apply to the starting day. Holiday exclusions apply to the actual redemption day. The overall end date still ends at midnight, even for an overnight window.
- Unknown hours do not mean “available now”. Unknown expiry does not mean an indefinitely valid offer.
- End dates alone do not prove every day/time is redeemable; preserve schedules and last-order cutoffs.

## 6. Validation and responses

| HTTP status | Meaning |
| --- | --- |
| 200 | Operation succeeded; inspect the returned result. |
| 207 | Source import had mixed per-source outcomes. |
| 400 | Invalid JSON, fields or publication requirements. |
| 401 / 403 | Missing/expired session or caller is not an administrator. |
| 404 | Candidate/offer unavailable. |
| 409 | Stale/already-resolved candidate, existing identity conflict or stale offer revision. |
| 413 | Request too large. |
| 503 | Dependency/database/service failure. |

The generated JSON Schemas capture the structural contract. Zod custom checks, source uniqueness, calendar validity, source URL restrictions, window completeness and publication business rules additionally run in TypeScript. JSON Schema alone is not proof that a record can publish. Generated schemas may reject extra fields that the runtime Zod parser would strip; submit only documented fields.

Authoritative implementation: `src/ingestion/sources/approved-json.ts`, `src/domain/promotion.ts`, `src/ingestion/service.ts`, and the admin route handlers under `src/app/api/admin/`.
