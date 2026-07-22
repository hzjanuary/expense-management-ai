# TASK-AI-001 Spending Query Routing, Total Spending, and Category Normalization

Status: implemented

## Scope

Fix real-Ollama spending-query routing and category normalization without
changing ledger mutation rules, adding new AI intents, or adding persistence
infrastructure.

## Changes

- Added explicit `spending_scope` for `query_spending` results:
  - `total` for all current-month expense spending.
  - `category` for current-month spending in one resolved expense category.
- Added deterministic SQL aggregation for total expenses without loading and
  summing transactions in application code.
- Added deterministic backend category alias normalization for canonical
  expense categories, including Vietnamese aliases such as `ăn uống`,
  `cà phê`, `ẩm thực`, and `xăng`.
- Added deterministic backend classification for supported current-month
  spending queries before the provider is called. This keeps the real-Ollama
  path usable while preventing supported read-only queries from depending on
  model latency or category extraction variance.
- Added post-provider semantic fallback for real-provider-shaped
  `query_spending` results that omit `spending_scope`, `category_slug`, or
  `date_range_label`. The backend now resolves total/all/cumulative spending
  language and category aliases from the original message before deciding
  whether clarification is needed.
- Strengthened the Ollama structured prompt with total/category spending
  examples, canonical category rules, and no-mutation/no-total-invention rules.
- Added deterministic `this_month` fallback when a message clearly says
  `tháng này` or `this month` and the provider omits the date-range label.
- Improved frontend auto routing so natural Vietnamese variants for total and
  category current-month spending route to the spending query endpoint.
- Updated insight rendering so total spending uses a distinct `Tổng chi tiêu`
  card and category spending uses Vietnamese category labels.
- Mapped internal clarification fields such as `category_slug` and
  `date_range` to user-facing Vietnamese labels.

## Read-Only Guarantees

Spending queries remain read-only. The endpoint does not create drafts, confirm
transactions, update balances, alter budgets, or mutate AI history. All amounts
come from persisted transaction rows through deterministic backend queries.

## Out Of Scope

- No general economics chat.
- No streaming responses.
- No cloud LLM providers.
- No persistent conversation history.
- No authentication.
- No migrations or schema changes.
- No new backend endpoints.
- No frontend financial calculations.

## Validation

| Check | Command | Result |
| --- | --- | --- |
| Backend query-spending target | `cd backend && .venv/bin/pytest tests/test_ai_query_spending_api.py` | passed: 33 passed, 1 warning |
| Backend AI regression target | `cd backend && .venv/bin/pytest tests/test_ai_query_spending_api.py tests/test_ai_budget_remaining_api.py tests/test_ai_spending_breakdown_api.py tests/test_ollama_provider.py tests/test_llm_provider_interface.py` | passed: 95 passed, 1 skipped, 1 warning |
| Frontend assistant target | `cd frontend && npm test -- chat-insights insight-routes page-separation` | passed: 3 files, 19 tests |
| Requested Compose backend-test gate | `docker compose run --rm backend-test pytest` | blocked: Compose has no `backend-test` service; repository-established backend gate was used |
| Full backend quality gate | `cd backend && .venv/bin/pytest`; `cd backend && .venv/bin/ruff check .`; `cd backend && .venv/bin/black --check .`; `cd backend && .venv/bin/mypy app` | passed: 261 passed, 1 skipped, 1 warning; ruff passed; black passed; mypy passed |
| Full frontend quality gate | `cd frontend && npm ci`; `cd frontend && npm test`; `cd frontend && npm run lint`; `cd frontend && npm run typecheck`; `cd frontend && npm run build` | passed: 11 files, 61 tests; lint passed; typecheck passed; production build passed |
| Runtime smoke | `scripts/runtime-smoke.sh` | passed: images rebuilt, backend/frontend health passed, transaction proxy passed, Alembic `0004 (head)`, restart persistence passed |
| Playwright assistant coverage | `scripts/e2e-mvp.sh` | passed: Chromium `1 passed`; includes `/assistant` total/category cards, axe no critical/serious checks, and responsive overflow checks at 375x812, 768x1024, and 1440x900 |
| Real Ollama manual corpus | frontend same-origin `/api/ai/query-spending` proxy with local ignored `.env` enabling `qwen3:4b-instruct` | passed: all seven prompts returned safe 200 responses; supported prompts completed in about 0.01-0.04s through deterministic backend classification; no user-visible internal-field leak; ledger snapshot unchanged |
| Real Ollama fallback validation | frontend same-origin `/api/ai/query-spending` proxy with local ignored `.env` enabling `qwen3:4b-instruct` | passed: rejected wallet-decrease prompt called Ollama and returned `spending_scope=total`, `category_slug=null`, `date_range.label=this_month`, `amount_minor=11000`, `transaction_count=11`, `needs_clarification=false`; `ẩm thực` fallback called Ollama and returned `spending_scope=category`, `category_slug=food`; ledger snapshot unchanged |
| Git whitespace | `git diff --check` | passed |
| Harness matrix | `scripts/bin/harness-cli query matrix` | passed |

