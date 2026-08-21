# Unicom University — AI Exam Rule

Read `00-master.md`, `01-architecture.md`, `03-backend.md`, `06-security.md`, and the MASTER PRD first.

AI-generated exams must be **grounded in uploaded training material**.

AI may assist question generation. It must not invent company SOP or policy.

## Provider Abstraction

Use an application-owned `AIProvider`/equivalent interface.

Do not scatter one vendor SDK across the LMS.

Provider-specific code belongs in adapters.

The system must be able to replace AI providers without redesigning the training/exam domain.

## Generation Timing

Generate exam/question candidates when material is published or updated, not only when a learner finishes a course.

Learners should not normally wait for AI generation after completing training.

If generation is not ready, expose an explicit state rather than fake questions.

## Async Pipeline

Use background jobs for AI/media processing.

Typical PDF flow:

`upload -> validate -> extract -> normalize -> chunk -> generate -> ground -> validate -> version -> ready`

Typical video flow:

`upload -> validate -> transcript -> normalize -> chunk -> generate -> ground -> validate -> version -> ready`

Do not block normal API requests for long processing.

## Source Extraction

PDF processing should preserve enough source location metadata to identify:

- material;
- material version;
- page;
- chunk/section.

Video processing should preserve:

- material;
- material version;
- transcript chunk;
- timestamp range where possible.

## Grounding Requirement

Every generated question accepted into an exam must have source evidence.

Store a reference such as:

- `material_id`;
- `material_version`;
- `source_chunk_id`;
- `page_number`;
- `timestamp_start`;
- `timestamp_end`.

Fields vary by media type.

If the answer cannot be supported from the source:

`DO NOT GENERATE`

or reject the candidate.

## Hallucination Policy

The model must not use general knowledge to invent:

- warranty rules;
- repair SOP;
- company policy;
- internal system process;
- brand-specific procedure;

unless that information exists in the approved source material.

Insufficient source must produce a controlled status such as:

`INSUFFICIENT_SOURCE`

not a fabricated question.

## MVP Question Types

Support first:

- `MULTIPLE_CHOICE`;
- `MULTIPLE_ANSWER`;
- `TRUE_FALSE`.

Essay/case-study may be future extensions.

Do not silently add AI essay grading to MVP unless explicitly requested by a later approved phase.

## Question Configuration

Support configurable:

- question count;
- passing score;
- attempt limit;
- randomize questions;
- randomize options;
- difficulty distribution;
- question types;
- duration.

Default difficulty if not otherwise configured:

- Easy 20%;
- Medium 50%;
- Hard 30%.

Configuration must be persisted/centralized, not hardcoded across UI and backend.

## Question Validation

Before a generated question becomes learner-visible, validate:

- answer is supported by source;
- wording is understandable;
- no material contradiction;
- no duplicate/near-duplicate question;
- no answer leaked in wording;
- MCQ has exactly one correct answer;
- multi-answer has a valid correct set;
- distractors are plausible but unsupported as correct;
- question is relevant to learning objectives/material.

Reject malformed candidates.

## Confidence

If generation/validation confidence is below the approved threshold:

- `REJECT`, or
- `REVIEW_REQUIRED`.

Do not automatically publish low-confidence content merely to satisfy requested question count.

It is better to produce fewer valid questions than fabricate enough questions.

## Duplicate Detection

Detect exact and meaningful semantic duplicates within an exam/question bank.

Do not generate several cosmetic rewrites of the same fact to inflate question count.

## Versioning

Material updates must create a new generation context/version.

Exam versions must be immutable for historical attempts.

An existing completed attempt must remain linked to the exact exam version/questions shown at submission time.

Do not regenerate old attempts.

## Randomization

Question and answer-option randomization must be server controlled.

Persist or deterministically associate the presented order with the attempt so grading remains correct.

Randomization must not modify which answers are correct.

## Correct Answer Protection

Never send correct-answer flags or internal grading keys to the learner before allowed result disclosure.

Do not hide them merely with CSS/client logic.

## Auto Grading

Objective grading is backend authoritative.

For `MULTIPLE_CHOICE`:
- grade against the authoritative correct option.

For `MULTIPLE_ANSWER`:
- use an explicitly defined exact/partial-credit policy.
- MVP should default to a deterministic policy documented in the exam configuration/domain.

For `TRUE_FALSE`:
- grade against authoritative answer.

Frontend must not finalize score.

## Attempt Integrity

Each attempt stores:

- learner;
- exam;
- exam version;
- presented question set/order as needed;
- start;
- submit;
- answers;
- score;
- pass/fail;
- attempt number.

Final submission must be idempotent.

## Passing

Passing score is configurable 0–100.

Pass/fail calculation occurs server-side.

Exam Completion and Exam Score are different metrics.

## Retry and Failure

AI provider errors must have controlled job behavior:

- retry with bounded backoff where safe;
- preserve failure reason;
- avoid duplicate exam versions;
- expose job status to authorized admins.

Do not retry indefinitely.

## Security and Privacy

Do not send unnecessary user data to AI providers.

Generation should use the minimum required training content.

Do not include:

- passwords;
- authentication tokens;
- unrelated employee personal data;
- secrets.

Follow provider data handling requirements selected by the deployment/security architecture.

## Cost and Resource Controls

Prevent accidental repeated generation.

Use:

- idempotent generation requests;
- job deduplication;
- authorized generation endpoints;
- limits/quotas where appropriate.

A page refresh must not trigger another expensive AI generation job.

## Required Tests

At minimum test:

- valid grounded PDF question generation;
- valid grounded video/transcript generation;
- insufficient source;
- provider failure;
- retry;
- low-confidence rejection;
- duplicate detection;
- source reference persistence;
- material version linkage;
- exam version immutability;
- no correct answers leaked pre-submit;
- grading correctness;
- randomization integrity;
- duplicate final submit;
- unauthorized generation request.

AI Exam work is not complete when text appears on screen; grounding, validation, persistence, grading, security, and version integrity must all pass.
