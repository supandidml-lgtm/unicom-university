# UNICOM UNIVERSITY Engineering Instructions

Read before modifying code:

- `docs/product/PRD.md`
- `docs/architecture/ARCHITECTURE.md`
- `docs/security/SECURITY.md`
- `docs/testing/TEST-STRATEGY.md`

Core rules:

1. TypeScript strict mode is mandatory.
2. Never bypass backend authorization.
3. Never store secrets in source code.
4. Never trust client-provided progress or score.
5. Every API mutation requires validation.
6. Every database change must use migrations.
7. Never modify production resources directly.
8. Security-sensitive actions require tests.
9. Do not introduce dependencies without need.
10. Run lint, typecheck, test, and build before declaring a task complete.
11. Every new protected business operation must declare and enforce a server-side permission.
12. Never authorize based only on frontend visibility or client-provided roles/permissions.
13. Every Brand-owned entity must enforce both the relevant RBAC permission and Brand scope unless the centralized Super Administrator bypass applies.
14. Never authorize Brand access from frontend selection or a submitted Brand ID alone.
15. Never log raw NIK or expose encrypted PII fields in API DTOs/responses.
16. Participant provisioning assigns only `TRAINEE`; Trainer provisioning assigns only `TRAINER`; clients never select privileged roles.
17. User identity provisioning and Training Enrollment are separate domains. Trainer ownership is temporary pre-enrollment scope and never replaces Enrollment plus Brand authorization.
18. Material upload must validate content, not merely its submitted extension or MIME type; private storage keys and physical paths never leave API-owned code.
19. Material and asset references in Published or Retired curriculum versions are immutable. Participant content access must follow the exact version bound to that participant's Enrollment and does not imply completion.
20. Never trust a filename extension or declared MIME type alone; private file access must be authorized server-side and never expose a storage key/path.
21. Published or retired Material and FileAsset references are immutable. Participant file/content access requires the exact own Enrollment binding and never marks learning completion.
22. Never trust browser-submitted completion, percent, duration, page total, dwell, or seek position; Learning progress is derived and persisted by the server.
23. File streaming and byte-range requests must never update learning progress. Video seek is not verified watch coverage.
24. Learning progress is scoped only to the exact TrainingEnrollment plus LearningMaterial; it is monotonic, completion is immutable, and TASK-009 does not introduce overall training progress.
25. High-volume valid learning telemetry is compact verification state, not an audit-event stream. Never log activity-session IDs or raw heartbeat bodies.
26. Never expose correct answers, answer keys, or correctness feedback to a participant before final submission.
27. Exam score, pass/fail, and objective correctness are deterministic server-side calculations; client values are never authoritative.
28. Every ExamAttempt uses an immutable server-side question/option snapshot and must be scoped to the exact own Enrollment and bound CurriculumVersion.
29. Exam start material gating uses only server-verified `LearningMaterialProgress.COMPLETED`; no AI scoring or AI question generation belongs in the assessment path.
30. Training progress is derived server-side from the exact Enrollment CurriculumVersion, material progress, and server-scored Exam attempts; never accept client authoritative progress or completion.
31. Overall progress uses `REQUIREMENT_UNIT_V1`; Exam score and Exam progress are separate, and multi-Brand Enrollment histories never merge.
32. A failed Exam does not fail an Enrollment while a legal retry remains; completed Enrollment state is immutable without a future explicit administrative workflow.
33. AI output is untrusted: AI-generated questions always start `DRAFT`, require valid source evidence, and are never auto-approved or auto-published.
34. Never use AI for deterministic objective scoring or send Participant PII, attempts, scores, cookies, tokens, or instructions embedded in Material content to a question-generation provider.
35. AI authoring must enforce server-side Exam/Curriculum/Brand authorization; CI uses deterministic fake providers and never paid external AI calls.
36. Reports are projections, never a second source of truth: reuse TASK-011 progress and TASK-010 submitted results.
37. Trainer reports and exports must query with server-side active Brand scope; never export raw NIK, answer keys, or private storage data.
38. Spreadsheet exports must neutralize values beginning with =, +, -, or @ and remain authenticated/private.
39. Certificates derive only from canonical completed Enrollments, are one-to-one and immutable snapshots, and must never change progress, score, or lifecycle.
40. Certificate PDFs remain private, omit NIK and scores, and require current server-side ownership or Brand authorization; public verification and share links are prohibited.

Task-specific requirements belong in `docs/tasks/`.

## UI/UX implementation guidance

- Use shared UI primitives before creating new page-specific variants.
- UI visibility never replaces backend authorization or Brand scope enforcement.
- Do not recalculate canonical progress or score in the client.
- Every asynchronous screen needs loading, empty, and safe error states.
- Every destructive action needs explicit confirmation that explains its impact.
- Mobile and keyboard access are mandatory; preserve focus management and visible focus states.
- Never expose sensitive tokens, PII, private storage details, or answer keys in UI.
- Keep role and product terminology consistent with `docs/product/UI-UX-GUIDELINES.md`.
