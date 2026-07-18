import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import fs from "node:fs/promises";

const DEMO_MONTH = "2026-07";
const DEMO_MESSAGE = "Hôm nay tôi tiêu 35k vào ăn trưa";
const SPENDING_QUERY = "Tháng này tôi ăn uống hết bao nhiêu?";
const BUDGET_QUERY = "Còn bao nhiêu tiền ăn tháng này?";
const BREAKDOWN_QUERY = "Tuần này tôi tiêu nhiều nhất vào mục nào?";

test.describe.configure({ mode: "serial" });

test("complete local-first MVP demo", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { level: 1, name: "Tổng quan" }))
    .toBeVisible();
  await page.getByLabel("Selected month").fill(DEMO_MONTH);

  const dashboard = page.locator("body");
  const dashboardBudget = sectionByHeading(page, "Budget status");
  const dashboardTransactions = sectionByHeading(page, "Recent Transactions");

  await expectMoney(dashboard, "1.000.000");
  await expect(dashboardTransactions.getByText("No transactions yet."))
    .toBeVisible();
  await expect(dashboardBudget.getByText("No budget configured for this month."))
    .toBeVisible();
  await expect(page.getByLabel("Chat to ledger message")).toHaveCount(0);
  await expect(page.getByText("Export Transactions")).toHaveCount(0);
  await expect(page.getByText("AI History Privacy")).toHaveCount(0);
  await expectNoCriticalOrSeriousA11yViolations(page, "dashboard overview");

  await page.getByRole("link", { name: "Ngân sách" }).first().click();
  await expect(page).toHaveURL(/\/budgets$/);
  await page.getByLabel("Selected month").fill(DEMO_MONTH);
  const budgetStatus = sectionByHeading(page, "Budget status");
  const budgetSetup = sectionByHeading(page, "Budget setup");
  await expectNoCriticalOrSeriousA11yViolations(page, "budget setup page");
  await budgetSetup.getByLabel(/Total monthly budget/).fill("5000000");
  await budgetSetup.getByRole("button", { name: "Add category" }).click();
  await budgetSetup.getByRole("combobox", { name: "Category" }).first().selectOption(
    "food",
  );
  await budgetSetup.getByLabel("Budget (VND)", { exact: true }).fill("2000000");
  await budgetSetup.getByRole("button", { name: "Save budget" }).click();
  await expect(budgetSetup.getByText("Budget saved.")).toBeVisible();
  await expectMoney(budgetStatus, "5.000.000");
  await expectMoney(budgetStatus, "2.000.000");
  await expectMoney(budgetStatus, "0");
  await expect(budgetStatus.getByText("Within budget")).toBeVisible();

  await page.getByRole("link", { name: "Trợ lý AI" }).first().click();
  await expect(page).toHaveURL(/\/assistant$/);
  const assistant = sectionByHeading(page, "Trợ lý tài chính");
  await expectNoCriticalOrSeriousA11yViolations(page, "assistant empty");
  await assistant.getByLabel("Chat to ledger message").fill(DEMO_MESSAGE);
  await assistant.getByRole("button", { name: "Gửi" }).click();
  await expect(assistant.getByText("Review AI Draft").first()).toBeVisible();
  await expect(assistant.getByText("expense").first()).toBeVisible();
  await expectMoney(assistant, "35.000");
  await expect(assistant.getByText("Food").first()).toBeVisible();
  await expect(assistant.getByText("ai_chat").first()).toBeVisible();
  await expect(assistant.getByRole("button", { name: "Confirm" })).toBeVisible();
  await expect(assistant.getByRole("button", { name: "Cancel" })).toBeVisible();
  await expectNoCriticalOrSeriousA11yViolations(page, "AI draft review");

  const preConfirmTransactions = await page.request.get(
    "/api/transactions?limit=10&offset=0",
  );
  expect((await preConfirmTransactions.json()).total).toBe(0);
  const preConfirmSummary = await page.request.get(
    `/api/dashboard/summary?month=${DEMO_MONTH}`,
  );
  const preConfirmSummaryPayload = await preConfirmSummary.json();
  expect(preConfirmSummaryPayload.total_balance_minor).toBe(1_000_000);
  expect(preConfirmSummaryPayload.monthly_expense_minor).toBe(0);

  await assistant.getByRole("button", { name: "Confirm" }).click();
  await expect(assistant.getByText(/Transaction created:/)).toBeVisible();
  await expect(page).toHaveURL(/\/assistant$/);

  await page.getByRole("link", { name: "Tổng quan" }).first().click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expectMoney(page.locator("body"), "965.000");
  await expectMoney(page.locator("body"), "35.000");
  await expect(sectionByHeading(page, "Recent Transactions").getByText("ăn trưa"))
    .toBeVisible();
  await expectMoney(sectionByHeading(page, "Budget status"), "1.965.000");

  await page.getByRole("link", { name: "Trợ lý AI" }).first().click();
  await submitChat(page, SPENDING_QUERY);
  const spendingInsight = insightByHeading(page, "Spending Insight");
  await expect(spendingInsight.getByText("Food", { exact: true })).toBeVisible();
  await expectMoney(spendingInsight, "35.000");
  await expect(spendingInsight.getByText("Transactions").locator("..")).toContainText("1");
  await expect(spendingInsight.getByText(/this_month/)).toBeVisible();
  await expectNoCriticalOrSeriousA11yViolations(page, "insight result");

  await submitChat(page, BUDGET_QUERY);
  const budgetInsight = insightByHeading(page, "Budget Insight");
  await expectMoney(budgetInsight, "2.000.000");
  await expectMoney(budgetInsight, "35.000");
  await expectMoney(budgetInsight, "1.965.000");
  await expect(budgetInsight.getByText("Within budget")).toBeVisible();
  await expect(budgetInsight.getByText("Transactions").locator("..")).toContainText("1");

  await submitChat(page, BREAKDOWN_QUERY);
  const breakdownInsight = insightByHeading(page, "Top Spending Insight");
  await expectMoney(breakdownInsight, "35.000");
  await expect(breakdownInsight.getByText("Food", { exact: true })).toBeVisible();
  await expect(breakdownInsight.getByText("100.00%")).toBeVisible();
  await expect(breakdownInsight.getByText("Transactions").locator("..")).toContainText("1");

  await page.getByRole("link", { name: "Giao dịch" }).first().click();
  await expect(page).toHaveURL(/\/transactions$/);
  const transactions = sectionByHeading(page, "Recent Transactions");
  const exportPanel = sectionByHeading(page, "Export Transactions");
  await expect(transactions.getByText("ăn trưa")).toBeVisible();

  const csvDownload = await downloadFromExportPanel(exportPanel);
  expect(csvDownload.suggestedFilename()).toMatch(/\.csv$/);
  const csvPath = await csvDownload.path();
  expect(csvPath).not.toBeNull();
  const csv = await fs.readFile(csvPath ?? "", "utf8");
  expect(csv).toContain("ăn trưa");
  expect(csv).toContain("ai_chat");
  expect(csv).not.toContain("raw_user_text");
  expect(csv).not.toContain("parser_confidence");
  expect(csv).not.toContain("provider_name");

  await exportPanel.getByLabel("Format").selectOption("json");
  const jsonDownload = await downloadFromExportPanel(exportPanel);
  expect(jsonDownload.suggestedFilename()).toMatch(/\.json$/);
  const jsonPath = await jsonDownload.path();
  expect(jsonPath).not.toBeNull();
  const jsonPayload = JSON.parse(await fs.readFile(jsonPath ?? "", "utf8")) as {
    transactions: Array<Record<string, unknown>>;
  };
  const exportedTransaction = jsonPayload.transactions.find(
    (item) => item.description === "ăn trưa",
  );
  expect(exportedTransaction).toMatchObject({
    amount_minor: 35000,
    category_slug: "food",
    currency: "VND",
    description: "ăn trưa",
    source: "ai_chat",
    type: "expense",
  });
  expect(exportedTransaction).not.toHaveProperty("deleted_at");
  expect(exportedTransaction).not.toHaveProperty("raw_user_text");
  expect(exportedTransaction).not.toHaveProperty("parser_confidence");
  expect(exportedTransaction).not.toHaveProperty("provider_name");

  await transactions.getByRole("button", { name: /Delete transaction ăn trưa/ }).click();
  const deleteDialog = page.getByRole("dialog", { name: "Delete transaction?" });
  await expect(deleteDialog.getByText(/active ledger views/)).toBeVisible();
  await expect(deleteDialog.getByText(/reverses its account-balance effect/)).toBeVisible();
  await expectNoCriticalOrSeriousA11yViolations(page, "transaction delete dialog");
  await deleteDialog.getByRole("button", { name: "Cancel" }).click();
  await expect(transactions.getByText("ăn trưa")).toBeVisible();

  await transactions.getByRole("button", { name: /Delete transaction ăn trưa/ }).click();
  await page
    .getByRole("dialog", { name: "Delete transaction?" })
    .getByRole("button", { name: "Delete transaction" })
    .click();
  await expect(transactions.getByText("No transactions yet.")).toBeVisible();

  await page.getByRole("link", { name: "Tổng quan" }).first().click();
  await expectMoney(page.locator("body"), "1.000.000");
  await expectMoney(page.locator("body"), "0");
  await expectMoney(sectionByHeading(page, "Budget status"), "2.000.000");
  await expect(sectionByHeading(page, "Recent Transactions").getByText("No transactions yet."))
    .toBeVisible();

  await page.getByRole("link", { name: "Cài đặt" }).first().click();
  await expect(page).toHaveURL(/\/settings$/);
  const historyPanel = sectionByHeading(page, "AI History Privacy");
  await historyPanel.getByRole("button", { name: "Clear AI history" }).click();
  await expect(
    historyPanel.getByText(/Confirmed transactions and account balances remain unchanged/),
  ).toBeVisible();
  await expect(historyPanel.getByText(/does not clear transaction history/))
    .toBeVisible();
  await expectNoCriticalOrSeriousA11yViolations(page, "clear AI history dialog");
  await historyPanel
    .getByRole("button", { name: "Clear AI history" })
    .last()
    .click();
  await expect(historyPanel.getByText(/Cleared \d+ AI draft records/)).toBeVisible();

  await historyPanel.getByRole("button", { name: "Clear AI history" }).click();
  await historyPanel
    .getByRole("button", { name: "Clear AI history" })
    .last()
    .click();
  await expect(historyPanel.getByText(/Cleared 0 AI draft records/)).toBeVisible();

  await page.getByRole("link", { name: "Tổng quan" }).first().click();
  await expectMoney(page.locator("body"), "1.000.000");
  await expectMoney(page.locator("body"), "0");
  await expectMoney(sectionByHeading(page, "Budget status"), "5.000.000");
  await expect(sectionByHeading(page, "Recent Transactions").getByText("No transactions yet."))
    .toBeVisible();

  await expectResponsiveRoutes(page);
});

