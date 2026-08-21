# Multi-stage Dockerfile for @unicom/api
FROM node:22-alpine AS base
WORKDIR /app
RUN npm install -g turbo

FROM base AS builder
WORKDIR /app
COPY . .
RUN npm ci
RUN turbo run build --filter=@unicom/api...

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api ./apps/api

WORKDIR /app/apps/api
EXPOSE 4000
CMD ["node", "dist/main.js"]
