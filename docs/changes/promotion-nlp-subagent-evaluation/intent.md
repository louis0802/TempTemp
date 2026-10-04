# Intent

Evaluate whether a general-purpose LLM can understand one isolated promotion text and extract supported facts without benchmark answers. This research evaluates **Codex gpt-6-luna subagent semantic capability**, not production OpenAI API model reliability.

Run the existing 49 reviewed cases once each in 49 fresh contexts. Use only explicit source facts, preserve first responses, and measure classification, field extraction, validator effectiveness, and critical campaign association errors. Success is a complete, auditable blind run with no leakage or semantic repair; an A2 recommendation additionally requires the specified safety bar.

No hosted model API/provider calls, network acquisition, production enablement, DB operations, activation changes, merchant-adapter changes, gold changes, commit, or push. Existing dirty work must be preserved. Never substitute fixtures, a different model, reused context, or parent extraction for a failed task.
