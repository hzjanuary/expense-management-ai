# TASK-AI-002 Colloquial Vietnamese Transaction Parsing

Status: implemented

## Scope

Fix AI transaction drafting for natural Vietnamese purchase and income
statements without changing ledger mutation rules, adding new intents, adding
cloud providers, or changing persistence.

## Changes

- Added post-provider deterministic recovery for clear transaction statements
  when the structured provider returns `unknown` or omits recoverable fields.
- Recovery remains conservative:
  - expense drafts require one positive money amount plus purchase/spending
    language;
  - income drafts require one positive money amount plus income language;
  - questions, hypotheticals, balances, budgets, and analytical spending
    queries do not become transaction drafts.
- Added deterministic Vietnamese money extraction for common forms such as
  `28k`, `28 K`, `28 nghìn`, `28 ngàn`, `28.000`, `1tr`, `1 triệu`, `1m`,
  `1.5 triệu`, and `1,5 triệu`.
- Extended backend-owned category aliases with high-confidence item phrases:
  `cơm gà`, `phở`, `cà phê sữa`, `đổ xăng`, `Grab`, `vỉ thuốc`, and
  `xem phim`.
- Added concise description recovery that removes informal pronouns, filler
  words, and money text.
- Added deterministic date recovery for supported relative phrases such as
  `hôm nay`, `trưa nay`, `vừa rồi`, and `tối qua`.
- Strengthened the Ollama structured prompt with colloquial transaction
  examples, statement-versus-question rules, money shorthand, category slugs,
  no-mutation rules, and explicit confirmation requirements.
- Updated frontend automatic routing so clear colloquial transaction statements
  reach the existing parse endpoint while analytical questions remain read-only
  insight queries.
- Removed visible internal parse field names from assistant clarifications.

## Safety Guarantees

Parsing still creates only a pending AI draft. It does not create a transaction,
change account balance, update budgets, or confirm a draft. Confirmation still
uses the existing deterministic command path and a stored `draft_id`.

## Supported Examples

| Message | Result |
| --- | --- |
| `hôm nay tao ăn hộp cơm gà 28k` | expense, `28000`, `food`, `Cơm gà`, today |
| `trưa nay làm tô phở 45k` | expense, `45000`, `food`, `Phở`, today |
| `sáng uống ly cà phê sữa 25 nghìn` | expense, `25000`, `coffee`, `Cà phê sữa` |
| `đổ 100k xăng` | expense, `100000`, `transport`, `Đổ xăng` |
| `đi Grab hết 42k` | expense, `42000`, `transport`, `Grab` |
| `mua vỉ thuốc 60k` | expense, `60000`, `health`, `Thuốc` |
| `tối qua xem phim hết 150k` | expense, `150000`, `entertainment`, yesterday |
| `hôm nay nhận lương 15 triệu` | income, `15000000`, `salary`, `Lương`, today |

Examples such as `Cơm gà 28k có đắt không?`, `Tôi còn 100k`, `Ngân sách ăn
uống 2 triệu`, and `Tháng này tôi ăn uống hết bao nhiêu?` do not create
transaction drafts.

## Validation

