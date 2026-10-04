# Schema and provider boundary

`src/ingestion/promotion-nlp/schema.ts` exports strict Zod input/output schemas and vendor-independent JSON Schema. The extraction envelope requires classification plus all thirteen fact fields. Classification also carries a quote; definite promotion/non-promotion requires a quote, while uncertain may have null support. Other fields use `{value: T | null, quote: string | null}`. Empty strings/list items are treated as absent. Unknowns can be null or empty arrays. Extra keys and unsupported enums reject the entire response.

Existing semantics are retained: dates YYYY-MM-DD, weekdays Monday=1 through Sunday=7, a single textual HH:mm–HH:mm (or hyphen/to) hour range, and all_outlets/selected_outlets/named_outlets/source_unspecified. There is no second promotion domain model and no change to DirectPromotionCandidate.

Input is plain isolated text, at most 20,000 characters. It includes sourceId, canonicalUrl, nativeId, evidenceId, selector and nullable merchantHint/titleHint; no timestamps are accepted. The prompt serializer transmits only normalized SOURCE_TEXT and explicitly labelled context hints. IDs and date-bearing URLs are provenance metadata, not semantic input. HTML rejection is a guard, not a DOM isolation verifier; adapters remain responsible for true boundaries.

`PromotionNlpProvider.extract` returns unknown at the trust boundary. Mandatory validation parses that payload. Vendor response envelopes remain in `openai-provider.ts`; domain code imports no vendor types. The hosted provider follows [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), with strict `text.format` JSON Schema and explicit refusal/incomplete-response handling. Configuration requires a server API key and an explicitly selected model; no model or credentials are invented.

Versions: promotion-nlp-schema-v1 and promotion-nlp-prompt-v1. API/schema conformance is verified with an injected HTTP transport; a real provider round trip remains unexecuted without credentials.
