# CHANGELOG — UNICOM UNIVERSITY

All notable changes to the Unicom University platform will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-08-22 (Production Baseline Release Candidate)

### 🌟 Milestone Highlights
- **Full PRD Completion:** Successfully delivered all 20 development phases (Phase 0 to Phase 19) spanning 162 detailed technical specification sections.
- **Enterprise Cloud Deployment:** Live dual-cloud topology with Next.js 15 Web application on Vercel Singapore (`sin1`) and NestJS backend on Railway Container Infrastructure.
- **Quality Gates Passed:** 100% type-safe compilation across all monorepo workspaces, 22/22 unit & integration test suites passed, 0 lint errors, and zero critical vulnerabilities.

---

### ✨ Added (Features & Modules)
- **Authentication & RBAC (PRD §10–§18):**
  - Multi-identifier login supporting NIK (Employee ID) and official corporate email.
  - Role-Based Access Control enforcing permissions for `SUPER_ADMIN`, `TRAINER`, `SUPERVISOR`, and `STAFF` (`TECHNICIAN`, `CUSTOMER_SERVICE`, `ADMIN`).
  - Mandatory First-Login Password Change flow with strong cryptographic password policy.
  - JWT Access Token (8 hours) and Refresh Token (7 days) architecture.
- **User Management & WhatsApp Integration (PRD §8–§14):**
  - Enterprise employee provisioning modal with 3-section structured layout (Personal Info, Role & Branch/Brand Assignment, Security Credentials).
  - 1-Click direct WhatsApp credential dispatch (`https://wa.me/...`) and clipboard copy utility.
  - Immutable root role protection guarding Master Super Admin (`ADM001`) from accidental deactivation.
- **Multi-Brand & Multi-Branch Architecture (PRD §4–§7):**
  - Pre-seeded authoritative data for 6 brand ecosystems: *Xiaomi, Huawei, Ecovacs, Tineco, Laifen, Yoniev*.
  - Multi-branch support across Service Center Jakarta Pusat, Surabaya, Bandung, Medan, and Makassar.
- **Curriculum & Course Player (PRD §19–§35):**
  - Sequential week-by-week curriculum progression with prerequisite locking.
  - Integrated Video Player with anti-skip verification (continuous heartbeats, 98% watched segment threshold).
  - PDF SOP Document Viewer with active page tracking and exposure verification.
- **AI Exam Generation & Assessment Engine (PRD §40–§55):**
  - Deterministic AI question generator with source-grounding to official SOPs and timestamps.
  - Anti-cheating exam runner with single-attempt locking, countdown timer, and automatic grading.
  - Weighted final scoring (60% Material Completion + 40% Exam Score, 80 passing grade).
- **Role Dashboards & Real-time Analytics (PRD §60–§75):**
  - Staff Dashboard with Continue Learning widget, progress ring, and upcoming deadlines.
  - Trainer Dashboard with Cohort progress monitoring, pass-rate metrics, and at-risk trainee escalation.
  - Supervisor Dashboard with branch-scoped progress analytics and employee pass/fail status.
  - Super Admin Dashboard with system health metrics and tenant-wide configuration controls.
- **Audit Logging & Activity Events (PRD §80–§89):**
  - Append-only audit trail recording user logins, role changes, course completions, and exam submissions with IP and timestamp metadata.
- **Security & Caching Hardening:**
  - Strict `Cache-Control: no-store, no-cache, must-revalidate, max-age=0` headers across all endpoints.
  - 1-Click *"Bersihkan Cache & Reset Browser"* utility on the login interface.

---

### 🔒 Security Hardening
- Implemented rate limiting and helmet security headers on backend API.
- Verified IDOR and Broken Access Control protections preventing unauthorized cross-branch or cross-role data access.
- Enforced Bcrypt 10-round password hashing for all user credentials.

---

### 📦 Workspaces in Monorepo
- `apps/web`: Next.js 15 React 19 Client with Tailwind CSS v4 and Phosphor/Lucide Icons.
- `apps/api`: NestJS 11 Core Backend API with Express, JWT, and Passport.
- `apps/worker`: Node.js Background Task Processor for AI Question Generation and PDF analysis.
- `packages/types`: Shared TypeScript interfaces and Enums.
- `packages/validation`: Zod schemas and validation rules.
- `packages/ui`: Shared design system components (Table, Modal, Button, Badge, Input, Select).
- `packages/config`: Centralized environment configurations and constants.
