import { test, expect } from "@playwright/test";
import { completeOnboarding, openSettings } from "./helpers";

test.describe("goals", () => {
  test.beforeEach(async ({ page }) => {
    await completeOnboarding(page);
  });

  test("shows an empty state before any goal exists", async ({ page }) => {
    await openSettings(page);
    await page.getByRole("button", { name: "Savings goals" }).click();
    await expect(page.getByRole("heading", { name: "Savings Goals", exact: true })).toBeVisible();
    await expect(page.getByText("No goals yet")).toBeVisible();
  });

  test("creates a goal, adds funds, and sees progress update", async ({ page }) => {
    await openSettings(page);
    await page.getByRole("button", { name: "Savings goals" }).click();
    await page.getByRole("button", { name: "Add goal" }).first().click();
    await expect(page.getByRole("heading", { name: "Add goal" })).toBeVisible();
    await page.getByLabel("Name").fill("New laptop");
    await page.getByLabel("Target amount").fill("2000");
    await page.locator(".sheet-footer").getByRole("button", { name: "Add goal" }).click();
    await expect(page.locator(".toast")).toContainText("Goal added");
    await expect(page.getByText("New laptop")).toBeVisible();

    const goalItem = page.locator(".budget-item", { hasText: "New laptop" });
    await goalItem.getByRole("button", { name: "Add funds" }).click();
    await expect(page.getByRole("heading", { name: "New laptop" })).toBeVisible();
    await page.getByLabel("Contribution amount").fill("500");
    await page.locator(".sheet-footer").getByRole("button", { name: "Add funds" }).click();
    await expect(page.locator(".toast")).toContainText("Funds added");
    await expect(goalItem).toContainText("500.00");
    await expect(goalItem).toContainText("25%");
  });

  test("records a withdrawal from a goal", async ({ page }) => {
    await openSettings(page);
    await page.getByRole("button", { name: "Savings goals" }).click();
    await page.getByRole("button", { name: "Add goal" }).first().click();
    await page.getByLabel("Name").fill("Vacation");
    await page.getByLabel("Target amount").fill("1000");
    await page.locator(".sheet-footer").getByRole("button", { name: "Add goal" }).click();
    await expect(page.locator(".toast")).toContainText("Goal added");

    const goalItem = page.locator(".budget-item", { hasText: "Vacation" });
    await goalItem.getByRole("button", { name: "Add funds" }).click();
    await page.getByLabel("Contribution amount").fill("400");
    await page.locator(".sheet-footer").getByRole("button", { name: "Add funds" }).click();
    await expect(page.locator(".toast")).toContainText("Funds added");
    await expect(goalItem).toContainText("400.00");

    await goalItem.getByRole("button", { name: "Add funds" }).click();
    await page.getByRole("tab", { name: "Withdraw" }).click();
    await page.getByLabel("Contribution amount").fill("150");
    await page.locator(".sheet-footer").getByRole("button", { name: "Withdraw" }).click();
    await expect(page.locator(".toast")).toContainText("Withdrawal recorded");
    await expect(goalItem).toContainText("250.00");
  });

  test("edits a goal's name and target", async ({ page }) => {
    await openSettings(page);
    await page.getByRole("button", { name: "Savings goals" }).click();
    await page.getByRole("button", { name: "Add goal" }).first().click();
    await page.getByLabel("Name").fill("Emergency fund");
    await page.getByLabel("Target amount").fill("500");
    await page.locator(".sheet-footer").getByRole("button", { name: "Add goal" }).click();
    await expect(page.locator(".toast")).toContainText("Goal added");

    const goalItem = page.locator(".budget-item", { hasText: "Emergency fund" });
    await goalItem.getByRole("button", { name: "Edit Emergency fund" }).click();
    await expect(page.getByRole("heading", { name: "Edit goal" })).toBeVisible();
    await page.getByLabel("Name").fill("Rainy day fund");
    await page.getByLabel("Target amount").fill("800");
    await page.locator(".sheet-footer").getByRole("button", { name: "Save changes" }).click();
    await expect(page.locator(".toast")).toContainText("Goal updated");
    await expect(page.getByText("Rainy day fund")).toBeVisible();
    await expect(page.locator(".budget-item", { hasText: "Rainy day fund" })).toContainText("800.00");
  });

  test("deletes a goal with confirmation", async ({ page }) => {
    await openSettings(page);
    await page.getByRole("button", { name: "Savings goals" }).click();
    await page.getByRole("button", { name: "Add goal" }).first().click();
    await page.getByLabel("Name").fill("Bike");
    await page.getByLabel("Target amount").fill("300");
    await page.locator(".sheet-footer").getByRole("button", { name: "Add goal" }).click();
    await expect(page.locator(".toast")).toContainText("Goal added");

    const goalItem = page.locator(".budget-item", { hasText: "Bike" });
    await goalItem.getByRole("button", { name: "Delete Bike" }).click();
    await expect(page.getByRole("heading", { name: "Delete Bike?" })).toBeVisible();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page.locator(".toast")).toContainText("Deleted");
    await expect(page.getByText("No goals yet")).toBeVisible();
  });
});
