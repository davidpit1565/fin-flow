import { test, expect, type Page } from "@playwright/test";
import { addExpense, completeOnboarding } from "./helpers";

/** Page must never scroll horizontally at these widths. */
async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const el = document.scrollingElement || document.documentElement;
    return el.scrollWidth - el.clientWidth;
  });
  expect(overflow).toBeLessThanOrEqual(1);
}

test.describe("adaptive shell", () => {
  test.describe("phone widths keep the bottom tab bar (regression)", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("tab bar is visible, sidebar is not, no horizontal overflow", async ({ page }) => {
      await completeOnboarding(page);
      await expect(page.locator(".tabbar")).toBeVisible();
      await expect(page.locator(".sidebar")).toBeHidden();
      await expectNoHorizontalOverflow(page);
    });
  });

  test.describe("tablet portrait switches to the sidebar (regression)", () => {
    test.use({ viewport: { width: 768, height: 1024 } });

    test("sidebar is visible, tab bar is not, Settings is reachable from it, no overflow", async ({ page }) => {
      await completeOnboarding(page);
      await expect(page.locator(".sidebar")).toBeVisible();
      await expect(page.locator(".tabbar")).toBeHidden();
      await expectNoHorizontalOverflow(page);

      await page.locator(".sidebar-footer .sidebar-item").click();
      await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });
  });

  test.describe("laptop width shows the two-column Home layout (regression)", () => {
    test.use({ viewport: { width: 1280, height: 900 } });

    test("Home renders as a grid, sheets render as a centered dialog, no overflow", async ({ page }) => {
      await completeOnboarding(page);
      await addExpense(page, { amount: "42", merchant: "Whole Foods", category: "Groceries" });
      await expect(page.locator(".home-grid")).toBeVisible();
      await expectNoHorizontalOverflow(page);

      const gridColumns = await page.locator(".home-grid").evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
      expect(gridColumns).toBeGreaterThan(1);

      await page.getByRole("button", { name: "Add transaction" }).click();
      const sheet = page.locator(".sheet");
      await expect(sheet).toBeVisible();
      await expect(sheet).toHaveCSS("position", "static");
      await expectNoHorizontalOverflow(page);
    });

  });

  test.describe("narrower two-column widths still hint scrollable overflow (regression)", () => {
    // At this width the two-column grid's main column is narrow enough that
    // the spending-period control doesn't fully fit -- confirmed by hand
    // (screenshot) before writing this assertion.
    test.use({ viewport: { width: 1024, height: 900 } });

    test("the spending-period control degrades to a scroll hint instead of clipping", async ({ page }) => {
      // The container-query fade hint (index.css) must key off the card's own
      // width, not the page viewport, or this reads as a hard clip instead of
      // a "scroll for more" affordance.
      await completeOnboarding(page);
      await addExpense(page, { amount: "10", merchant: "Test" });
      const segmented = page.locator(".segmented-full");
      await expect(segmented).toBeVisible();
      const overflowsItsOwnCard = await segmented.evaluate((el) => el.scrollWidth > el.clientWidth);
      expect(overflowsItsOwnCard).toBe(true);
      const hasFadeHint = await segmented.evaluate((el) => getComputedStyle(el).maskImage !== "none" || getComputedStyle(el).webkitMaskImage !== "none");
      expect(hasFadeHint).toBe(true);
    });
  });
});