const responsiveRoutes = [
  { path: "/dashboard", heading: "Tổng quan" },
  { path: "/transactions", heading: "Giao dịch" },
  { path: "/budgets", heading: "Ngân sách" },
  { path: "/assistant", heading: "Trợ lý AI" },
  { path: "/settings", heading: "Cài đặt" },
] as const;

const responsiveViewports = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

function sectionByHeading(page: Page, heading: string): Locator {
  return page.locator("section").filter({
    has: page.getByRole("heading", { name: heading }),
  }).first();
}

function insightByHeading(page: Page, heading: string): Locator {
  return page.locator("article").filter({
    has: page.getByRole("heading", { name: heading }),
  }).first();
}

async function submitChat(page: Page, message: string) {
  const assistant = sectionByHeading(page, "Trợ lý tài chính");
  await assistant.getByLabel("Chat to ledger message").fill(message);
  await assistant.getByRole("button", { name: "Gửi" }).click();
}

async function downloadFromExportPanel(exportPanel: Locator) {
  const page = exportPanel.page();
  const downloadPromise = page.waitForEvent("download");
  await exportPanel.getByRole("button", { name: "Download export" }).click();
  return downloadPromise;
}

async function expectMoney(scope: Locator, amountWithDots: string) {
  await expect(scope.getByText(moneyPattern(amountWithDots)).first()).toBeVisible();
}

