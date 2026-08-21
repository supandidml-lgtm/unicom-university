# Security Architecture — Unicom University

## Core Principles
1. **Zero Trust Client**: All client-submitted payloads (heartbeats, exam answers, role claims) are treated as untrusted until verified server-side.
2. **Role-Based Access Control (RBAC) + Resource Scoping**:
   - `SUPER_ADMIN`: Global administrative authority.
   - `TRAINER`: Management and monitoring of assigned trainees.
   - `SUPERVISOR`: Scoped read-only branch monitoring.
   - `STAFF`: Trainee access restricted exclusively to assigned courses and active exams.
3. **Security Headers**:
   - Helmet applied globally on `apps/api`.
   - Explicit CORS whitelist origin validation.
4. **Secret Management**:
   - No hardcoded passwords, JWT secrets, or provider API keys in source control.
   - All configurations loaded via strictly validated Zod environment schemas.
