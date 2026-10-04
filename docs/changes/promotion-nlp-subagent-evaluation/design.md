# Design

Add research-only tooling under scripts/research/promotion-nlp-subagent-evaluation.ts. Import the existing v1 prompt/schema and unchanged validator/scorer directly; do not import the hosted provider, fixture provider, candidate mapper, registry, persistence, acquisition, or benchmark API runner.

Prepare projects the raw benchmark into newly allocated allowlisted task objects before exporting tasks. Explicitly include id, merchantHint, titleHint=null, and SOURCE_TEXT; use the same normalization as v1. Case identity is never inferred from model output. Keep full source-evidence metadata local for validation only after extraction.

The Codex tool orchestrator launches at most four active agents, always fork_context=false and model=gpt-6-luna, with the same reasoning configuration. Prompts prohibit tools, repository reads, browsing, and filesystem edits; tasks perform source-only JSON extraction. Close completed agents to release concurrency slots. No task gets any history or other outputs. Codex capability does not provide a filesystem/tool-denial sandbox; report this limitation explicitly, and never send repo paths to extraction agents.

Research CLI phases: prepare, record, seal, score. Persist each raw response and its SHA plus sanitized input SHA using exclusive writes. Responses are strings, untouched by JSON/schema parsing. Seal the sorted raw-results.json once all attempts have terminated; incomplete results are listed explicitly. Score rereads and verifies the seal, parses JSON without repair, validates with existing validator, then reads reviewed gold. Benchmark hash must still match preparation. A duplicate identity or integrity mismatch aborts scoring.

Store local run artifacts beneath ignored .local/promotion-nlp-subagent/<run-id>/. Only allowlisted metadata is serialized, never environment variables. Record git status and protected hashes before/after. Model is explicitly requested gpt-6-luna; backend revision identity is unavailable unless exposed by Codex.

Scorer differences are gold-relative exact/list comparisons, not automatically proven hallucinations. Keep official scores unchanged; separately review source entailment and categorize normalization versus semantic failures. No readiness promotion can bypass actual critical-source review.
