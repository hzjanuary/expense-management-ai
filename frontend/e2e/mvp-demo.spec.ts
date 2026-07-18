import { expect, test, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";

const DEMO_MONTH = "2026-07";
const DEMO_MESSAGE = "Hôm nay tôi tiêu 35k vào ăn trưa";
const SPENDING_QUERY = "Tháng này tôi ăn uống hết bao nhiêu?";
const BUDGET_QUERY = "Còn bao nhiêu tiền ăn tháng này?";
const BREAKDOWN_QUERY = "Tuần này tôi tiêu nhiều nhất vào mục nào?";

test.describe.configure({ mode: "serial" });

test("complete local-first MVP demo", async ({ page }) => {
  const initialUrl = "/dashboard";

  await page.goto(initialUrl);
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByLabel("Selected month").fill(DEMO_MONTH);

  const dashboard = page.locator("body");
  const budgetStatus = sectionByHeading(page, "Budget status");
  const chat = sectionByLegend(page, "Chat to ledger");
  const transactions = sectionByHeading(page, "Recent Transactions");
  const exportPanel = sectionByHeading(page, "Export Transactions");
  const historyPanel = sectionByHeading(page, "AI History Privacy");

  await expectMoney(dashboard, "1.000.000");
  await expect(transactions.getByText("No transactions yet.")).toBeVisible();
  await expect(
    budgetStatus.getByText("No budget configured for this month."),
  ).toBeVisible();
  await expect(page.getByText(/failed to load|stack trace|backend:/i)).toHaveCount(
    0,
  );
  await expectNoCriticalOrSeriousA11yViolations(page, "initial dashboard");

  await page.getByRole("button", { name: "Set up budget" }).first().click();
  const budgetSetup = sectionByHeading(page, "Budget setup");
  await expectNoCriticalOrSeriousA11yViolations(page, "budget setup form");
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

  await chat.getByLabel("Chat to ledger message").fill(DEMO_MESSAGE);
  await chat.getByRole("button", { name: "Send" }).click();
  await expect(chat.getByText("Review AI Draft").first()).toBeVisible();
  await expect(chat.getByText("expense").first()).toBeVisible();
  await expectMoney(chat, "35.000");
  await expect(chat.getByText("Food").first()).toBeVisible();
  await expect(chat.getByText("ai_chat").first()).toBeVisible();
  await expect(chat.getByRole("button", { name: "Confirm" })).toBeVisible();
  await expect(chat.getByRole("button", { name: "Cancel" })).toBeVisible();
  await expectNoCriticalOrSeriousA11yViolations(page, "AI draft review");
  await expect(transactions.getByText("No transactions yet.")).toBeVisible();
  await expectMoney(dashboard, "1.000.000");
  await expectMoney(dashboard, "0");

  await chat.getByRole("button", { name: "Confirm" }).click();
  await expect(chat.getByText(/Transaction created:/)).toBeVisible();
  await expect(transactions.getByText("ăn trưa")).toBeVisible();
  await expectMoney(dashboard, "965.000");
  await expectMoney(dashboard, "35.000");
  await expectMoney(budgetStatus, "35.000");
  await expectMoney(budgetStatus, "1.965.000");
  await expect(page).toHaveURL(/\/dashboard$/);

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
  await page.getByRole("dialog", { name: "Delete transaction?" })
    .getByRole("button", { name: "Delete transaction" })
    .click();
  await expect(
    transactions.getByText("No transactions yet."),
  ).toBeVisible();
  await expectMoney(dashboard, "1.000.000");
  await expectMoney(dashboard, "0");
  await expectMoney(budgetStatus, "2.000.000");
  await expectMoney(budgetStatus, "0");
  await expect(page.getByText(/Financial data changed/).first()).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard$/);

  await historyPanel.getByRole("button", { name: "Clear AI history" }).click();
  await expect(
    historyPanel.getByText(/Confirmed transactions and account balances remain unchanged/),
  ).toBeVisible();
  await expect(
    historyPanel.getByText(/does not clear transaction history/),
  ).toBeVisible();
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

  await expectMoney(dashboard, "1.000.000");
  await expectMoney(dashboard, "0");
  await expectMoney(budgetStatus, "5.000.000");
  await expectMoney(budgetStatus, "2.000.000");
  await expect(transactions.getByText("No transactions yet.")).toBeVisible();
});

function sectionByHeading(page: Page, heading: string): Locator {
  return page.locator("section").filter({
    has: page.getByRole("heading", { name: heading }),
  });
}

function sectionByLegend(page: Page, legend: string): Locator {
  return page.locator("section").filter({
    has: page.getByText(legend, { exact: true }),
  });
}

function insightByHeading(page: Page, heading: string): Locator {
  return page.locator("article").filter({
    has: page.getByRole("heading", { name: heading }),
  }).first();
}

async function submitChat(page: Page, message: string) {
  const chat = sectionByLegend(page, "Chat to ledger");
  await chat.getByLabel("Chat to ledger message").fill(message);
  await chat.getByRole("button", { name: "Send" }).click();
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
  const blockingViolations = results.violations.filter((violation) =>
    violation.impact === "critical" || violation.impact === "serious"
  );

  expect(
    blockingViolations,
    `${context} has critical or serious accessibility violations`,
  ).toEqual([]);
}
