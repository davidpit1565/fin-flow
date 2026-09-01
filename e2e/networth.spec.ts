import { test, expect } from "@playwright/test";
import { completeOnboarding, openSettings } from "./helpers";

test.describe("net worth", () => {
  test.beforeEach(async ({ page }) => {
    await completeOnboarding(page);
  });

  test("adds an asset and a liability and computes the net total", async ({ page }) => {
    await openSettings(page);
    await page.getByRole("button", { name: "Net worth" }).click();
    await expect(page.getByRole("heading", { name: "Net Worth", exact: true })).toBeVisible();

    // Add an asset.
    await page.locator(".section", { hasText: "Assets" }).getByRole("button", { name: "Add" }).click();
    await expect(page.getByRole("heading", { name: "Add asset" })).toBeVisible();
    await page.getByLabel("Name").fill("Savings account");
    await page.getByRole("radio", { name: "Cash", exact: true }).click();
    await page.getByLabel("Value").fill("10000");
    await page.locator(".sheet-footer").getByRole("button", { name: "Add asset" }).click();
    await expect(page.locator(".toast")).toContainText("Asset added");
    await expect(page.getByText("Savings account")).toBeVisible();

    // Add a liability.
    await page.locator(".section", { hasText: "Liabilities" }).getByRole("button", { name: "Add" }).click();
    await expect(page.getByRole("heading", { name: "Add liability" })).toBeVisible();
    await page.getByLabel("Name").fill("Car loan");
    await page.getByRole("radio", { name: "Loan", exact: true }).click();
    await page.getByLabel("Value").fill("4000");
    await page.locator(".sheet-footer").getByRole("button", { name: "Add liability" }).click();
    await expect(page.locator(".toast")).toContainText("Liability added");
    await expect(page.getByText("Car loan")).toBeVisible();

    // Net worth = 10,000 - 4,000 = 6,000, and positive.
    await expect(page.locator(".networth-total-card .money-large")).toContainText("6,000.00");
  });

  test("editing an item updates the total", async ({ page }) => {
    await openSettings(page);
    await page.getByRole("button", { name: "Net worth" }).click();

    await page.locator(".section", { hasText: "Assets" }).getByRole("button", { name: "Add" }).click();
    await page.getByLabel("Name").fill("Brokerage");
    await page.getByLabel("Value").fill("1000");
    await page.locator(".sheet-footer").getByRole("button", { name: "Add asset" }).click();
    await expect(page.locator(".toast")).toContainText("Asset added");
    await expect(page.locator(".networth-total-card .money-large")).toContainText("1,000.00");

    await page.getByRole("button", { name: "Edit Brokerage" }).click();
    await expect(page.getByRole("heading", { name: "Edit asset" })).toBeVisible();
    await page.getByLabel("Value").fill("2500");
    await page.locator(".sheet-footer").getByRole("button", { name: "Save changes" }).click();
    await expect(page.locator(".toast")).toContainText("Asset updated");
    await expect(page.locator(".networth-total-card .money-large")).toContainText("2,500.00");
  });

  test("deleting an item removes it and updates the total", async ({ page }) => {
    await openSettings(page);
    await page.getByRole("button", { name: "Net worth" }).click();

    await page.locator(".section", { hasText: "Assets" }).getByRole("button", { name: "Add" }).click();
    await page.getByLabel("Name").fill("Cash on hand");
    await page.getByLabel("Value").fill("500");
    await page.locator(".sheet-footer").getByRole("button", { name: "Add asset" }).click();
    await expect(page.locator(".toast")).toContainText("Asset added");

    await page.getByRole("button", { name: "Delete Cash on hand" }).click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page.locator(".toast")).toContainText("Deleted");
    await expect(page.getByText("Cash on hand")).toHaveCount(0);
    await expect(page.locator(".networth-total-card .money-large")).toContainText("0.00");
  });

  test("a liability larger than assets shows a negative net worth", async ({ page }) => {
    await openSettings(page);
    await page.getByRole("button", { name: "Net worth" }).click();

    await page.locator(".section", { hasText: "Liabilities" }).getByRole("button", { name: "Add" }).click();
    await page.getByLabel("Name").fill("Mortgage");
    await page.getByRole("radio", { name: "Mortgage", exact: true }).click();
    await page.getByLabel("Value").fill("3000");
    await page.locator(".sheet-footer").getByRole("button", { name: "Add liability" }).click();
    await expect(page.locator(".toast")).toContainText("Liability added");

    await expect(page.locator(".networth-total-card .money-large")).toHaveClass(/negative/);
  });
});