## Real Ollama Manual Corpus

Used `qwen3:4b-instruct` installed on the host and the frontend same-origin
assistant proxy with the local ignored `.env` enabling Ollama. The normal
tracked default remains Ollama-disabled.

Before snapshot: `transaction_count=11`, `balance_minor=989000`,
`monthly_expense_minor=11000`.

| Prompt | Status | Scope | Category | User-visible answer | Internal-field leak | Time |
| --- | --- | --- | --- | --- | --- | --- |
| `Tháng này tôi đã chi tổng cộng bao nhiêu?` | 200 | `total` | none | `Tháng này bạn đã chi tổng cộng 11.000₫.` | no | 0.02s |
| `Tôi đã tiêu bao nhiêu trong tháng này?` | 200 | `total` | none | `Tháng này bạn đã chi tổng cộng 11.000₫.` | no | 0.04s |
| `Tháng này tôi ăn uống hết bao nhiêu?` | 200 | `category` | `food` | `Tháng này bạn đã chi 11.000₫ cho Ăn uống.` | no | 0.02s |
| `Tháng này tôi uống cà phê hết bao nhiêu?` | 200 | `category` | `coffee` | `Tháng này bạn đã chi 0₫ cho Cà phê.` | no | 0.02s |
| `Tháng này tôi chi bao nhiêu tiền xăng?` | 200 | `category` | `transport` | `Tháng này bạn đã chi 0₫ cho Đi lại.` | no | 0.01s |
| `Tháng này tôi mua thuốc hết bao nhiêu?` | 200 | `category` | `health` | `Tháng này bạn đã chi 0₫ cho Sức khỏe.` | no | 0.02s |
| `Tháng này tôi chi cho một danh mục không tồn tại bao nhiêu?` | 200 | clarification | none | `Bạn muốn xem chi tiêu cho nhóm nào?` | no | 0.02s |

After snapshot: `transaction_count=11`, `balance_minor=989000`,
`monthly_expense_minor=11000`.

Ledger mutation proof: before and after snapshots were identical.

## Real Ollama Fallback Validation

The previously rejected fallback prompt was rerun after the post-provider
normalization fix.

Before snapshot: `transaction_count=11`, `balance_minor=989000`,
`monthly_expense_minor=11000`.

| Prompt | Status | Scope | Category | Date range | Amount | Count | Clarification | Time |
| --- | --- | --- | --- | --- | ---: | ---: | --- | ---: |
| `Kể từ ngày đầu tiên của tháng này đến giờ, ví của tôi đã giảm bao nhiêu vì các khoản chi?` | 200 | `total` | none | `this_month` | 11000 | 11 | no | 92.26s |
| `Trong tháng hiện tại, khoản dành cho ẩm thực của tôi đã ngốn bao nhiêu?` | 200 | `category` | `food` | `this_month` | 11000 | 11 | no | 15.90s |

Backend container logs showed two real outbound provider calls:

```text
HTTP Request: POST http://host.docker.internal:11434/api/chat "HTTP/1.1 200 OK"
```

The first application request duration was approximately `92140ms`; the second
was approximately `15870ms`, proving these were not the deterministic fast path.
The shell user could not read the system Ollama unit journal directly
(`journalctl -u ollama` returned no visible entries), so backend container logs
are the captured provider-call evidence from this run.

After snapshot: `transaction_count=11`, `balance_minor=989000`,
`monthly_expense_minor=11000`.

Ledger mutation proof: before and after snapshots were identical.
