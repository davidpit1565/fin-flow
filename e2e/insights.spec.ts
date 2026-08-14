import { test, expect } from "@playwright/test";
import { addExpense, completeOnboarding } from "./helpers";

test.describe("insights", () => {
  test("reflects stored spending data", async ({ page }) => {
    await completeOnboarding(page);
    await addExpense(page, { amount: "25.00", merchant: "Groceries Run", category: "Groceries" });
    await page.getByRole("button", { name: "Insights", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Insights" })).toBeVisible();
    await expect(page.locator(".chart-card").first()).toContainText("Spending");
    await expect(page.getByText("By category")).toBeVisible();
    await expect(page.locator(".donut-legend")).toContainText("Groceries");
    await expect(page.getByText("Top category")).toBeVisible();
    await expect(page.locator(".insight-tile", { hasText: "Top category" })).toContainText("Groceries");
    await expect(page.getByText("Largest transaction")).toBeVisible();
  });
});
