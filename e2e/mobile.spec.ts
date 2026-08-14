import { test, expect } from "@playwright/test";
import { addExpense, completeOnboarding, openSettings, waitForSheetSettled } from "./helpers";

/** A short, narrow iPhone-style viewport (e.g. iPhone SE / older devices). */
test.use({ viewport: { width: 320, height: 568 } });

/** Page must never scroll horizontally at these widths. */
async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => {
    const el = document.scrollingElement || document.documentElement;
    return el.scrollWidth - el.clientWidth;
  });
  expect(overflow).toBeLessThanOrEqual(1);
}

test.describe("mobile UX", () => {
  test("currency picker opens fully within the viewport and all options are reachable", async ({ page }) => {
    await completeOnboarding(page);
    await openSettings(page);

    const currencyRow = page.getByRole("button", { name: "Currency" });
    await currencyRow.scrollIntoViewIfNeeded();
    const scrollTopBefore = await page.locator(".app-scroll").evaluate((el: HTMLElement) => el.scrollTop);
    await currencyRow.click();

    const dialog = page.getByRole("dialog", { name: "Choose currency" });
    await expect(dialog).toBeVisible();

    // Wait for the slide-up entrance animation to finish before measuring.
    const sheet = page.locator(".sheet");
    await waitForSheetSettled(page);
    const box = await sheet.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(568 + 1);

    // The last currency is reachable through the sheet's own scroll area.
    const body = page.locator(".sheet-body");
    await body.evaluate((el: HTMLElement) => {
      el.scrollTop = el.scrollHeight;
    });
    await expect(page.getByRole("button", { name: "Israeli Shekel" })).toBeInViewport();

    // Closing restores the Settings scroll position (no jump to top/bottom).
    await page.getByRole("button", { name: "British Pound" }).click();
    await expect(dialog).toHaveCount(0);
    const scrollTopAfter = await page.locator(".app-scroll").evaluate((el: HTMLElement) => el.scrollTop);
    expect(Math.abs(scrollTopAfter - scrollTopBefore)).toBeLessThanOrEqual(2);
  });

  test("Home spending period selector fits inside its card with clear labels", async ({ page }) => {
    await completeOnboarding(page);
    await addExpense(page, { amount: "12.99", merchant: "Period test" });
    await page.getByRole("button", { name: "Home", exact: true }).click();

    const segmented = page.locator(".segmented-full");
    await expect(segmented).toBeVisible();

    // Clear, unambiguous wording (no bare "Last").
    for (const label of ["This month", "Prev. month", "3 months", "This year"]) {
      await expect(segmented.getByRole("tab", { name: label })).toBeVisible();
    }

    // The control stays inside the spending card.
    const fits = await segmented.evaluate((el: HTMLElement) => {
      const card = el.closest(".spend-card") as HTMLElement | null;
      if (!card) return false;
      const c = card.getBoundingClientRect();
      const s = el.getBoundingClientRect();
      return s.left >= c.left - 1 && s.right <= c.right + 1;
    });
    expect(fits).toBe(true);

    await expectNoHorizontalOverflow(page);

    // Selecting a period updates the summary wording to match its semantics.
    await segmented.getByRole("tab", { name: "3 months" }).click();
    await expect(page.locator(".spend-label")).toContainText("Spent the last 3 months");
  });

  test("Add transaction sheet has no horizontal overflow and keeps actions reachable", async ({ page }) => {
    await completeOnboarding(page);
    await page.getByRole("button", { name: "Add transaction" }).click();
    const sheet = page.locator(".sheet");
    await expect(sheet).toBeVisible();
    await waitForSheetSettled(page);

    await expectNoHorizontalOverflow(page);

    const box = await sheet.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(568 + 1);

    // The amount field requests the decimal keyboard.
    await expect(page.getByLabel("Amount")).toHaveAttribute("inputmode", "decimal");

    // The primary action remains reachable (scroll the sheet if needed).
    const save = page.locator(".sheet-footer").getByRole("button", { name: "Add expense" });
    await save.scrollIntoViewIfNeeded();
    await expect(save).toBeInViewport();
  });

  test("numeric money fields request the decimal keyboard everywhere", async ({ page }) => {
    await page.goto("/");
    // Onboarding setup screen numeric fields.
    for (let i = 0; i < 3; i++) {
      await page.getByRole("button", { name: "Continue" }).click();
    }
    await expect(page.getByLabel("Monthly spending goal")).toHaveAttribute("inputmode", "decimal");
    await expect(page.getByLabel("Starting balance")).toHaveAttribute("inputmode", "decimal");

    await page.getByRole("button", { name: /Get started/ }).click();
    await expect(page.getByRole("heading", { name: "Your finances" })).toBeVisible();

    await page.getByRole("button", { name: "Add transaction" }).click();
    await expect(page.getByLabel("Amount")).toHaveAttribute("inputmode", "decimal");
    await page.getByRole("button", { name: "Close" }).click();

    await openSettings(page);
    await page.getByRole("button", { name: "Monthly budgets" }).click();
    await page.getByRole("button", { name: "Set monthly budget" }).click();
    await expect(page.getByLabel("Budget amount")).toHaveAttribute("inputmode", "decimal");
  });

  test("bottom navigation stays fixed while the page scrolls", async ({ page }) => {
    await completeOnboarding(page);
    await addExpense(page, { amount: "5.00", merchant: "Scroll test" });
    await page.getByRole("button", { name: "Home", exact: true }).click();

    const tabbar = page.locator(".tabbar");
    const before = await tabbar.boundingBox();
    expect(before).not.toBeNull();

    // Scroll the page container aggressively to the bottom and back to top.
    const scroller = page.locator(".app-scroll");
    await scroller.evaluate((el: HTMLElement) => {
      el.scrollTop = el.scrollHeight;
    });
    const atBottom = await tabbar.boundingBox();
    expect(atBottom!.y).toBeCloseTo(before!.y, 0);
    expect(atBottom!.y + atBottom!.height).toBeLessThanOrEqual(568 + 1);

    await scroller.evaluate((el: HTMLElement) => {
      el.scrollTop = 0;
    });
    const atTop = await tabbar.boundingBox();
    expect(atTop!.y).toBeCloseTo(before!.y, 0);
  });
});
