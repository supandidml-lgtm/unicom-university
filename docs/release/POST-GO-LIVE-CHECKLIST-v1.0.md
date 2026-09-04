# Post-go-live checklist — Version 1.0

Status: **PENDING — execute only after an approved production deployment.**

## T+15 minutes

- [ ] Confirm production Web, API, and worker readiness endpoints.
- [ ] Confirm the release artifact digest and deployed source commit match the approved RC.
- [ ] Confirm structured error rate, latency, queue health, and database/Redis connectivity.
- [ ] Confirm transactional-email and malware-scanning health without exposing secrets.

## T+1 hour

- [ ] Review authentication, authorization-denial, upload, assessment, certificate, and worker failures.
- [ ] Confirm backup completion and retention policy in the production backup destination.
- [ ] Confirm no P0/P1 incident and that operational alerts route to the on-call owner.

## T+24 hours

- [ ] Review business metrics and representative Super Administrator, Trainer, and Participant flows.
- [ ] Review audit logs and security alerts for anomalous access without exposing PII.
- [ ] Record incidents, support requests, remediation owner, and customer communication if needed.
- [ ] Close hypercare only with business and operations acknowledgement.
