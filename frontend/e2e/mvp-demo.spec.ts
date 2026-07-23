import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import fs from "node:fs/promises";

const DEMO_MONTH = "2026-07";
const DEMO_MESSAGE = "hôm nay tao ăn hộp cơm gà 28k";
const TOTAL_SPENDING_QUERY = "Tháng này tôi đã chi tổng cộng bao nhiêu?";
const SPENDING_QUERY = "Tháng này tôi ăn uống hết bao nhiêu?";
const BUDGET_QUERY = "Còn bao nhiêu tiền ăn tháng này?";
const BREAKDOWN_QUERY = "Tuần này tôi tiêu nhiều nhất vào mục nào?";

test.describe.configure({ mode: "serial" });

test("complete local-first MVP demo", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { level: 1, name: "Tổng quan" }))
    .toBeVisible();
  await page.getByLabel("Tháng đang xem").fill(DEMO_MONTH);

  const dashboard = page.locator("body");
  const dashboardBudget = sectionByHeading(page, "Tình trạng ngân sách");
  const dashboardTransactions = sectionByHeading(page, "Giao dịch gần đây");

  await expectMoney(dashboard, "1.000.000");
  await expect(dashboardTransactions.getByText("Chưa có giao dịch"))
    .toBeVisible();
  await expect(dashboardBudget.getByText("Chưa thiết lập ngân sách"))
    .toBeVisible();
  await expect(page.getByLabel("Chat to ledger message")).toHaveCount(0);
  await expect(page.getByText("Xuất dữ liệu")).toHaveCount(0);
  await expect(page.getByText("Lịch sử AI")).toHaveCount(0);
  await expectNoCriticalOrSeriousA11yViolations(page, "dashboard overview");

  await page.getByRole("link", { name: "Ngân sách" }).first().click();
  await expect(page).toHaveURL(/\/budgets$/);
  await page.getByLabel("Tháng đang xem").fill(DEMO_MONTH);
  const budgetStatus = sectionByHeading(page, "Tình trạng ngân sách");
  const budgetSetup = sectionByHeading(page, "Thiết lập ngân sách");
  await expectNoCriticalOrSeriousA11yViolations(page, "budget setup page");
  await budgetSetup.getByLabel(/Ngân sách tháng/).fill("5000000");
  await budgetSetup.getByRole("button", { name: "Thêm danh mục" }).click();
  await budgetSetup.getByRole("combobox", { name: "Danh mục" }).first().selectOption(
    "food",
  );
  await budgetSetup.getByLabel("Ngân sách danh mục", { exact: true }).fill("2000000");
  await budgetSetup.getByRole("button", { name: "Lưu ngân sách" }).click();
  await expect(budgetSetup.getByText("Đã lưu ngân sách.")).toBeVisible();
  await expectMoney(budgetStatus, "5.000.000");
  await expectMoney(budgetStatus, "2.000.000");
  await expectMoney(budgetStatus, "0");
  await expect(budgetStatus.getByText("Còn trong ngân sách").first()).toBeVisible();

  await page.getByRole("link", { name: "Trợ lý" }).first().click();
  await expect(page).toHaveURL(/\/assistant$/);
  const assistant = page.locator("main");
  await expectNoCriticalOrSeriousA11yViolations(page, "assistant empty");
  await assistant.getByLabel("Chat to ledger message").fill(DEMO_MESSAGE);
  await assistant.getByRole("button", { name: "Gửi" }).click();
  await expect(assistant.getByText("Bản nháp giao dịch").first()).toBeVisible();
  await expect(assistant.getByText("Chi").first()).toBeVisible();
  await expectMoney(assistant, "28.000");
  await expect(assistant.getByText("Ăn uống").first()).toBeVisible();
  await expect(assistant.getByText("Chưa được lưu").first()).toBeVisible();
  await expect(assistant.getByRole("button", { name: "Xác nhận" })).toBeVisible();
  await expect(assistant.getByRole("button", { name: "Hủy" })).toBeVisible();
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

  await assistant.getByRole("button", { name: "Xác nhận" }).click();
  await expect(assistant.getByText(/Đã tạo giao dịch:/)).toBeVisible();
  await expect(page).toHaveURL(/\/assistant$/);

  await page.getByRole("link", { name: "Tổng quan" }).first().click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expectMoney(page.locator("body"), "972.000");
  await expectMoney(page.locator("body"), "28.000");
  await expect(sectionByHeading(page, "Giao dịch gần đây").getByText("Cơm gà"))
    .toBeVisible();
  await expectMoney(sectionByHeading(page, "Tình trạng ngân sách"), "4.972.000");
  await page.getByRole("link", { name: "Ngân sách" }).first().click();
  await expectMoney(sectionByHeading(page, "Tình trạng ngân sách"), "1.972.000");

  await page.getByRole("link", { name: "Trợ lý" }).first().click();
  await submitChat(page, TOTAL_SPENDING_QUERY);
  const totalSpendingInsight = insightByHeading(page, "Tổng chi tiêu");
  await expect(totalSpendingInsight.getByText("Danh mục")).toHaveCount(0);
  await expectMoney(totalSpendingInsight, "28.000");
  await expect(totalSpendingInsight.getByText("Số giao dịch").locator("..")).toContainText("1");
  await expect(totalSpendingInsight.getByText("Tháng 7, 2026")).toBeVisible();

  await submitChat(page, SPENDING_QUERY);
  const spendingInsight = insightByHeading(page, "Chi tiêu theo danh mục");
  await expect(spendingInsight.getByText("Ăn uống", { exact: true })).toBeVisible();
  await expectMoney(spendingInsight, "28.000");
  await expect(spendingInsight.getByText("Số giao dịch").locator("..")).toContainText("1");
  await expect(spendingInsight.getByText("Tháng 7, 2026")).toBeVisible();
  await expectNoCriticalOrSeriousA11yViolations(page, "insight result");

  await submitChat(page, BUDGET_QUERY);
  const budgetInsight = insightByHeading(page, "Ngân sách còn lại");
  await expectMoney(budgetInsight, "2.000.000");
  await expectMoney(budgetInsight, "28.000");
  await expectMoney(budgetInsight, "1.972.000");
  await expect(budgetInsight.getByText("Còn trong ngân sách").first()).toBeVisible();
  await expect(budgetInsight.getByText("Số giao dịch").locator("..")).toContainText("1");

  await submitChat(page, BREAKDOWN_QUERY);
  const breakdownInsight = insightByHeading(page, "Chi nhiều nhất");
  await expectMoney(breakdownInsight, "28.000");
  await expect(breakdownInsight.getByText("Ăn uống", { exact: true })).toBeVisible();
  await expect(breakdownInsight.getByText("100,00%")).toBeVisible();
  await expect(breakdownInsight.getByText("Số giao dịch").locator("..")).toContainText("1");

  await page.getByRole("link", { name: "Giao dịch" }).first().click();
  await expect(page).toHaveURL(/\/transactions$/);
  const transactions = sectionByHeading(page, "Danh sách giao dịch");
  await expect(transactions.getByText("Cơm gà")).toBeVisible();
  await page.getByRole("button", { name: "Xuất dữ liệu" }).click();
  const exportPanel = page.locator("body");

  const csvDownload = await downloadFromExportPanel(exportPanel);
  expect(csvDownload.suggestedFilename()).toMatch(/\.csv$/);
  const csvPath = await csvDownload.path();
  expect(csvPath).not.toBeNull();
  const csv = await fs.readFile(csvPath ?? "", "utf8");
  expect(csv).toContain("Cơm gà");
  expect(csv).toContain("ai_chat");
  expect(csv).not.toContain("raw_user_text");
  expect(csv).not.toContain("parser_confidence");
  expect(csv).not.toContain("provider_name");

  await exportPanel.getByLabel("Định dạng").selectOption("json");
  const jsonDownload = await downloadFromExportPanel(exportPanel);
  expect(jsonDownload.suggestedFilename()).toMatch(/\.json$/);
  const jsonPath = await jsonDownload.path();
  expect(jsonPath).not.toBeNull();
  const jsonPayload = JSON.parse(await fs.readFile(jsonPath ?? "", "utf8")) as {
    transactions: Array<Record<string, unknown>>;
  };
  const exportedTransaction = jsonPayload.transactions.find(
    (item) => item.description === "Cơm gà",
  );
  expect(exportedTransaction).toMatchObject({
    amount_minor: 28000,
    category_slug: "food",
    currency: "VND",
    description: "Cơm gà",
    source: "ai_chat",
    type: "expense",
  });
  expect(exportedTransaction).not.toHaveProperty("deleted_at");
  expect(exportedTransaction).not.toHaveProperty("raw_user_text");
  expect(exportedTransaction).not.toHaveProperty("parser_confidence");
  expect(exportedTransaction).not.toHaveProperty("provider_name");

  await openTransactionDelete(transactions, "Cơm gà");
  const deleteDialog = page.getByRole("dialog", { name: "Xóa giao dịch?" });
  await expect(deleteDialog.getByText(/màn hình đang dùng/)).toBeVisible();
  await expect(deleteDialog.getByText(/số dư sẽ được hoàn lại/)).toBeVisible();
  await expectNoCriticalOrSeriousA11yViolations(page, "transaction delete dialog");
  await deleteDialog.getByRole("button", { name: "Hủy" }).click();
  await expect(transactions.getByText("Cơm gà")).toBeVisible();

  await openTransactionDelete(transactions, "Cơm gà");
  await page
    .getByRole("dialog", { name: "Xóa giao dịch?" })
    .getByRole("button", { name: "Xóa giao dịch" })
    .click();
  await expect(transactions.getByText("Chưa có giao dịch")).toBeVisible();

  await page.getByRole("link", { name: "Tổng quan" }).first().click();
  await expectMoney(page.locator("body"), "1.000.000");
  await expectMoney(page.locator("body"), "0");
  await expectMoney(sectionByHeading(page, "Tình trạng ngân sách"), "5.000.000");
  await expect(sectionByHeading(page, "Giao dịch gần đây").getByText("Chưa có giao dịch"))
    .toBeVisible();
  await page.getByRole("link", { name: "Ngân sách" }).first().click();
  await expectMoney(sectionByHeading(page, "Tình trạng ngân sách"), "2.000.000");

  await page.getByRole("link", { name: "Cài đặt" }).first().click();
  await expect(page).toHaveURL(/\/settings$/);
  const historyPanel = sectionByHeading(page, "Lịch sử AI");
  await historyPanel.getByRole("button", { name: "Xóa lịch sử AI" }).click();
  await expect(
    historyPanel.getByText(/Giao dịch đã xác nhận, số dư và ngân sách vẫn được giữ nguyên/),
  ).toBeVisible();
  await expect(historyPanel.getByText(/không xóa lịch sử giao dịch/))
    .toBeVisible();
  await expectNoCriticalOrSeriousA11yViolations(page, "clear AI history dialog");
  await historyPanel
    .getByRole("button", { name: "Xóa lịch sử AI" })
    .last()
    .click();
  await expect(historyPanel.getByText(/Đã xóa \d+ bản ghi lịch sử AI/)).toBeVisible();

  await historyPanel.getByRole("button", { name: "Xóa lịch sử AI" }).click();
  await historyPanel
    .getByRole("button", { name: "Xóa lịch sử AI" })
    .last()
    .click();
  await expect(historyPanel.getByText(/Đã xóa 0 bản ghi lịch sử AI/)).toBeVisible();

  await page.getByRole("link", { name: "Tổng quan" }).first().click();
  await expectMoney(page.locator("body"), "1.000.000");
  await expectMoney(page.locator("body"), "0");
  await expectMoney(sectionByHeading(page, "Tình trạng ngân sách"), "5.000.000");
  await expect(sectionByHeading(page, "Giao dịch gần đây").getByText("Chưa có giao dịch"))
    .toBeVisible();

  await expectResponsiveRoutes(page);
});

