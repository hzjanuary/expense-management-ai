#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_NAME="pocket-ledger-e2e"
RUNNER_CONTAINER="${PROJECT_NAME}-runner"
COMPOSE_FILES=(-f compose.yaml -f compose.e2e.yaml)
export BACKEND_PORT="${BACKEND_PORT:-8011}"
export FRONTEND_PORT="${FRONTEND_PORT:-3001}"
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
    if docker container inspect "$RUNNER_CONTAINER" >/dev/null 2>&1; then
      local artifact_dir="frontend/e2e-artifacts/$(date -u +%Y%m%dT%H%M%SZ)"
      mkdir -p "$artifact_dir"
      docker cp "$RUNNER_CONTAINER:/work/frontend/playwright-report" "$artifact_dir/playwright-report" || true
      docker cp "$RUNNER_CONTAINER:/work/frontend/test-results" "$artifact_dir/test-results" || true
      echo "Copied E2E failure artifacts to $artifact_dir"
    fi
  fi
  if [ "${KEEP_E2E_STACK:-0}" != "1" ]; then
    docker rm -f "$RUNNER_CONTAINER" >/dev/null 2>&1 || true
    docker compose -p "$PROJECT_NAME" "${COMPOSE_FILES[@]}" down -v --remove-orphans || true
  else
    echo "KEEP_E2E_STACK=1 set; leaving isolated E2E stack running."
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

docker compose -p "$PROJECT_NAME" "${COMPOSE_FILES[@]}" down -v --remove-orphans
docker rm -f "$RUNNER_CONTAINER" >/dev/null 2>&1 || true
docker compose -p "$PROJECT_NAME" "${COMPOSE_FILES[@]}" config >/dev/null
docker compose -p "$PROJECT_NAME" "${COMPOSE_FILES[@]}" build backend frontend e2e
docker compose -p "$PROJECT_NAME" "${COMPOSE_FILES[@]}" up -d backend frontend

wait_for_url "http://127.0.0.1:${BACKEND_PORT}/health" "E2E backend health"
wait_for_url "http://127.0.0.1:${FRONTEND_PORT}/dashboard" "E2E frontend dashboard"
docker compose -p "$PROJECT_NAME" "${COMPOSE_FILES[@]}" exec -T backend alembic current
docker compose -p "$PROJECT_NAME" "${COMPOSE_FILES[@]}" exec -T backend python -m app.cli.e2e_seed
docker compose -p "$PROJECT_NAME" "${COMPOSE_FILES[@]}" run --name "$RUNNER_CONTAINER" e2e

echo "E2E MVP demo passed"
