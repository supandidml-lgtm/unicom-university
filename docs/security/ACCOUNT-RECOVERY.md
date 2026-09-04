# Account recovery

Password recovery accepts an email address but always returns the same `202` response for unknown, invited,
disabled, suspended, and active accounts. Only an `ACTIVE` account queues recovery delivery. Redis enforces
HMAC-derived per-identifier and per-IP limits; Redis unavailability fails closed.

Reset tokens are generated with Node `randomBytes(32)`, are sent only in the transactional email body, and are
stored solely as SHA-256 hashes. They expire according to `AUTH_PASSWORD_RESET_TTL_MINUTES`; a later issued token
revokes all earlier unused tokens. A reset transaction consumes one token once, stores the Argon2id password hash,
revokes every active session, and revokes any remaining reset tokens. Raw tokens, URLs, passwords, cookies, and
provider credentials must never be logged or included in audit metadata.

All activation and reset links are built from `WEB_PUBLIC_URL`; request Host, Origin, `returnTo`, `redirectUrl`,
and `next` are never trusted.
