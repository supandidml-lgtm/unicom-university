# Architecture Specification — Unicom University

## 1. Executive Summary
**Unicom University** is an enterprise-grade Learning Management System (LMS) built with a modular monorepo architecture. The platform delivers structured multi-brand employee training, video/PDF interactive learning, server-authoritative progress tracking, and grounded AI exam generation.

---

## 2. Monorepo Architecture

```text
unicom-university/
├── apps/
│   ├── web/           # Next.js 15 App Router frontend application
│   ├── api/           # NestJS RESTful API backend service
│   └── worker/        # Standalone asynchronous processing service
│
├── packages/
│   ├── ui/            # Reusable accessible enterprise UI primitives & design tokens
│   ├── types/         # Shared domain types, enums, & API contracts
│   ├── config/        # Centralized domain constants & defaults
│   └── validation/    # Zod schemas for runtime environment & data contracts
│
├── database/          # PostgreSQL relational schema blueprint & migrations
├── docs/              # Architectural, security, and developer documentation
└── .agents/rules/     # Modular Antigravity governance rules
```

---

## 3. Layer Boundaries & Data Flow

```text
Browser Client
   │ (HTTPS)
   ▼
[apps/web (Next.js 15)]
   │ (API Client /api/v1)
   ▼
[apps/api (NestJS)] ───► [PostgreSQL] (Authoritative Source of Truth)
   │
   ├─► [Redis / Job Queue]
   │          │
   │          ▼
   └──► [apps/worker] ───► [AI Provider Abstraction] (Grounded Exam Gen)
                      ───► [Media Processor] (Audio / PDF Extraction)
                      ───► [S3 Private Object Storage]
```

### Key Architectural Boundaries:
1. **Server Authority**: Frontend is strictly a presentation layer. Progress percentage, exam scoring, attempt counts, and access permissions are calculated and validated exclusively on the backend.
2. **Provider Abstraction**: AI services and Media processing are isolated behind `IAIProvider` and `IMediaProcessor` interfaces to prevent vendor lock-in.
3. **Immutability & Versioning**: Learning materials and exam definitions are versioned (`material_versions`, `exam_versions`) so that historical trainee completions are never corrupted.
