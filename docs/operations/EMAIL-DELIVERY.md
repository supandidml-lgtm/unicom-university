# Transactional email delivery

`EMAIL_PROVIDER` supports `disabled`, `test`, and `smtp`. Disabled mode leaves the LMS usable and marks a queued
delivery `DISABLED`; it never reports success. Test mode uses an in-memory deterministic test inbox and is rejected
in production. SMTP mode requires `EMAIL_FROM_ADDRESS`, `SMTP_HOST`, `SMTP_USERNAME`, and `SMTP_PASSWORD`; none of
these values may be logged.

Delivery is performed by the worker from `NotificationDelivery`. The record contains delivery metadata, template
version, a safe correlation ID, retry state, and a safe failure code; it does not contain an invitation or reset
token. Retriable failures use bounded exponential retry. Permanent failures and exhausted attempts become `FAILED`
without rolling back identity, assignment, progress, or assessment state.

Invitation resend revokes prior unused invitation tokens and is protected by
`AUTH_INVITATION_RESEND_COOLDOWN_SECONDS`. Templates provide plain text and HTML; HTML is escaped and email headers
reject CR/LF injection. Normal API responses and the staff UI expose delivery status only, never activation URLs.
