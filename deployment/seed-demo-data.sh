#!/usr/bin/env bash
# ============================================================
# Whisper Mart — run this after `docker compose up -d --build`
# to load demo data. Database migrations run automatically every
# time the backend container starts (see backend/docker-entrypoint.sh),
# so there's no separate migration step needed here.
# Usage: bash deployment/seed-demo-data.sh
# ============================================================
set -euo pipefail

echo "==> Waiting for backend container to be healthy..."
until [ "$(docker inspect -f '{{.State.Health.Status}}' whisper-mart-backend 2>/dev/null)" == "healthy" ]; do
  sleep 2
  echo "   ...still waiting"
done

echo "==> Seeding demo data"
docker compose exec backend python seed.py

echo "==> Done! Demo accounts:"
echo "   Admin:    admin@wm-demo.example.com / Admin@123"
echo "   Seller:   seller@wm-demo.example.com / Seller@123"
echo "   Customer: customer@wm-demo.example.com / Customer@123"
