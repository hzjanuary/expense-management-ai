#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

section() {
  printf '\n== %s ==\n' "$1"
}

run_backend() {
  section "Backend quality gates"
  cd "$ROOT_DIR/backend"
  .venv/bin/pytest
  .venv/bin/ruff check .
  .venv/bin/black --check .
  .venv/bin/mypy app
}

run_alembic_round_trip() {
  section "Isolated Alembic round trip"
  local temp_dir
  temp_dir="$(mktemp -d)"
  cleanup_alembic() {
    if [ -n "$temp_dir" ] && [ -d "$temp_dir" ]; then
      rm -r "$temp_dir"
    fi
  }
  trap cleanup_alembic RETURN

  cd "$ROOT_DIR/backend"
  export POCKET_LEDGER_DATABASE_URL="sqlite+aiosqlite:///${temp_dir}/release_alembic.db"
  .venv/bin/alembic upgrade head
  .venv/bin/alembic current
  .venv/bin/alembic downgrade base
  .venv/bin/alembic upgrade head
  .venv/bin/alembic current
}

run_frontend() {
  section "Frontend quality gates"
  cd "$ROOT_DIR/frontend"
  npm ci
  npm test
  npm run lint
  npm run typecheck
  npm run build
}

run_dependency_review() {
  section "Dependency and security review"
  cd "$ROOT_DIR/frontend"
  npm audit || true
  npm audit --json >/tmp/pocket-ledger-npm-audit.json || true
  node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync('/tmp/pocket-ledger-npm-audit.json','utf8')); console.log('npm audit vulnerabilities:', JSON.stringify(p.metadata?.vulnerabilities ?? {}));"

  cd "$ROOT_DIR/backend"
  if .venv/bin/python -m pip_audit --version >/dev/null 2>&1; then
    .venv/bin/python -m pip_audit || true
  else
    local audit_env
    audit_env="$(mktemp -d)"
    cleanup_audit() {
      if [ -n "$audit_env" ] && [ -d "$audit_env" ]; then
        rm -r "$audit_env"
      fi
    }
    trap cleanup_audit RETURN

    python3 -m venv "$audit_env"
    "$audit_env/bin/python" -m pip install --quiet --upgrade pip pip-audit
    "$audit_env/bin/python" -m pip_audit --path .venv/lib/python*/site-packages || true
  fi
}

run_e2e_twice() {
  section "Playwright MVP E2E run 1"
  cd "$ROOT_DIR"
  scripts/e2e-mvp.sh

  section "Playwright MVP E2E run 2"
  scripts/e2e-mvp.sh
}

run_runtime() {
  section "Default Compose runtime smoke"
  cd "$ROOT_DIR"
  docker compose config >/dev/null
  docker compose --profile ollama config >/dev/null
  scripts/runtime-smoke.sh
}

run_privacy() {
  section "Privacy-safe logging smoke"
  cd "$ROOT_DIR"
  scripts/privacy-log-smoke.sh
}

run_harness() {
  section "Git and Harness checks"
  cd "$ROOT_DIR"
  git diff --check
  scripts/bin/harness-cli query matrix >/dev/null
  scripts/bin/harness-cli query stats >/dev/null
}

section "Static configuration checks"
docker info >/dev/null
docker compose version
docker compose config >/dev/null
docker compose --profile ollama config >/dev/null
test -f .env.example
test -f compose.yaml
test -f compose.e2e.yaml
test -x scripts/runtime-smoke.sh
test -x scripts/e2e-mvp.sh
test -x scripts/privacy-log-smoke.sh

run_backend
run_alembic_round_trip
run_frontend
run_dependency_review
run_e2e_twice
run_runtime
run_privacy
run_harness

section "Release validation complete"
echo "release validation passed"
