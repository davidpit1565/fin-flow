import { test, expect, type Page } from "@playwright/test";
import { completeOnboarding, openSettings } from "./helpers";

interface DebtInput {
  name: string;
  remaining: string;
  apr: string;
  minPayment: string;
}

async function openDebts(page: Page) {
  await openSettings(page);
  await page.getByRole("button", { name: "Debt payoff planner" }).click();
  await expect(page.getByRole("heading", { name: "Debts", exact: true })).toBeVisible();
}

async function addDebt(page: Page, { name, remaining, apr, minPayment }: DebtInput) {
  const hasDebts = await page.getByRole("button", { name: "Add", exact: true }).isVisible();
  await page.getByRole("button", { name: hasDebts ? "Add" : "Add debt", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Add debt" })).toBeVisible();
  await page.getByLabel("Debt name").fill(name);
  await page.getByLabel("Remaining balance").fill(remaining);
  await page.getByLabel("Interest rate").fill(apr);
  await page.getByLabel("Minimum payment").fill(minPayment);
  await page.locator(".sheet-footer").getByRole("button", { name: "Add debt" }).click();
  await expect(page.locator(".toast")).toContainText("Debt added");
}

test.describe("debts", () => {
  test.beforeEach(async ({ page }) => {
    await completeOnboarding(page);
  });

  test("adds two debts and shows a payoff plan", async ({ page }) => {
    await openDebts(page);

    await addDebt(page, { name: "Store Card", remaining: "500", apr: "5", minPayment: "25" });
    await addDebt(page, { name: "Bank Loan", remaining: "2000", apr: "20", minPayment: "60" });

    await expect(page.getByText("Store Card").first()).toBeVisible();
    await expect(page.getByText("Bank Loan").first()).toBeVisible();
    await expect(page.getByText("500.00", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("2,000.00", { exact: false }).first()).toBeVisible();

    await expect(page.getByText("Payoff plan")).toBeVisible();
    await expect(page.getByText("Debt-free in")).toBeVisible();
    await expect(page.getByText("Total interest")).toBeVisible();
    // Both debts should show up somewhere in the payoff order.
    await expect(page.locator(".detail-row-label", { hasText: "Store Card" })).toBeVisible();
    await expect(page.locator(".detail-row-label", { hasText: "Bank Loan" })).toBeVisible();
  });

  test("switching strategy changes the displayed payoff order", async ({ page }) => {
    await openDebts(page);

    // Smallest balance (Store Card) has the lowest APR; the bigger balance
    // (Bank Loan) has the highest APR, and the two balances are close enough
    // that whichever debt gets the extra payment finishes first -- so
    // snowball and avalanche produce genuinely different payoff order.
    await addDebt(page, { name: "Store Card", remaining: "500", apr: "5", minPayment: "25" });
    await addDebt(page, { name: "Bank Loan", remaining: "700", apr: "20", minPayment: "25" });
    await page.getByLabel("Extra monthly payment").fill("50");

    // Default strategy is Snowball: smallest balance (Store Card) first.
    await expect(page.getByRole("tab", { name: "Snowball" })).toHaveAttribute("aria-selected", "true");
    let labels = await page.locator(".detail-row-label").allTextContents();
    expect(labels).toEqual(["Store Card", "Bank Loan"]);

    // Switch to Avalanche: highest APR (Bank Loan) goes first instead.
    await page.getByRole("tab", { name: "Avalanche" }).click();
    await expect(page.getByRole("tab", { name: "Avalanche" })).toHaveAttribute("aria-selected", "true");
    labels = await page.locator(".detail-row-label").allTextContents();
    expect(labels).toEqual(["Bank Loan", "Store Card"]);
  });

  test("records a payment and updates the remaining balance", async ({ page }) => {
    await openDebts(page);
    await addDebt(page, { name: "Visa", remaining: "500", apr: "10", minPayment: "25" });

    await page.getByRole("button", { name: "Record payment for Visa" }).click();
    await expect(page.getByRole("heading", { name: "Record payment" })).toBeVisible();
    await page.getByLabel("Payment amount").fill("50");
    await page.locator(".sheet-footer").getByRole("button", { name: "Record payment" }).click();
    await expect(page.locator(".toast")).toContainText("Payment recorded");

    await expect(page.getByText("450.00", { exact: false })).toBeVisible();
  });

  test("deletes a debt", async ({ page }) => {
    await openDebts(page);
    await addDebt(page, { name: "Old Loan", remaining: "1000", apr: "8", minPayment: "40" });

    await page.getByRole("button", { name: "Delete Old Loan" }).click();
    await expect(page.locator(".dialog")).toBeVisible();
    await page.locator(".dialog").getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page.locator(".toast")).toContainText("Deleted");
    await expect(page.getByText("Old Loan")).toHaveCount(0);
    await expect(page.getByText("No debts yet")).toBeVisible();
  });
});
