# Pocket Ledger AI Troubleshooting

## Docker Socket Permission Denied

Symptom:

```text
permission denied while trying to connect to the Docker daemon socket
```

Fix:

```bash
groups
sudo usermod -aG docker "$USER"
```

Log out and back in so group membership refreshes. Do not use
`chmod 666 /var/run/docker.sock`.

## Docker Daemon Not Running

Check:

```bash
docker info
```

Start Docker through the host service manager, then rerun:

```bash
docker compose ps
```

## Ports Already In Use

Default ports are `8010` for the backend and `3000` for the frontend.

Use alternate ports:

```bash
BACKEND_PORT=8011 FRONTEND_PORT=3001 \
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8011 \
docker compose up --build
```

## Frontend Cannot Reach Backend

Check that both services are healthy:

```bash
docker compose ps
curl -i http://127.0.0.1:8010/health
curl -i http://127.0.0.1:3000/api/transactions
```

Compose route handlers should use:

```text
BACKEND_INTERNAL_URL=http://backend:8010
```

Browser-facing configuration should use:

```text
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8010
```

## Migration Startup Failure

Inspect backend logs:

```bash
docker compose logs --tail=200 backend
docker compose exec backend alembic current
```

For release validation, migrations are tested against an isolated temporary
SQLite database by `scripts/release-validate.sh`.

## SQLite Volume Permission Issue

Inspect the mounted data path:

```bash
docker compose exec backend sh -lc 'ls -la /app/data'
```

The normal reset command is explicit and destructive:

```bash
docker compose down -v
```

Do not use `-v` unless you intend to remove the local SQLite volume.

## Ollama Provider Unavailable

Default behavior has Ollama disabled:

```text
POCKET_LEDGER_OLLAMA_ENABLED=false
```

AI parse and insight requests should return a safe provider-unavailable state
without affecting `/health`.

If enabling Ollama, verify the model exists locally:

```bash
ollama list
```

The app does not download a model automatically.

## E2E Stack Cleanup

The E2E runner uses project `pocket-ledger-e2e` and removes only its isolated
volume on completion.

If debugging a failure:

```bash
KEEP_E2E_STACK=1 scripts/e2e-mvp.sh
docker compose -p pocket-ledger-e2e -f compose.yaml -f compose.e2e.yaml logs
docker compose -p pocket-ledger-e2e -f compose.yaml -f compose.e2e.yaml down -v --remove-orphans
```

## Playwright Failure Artifacts

Failure artifacts are copied to:

```text
frontend/e2e-artifacts/
```

These reports, traces, screenshots, videos, and downloads are ignored by Git.

## NPM Audit Findings

Run:

```bash
cd frontend
npm audit
```

The MVP release validation currently documents two moderate findings from
`postcss` nested under `next`. The available npm remediation proposes a
breaking forced downgrade path and was not applied during US-707.

## Clean Local Data Reset

Normal stop, preserving local data:

```bash
docker compose down
```

Destructive reset:

```bash
docker compose down -v
```
