# Pocket Ledger AI MVP Known Limitations

- Local single-user MVP only; authentication and authorization are not
  implemented.
- No cloud synchronization, multi-device consistency, hosted database, or cloud
  backup is included.
- SQLite is the only validated MVP database and has local concurrency limits.
- No automatic backups are provided; users must export or copy local data
  themselves.
- Transaction deletion is soft delete only. There is no restoration UI, hard
  delete UI, or bulk delete UI.
- Chat interactions are session-only in the frontend. Persistent multi-turn
  chat history is not implemented.
- The assistant is not a general-purpose economics chatbot; it supports the
  implemented transaction-draft and financial-insight intents only.
- The deterministic fake provider is for tests and E2E only. Default
  production-like Compose startup uses safe provider-unavailable behavior when
  Ollama is disabled.
- Real Ollama model quality depends on the locally installed model and runtime;
  full real-Ollama demo proof is documented but not validated for this release
  candidate.
- CSV/JSON exports are bounded by the backend export row limit
  `POCKET_LEDGER_EXPORT_MAX_ROWS`, default `10000`.
- Validated platform is Linux x86_64 on openSUSE Tumbleweed with Docker Engine
  `29.4.0-ce` and Docker Compose `5.3.1`.
- Docker Desktop on macOS, Docker Desktop on Windows/WSL2, other Linux
  distributions, ARM64 hosts, and real-Ollama full demo are documented as
  plausible but not validated.
- Frontend dependency audit still reports two moderate findings for transitive
  `postcss` under `next`; npm's listed remediation is a breaking forced path
  and was not applied.
- Backend dependency audit of the local development `.venv` reports
  vulnerabilities in `pip 26.0.1`; the runtime container upgrades pip to
  `26.1.2` during image build, and application runtime dependencies had no
  reported vulnerabilities in the audit output.
- Backend and frontend container base images are version-tagged rather than
  digest-pinned. The optional Ollama profile uses `ollama/ollama:latest` and is
  not part of default startup.
- The E2E Playwright runner uses the official Playwright container as root; the
  backend and frontend runtime containers run as non-root users.
- Clearing AI history removes local AI draft records but does not clear
  application, Docker, shell, or operating-system logs.
