#!/usr/bin/env bash
# ==============================================================================
# Unicom University — Zero-Downtime Deployment & Update Script
# ==============================================================================

set -euo pipefail

echo "🚀 Deploying latest updates for Unicom University..."

APP_DIR="${1:-/opt/unicom-university}"
cd "$APP_DIR"

echo "📥 Pulling latest commits from GitHub..."
git pull origin main || git pull origin master

echo "🐳 Rebuilding and updating Docker containers..."
docker compose build --pull
docker compose up -d --remove-orphans

echo "🧹 Cleaning up dangling images..."
docker image prune -f

echo "🩺 Verifying container health status..."
sleep 5
docker compose ps

echo "✅ Deployment completed successfully!"
