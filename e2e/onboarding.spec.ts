import { test, expect } from "@playwright/test";
import { addExpense, completeOnboarding } from "./helpers";

test.describe("onboarding", () => {
  test("completes onboarding and lands on an empty Home", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Know where your money goes.")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Never forget a recurring payment.")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Find opportunities to save.")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Set up Flow")).toBeVisible();
    await page.getByRole("button", { name: /Get started/ }).click();
    await expect(page.getByRole("heading", { name: "Your finances" })).toBeVisible();
    await expect(page.getByText("Start tracking your money")).toBeVisible();
  });
});

test.describe("empty states", () => {
  test("every main screen has a friendly empty state", async ({ page }) => {
    await completeOnboarding(page);
    await expect(page.getByText("Start tracking your money")).toBeVisible();

    await page.getByRole("button", { name: "Transactions", exact: true }).click();
    await expect(page.getByText("Nothing here yet")).toBeVisible();

    await page.getByRole("button", { name: "Subscriptions", exact: true }).click();
    await expect(page.getByText("No subscriptions yet")).toBeVisible();

    await page.getByRole("button", { name: "Insights", exact: true }).click();
    await expect(page.getByText("Insights will appear here")).toBeVisible();
  });
});

test.describe("persistence", () => {
  test("data survives a full reload (IndexedDB)", async ({ page }) => {
    await completeOnboarding(page);
    await addExpense(page, { amount: "4.80", merchant: "Reload Coffee" });
    await page.reload();
    await expect(page.getByRole("heading", { name: "Your finances" })).toBeVisible();
    await page.getByRole("button", { name: "Transactions", exact: true }).click();
    await expect(page.getByText("Reload Coffee")).toBeVisible();
    await expect(page.locator(".txn-group .row").first()).toContainText("4.80");
  });
});

test.describe("storage unavailable (regression)", () => {
  test("shows a real error and recovers via retry instead of hanging on the splash screen forever", async ({ page }) => {
    // Simulates Safari Private Browsing, where indexedDB.open() throws --
    // before this fix the app just sat on the splash screen forever.
    await page.addInitScript(() => {
      const realOpen = indexedDB.open.bind(indexedDB);
      Object.defineProperty(window, "__flowIndexedDBBlocked", { value: true, writable: true });
      indexedDB.open = ((...args: Parameters<typeof indexedDB.open>) => {
        if ((window as typeof window & { __flowIndexedDBBlocked: boolean }).__flowIndexedDBBlocked) {
          throw new DOMException("The operation is not supported", "InvalidStateError");
        }
        return realOpen(...args);
      }) as typeof indexedDB.open;
    });
    await page.goto("/");

    await expect(page.getByText("Flow couldn't load your data")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Your finances" })).toHaveCount(0);

    // Unblock and retry -- should recover into the real app.
    await page.evaluate(() => {
      (window as typeof window & { __flowIndexedDBBlocked: boolean }).__flowIndexedDBBlocked = false;
    });
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByText("Flow couldn't load your data")).toHaveCount(0);
  });
});
