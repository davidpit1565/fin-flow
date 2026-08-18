import { test, expect } from "@playwright/test";
import { addExpense, completeOnboarding, openSettings } from "./helpers";

test.describe("categories", () => {
  test.beforeEach(async ({ page }) => {
    await completeOnboarding(page);
  });

  test("deleting a used category requires picking a real destination before it can proceed (regression)", async ({ page }) => {
    await addExpense(page, { amount: "42", merchant: "Orphan check", category: "Food" });
    await openSettings(page);
    await page.getByRole("button", { name: "Manage categories" }).click();

    const foodRow = page.locator(".row", { hasText: "Food" });
    await foodRow.getByRole("button", { name: "Delete Food" }).click();
    await page.getByRole("button", { name: "Reassign & delete" }).click();

    // The button must start disabled -- no destination has been chosen yet.
    const moveBtn = page.getByRole("button", { name: /Move items & delete/ });
    await expect(moveBtn).toBeDisabled();

    // Choosing a destination enables it, and the reassignment actually happens.
    await page.getByRole("button", { name: "Groceries", exact: true }).click();
    await expect(moveBtn).toBeEnabled();
    await moveBtn.click();
    await expect(page.getByText("Food", { exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: "Back" }).click();
    await page.getByRole("button", { name: "Back" }).click();
    await page.getByRole("button", { name: "Transactions", exact: true }).click();
    await page.getByText("Orphan check").click();
    await expect(page.locator(".detail-row-value").first()).toHaveText("Groceries");
  });

  test("deleting a budgeted-but-unused category also removes its budget, leaving no orphaned entry", async ({ page }) => {
    await openSettings(page);
    await page.getByRole("button", { name: "Monthly budgets" }).click();
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await page.getByLabel("Budget amount").fill("500");
    await page.getByRole("button", { name: "Housing", exact: true }).click();
    await page.locator(".sheet-footer").getByRole("button", { name: "Save budget" }).click();
    await expect(page.getByText("Housing")).toBeVisible();

    await page.getByRole("button", { name: "Back" }).click();
    await page.getByRole("button", { name: "Manage categories" }).click();
    const housingRow = page.locator(".row", { hasText: "Housing" });
    await housingRow.getByRole("button", { name: "Delete Housing" }).click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page.getByText("Housing", { exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: "Back" }).click();
    await page.getByRole("button", { name: "Monthly budgets" }).click();
    await expect(page.getByText("Add budgets for categories")).toBeVisible();
    await expect(page.locator(".budget-list")).toHaveCount(0);
  });

  test("the last remaining category cannot be deleted", async ({ page }) => {
    await openSettings(page);
    await page.getByRole("button", { name: "Manage categories" }).click();

    for (let i = 0; i < 12; i++) {
      await page.locator('button[aria-label^="Delete "]').first().click();
      await page.getByRole("button", { name: "Delete", exact: true }).click();
    }
    await expect(page.locator(".row-title")).toHaveCount(1);

    await page.locator('button[aria-label^="Delete "]').click();
    await expect(page.locator(".row-title")).toHaveCount(1);
    await expect(page.locator(".toast")).toContainText("at least one category");
  });

  test("duplicate category names (including case/whitespace variants) are rejected", async ({ page }) => {
    await openSettings(page);
    await page.getByRole("button", { name: "Manage categories" }).click();

    await page.getByRole("button", { name: "Add category" }).click();
    await page.getByLabel("Name", { exact: true }).fill("Groceries");
    await page.locator(".sheet-footer").getByRole("button", { name: "Add category" }).click();
    await expect(page.getByRole("heading", { name: "Add category" })).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();

    await page.getByRole("button", { name: "Add category" }).click();
    await page.getByLabel("Name", { exact: true }).fill("  GROCERIES  ");
    await page.locator(".sheet-footer").getByRole("button", { name: "Add category" }).click();
    await expect(page.getByRole("heading", { name: "Add category" })).toBeVisible();

    await expect(page.getByText("Groceries", { exact: true })).toHaveCount(1);
  });

  test("renaming a category to its own current name is still allowed", async ({ page }) => {
    await openSettings(page);
    await page.getByRole("button", { name: "Manage categories" }).click();
    const foodRow = page.locator(".row", { hasText: "Food" });
    await foodRow.getByRole("button", { name: "Edit Food" }).click();
    await page.getByLabel("Name", { exact: true }).fill("Food");
    await page.locator(".sheet-footer").getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("heading", { name: "Edit category" })).toHaveCount(0);
    await expect(page.getByText("Food", { exact: true })).toBeVisible();
  });
});
