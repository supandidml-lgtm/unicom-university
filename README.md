# Unicom University

[![CI Quality Gate](https://github.com/unicom/unicom-university/actions/workflows/ci.yml/badge.svg)](https://github.com/unicom/unicom-university/actions)
[![TypeScript Strict](https://img.shields.io/badge/TypeScript-Strict-blue.svg)](https://www.typescriptlang.org/)
[![License: Private](https://img.shields.io/badge/License-Private-red.svg)](#)

> Enterprise Web-Based Learning Management System for Internal Training, Interactive Media Learning, Server-Authoritative Progress Tracking, and Grounded AI Exam Generation.

---

## 🏛️ Monorepo Structure

```text
unicom-university/
├── apps/
│   ├── web/           # Next.js 15 App Router Frontend
│   ├── api/           # NestJS 11 Backend REST API
│   └── worker/        # Standalone Background Processing Worker
│
├── packages/
│   ├── ui/            # Enterprise UI Primitives & Design Tokens
│   ├── types/         # Shared Domain Types & API Contracts
│   ├── config/        # Centralized Domain Defaults & Formulas
│   └── validation/    # Runtime Zod Environment & Payload Schemas
│
├── database/          # PostgreSQL Schema Blueprint & Migrations
├── docs/              # Architecture, Security, & Developer Docs
└── .agents/rules/     # Modular Antigravity Rules & Guidelines
```

---

## 🚀 Quick Start

```bash
# 1. Install all dependencies across monorepo
npm install

# 2. Setup environment variables
cp .env.example .env

# 3. Build shared packages
npm run build

# 4. Run tests
npm run test

# 5. Start development servers (Web, API, Worker)
npm run dev
```

---

## 🛡️ Quality Gate & Verification

```bash
# Run ESLint across all workspaces
npm run lint

# Run strict TypeScript typechecks
npm run typecheck

# Run unit test suites
npm run test

# Run production build
npm run build
```

---

## 📚 Documentation
- [Architecture Blueprint](docs/ARCHITECTURE.md)
- [Environment Variables](docs/ENV_VARS.md)
- [Getting Started Guide](docs/GETTING_STARTED.md)
- [Development Guidelines](docs/DEVELOPMENT_GUIDELINES.md)
- [Security Architecture](docs/SECURITY.md)

---
*Unicom University — Internal Enterprise Learning Platform.*
