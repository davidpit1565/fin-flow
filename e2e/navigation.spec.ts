import { test, expect } from "@playwright/test";
import { collectConsoleErrors, completeOnboarding, openSettings } from "./helpers";

test.describe("navigation", () => {
  test("moves between Home, Transactions, Subscriptions, and Insights", async ({ page }) => {
    await completeOnboarding(page);
    await expect(page.getByRole("heading", { name: "Your finances" })).toBeVisible();

    await page.getByRole("button", { name: "Transactions", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Transactions", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Subscriptions", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Subscriptions", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Insights", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Insights", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Home", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Your finances" })).toBeVisible();
  });

  test("App lock with Face ID is correctly disabled on the web (regression)", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await completeOnboarding(page);
    await openSettings(page);

    const toggle = page.getByRole("switch", { name: "App lock with Face ID" });
    await expect(toggle).toBeVisible();
    await expect(toggle).toBeDisabled();
    await expect(page.getByText("Not available in the browser")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("the + Add flow opens and closes from any tab", async ({ page }) => {
    await completeOnboarding(page);
    for (const tab of ["Transactions", "Subscriptions", "Insights"] as const) {
      await page.getByRole("button", { name: tab, exact: true }).click();
      await page.getByRole("button", { name: "Add transaction" }).click();
      await expect(page.getByRole("heading", { name: "Add transaction", exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Close" }).click();
      await expect(page.getByRole("heading", { name: "Add transaction", exact: true })).toHaveCount(0);
    }
  });

  test("Settings is reachable and can return Home; no broken paths or console errors", async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await completeOnboarding(page);

    // Settings → back to Home
    await openSettings(page);
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByRole("heading", { name: "Your finances" })).toBeVisible();

    // Sweep every Settings subpage and return each time.
    const subpages: { label: string; heading: string }[] = [
      { label: "Monthly budgets", heading: "Budgets" },
      { label: "Manage categories", heading: "Categories" },
      { label: "Privacy Policy", heading: "Privacy Policy" },
      { label: "Terms of Use", heading: "Terms of Use" },
      { label: "Help & Support", heading: "Help & Support" },
    ];
    for (const sub of subpages) {
      await openSettings(page);
      await page.getByRole("button", { name: sub.label }).click();
      await expect(page.getByRole("heading", { name: sub.heading, exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Back" }).click();
      await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Back" }).click();
      await expect(page.getByRole("heading", { name: "Your finances" })).toBeVisible();
    }

    expect(errors).toEqual([]);
  });
});
