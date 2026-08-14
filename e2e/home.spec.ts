import { test, expect } from "@playwright/test";
import { addExpense, addIncome, addSubscription, completeOnboarding, tomorrowISO } from "./helpers";

test.describe("home", () => {
  test("reflects expenses, income, and subscriptions from stored data", async ({ page }) => {
    await completeOnboarding(page);
    await addExpense(page, { amount: "4.80", merchant: "Coffee" });
    await addIncome(page, { amount: "100", merchant: "Salary" });
    await addSubscription(page, { name: "Netflix", amount: "17.99", nextPaymentDate: tomorrowISO() });
    await page.getByRole("button", { name: "Home", exact: true }).click();

    const expensesTile = page.locator(".stat-tile", { hasText: "Expenses" });
    await expect(expensesTile).toContainText("4.80");
    const subsTile = page.locator(".stat-tile", { hasText: "Subscriptions" });
    await expect(subsTile).toContainText("17.99");
    const upcomingTile = page.locator(".stat-tile", { hasText: "Upcoming" });
    await expect(upcomingTile).toContainText("17.99");

    await expect(page.getByText("Coming up")).toBeVisible();
    await expect(page.getByText("Netflix")).toBeVisible();
  });
});
