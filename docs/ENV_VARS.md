# Environment Variables Reference — Unicom University

All environment variables are validated at startup using Zod schemas in `@unicom/validation`.

| Variable | Scope | Type | Default | Description |
|---|---|---|---|---|
| `NODE_ENV` | Global | string | `development` | Application environment (`development`, `test`, `staging`, `production`) |
| `PORT` | API | number | `4000` | HTTP port for NestJS backend API |
| `WEB_PORT` | Web | number | `3000` | HTTP port for Next.js web application |
| `WORKER_PORT` | Worker | number | `4001` | Port/identifier for Worker service |
| `NEXT_PUBLIC_APP_URL` | Web | string (URL) | `http://localhost:3000` | Base public URL of frontend web app |
| `NEXT_PUBLIC_API_URL` | Web | string (URL) | `http://localhost:4000/api/v1` | Public API base URL for client requests |
| `DATABASE_URL` | API/Worker | string (URL) | - | Full PostgreSQL connection string |
| `DATABASE_HOST` | API | string | `localhost` | PostgreSQL host |
| `DATABASE_PORT` | API | number | `5432` | PostgreSQL port |
| `DATABASE_NAME` | API | string | `unicom_university` | Database name |
| `REDIS_URL` | API/Worker | string (URL) | `redis://localhost:6379/0` | Redis connection URL for caching/queues |
| `JWT_SECRET` | API | string | - | Min 32-char secret for JWT authentication |
| `SESSION_SECRET` | API | string | - | Min 32-char secret for session encryption |
| `CORS_ALLOWED_ORIGINS` | API | string (list) | `http://localhost:3000` | Comma-separated allowed CORS origins |
| `STORAGE_DRIVER` | Worker | string | `local` | Storage driver (`local` or `s3`) |
| `STORAGE_BUCKET` | Worker | string | `unicom-materials` | S3 bucket name for private uploads |
| `AI_PROVIDER` | Worker | string | `mock` | AI Provider adapter (`mock`, `gemini`, `openai`, `anthropic`) |
| `AI_API_KEY` | Worker | string | - | Secret API key for AI provider |
