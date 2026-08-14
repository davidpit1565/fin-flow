import { test, expect } from "@playwright/test";
import { completeOnboarding, openSettings } from "./helpers";

test.describe("budgets", () => {
  test.beforeEach(async ({ page }) => {
    await completeOnboarding(page);
  });

  test("creates an overall monthly budget and reflects it on Home", async ({ page }) => {
    await openSettings(page);
    await page.getByRole("button", { name: "Monthly budgets" }).click();
    await expect(page.getByRole("heading", { name: "Budgets", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Set monthly budget" }).click();
    await page.getByLabel("Budget amount").fill("1500");
    await page.locator(".sheet-footer").getByRole("button", { name: "Save budget" }).click();
    await expect(page.locator(".toast")).toContainText("Budget saved");
    await expect(page.getByText("Monthly budget")).toBeVisible();

    // Back out of Settings (tab bar is hidden there) to reach Home.
    await page.getByRole("button", { name: "Back" }).click();
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByRole("heading", { name: "Your finances" })).toBeVisible();
    await expect(page.getByText("Monthly budget")).toBeVisible();
    await expect(page.locator(".budget-card")).toContainText("1,500.00");
  });

  test("creates a category budget", async ({ page }) => {
    await openSettings(page);
    await page.getByRole("button", { name: "Monthly budgets" }).click();
    await expect(page.getByRole("heading", { name: "Budgets", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await page.getByLabel("Budget amount").fill("300");
    await page.getByRole("button", { name: "Food", exact: true }).click();
    await page.locator(".sheet-footer").getByRole("button", { name: "Save budget" }).click();
    await expect(page.locator(".toast")).toContainText("Budget saved");
    await expect(page.getByText("Category budgets")).toBeVisible();
    await expect(page.getByText("Food")).toBeVisible();
  });
});
