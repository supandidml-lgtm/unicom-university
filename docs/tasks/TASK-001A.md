# TASK-001A — Infrastructure Verification & Closure

**Priority:** P0 — Critical

## Objective

Memverifikasi runtime infrastructure TASK-001 pada environment local: Docker Compose, PostgreSQL, Redis, Prisma connectivity, serta startup aplikasi. Task ini tidak menambah fitur bisnis dan tidak mengubah schema domain.

## Scope

- Pastikan Docker Desktop tersedia dan daemon berjalan.
- Salin `.env.example` menjadi `.env`, lalu ubah hanya credential development lokal bila diperlukan.
- Jalankan `docker compose up -d` dan verifikasi service `postgres` serta `redis` berstatus healthy.
- Jalankan `pnpm db:generate` dan `pnpm db:migrate`.
- Verifikasi konektivitas Prisma ke PostgreSQL melalui migrasi tanpa membuat migration kosong.
- Jalankan `pnpm dev`, buka web foundation di `http://localhost:3000`, dan panggil `GET http://localhost:4000/health`.
- Jalankan ulang quality gate: `pnpm lint`, `pnpm typecheck`, `pnpm test`, dan `pnpm build`.

## Explicitly Out of Scope

- Business entity atau migration domain.
- Authentication, authorization, user management, curriculum, progress, exams, AI, dan fitur produk lainnya.
- Perubahan arsitektur atau penambahan dependency, kecuali diperlukan untuk memperbaiki kegagalan runtime infrastructure yang terbukti.

## Acceptance Criteria

1. `docker compose up -d` selesai tanpa error.
2. PostgreSQL dan Redis melaporkan health `healthy`.
3. `pnpm db:generate` berhasil.
4. `pnpm db:migrate` berhasil terhadap database development lokal.
5. Web, API, dan worker dapat boot dengan konfigurasi `.env` yang valid.
6. `GET /health` mengembalikan HTTP 200 dan request ID.
7. `pnpm lint`, `pnpm typecheck`, `pnpm test`, dan `pnpm build` semuanya PASS.
8. Tidak ada secret development yang ter-commit.

## Closure Rule

TASK-001 dinyatakan closed setelah seluruh acceptance criteria TASK-001A terpenuhi. Git author identity dan tidak adanya migration kosong bukan blocker untuk closure engineering.
