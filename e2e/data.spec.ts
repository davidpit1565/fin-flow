import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { addExpense, completeOnboarding, openSettings } from "./helpers";

test.describe("data management", () => {
  test("exports a CSV containing recorded data", async ({ page }) => {
    await completeOnboarding(page);
    await addExpense(page, { amount: "12.34", merchant: "Export Me" });
    await openSettings(page);
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export my data" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/flow-data-.*\.csv/);
    const content = readFileSync((await download.path())!, "utf-8");
    expect(content).toContain("Export Me");
    expect(content).toContain("12.34");
  });

  test("imports a CSV into transactions", async ({ page }) => {
    await completeOnboarding(page);
    await openSettings(page);
    const csv = [
      "Flow export",
      "",
      "# Transactions",
      "Date,Merchant,Amount,Currency,Category,Type,Notes,Recurring,Frequency,Payment method",
      "2026-08-01,Imported Coffee,4.50,,Food,expense,,no,,",
      "2026-08-02,Imported Salary,100.00,,Other,income,,no,,",
    ].join("\r\n");
    await page.setInputFiles("input[type=file]", {
      name: "flow.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csv),
    });
    await expect(page.locator(".toast")).toContainText("Imported 2 transactions");

    await page.getByRole("button", { name: "Back" }).click();
    await page.getByRole("button", { name: "Transactions", exact: true }).click();
    await expect(page.getByText("Imported Coffee")).toBeVisible();
    await expect(page.getByText("Imported Salary")).toBeVisible();
  });

  test("delete all data returns the app to onboarding", async ({ page }) => {
    await completeOnboarding(page);
    await addExpense(page, { amount: "1.00", merchant: "Wipe Me" });
    await openSettings(page);
    await page.getByRole("button", { name: "Delete all data" }).click();
    await expect(page.locator(".dialog")).toBeVisible();
    await page.locator(".dialog").getByRole("button", { name: "Delete everything" }).click();
    await expect(page.getByText("Know where your money goes.")).toBeVisible();
  });
});
