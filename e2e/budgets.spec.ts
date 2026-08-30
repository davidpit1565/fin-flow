import { test, expect } from "@playwright/test";
import { collectConsoleErrors, completeOnboarding, openSettings } from "./helpers";

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

  test("adding category budgets never renders a duplicate category chip (regression)", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await openSettings(page);
    await page.getByRole("button", { name: "Monthly budgets" }).click();

    // First category budget: the "Add" seed used to duplicate the first
    // available category into its own chip list (same id twice -> React
    // duplicate-key warning). Assert the chip appears exactly once.
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.locator(".chip-group.wrap").getByRole("button", { name: "Housing", exact: true })).toHaveCount(1);
    await page.getByLabel("Budget amount").fill("300");
    await page.getByRole("button", { name: "Housing", exact: true }).click();
    await page.locator(".sheet-footer").getByRole("button", { name: "Save budget" }).click();
    await expect(page.locator(".toast")).toContainText("Budget saved");

    // Second category budget: the seed now points at the next available
    // category (previously reproduced with "Food"). Same assertion.
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.locator(".chip-group.wrap").getByRole("button", { name: "Food", exact: true })).toHaveCount(1);
    await page.getByLabel("Budget amount").fill("150");
    await page.getByRole("button", { name: "Food", exact: true }).click();
    await page.locator(".sheet-footer").getByRole("button", { name: "Save budget" }).click();
    await expect(page.locator(".toast")).toContainText("Budget saved");

    await expect(page.getByText("Housing")).toBeVisible();
    await expect(page.getByText("Food")).toBeVisible();
    expect(errors.filter((e) => e.includes("same key"))).toEqual([]);
  });

  test("can still add a monthly budget after a category budget already exists (regression)", async ({ page }) => {
    await openSettings(page);
    await page.getByRole("button", { name: "Monthly budgets" }).click();

    // Add a category budget first, without ever setting an overall one --
    // this used to leave no way to ever create the overall budget, since
    // its only "create" button lived inside the now-hidden empty state.
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await page.getByLabel("Budget amount").fill("300");
    await page.getByRole("button", { name: "Food", exact: true }).click();
    await page.locator(".sheet-footer").getByRole("button", { name: "Save budget" }).click();
    await expect(page.locator(".toast")).toContainText("Budget saved");

    const addOverall = page.getByRole("button", { name: "Add monthly budget" });
    await expect(addOverall).toBeVisible();
    await addOverall.click();
    await page.getByLabel("Budget amount").fill("2000");
    await page.locator(".sheet-footer").getByRole("button", { name: "Save budget" }).click();
    await expect(page.locator(".toast")).toContainText("Budget saved");
    await expect(page.locator(".budget-card")).toContainText("2,000.00");
  });
});
