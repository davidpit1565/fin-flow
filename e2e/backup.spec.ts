import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { addExpense, completeOnboarding, openSettings } from "./helpers";

const BACKUP_FILE_INPUT = 'input[type="file"][accept*="flowbackup"]';

/** Add an overall monthly budget through the real UI, from Settings. */
async function addOverallBudget(page: import("@playwright/test").Page, amount: string) {
  await page.getByRole("button", { name: "Monthly budgets" }).click();
  await expect(page.getByRole("heading", { name: "Budgets", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add budget" }).click();
  await page.getByLabel("Budget amount").fill(amount);
  await page.locator(".sheet-footer").getByRole("button", { name: "Save budget" }).click();
  await expect(page.locator(".toast")).toContainText("Budget saved");
  await page.getByRole("button", { name: "Back" }).click();
}

/** Export an encrypted backup from Settings (already open) and return its raw file content. */
async function exportBackup(page: import("@playwright/test").Page, password: string): Promise<string> {
  await page.getByRole("button", { name: "Export encrypted backup" }).click();
  await expect(page.getByRole("heading", { name: "Export encrypted backup" })).toBeVisible();
  await page.getByLabel("Backup password", { exact: true }).fill(password);
  await page.getByLabel("Confirm backup password").fill(password);
  const downloadPromise = page.waitForEvent("download");
  await page.locator(".sheet-footer").getByRole("button", { name: "Export backup" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/flow-backup-.*\.flowbackup/);
  await expect(page.locator(".toast")).toContainText("Backup exported");
  return readFileSync((await download.path())!, "utf-8");
}

test.describe("encrypted backup", () => {
  test("round-trips every kind of data through export, wipe, and restore", async ({ page }) => {
    await completeOnboarding(page);
    await addExpense(page, { amount: "12.34", merchant: "Backup Me" });
    await openSettings(page);
    await addOverallBudget(page, "1500");

    const content = await exportBackup(page, "correct horse battery staple");

    // Wipe the device back to onboarding, the same way e2e/data.spec.ts does.
    await page.getByRole("button", { name: "Delete all data" }).click();
    await expect(page.locator(".dialog")).toBeVisible();
    await page.locator(".dialog").getByRole("button", { name: "Delete everything" }).click();
    await expect(page.getByText("Know where your money goes.")).toBeVisible();

    await completeOnboarding(page);
    await openSettings(page);

    await page.setInputFiles(BACKUP_FILE_INPUT, {
      name: "flow-backup.flowbackup",
      mimeType: "application/json",
      buffer: Buffer.from(content),
    });
    await expect(page.getByRole("heading", { name: "Restore from backup" })).toBeVisible();
    await page.getByLabel("Backup password", { exact: true }).fill("correct horse battery staple");
    await page.locator(".sheet-footer").getByRole("button", { name: "Restore" }).click();

    await expect(page.locator(".dialog")).toBeVisible();
    await expect(page.locator(".dialog")).toContainText("replaces every transaction");
    await page.locator(".dialog").getByRole("button", { name: "Restore" }).click();
    await expect(page.locator(".toast")).toContainText("Backup restored");

    // The transaction is back.
    await page.getByRole("button", { name: "Back" }).click();
    await page.getByRole("button", { name: "Transactions", exact: true }).click();
    await expect(page.getByText("Backup Me")).toBeVisible();

    // The budget is back.
    await page.getByRole("button", { name: "Home", exact: true }).click();
    await expect(page.getByText("Monthly budget")).toBeVisible();
    await expect(page.locator(".budget-card")).toContainText("1,500.00");
  });

  test("restoring with the wrong password errors out and leaves current data untouched", async ({ page }) => {
    await completeOnboarding(page);
    await addExpense(page, { amount: "9.99", merchant: "Keep Me" });
    await openSettings(page);

    const content = await exportBackup(page, "the-right-password");

    await page.setInputFiles(BACKUP_FILE_INPUT, {
      name: "flow-backup.flowbackup",
      mimeType: "application/json",
      buffer: Buffer.from(content),
    });
    await expect(page.getByRole("heading", { name: "Restore from backup" })).toBeVisible();
    await page.getByLabel("Backup password", { exact: true }).fill("totally-the-wrong-password");
    await page.locator(".sheet-footer").getByRole("button", { name: "Restore" }).click();

    await expect(page.locator(".toast")).toContainText("Wrong password or corrupted file");
    // A failed decrypt must never get as far as the destructive confirmation.
    await expect(page.locator(".dialog")).not.toBeVisible();

    // Current data survives the failed attempt untouched.
    await page.getByRole("button", { name: "Close" }).click();
    await page.getByRole("button", { name: "Back" }).click();
    await page.getByRole("button", { name: "Transactions", exact: true }).click();
    await expect(page.getByText("Keep Me")).toBeVisible();
  });
});
