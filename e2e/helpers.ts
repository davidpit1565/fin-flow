import { expect, type Page } from "@playwright/test";

/** Local-time ISO date (YYYY-MM-DD), matching the app's date handling. */
export function localISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function todayISO(): string {
  return localISO(new Date());
}

export function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return localISO(d);
}

/** Drive the real onboarding flow to its end. */
export async function completeOnboarding(page: Page) {
  await page.goto("/");
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: "Continue" }).click();
  }
  await page.getByRole("button", { name: /Get started/ }).click();
  await expect(page.getByRole("heading", { name: "Your finances" })).toBeVisible();
}

/** Open the + Add sheet from the tab bar. */
export async function openAddSheet(page: Page) {
  await page.getByRole("button", { name: "Add transaction" }).click();
  await expect(page.getByRole("heading", { name: "Add transaction" })).toBeVisible();
}

interface ExpenseOpts {
  amount: string;
  category?: string;
  merchant?: string;
}

/** Add an expense through the real UI and wait for the confirmation toast. */
export async function addExpense(page: Page, { amount, category = "Food", merchant = "" }: ExpenseOpts) {
  await openAddSheet(page);
  await page.getByLabel("Amount").fill(amount);
  if (category) await page.getByRole("radio", { name: category, exact: true }).click();
  if (merchant) await page.getByLabel("Merchant").fill(merchant);
  await page.locator(".sheet-footer").getByRole("button", { name: "Add expense" }).click();
  await expect(page.locator(".toast")).toContainText("Expense added");
}

/** Add an income transaction through the real UI. */
export async function addIncome(page: Page, { amount, merchant = "" }: { amount: string; merchant?: string }) {
  await openAddSheet(page);
  await page.getByLabel("Amount").fill(amount);
  await page.getByRole("tab", { name: "Income" }).click();
  if (merchant) await page.getByLabel("Merchant").fill(merchant);
  await page.locator(".sheet-footer").getByRole("button", { name: "Add income" }).click();
  await expect(page.locator(".toast")).toContainText("Income added");
}

interface SubscriptionOpts {
  name: string;
  amount: string;
  frequency?: "Weekly" | "Monthly" | "Quarterly" | "Yearly";
  nextPaymentDate?: string;
  category?: string;
}

/** Add a subscription through the real UI. */
export async function addSubscription(
  page: Page,
  { name, amount, frequency = "Monthly", nextPaymentDate, category = "Subscriptions" }: SubscriptionOpts
) {
  await page.getByRole("button", { name: "Subscriptions" }).click();
  await expect(page.getByRole("heading", { name: "Subscriptions", exact: true })).toBeVisible();
  await page.locator(".sub-toolbar").getByRole("button", { name: "Add subscription" }).click();
  await expect(page.getByRole("heading", { name: "Add subscription" })).toBeVisible();

  await page.getByLabel("Service name").fill(name);
  await page.getByLabel("Amount").fill(amount);
  await page.getByRole("radio", { name: frequency, exact: true }).click();
  if (nextPaymentDate) await page.getByLabel("Next payment").fill(nextPaymentDate);
  await page.getByRole("radio", { name: category, exact: true }).click();
  await page.locator(".sheet-footer").getByRole("button", { name: "Add subscription" }).click();
  await expect(page.locator(".toast")).toContainText("Subscription added");
}

/** Open Settings via the Home header gear button. */
export async function openSettings(page: Page) {
  await page.getByRole("button", { name: "Settings" }).first().click();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
}

/** Go to a tab by its label. */
export async function goToTab(page: Page, label: "Home" | "Transactions" | "Subscriptions" | "Insights") {
  await page.getByRole("button", { name: label, exact: true }).click();
}

/**
 * Wait for a bottom sheet's entrance animation to finish. The `.sheet` slides up
 * from below the viewport over ~300ms, so geometry assertions must wait until it
 * has settled at the viewport bottom.
 */
export async function waitForSheetSettled(page: Page) {
  await expect
    .poll(
      () =>
        page
          .locator(".sheet")
          .evaluate((el: HTMLElement) => Math.abs(el.getBoundingClientRect().bottom - window.innerHeight)),
      { message: "bottom sheet should settle at the viewport bottom" }
    )
    .toBeLessThanOrEqual(1);
}

/** Collect browser console errors + page errors for a test. */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(String(err)));
  return errors;
}
