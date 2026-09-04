# TASK-012 — AI Question Generation, Source Grounding & Human Review

Implemented authoring scope:

- Config-driven provider abstraction with disabled-safe default, test-only deterministic provider, bounded
  question/source/job limits, and isolated background worker polling.
- Draft-only, Brand-scoped generation jobs, selected READY exact-Version Materials, cancellation, safe states,
  audit events, and immutable-asset extraction records/chunks.
- Runtime validation of untrusted structured output, objective question compatibility, source ownership,
  duplicate prevention, `AI_GENERATED` origin, mandatory evidence, and DRAFT-only persistence.
- Reviewer UI for source Material selection, count distribution, job status, cancellation, AI badge, answer
  review, and evidence locators. Normal TASK-010 explicit approval remains unchanged.

AI is never called from participant scoring/submission and cannot update learning/progress state.
