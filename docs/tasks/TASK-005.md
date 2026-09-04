# TASK-005 User Management, Trainer & Participant Provisioning

TASK-005 adds a shared, one-to-one `StaffProfile` for internally provisioned Participants and Trainers.
It creates invited identities atomically with their required system role, profile, hashed invitation token,
and audit event. NIK uses AES-256-GCM encryption plus a separate HMAC fingerprint, and all normal API
responses contain only a server-masked NIK.

Trainers may provision and manage only the Participants they created. This is explicitly pre-enrollment
scope, not final training authorization. TASK-006 must add Enrollment plus Brand scope and does not begin
in this task. Curriculum, Week, Brand assignment, training duration, notifications, and password reset are
out of scope.