| Check | Command | Result |
| --- | --- | --- |
| Backend focused target | `cd backend && .venv/bin/pytest tests/test_ai_parse_api.py tests/test_categories.py tests/test_ollama_provider.py` | passed: 76 passed, 1 skipped, 1 warning |
| Backend full gate | `cd backend && .venv/bin/pytest`; `cd backend && .venv/bin/ruff check .`; `cd backend && .venv/bin/black --check .`; `cd backend && .venv/bin/mypy app` | passed: 295 passed, 1 skipped, 1 warning; ruff passed; black passed; mypy passed |
| Frontend focused target | `cd frontend && npm test -- chat-insights.test.tsx` | passed: 14 tests |
| Frontend full gate | `cd frontend && npm ci`; `cd frontend && npm test`; `cd frontend && npm run lint`; `cd frontend && npm run typecheck`; `cd frontend && npm run build` | passed: 11 files, 64 tests; lint passed; typecheck passed; production build passed |
| Runtime smoke | `scripts/runtime-smoke.sh` | passed: Compose build, backend/frontend health, frontend transaction proxy, Alembic `0004 (head)`, restart persistence |
| Playwright E2E | `scripts/e2e-mvp.sh` | passed: Chromium `1 passed`; demo now uses `hôm nay tao ăn hộp cơm gà 28k` through `/assistant`; responsive route and axe checks passed |
| Real Ollama corpus | frontend same-origin `/api/ai/parse` with local ignored `.env` enabling `qwen3:4b-instruct` | passed: requested transaction prompts created pending drafts; price question and spending query created no draft; backend logs showed real `POST http://host.docker.internal:11434/api/chat` calls |
| Ledger integrity before confirmation | dashboard summary and transaction list before and after parse corpus | passed: transaction count stayed `13`, balance stayed `987000`, July expense stayed `13000` |
| Explicit confirmation proof | `POST /api/ai/confirm` for the first recovered draft, then repeated confirm | passed: one `Cơm gà` expense transaction for `28000` was created, balance changed once to `959000`, repeat confirm returned safe `422` |

## Real Ollama Manual Corpus

Used local `qwen3:4b-instruct` through the running Compose stack. The local
ignored `.env` had Ollama enabled with
`POCKET_LEDGER_OLLAMA_BASE_URL=http://host.docker.internal:11434`.

Before parse snapshot: `transaction_count=13`, `balance_minor=987000`,
`monthly_expense_minor=13000`.

| Prompt | Final intent | Type | Amount | Category | Description | Date | Confirmation | Time |
| --- | --- | --- | ---: | --- | --- | --- | --- | ---: |
| `hôm nay tao ăn hộp cơm gà 28k` | `create_transaction` | expense | 28000 | `food` | `Cơm gà` | 2026-07-22 | required | 117.59s |
| `trưa nay làm tô phở 45k` | `create_transaction` | expense | 45000 | `food` | `Phở` | 2026-07-22 | required | 14.58s |
| `sáng uống ly cà phê sữa 25 nghìn` | `create_transaction` | expense | 25000 | `coffee` | `Cà phê sữa` | confirmation time | required | 14.56s |
| `đổ 100k xăng` | `create_transaction` | expense | 100000 | `transport` | `Đổ xăng` | confirmation time | required | 14.15s |
| `đi Grab hết 42k` | `create_transaction` | expense | 42000 | `transport` | `Grab` | confirmation time | required | 13.98s |
| `mua vỉ thuốc 60k` | `create_transaction` | expense | 60000 | `health` | `Thuốc` | confirmation time | required | 14.46s |
| `tối qua xem phim hết 150k` | `create_transaction` | expense | 150000 | `entertainment` | `Xem phim` | 2026-07-21 | required | 14.88s |
| `hôm nay nhận lương 15 triệu` | `create_transaction` | income | 15000000 | `salary` | `Lương` | 2026-07-22 | required | 14.24s |
| `Cơm gà 28k có đắt không?` | `unknown` | none | none | none | none | none | no draft | 12.56s |
| `Tháng này tôi ăn uống hết bao nhiêu?` | `query_spending` | none | none | none | none | none | no draft | 17.05s |

Actual frontend auto-routing for `Tháng này tôi ăn uống hết bao nhiêu?` was
also validated through `/api/ai/query-spending`; it returned
`spending_scope=category`, `category_slug=food`, `amount_minor=13000`, and
`transaction_count=13` without mutation.

After parse snapshot: `transaction_count=13`, `balance_minor=987000`,
`monthly_expense_minor=13000`.

Confirmation proof: confirming the first draft created transaction
`2e96f6c3-b78f-4595-ba07-b06f94b7668c` with `amount_minor=28000`,
`category_slug=food`, and `description=Cơm gà`. A second confirm attempt for
the same draft returned `422`, preserving exactly-once confirmation behavior.
