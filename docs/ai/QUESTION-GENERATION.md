# AI Question Generation

TASK-012 adds AI-assisted authoring only. The provider receives only selected, READY learning-source chunks
from the exact Draft CurriculumVersion of a Draft Exam. It never receives Participant profiles, NIK, phone
numbers, authentication data, progress, attempts, scores, or unrelated Materials.

`AI_PROVIDER=disabled` is the safe default. It creates a safe failed job with `AI_DISABLED` and makes no
external request. `openai_compatible` requires `AI_API_KEY` and `AI_BASE_URL`; neither is logged or stored
in the database. `test_fake` is permitted only under `NODE_ENV=test` for deterministic CI coverage.

The worker claims queued jobs and processes bounded source chunks. PDF chunks retain a page number; DOCX
chunks retain paragraph/section labels; XLSX chunks retain a sheet/range locator. Video uses fixed, no-shell
FFmpeg audio-extraction arguments with a time cap, then the configured transcription endpoint returns
timestamped segments. CI uses a deterministic transcript fixture. Image input is capability gated; because
the current adapter has no reviewed visual-analysis capability, images are safely marked unsupported rather
than being sent or given fabricated OCR text. Extracted chunks are reused only for the immutable READY
`FileAsset` and extractor version, so a Draft file replacement receives a new extraction.

Source content is delimited as untrusted data in the prompt. Instructions found inside Material files cannot
change permissions, access secrets, execute tools, or alter database behavior. Provider responses are also
untrusted: structural validation enforces supported objective types, option rules, unique prompts, and source
chunk ownership before persistence.

Every accepted result has `origin=AI_GENERATED`, `status=DRAFT`, and at least one `QuestionSourceReference`.
Human reviewers inspect the evidence and explicitly approve using the normal Exam question approval flow.
Generation never publishes an Exam or Curriculum. Regeneration creates a new job and does not overwrite
manual, edited, or approved Questions.

Transient provider failures retry at most three times with bounded exponential backoff. Cancellation wins over
late provider results. Limits apply to questions per job, source characters, active jobs per author, requests
per minute, worker concurrency, and provider timeout. Enabling an external provider transmits only the
explicitly selected learning-source chunks to that configured provider; confidential-material owners must
make that deployment decision deliberately.

TASK-010 remains the only scorer. Exam submissions never invoke an AI provider, and generation never updates
Material progress, Exam attempts, Enrollment lifecycle, score, or pass/fail state.
