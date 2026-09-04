# UNICOM UNIVERSITY

Enterprise learning-management platform for internal training. This repository contains only the engineering foundation; business modules are introduced through approved tasks.

## Architecture

The platform is a pnpm/Turborepo modular monolith. `apps/web` is the Next.js App Router interface, `apps/api` is the NestJS HTTP API, and `apps/worker` hosts future asynchronous processing. Shared packages remain focused by responsibility. See [architecture documentation](docs/architecture/ARCHITECTURE.md).

## Prerequisites

- Node.js 24.19.0 (see `.nvmrc`)
- pnpm 11.19.0
- Docker Desktop with Docker Compose

## Install and start

Run `pnpm install`, copy `.env.example` to `.env`, then run `docker compose up -d`, `pnpm db:generate`, and `pnpm db:migrate`. Start applications with `pnpm dev`.

- Web: `http://localhost:3000`
- API: `http://localhost:4000`
- API health: `http://localhost:4000/health`

The `change-me-local` values in `.env.example` are development placeholders, never production credentials.

## Quality commands

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm format:check` run from the repository root.

## Database commands

`pnpm db:generate`, `pnpm db:migrate`, `pnpm db:seed`, and `pnpm db:studio` run the Prisma utilities.

## Super Administrator bootstrap

After migrations and `pnpm db:seed`, create the first administrator only through the explicit bootstrap
command. It never runs on application startup and has no default credentials. Supply
`ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD`, and `ADMIN_BOOTSTRAP_CONFIRM_PASSWORD` through
your secure shell/session, then run `pnpm admin:bootstrap`. In production, also set
`ADMIN_BOOTSTRAP_CONFIRM=BOOTSTRAP_SUPER_ADMIN`. The command aborts if any Super Administrator already
exists and never prints the password.

## Development rules

Read [AGENTS.md](AGENTS.md) and its referenced documents. Keep TypeScript strict, validate all external input, preserve backend source-of-truth rules, and pass quality checks before submitting changes.

# UNICOM UNIVERSITY

## Local authentication verification

Start local PostgreSQL and Redis with `docker compose up -d`, then apply the authentication migration with `pnpm db:migrate`. API integration tests use the isolated `unicom_test` database and the `auth:login:test:*` Redis key namespace. Create that local test database once with `docker compose exec -T postgres createdb -U unicom_app unicom_test`, then apply migrations using the test `DATABASE_URL` documented in CI.

Authentication settings are validated from `.env`; copy `.env.example` for local setup and replace the rate-limit-secret placeholder. Do not use local development credentials in production.
