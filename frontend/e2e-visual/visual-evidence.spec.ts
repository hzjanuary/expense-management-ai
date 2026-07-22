import { expect, test, type Locator, type Page, type Route } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const OUTPUT_DIR = path.resolve("visual-evidence-output");
const DEMO_MONTH = "2026-07";

test.describe.configure({ mode: "serial" });

test("captures TASK-UX-003B visual evidence", async ({ page }) => {
  await fs.rm(OUTPUT_DIR, { force: true, recursive: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/assistant");
  await expect(page.getByRole("heading", { level: 1, name: "Trợ lý" }))
    .toBeVisible();
  await expect(page.getByText("Bạn muốn ghi giao dịch hay hỏi số liệu?"))
    .toBeVisible();
  await screenshot(page, "assistant-empty-desktop.png");

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { level: 1, name: "Tổng quan" }))
    .toBeVisible();
  await expect(page.getByText(/Đang tải/)).toHaveCount(0);
  await screenshot(page, "app-shell-desktop.png");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { level: 1, name: "Tổng quan" }))
    .toBeVisible();
  await expect(page.getByRole("navigation", { name: "Điều hướng chính" }).last())
    .toBeVisible();
  await expect(page.getByText(/Đang tải/)).toHaveCount(0);
  await screenshot(page, "app-shell-mobile.png");

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/transactions");
  await expect(page.getByRole("heading", { level: 1, name: "Giao dịch" }))
    .toBeVisible();
  await expect(page.getByText("Chưa có giao dịch")).toBeVisible();
  await expect(page.getByText(/Đang tải/)).toHaveCount(0);
  await screenshot(page, "transactions-empty-desktop.png");

  await setupBudget(page);

  await page.goto("/assistant");
  await submitAssistant(page, "hôm nay tao ăn hộp cơm gà 28k");
  await expect(page.getByText("Bản nháp giao dịch").first()).toBeVisible();
  await expect(page.getByText("hôm nay tao ăn hộp cơm gà 28k")).toBeVisible();
  await expect(page.getByLabel("Chat to ledger message")).toHaveValue("");
  await expect(page.getByText("28.000 ₫").first()).toBeVisible();
  await expect(page.getByText("Cơm gà").first()).toBeVisible();
  await expect(page.getByText("Chưa được lưu").first()).toBeVisible();
  await screenshot(page, "assistant-draft-desktop.png");

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: "Xác nhận" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Hủy" })).toBeVisible();
  await screenshot(page, "assistant-draft-mobile.png");

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "Xác nhận" }).click();
  await expect(page.getByText(/Đã tạo giao dịch:/)).toBeVisible();

  await page.goto("/budgets");
  await expect(page.getByText("5.000.000 ₫").first()).toBeVisible();
  await expect(page.getByText("28.000 ₫").first()).toBeVisible();
  await expect(page.getByText("4.972.000 ₫").first()).toBeVisible();
  await expect(page.getByText("0,56%")).toBeVisible();
  await expect(page.getByText(/Đang tải/)).toHaveCount(0);
  await screenshot(page, "budgets-desktop.png");

  await page.goto("/assistant");

  await submitAssistant(
    page,
    "Tháng này tôi đã chi tổng cộng bao nhiêu?",
  );
  await expect(insightByHeading(page, "Tổng chi tiêu").getByText("28.000 ₫", { exact: true }))
    .toBeVisible();
  await expect(page.getByLabel("Chat to ledger message")).toHaveValue("");
  await screenshot(page, "assistant-total-result-desktop.png");

  await page.getByRole("button", { name: "Cuộc trò chuyện mới" }).click();
  await submitAssistant(page, "Tôi còn 100k");
  await expect(page.getByText(/Mình chưa chắc đây có phải một giao dịch không/))
    .toBeVisible();
  await expect(page.getByLabel("Chat to ledger message")).toHaveValue("");
  await screenshot(page, "assistant-clarification-desktop.png");

  await page.getByRole("button", { name: "Cuộc trò chuyện mới" }).click();
  await page.route("**/api/ai/parse", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      status: 503,
      body: JSON.stringify({
        error: "Trợ lý AI chưa sẵn sàng. Hãy kiểm tra Ollama trong phần Cài đặt.",
      }),
    });
  });
  await submitAssistant(page, "hôm nay tao ăn hộp cơm gà 28k");
  await expect(page.getByText("Trợ lý chưa sẵn sàng")).toBeVisible();
  await expect(page.getByRole("link", { name: "Mở Cài đặt" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Thử lại" })).toBeVisible();
  await expect(page.getByLabel("Chat to ledger message")).toHaveValue("");
  await screenshot(page, "assistant-provider-unavailable-desktop.png");
  await page.unroute("**/api/ai/parse");

  await page.goto("/dashboard");
  await expect(page.getByText("Số dư hiện tại")).toBeVisible();
  await expect(page.getByText(/^972\.000\s₫$/)).toBeVisible();
  await expect(page.getByText(/Đang tải/)).toHaveCount(0);
  await screenshot(page, "dashboard-desktop.png");

  await page.goto("/transactions");
  await expect(sectionByHeading(page, "Danh sách giao dịch").getByText("Cơm gà"))
    .toBeVisible();
  await expect(page.getByText(/Đang tải/)).toHaveCount(0);
  await screenshot(page, "transactions-populated-desktop.png");
  await captureSharedStateComposite(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/transactions");
  await expect(sectionByHeading(page, "Danh sách giao dịch").getByText("Cơm gà"))
    .toBeVisible();
  await screenshot(page, "transactions-populated-mobile.png");
  await openTransactionMenu(page, "Cơm gà");
  await page.getByRole("menuitem", { name: "Xóa giao dịch" }).click();
  await expect(page.getByRole("dialog", { name: "Xóa giao dịch?" }))
    .toBeVisible();
  await screenshot(page, "transactions-delete-sheet-mobile.png");
  await page.getByRole("dialog", { name: "Xóa giao dịch?" })
    .getByRole("button", { name: "Hủy" })
    .click();

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/settings");
  await expect(page.getByRole("heading", { level: 1, name: "Cài đặt" }))
    .toBeVisible();
  await expect(page.getByText("Dữ liệu nằm trên máy này.")).toBeVisible();
  await screenshot(page, "settings-desktop.png");
});

async function setupBudget(page: Page) {
  await page.goto("/budgets");
  await page.getByLabel("Tháng đang xem").fill(DEMO_MONTH);
  const budgetSetup = sectionByHeading(page, "Thiết lập ngân sách");
  await expect(budgetSetup.getByLabel(/Ngân sách tháng/)).toBeVisible();
  await budgetSetup.getByLabel(/Ngân sách tháng/).fill("5000000");
  await budgetSetup.getByRole("button", { name: "Thêm danh mục" }).click();
  await budgetSetup.getByRole("combobox", { name: "Danh mục" }).first()
    .selectOption("food");
  await budgetSetup.getByLabel("Ngân sách (VND)", { exact: true }).fill("2000000");
  await budgetSetup.getByRole("button", { name: "Lưu ngân sách" }).click();
  await expect(budgetSetup.getByText("Đã lưu ngân sách.")).toBeVisible();
}

async function submitAssistant(page: Page, message: string) {
  await page.getByLabel("Chat to ledger message").fill(message);
  await page.getByRole("button", { name: "Gửi" }).click();
}

async function openTransactionMenu(page: Page, description: string) {
  await page
    .getByRole("button", {
      name: new RegExp(`Mở menu giao dịch ${escapeRegExp(description)}`),
    })
    .first()
    .click();
}

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

async function screenshot(page: Page, filename: string) {
  await page.screenshot({
    fullPage: false,
    path: path.join(OUTPUT_DIR, filename),
  });
}

async function captureSharedStateComposite(page: Page) {
  const partsDir = path.join(OUTPUT_DIR, "_shared-parts");
  await fs.mkdir(partsDir, { recursive: true });

  const heldLoadingRoutes: Route[] = [];
  await page.route("**/api/dashboard/summary**", (route) => {
    heldLoadingRoutes.push(route);
  });
  await page.goto("/dashboard");
  await expect(page.getByText(/Đang tải/).first()).toBeVisible();
  await page.screenshot({
    fullPage: false,
    path: path.join(partsDir, "loading.png"),
  });
  await Promise.allSettled(heldLoadingRoutes.map((route) => route.abort()));
  await page.unroute("**/api/dashboard/summary**");

  await page.goto("/assistant");
  await page.route("**/api/ai/parse", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      status: 503,
      body: JSON.stringify({
        error: "Trợ lý AI chưa sẵn sàng. Hãy kiểm tra Ollama trong phần Cài đặt.",
      }),
    });
  });
  await submitAssistant(page, "hôm nay tao ăn hộp cơm gà 28k");
  await expect(page.getByText("Trợ lý chưa sẵn sàng")).toBeVisible();
  await page.screenshot({
    fullPage: false,
    path: path.join(partsDir, "error.png"),
  });
  await page.unroute("**/api/ai/parse");

  await page.goto("/transactions");
  await expect(page.getByText("Cơm gà")).toBeVisible();
  await openTransactionMenu(page, "Cơm gà");
  await page.getByRole("menuitem", { name: "Xóa giao dịch" }).click();
  await expect(page.getByRole("dialog", { name: "Xóa giao dịch?" }))
    .toBeVisible();
  await page.screenshot({
    fullPage: false,
    path: path.join(partsDir, "dialog.png"),
  });
  await page.getByRole("dialog", { name: "Xóa giao dịch?" })
    .getByRole("button", { name: "Hủy" })
    .click();

  await page.goto("/transactions");
  await page.getByPlaceholder("Tìm giao dịch").fill("khong-co-giao-dich");
  await expect(page.getByText("Không có giao dịch phù hợp")).toBeVisible();
  await page.screenshot({
    fullPage: false,
    path: path.join(partsDir, "empty.png"),
  });

  await page.setContent(`
    <!doctype html>
    <html lang="vi">
      <head>
        <meta charset="utf-8" />
        <style>
          body { margin: 0; background: #f5f3ee; font-family: Arial, sans-serif; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 12px; }
          figure { margin: 0; border: 1px solid #ddd6c8; background: white; }
          figcaption { padding: 8px 10px; font: 600 13px Arial, sans-serif; color: #223128; border-bottom: 1px solid #ddd6c8; }
          img { display: block; width: 100%; height: 372px; object-fit: cover; object-position: top left; }
        </style>
      </head>
      <body>
        <div class="grid">
          <figure><figcaption>Loading</figcaption><img src="file://${path.join(partsDir, "loading.png")}"></figure>
          <figure><figcaption>Error/unavailable</figcaption><img src="file://${path.join(partsDir, "error.png")}"></figure>
          <figure><figcaption>Destructive confirmation</figcaption><img src="file://${path.join(partsDir, "dialog.png")}"></figure>
          <figure><figcaption>Empty state</figcaption><img src="file://${path.join(partsDir, "empty.png")}"></figure>
        </div>
      </body>
    </html>
  `);
  await screenshot(page, "shared-loading-error-dialog.png");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