function moneyPattern(amountWithDots: string): RegExp {
  if (amountWithDots === "0") {
    return /(^|[^\d.])0\s*₫/;
  }

  return new RegExp(`${escapeRegExp(amountWithDots)}\\s*₫`);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function expectNoCriticalOrSeriousA11yViolations(
  page: Page,
  context: string,
) {
  const results = await new AxeBuilder({ page }).analyze();
  const blockingViolations = results.violations.filter(
    (violation) =>
      violation.impact === "critical" || violation.impact === "serious",
  );

  expect(
    blockingViolations,
    `${context} has critical or serious accessibility violations`,
  ).toEqual([]);
}

async function expectResponsiveRoutes(page: Page) {
  for (const viewport of responsiveViewports) {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });

    for (const route of responsiveRoutes) {
      await page.goto(route.path);
      await expect(page.getByRole("heading", { level: 1, name: route.heading }))
        .toBeVisible();
      await expectNoHorizontalOverflow(page);
    }

    if (viewport.name === "mobile") {
      await expect(page.getByRole("navigation", { name: "Điều hướng chính" }).last())
        .toBeVisible();
      await page.getByRole("link", { name: "Trợ lý AI" }).last().click();
      await expect(page).toHaveURL(/\/assistant$/);
      await expect(page.getByLabel("Chat to ledger message")).toBeVisible();
    } else {
      await expect(page.getByRole("navigation", { name: "Điều hướng chính" }).first())
        .toBeVisible();
    }
  }
}

async function expectNoHorizontalOverflow(page: Page) {
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(hasOverflow).toBe(false);
}
