#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_NAME="pocket-ledger-privacy-smoke"
COMPOSE_FILES=(-f compose.yaml -f compose.e2e.yaml)
export BACKEND_PORT="${BACKEND_PORT:-8012}"
export FRONTEND_PORT="${FRONTEND_PORT:-3002}"
export NEXT_PUBLIC_API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL:-http://127.0.0.1:${BACKEND_PORT}}"

cd "$ROOT_DIR"

if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon is not reachable without sudo." >&2
  exit 1
fi

cleanup() {
  local exit_code=$?
  if [ "$exit_code" -ne 0 ]; then
    docker compose -p "$PROJECT_NAME" "${COMPOSE_FILES[@]}" logs --tail=300 || true
  fi
  if [ "${KEEP_PRIVACY_SMOKE_STACK:-0}" != "1" ]; then
    docker compose -p "$PROJECT_NAME" "${COMPOSE_FILES[@]}" down -v --remove-orphans >/dev/null 2>&1 || true
  else
    echo "KEEP_PRIVACY_SMOKE_STACK=1 set; leaving isolated privacy stack running."
  fi
  exit "$exit_code"
}
trap cleanup EXIT

wait_for_url() {
  local url="$1"
  local label="$2"

  for _ in $(seq 1 60); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      echo "$label is reachable"
      return 0
    fi
    sleep 2
  done

  echo "$label did not become reachable at $url" >&2
  return 1
}

docker compose -p "$PROJECT_NAME" "${COMPOSE_FILES[@]}" down -v --remove-orphans >/dev/null 2>&1
docker compose -p "$PROJECT_NAME" "${COMPOSE_FILES[@]}" up -d --build backend frontend

wait_for_url "http://127.0.0.1:${BACKEND_PORT}/health" "privacy backend health"
wait_for_url "http://127.0.0.1:${FRONTEND_PORT}/dashboard" "privacy frontend dashboard"
docker compose -p "$PROJECT_NAME" "${COMPOSE_FILES[@]}" exec -T backend python -m app.cli.e2e_seed >/dev/null

curl -fsS -X POST "http://127.0.0.1:${BACKEND_PORT}/api/v1/ai/parse" \
  -H "Content-Type: application/json" \
  -d '{"message":"Hôm nay tôi tiêu 35k vào ăn trưa"}' >/dev/null

curl -fsS -X POST "http://127.0.0.1:${BACKEND_PORT}/api/v1/transactions" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "expense",
    "amount_minor": 1000,
    "currency": "VND",
    "category_slug": "food",
    "description": "US-707 private transaction description",
    "occurred_at": "2026-07-17T08:00:00+07:00",
    "source": "manual"
  }' >/dev/null

curl -fsS "http://127.0.0.1:${BACKEND_PORT}/api/v1/transactions/export?format=json&month=2026-07" >/dev/null

logs="$(docker compose -p "$PROJECT_NAME" "${COMPOSE_FILES[@]}" logs --no-color backend frontend)"

if grep -Fq "Hôm nay tôi tiêu 35k vào ăn trưa" <<<"$logs"; then
  echo "Privacy log smoke failed: raw AI chat text was found in runtime logs." >&2
  exit 1
fi

if grep -Fq "US-707 private transaction description" <<<"$logs"; then
  echo "Privacy log smoke failed: transaction description was found in runtime logs." >&2
  exit 1
fi

if grep -Fq '"draft"' <<<"$logs"; then
  echo "Privacy log smoke failed: provider/draft payload text was found in runtime logs." >&2
  exit 1
fi

echo "privacy log smoke passed"
