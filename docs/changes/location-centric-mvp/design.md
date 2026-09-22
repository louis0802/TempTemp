# Design
Use explicit live, live_with_expired and corpus modes in the serving selector. Pages await Next.js searchParams and gate props using NODE_ENV; API routes independently gate mode and raw-source presentation. Corpus alone bypasses viewport clipping. Raw body fields are redacted in API response copies unless explicitly enabled in development; storage is untouched.

A pure client-safe grouping helper unions outlet rows sharing Place ID or coordinates rounded to six decimal places (approximately 0.11 m latitude at Singapore). This quantization only removes anchor overlap; adjacent rounding cells are distinct. Transitive matching is deterministic, with input sorted for stable keys and headings. Deduplicate by promotion ID and retain all original outlet variants for source wording. No Google venue-name field is available independently in Listing: use returned outlet name and Google formatted address where present, without inventing a venue name.

Explorer owns promotion and location selection. One native dialog swaps location rows for existing promotion detail, avoiding nested modals and retaining Escape/focus behavior. Both MapLibre and schematic consume the same groups and selection predicate. List indexes do not control pins.

No migrations, external lookups or publication changes. Rollback is this commit only. Existing minute refresh remains.


## Verification findings incorporated
- This Next.js release rejects development asset requests from unlisted origins. Added next.config.ts with localhost and 127.0.0.1 only so ordinary local inspection and the established Playwright base URL both hydrate correctly.
- Distinct nearby anchors can still overlap at a wide zoom. Multi-promotion pins have drawing priority, focused pins rise above neighbours, and map zoom/keyboard access remains available. No spatial clustering or fabricated offsets were added.
- Location rows show full promotion titles plus benefits; identical short benefit strings cannot hide the distinction between records.
- Location selection stores a key and derives current rows from refreshed groups. Marker highlighting changes classes without recreating markers. The native dialog restores the current anchor on close, including Escape after replacing its contents with promotion detail.
- Production builds run in a temporary project copy because Next rewrites next-env.d.ts. The working repository file is never written by this task.
