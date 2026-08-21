# Multi-stage Dockerfile for @unicom/worker
FROM node:22-alpine AS base
WORKDIR /app
RUN npm install -g turbo

FROM base AS builder
WORKDIR /app
COPY . .
RUN npm ci
RUN turbo run build --filter=@unicom/worker...

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/worker ./apps/worker

WORKDIR /app/apps/worker
CMD ["node", "dist/index.js"]
