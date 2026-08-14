import { test, expect } from "@playwright/test";
import { addExpense, addIncome, completeOnboarding, openAddSheet } from "./helpers";

test.describe("transactions", () => {
  test.beforeEach(async ({ page }) => {
    await completeOnboarding(page);
  });

  test("edits a transaction", async ({ page }) => {
    await addExpense(page, { amount: "10.00", merchant: "Before" });
    await page.getByRole("button", { name: "Transactions", exact: true }).click();
    await page.getByText("Before").click();
    await expect(page.getByRole("button", { name: "Edit" })).toBeVisible();
    await page.getByRole("button", { name: "Edit" }).click();
    await expect(page.getByRole("heading", { name: "Edit transaction" })).toBeVisible();
    await page.getByLabel("Amount").fill("25.50");
    await page.getByLabel("Merchant").fill("After");
    await page.locator(".sheet-footer").getByRole("button", { name: "Save changes" }).click();
    await expect(page.locator(".toast")).toContainText("Changes saved");
    await expect(page.getByText("After")).toBeVisible();
    await expect(page.getByText("25.50")).toBeVisible();
  });

  test("deletes a transaction with confirmation", async ({ page }) => {
    await addExpense(page, { amount: "10.00", merchant: "Delete Me" });
    await page.getByRole("button", { name: "Transactions", exact: true }).click();
    await page.getByText("Delete Me").click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page.locator(".dialog")).toBeVisible();
    await page.locator(".dialog").getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page.locator(".toast")).toContainText("Deleted");
    await expect(page.getByText("Delete Me")).toHaveCount(0);
    await expect(page.getByText("Nothing here yet")).toBeVisible();
  });

  test("creates a recurring transaction and filters to it", async ({ page }) => {
    await openAddSheet(page);
    await page.getByLabel("Amount").fill("9.99");
    await page.getByRole("radio", { name: "Entertainment", exact: true }).click();
    await page.getByLabel("Merchant").fill("Netflix Monthly");
    await page.getByRole("switch", { name: "Recurring transaction" }).click();
    await page.locator(".sheet-footer").getByRole("button", { name: "Add expense" }).click();
    await expect(page.locator(".toast")).toContainText("Expense added");

    await page.getByRole("button", { name: "Transactions", exact: true }).click();
    await page.getByRole("button", { name: "Recurring", exact: true }).click();
    await expect(page.getByText("Netflix Monthly")).toBeVisible();
  });

  test("searches and filters transactions", async ({ page }) => {
    await addExpense(page, { amount: "4.80", merchant: "Coffee Shop" });
    await addExpense(page, { amount: "16.40", merchant: "Uber" });
    await addIncome(page, { amount: "2400", merchant: "Salary" });
    await page.getByRole("button", { name: "Transactions", exact: true }).click();

    await page.getByLabel("Search transactions").fill("coffee");
    await expect(page.getByText("Coffee Shop")).toBeVisible();
    await expect(page.getByText("Uber")).toHaveCount(0);
    await page.getByLabel("Search transactions").fill("");

    await page.getByRole("button", { name: "Income", exact: true }).click();
    await expect(page.getByText("Salary")).toBeVisible();
    await expect(page.getByText("Coffee Shop")).toHaveCount(0);

    await page.getByRole("button", { name: "Expenses", exact: true }).click();
    await expect(page.getByText("Coffee Shop")).toBeVisible();
    await expect(page.getByText("Salary")).toHaveCount(0);
  });

  test("rejects an empty amount", async ({ page }) => {
    await openAddSheet(page);
    await page.locator(".sheet-footer").getByRole("button", { name: "Add expense" }).click();
    await expect(page.getByText("Enter a valid amount.")).toBeVisible();
  });
});
