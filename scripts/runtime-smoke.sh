#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is not available" >&2
  exit 1
fi

PYTHON_BIN="$(command -v python3 || command -v python || true)"
if [ -z "$PYTHON_BIN" ]; then
  echo "python3 or python is required for JSON validation" >&2
  exit 1
fi

docker compose config >/dev/null
docker compose build
docker compose up -d

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
  docker compose ps
  exit 1
}

wait_for_url "http://127.0.0.1:8010/health" "backend health"
wait_for_url "http://127.0.0.1:3000/dashboard" "frontend dashboard"
wait_for_url "http://127.0.0.1:3000/api/transactions" "frontend transaction proxy"

assert_loopback_binding() {
  local service="$1"
  local private_port="$2"
  local published

  published="$(docker compose port "$service" "$private_port")"
  case "$published" in
    127.0.0.1:* | localhost:*)
      echo "$service:$private_port is bound to loopback at $published"
      ;;
    *)
      echo "$service:$private_port is not loopback-bound: $published" >&2
      exit 1
      ;;
  esac
}

assert_loopback_binding backend 8010
assert_loopback_binding frontend 3000

docker compose exec -T backend alembic current
docker compose exec -T backend test -f /app/data/pocket_ledger.db

transaction_id="$(
  curl -fsS -X POST "http://127.0.0.1:8010/api/v1/transactions" \
    -H "Content-Type: application/json" \
    -d '{
      "type": "expense",
      "amount_minor": 1000,
      "currency": "VND",
      "category_slug": "food",
      "description": "runtime smoke",
      "occurred_at": "2026-07-17T08:00:00+07:00",
      "source": "manual"
	    }' \
	  | "$PYTHON_BIN" -c 'import json,sys; print(json.load(sys.stdin)["id"])'
)"

docker compose restart backend frontend
wait_for_url "http://127.0.0.1:8010/health" "backend health after restart"
wait_for_url "http://127.0.0.1:3000/dashboard" "frontend dashboard after restart"

transactions_payload="$(
  curl -fsS "http://127.0.0.1:8010/api/v1/transactions?limit=100&offset=0"
)"

TRANSACTION_ID="$transaction_id" TRANSACTIONS_PAYLOAD="$transactions_payload" "$PYTHON_BIN" - <<'PY'
import json
import os

transaction_id = os.environ["TRANSACTION_ID"]
payload = json.loads(os.environ["TRANSACTIONS_PAYLOAD"])
ids = {item["id"] for item in payload["items"]}
if transaction_id not in ids:
    raise SystemExit(f"transaction {transaction_id} was not persisted after restart")
print(f"persisted transaction {transaction_id}")
PY

echo "runtime smoke passed"
