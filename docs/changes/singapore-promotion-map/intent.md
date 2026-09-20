# Intent: Singapore promotion map

Status: Implementation authorised on 16 September 2026. Deployment and recurring collection remain out of scope.

## Problem and audience
People in Singapore discover store promotions across Telegram channels but must separately establish where offers apply, whether they are still valid, and how to get there.

## Desired outcome
A mobile-friendly web application lets a visitor find nearby promotions, understand redemption conditions, inspect participating outlets, and open directions or the original source.

## Initial scope
- Singapore only.
- Initial sources selected by the user: [SG Food Deals](https://t.me/sgfooddeals) and [TasteSoul](https://t.me/tastesoulsg).
- Food and beverage is the proposed initial category, based on these sources; wider retail coverage is deferred.
- Prioritise accurate outlet participation, clear validity, and source attribution.
- Start with ongoing promotions, then check both channels hourly for new messages since each channel’s last successful check. Store results in the database and show eligible promotions on the map automatically.

## Success measures
- Every published map location has confirmed outlet participation and a source reference.
- Expired offers do not appear among active offers.
- Under healthy operation, new messages are collected on the next hourly run; successfully validated ongoing promotions become available to map queries after processing. Review exceptions may take longer.
- Visitors can find an offer, understand conditions, and open directions without creating an account.
- Pilot review records listing accuracy, freshness, and administrator time per listing. Quantitative targets remain to be set after sampling.

## Constraints and exclusions
Public viewing of both selected channels is verified through their public preview pages without login or channel administrator access. Automated ingestion and permitted reuse remain separate decisions. Do not assume AI processing of Telegram content is permitted.

The first version excludes payments, loyalty programmes, personalisation, notifications, and consumer accounts. No recurring collection job or deployment is authorised by these planning documents.

## Closed clarification: public source viewing
Public viewing is verified for both channels. The earlier login screen applied to Telegram Web links, not their public previews. Administrator versus subscriber access is not a prerequisite for viewing and is no longer an open access issue.

## Decisions still open
Public-preview source access is implemented following the user instruction to proceed; permitted reuse and production map/hosting commitments remain to be confirmed before launch. The user requested configurable history depth and unknown-expiry review policy; implementation defaults are 30 and 7 days. Hourly checking and an ongoing-promotions-first launch are decided. Channel-owner cooperation only needs investigation if a channel bot is selected.

Next: [Specification](spec.md).

## Implementation scope boundary
Build the local application and provider integrations now. Demonstration data is synthetic and visibly labelled. Do not activate Telegram scraping while source-route feasibility and reuse remain unresolved. Support explicit approved JSON imports as a testable adapter contract; this does not establish production channel coverage. No paid services, deployment, or recurring jobs are created.

## Local delivery
The user requested Docker because provider accounts are not set up. Local PostgreSQL/PostGIS and Supabase Auth are implemented through Docker Compose. Consumer discovery runs with explicit synthetic demo data until approved real data and map configuration are available. The intended live-channel outcome remains gated, not declared complete.

## Follow-on delivery — remaining local features
The user requested the remaining features. Reduce dependence on paid configuration for local map browsing, make curator work usable without editing JSON, and extend the local ingestion/validity pipeline. Live collection still depends on a selected authorised source route; production deployment, service purchases and enabling a recurring job are not implied by this request.

### Source-scope update
When asked about an approved route, the user instructed “just do it.” Proceed with implementing and validating the public-preview collection route using ordinary unauthenticated access. This is implementation authorisation, not evidence of publisher cooperation or a guarantee of complete source coverage. No login/challenge bypass or AI enrichment is part of the collector.

## Follow-on outcome
Public-preview ingestion now runs locally on demand and has imported 140 source posts. The incremental replay stored zero duplicate posts. Raw records remain under review, so the visitor preview remains explicitly fictional until real offers are verified. Real OpenStreetMap browsing, structured curator forms, pagination, overnight schedules, approved upload and an optional (stopped) hourly worker are delivered. No cloud resources or recurring process were enabled.