const responsiveRoutes = [
  { path: "/dashboard", heading: "Tổng quan" },
  { path: "/transactions", heading: "Giao dịch" },
  { path: "/budgets", heading: "Ngân sách" },
  { path: "/assistant", heading: "Trợ lý" },
  { path: "/settings", heading: "Cài đặt" },
] as const;

const responsiveViewports = [
  { name: "mobile", width: 375, height: 812 },
  { name: "mobile-wide", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop-compact", width: 1280, height: 800 },
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
  const assistant = page.locator("main");
  await assistant.getByLabel("Chat to ledger message").fill(message);
  await assistant.getByRole("button", { name: "Gửi" }).click();
}

async function downloadFromExportPanel(exportPanel: Locator) {
  const page = exportPanel.page();
  const downloadPromise = page.waitForEvent("download");
  await exportPanel.getByRole("button", { name: "Tải xuống" }).click();
  return downloadPromise;
}

async function openTransactionDelete(
  transactions: Locator,
  description: string,
) {
  await transactions
    .getByRole("button", {
      name: new RegExp(`Mở menu giao dịch ${escapeRegExp(description)}`),
    })
    .click();
  await transactions.getByRole("menuitem", { name: "Xóa giao dịch" }).click();
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

    if (viewport.name === "mobile" || viewport.name === "mobile-wide") {
      await expect(page.getByRole("navigation", { name: "Điều hướng chính" }).last())
        .toBeVisible();
      await page.getByRole("link", { name: "Trợ lý" }).last().click();
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
