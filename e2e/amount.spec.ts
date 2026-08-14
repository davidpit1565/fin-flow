import { test, expect } from "@playwright/test";
import { completeOnboarding, openAddSheet } from "./helpers";

test.describe("amount input", () => {
  test.beforeEach(async ({ page }) => {
    await completeOnboarding(page);
  });

  const cases = [
    { typed: "5", expectedSaved: "5.00" },
    { typed: "12.99", expectedSaved: "12.99" },
    { typed: "100", expectedSaved: "100.00" },
    { typed: "1,247.80", expectedSaved: "1,247.80" },
    { typed: "0.99", expectedSaved: "0.99" },
  ];

  for (const c of cases) {
    test(`expense "${c.typed}" is not corrupted and saves as ${c.expectedSaved}`, async ({ page }) => {
      await openAddSheet(page);
      const amount = page.getByLabel("Amount");
      await amount.fill(c.typed);
      // The field must display exactly what the user typed — no reformatting mid-typing.
      await expect(amount).toHaveValue(c.typed);
      await page.locator(".sheet-footer").getByRole("button", { name: "Add expense" }).click();
      await expect(page.locator(".toast")).toContainText("Expense added");
      await page.getByRole("button", { name: "Transactions", exact: true }).click();
      await expect(page.locator(".txn-group .row").first()).toContainText(c.expectedSaved);
    });
  }

  test('income "100" is not corrupted', async ({ page }) => {
    await openAddSheet(page);
    const amount = page.getByLabel("Amount");
    await amount.fill("100");
    await expect(amount).toHaveValue("100");
    await page.getByRole("tab", { name: "Income" }).click();
    await page.locator(".sheet-footer").getByRole("button", { name: "Add income" }).click();
    await expect(page.locator(".toast")).toContainText("Income added");
    await page.getByRole("button", { name: "Transactions", exact: true }).click();
    const row = page.locator(".txn-group .row").first();
    await expect(row).toContainText("+");
    await expect(row).toContainText("100.00");
  });

  test("backspace and retype keep the field under the user's control", async ({ page }) => {
    await openAddSheet(page);
    const amount = page.getByLabel("Amount");
    await amount.pressSequentially("1234");
    await expect(amount).toHaveValue("1234");
    await amount.press("Backspace");
    await expect(amount).toHaveValue("123");
    await amount.pressSequentially("5");
    await expect(amount).toHaveValue("1235");
  });
});
