# UNICOM UNIVERSITY
### Enterprise Web-Based Learning Management System (LMS)
**Version:** `1.0.0 (Production Baseline)` · **Status:** `RELEASE CANDIDATE (v1.0.0-rc.1)`

---

## 🌐 Live Production Environments

| Component | Provider / Region | Production URL |
| :--- | :--- | :--- |
| **Frontend Web App** | Vercel (`sin1` - Singapore) | [https://unicom-university-web.vercel.app](https://unicom-university-web.vercel.app) |
| **Backend API** | Railway Cloud Container | [https://unicom-university-production.up.railway.app/api/v1](https://unicom-university-production.up.railway.app/api/v1) |
| **Health Endpoint** | Railway Cloud | [https://unicom-university-production.up.railway.app/api/v1/health](https://unicom-university-production.up.railway.app/api/v1/health) |

---

## 🔑 Pre-Seeded Authoritative User Accounts

All pre-seeded test accounts use the default password: **`UnicomPassword2026!`**

| Role | Email / Username | NIK | Scope / Assigned Brands |
| :--- | :--- | :--- | :--- |
| 👑 **Super Admin** | `admin@unicom.co.id` | `ADM001` | Global Tenant (All Brands & Branches) |
| 🎓 **Trainer** | `trainer@unicom.co.id` | `TRN001` | Curriculum, Cohorts & Evaluation (Xiaomi, Huawei) |
| 👔 **Supervisor** | `supervisor.jkt@unicom.co.id` | `SPV001` | Jakarta Pusat Branch Scope |
| 🔧 **Staff (Teknisi)** | `andi.pratama@unicom.co.id` | `UC10042` | Jakarta Pusat · Xiaomi Ecosystem |
| 🎧 **Staff (CS)** | `bambang.wijaya@unicom.co.id` | `UC10043` | Surabaya Branch · Customer Service |

---

## 🏗️ Monorepo Architecture

```
Unicom-University/
├── MASTER_PRD_UNICOM_UNIVERSITY.md   # Historical Baseline V1.0 (Frozen)
├── CHANGELOG.md                      # Release changelog & version history
├── README.md                         # Project documentation & quick start
│
├── roadmap/
│   └── MASTER_PRD_UNICOM_UNIVERSITY_V1.1.md  # Future V1.1 Roadmap Specification
│
├── docs/
│   ├── ARCHITECTURE.md               # System architecture & data flow
│   ├── SECURITY.md                   # Threat model & security controls
│   ├── GETTING_STARTED.md            # Developer on-boarding guide
│   ├── OPERATIONAL_HANDOVER_RUNBOOK.md # Production runbook
│   └── product/
│       ├── USER_FEEDBACK.md          # Structured user feedback register
│       ├── BUG_BACKLOG.md            # Defect & bug tracking register
│       ├── IMPROVEMENT_BACKLOG.md    # Existing feature enhancements
│       ├── FEATURE_REQUESTS.md       # New feature proposals
│       └── V1.1_BACKLOG.md           # Prioritized V1.1 candidate epics
│
├── apps/
│   ├── web/                          # Next.js 15 App Router Frontend
│   ├── api/                          # NestJS 11 Core REST API
│   └── worker/                       # Background Worker for AI & Document Processing
│
└── packages/
    ├── types/                        # Shared TypeScript Domain Interfaces
    ├── validation/                   # Zod Validation Schemas
    ├── ui/                           # Shared Enterprise UI Component Library
    └── config/                       # Centralized Constants & Configurations
```

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- Node.js `>= 20.0.0`
- npm `>= 10.0.0`

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Servers
```bash
# Run both Frontend (port 3000) and Backend (port 4000) concurrently
npm run dev
```

### 4. Verification & Testing
```bash
# Lint code
npm run lint

# Check TypeScript types
npm run typecheck

# Run automated unit & integration tests
npm run test

# Build production bundles
npm run build
```

---

## 🔒 Security & Anti-Cheating Compliance
- **Video Anti-Skip:** Real-time heartbeats verify continuous playback with a 98% unique segment requirement before marking complete.
- **PDF Tracking:** Mandatory page-by-page exposure and dwell time calculation.
- **Exam Integrity:** Exam prerequisites require 100% material completion; single-attempt locking with automated server-side evaluation.
- **Cache Invalidation:** Strict `Cache-Control: no-store, no-cache, max-age=0` headers and 1-Click Clear Cache tools ensure zero stale sessions.

---

## 📄 License
© 2026 UNICOM Service Center. All rights reserved. Internal Enterprise Application.
