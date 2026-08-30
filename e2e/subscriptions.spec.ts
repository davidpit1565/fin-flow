import { test, expect } from "@playwright/test";
import { addSubscription, completeOnboarding, todayISO, tomorrowISO } from "./helpers";

test.describe("subscriptions", () => {
  test.beforeEach(async ({ page }) => {
    await completeOnboarding(page);
  });

  test("adds a subscription and shows its monthly cost", async ({ page }) => {
    await addSubscription(page, { name: "Netflix", amount: "17.99", nextPaymentDate: tomorrowISO() });
    await expect(page.locator(".sub-summary")).toContainText("17.99");
    await expect(page.getByText("Netflix")).toBeVisible();
  });

  test("edits a subscription", async ({ page }) => {
    await addSubscription(page, { name: "Spotify", amount: "11.99" });
    await page.getByText("Spotify").click();
    await page.getByRole("button", { name: "Edit subscription" }).click();
    await expect(page.getByRole("heading", { name: "Edit subscription" })).toBeVisible();
    await page.getByLabel("Amount").fill("14.99");
    await page.locator(".sheet-footer").getByRole("button", { name: "Save changes" }).click();
    await expect(page.locator(".toast")).toContainText("Changes saved");
    await expect(page.locator(".detail-amount")).toContainText("14.99");
  });

  test("pauses and reactivates a subscription", async ({ page }) => {
    await addSubscription(page, { name: "iCloud", amount: "2.99" });
    await page.getByText("iCloud").click();
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    await expect(page.locator(".status-chip")).toContainText("Paused");
    await page.getByRole("button", { name: "Resume", exact: true }).click();
    await expect(page.locator(".status-chip")).toContainText("Active");
  });

  test("records a subscription payment into history", async ({ page }) => {
    await addSubscription(page, { name: "Netflix", amount: "17.99", nextPaymentDate: todayISO() });
    await page.getByText("Netflix").click();
    await page.getByRole("button", { name: "Record payment" }).click();
    await expect(page.locator(".toast")).toContainText("Payment recorded");
    const history = page.locator(".section", { hasText: "Payment history" });
    await expect(history).toContainText("17.99");
  });

  test("upcoming payments appear on Home", async ({ page }) => {
    await addSubscription(page, { name: "Netflix", amount: "17.99", nextPaymentDate: tomorrowISO() });
    await page.getByRole("button", { name: "Home", exact: true }).click();
    await expect(page.getByText("Coming up")).toBeVisible();
    await expect(page.getByText("Netflix")).toBeVisible();
    await expect(page.getByText("Tomorrow")).toBeVisible();
  });

  test("requires a service name", async ({ page }) => {
    await page.getByRole("button", { name: "Subscriptions", exact: true }).click();
    await page.locator(".sub-toolbar").getByRole("button", { name: "Add subscription" }).click();
    await page.locator(".sheet-footer").getByRole("button", { name: "Add subscription" }).click();
    await expect(page.getByText("Please enter a service name.")).toBeVisible();
  });

  test("rapid double-click on Record payment only records one payment (regression)", async ({ page }) => {
    await addSubscription(page, { name: "Netflix", amount: "17.99", nextPaymentDate: todayISO() });
    await page.getByText("Netflix").click();

    const recordBtn = page.getByRole("button", { name: "Record payment" });
    await Promise.all([recordBtn.click(), recordBtn.click()]);
    await expect(page.locator(".toast")).toContainText("Payment recorded");

    const history = page.locator(".section", { hasText: "Payment history" });
    await expect(history.locator(".row")).toHaveCount(1);
  });

  test("two genuinely separate payments both record correctly", async ({ page }) => {
    await addSubscription(page, { name: "Gym", amount: "9.99", frequency: "Weekly", nextPaymentDate: todayISO() });
    await page.getByText("Gym").click();

    const recordBtn = page.getByRole("button", { name: "Record payment" });
    await recordBtn.click();
    await expect(page.locator(".toast")).toContainText("Payment recorded");
    await page.waitForTimeout(600);
    await recordBtn.click();
    await expect(page.locator(".toast")).toContainText("Payment recorded");

    const history = page.locator(".section", { hasText: "Payment history" });
    await expect(history.locator(".row")).toHaveCount(2);
  });

  test("warns when a reminder would already be in the past instead of silently dropping it (regression)", async ({ page }) => {
    await page.getByRole("button", { name: "Subscriptions" }).click();
    await page.locator(".sub-toolbar").getByRole("button", { name: "Add subscription" }).click();

    await page.getByLabel("Service name").fill("Streaming");
    await page.getByLabel("Amount").fill("9.99");
    await page.getByLabel("Next payment").fill(tomorrowISO());

    // The reminder toggle defaults to on (with "None" selected) for a new subscription.
    await expect(page.getByText("Reminders are sent at 9:00 AM local time.")).toBeVisible();

    // A 7-day-before reminder for a payment due tomorrow has already passed.
    await page.getByRole("radio", { name: "7 days", exact: true }).click();
    await expect(page.getByText(/already passed/)).toBeVisible();

    // Same day is still in the future -- the warning clears.
    await page.getByRole("radio", { name: "Same day", exact: true }).click();
    await expect(page.getByText(/already passed/)).toHaveCount(0);
    await expect(page.getByText("Reminders are sent at 9:00 AM local time.")).toBeVisible();
  });
});
