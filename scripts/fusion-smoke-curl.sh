#!/usr/bin/env bash
# Lightweight curl checklist for Fusion critical routes.
# Skips cleanly when the server is down.
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"

if ! curl -sf --max-time 2 "$BASE_URL/api/health" >/dev/null 2>&1; then
  echo "SKIP: no server at $BASE_URL (start npm run dev to run smoke curls)"
  exit 0
fi

echo "Fusion smoke curls against $BASE_URL"
code=$(curl -sS -o /tmp/fusion-health.json -w "%{http_code}" "$BASE_URL/api/health")
echo "GET /api/health → $code"
cat /tmp/fusion-health.json
echo
echo "Documented route inventory:"
npx tsx scripts/fusion-smoke-routes.ts | tail -5
echo
echo "Full curl list:"
npx tsx scripts/fusion-smoke-routes.ts --curl
