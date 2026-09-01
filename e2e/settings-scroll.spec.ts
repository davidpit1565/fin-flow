import { test, expect } from "@playwright/test";
import { completeOnboarding, openSettings } from "./helpers";

test.describe("settings mobile scrolling", () => {
  test.beforeEach(async ({ page }) => {
    await completeOnboarding(page);
  });

  test("changing currency preserves scroll position and locks the background", async ({ page }) => {
    await openSettings(page);
    const scroller = page.locator(".app-scroll");
    const currencyRow = page.getByRole("button", { name: "Currency" });

    // Position the page with a non-zero scroll offset while keeping the Currency
    // row comfortably visible -- if it were scrolled out of view instead,
    // clicking it snaps the scroller back to wherever the browser reveals
    // it (observed to land exactly on 0), which isn't what this test is
    // trying to exercise.
    const rowTop = await currencyRow.evaluate((el: HTMLElement) => {
      const s = el.closest(".app-scroll") as HTMLElement | null;
      return s ? el.getBoundingClientRect().top - s.getBoundingClientRect().top + s.scrollTop : 0;
    });
    const target = Math.max(0, Math.floor(rowTop) - 50);
    await scroller.evaluate((el: HTMLElement, top: number) => {
      el.scrollTop = top;
    }, target);
    // Playwright's click actionability check polls the target's bounding box
    // for stability before clicking; it can race a React re-render triggered
    // by an unrelated scroll/resize listener elsewhere in the app (e.g. the
    // collapsing header's `useHeaderScrolled`) and "help" by scrolling the
    // row into view from scratch instead of clicking it where it already is.
    // `force: true` skips that check -- a real tap doesn't do this polling
    // either, so this matches actual user behavior rather than working
    // around a timing quirk with a magic wait.
    await currencyRow.click({ force: true });
    await expect(page.getByRole("dialog", { name: "Choose currency" })).toBeVisible();

    // Reference position once the sheet is open.
    const settled = await scroller.evaluate((el: HTMLElement) => el.scrollTop);
    expect(settled).toBeGreaterThan(0);

    // A scroll gesture on the backdrop (outside the sheet) must not move the page.
    await page.mouse.move(210, 60);
    await page.mouse.wheel(0, 400);
    await expect
      .poll(() => scroller.evaluate((el: HTMLElement) => el.scrollTop))
      .toBe(settled);

    // Change the currency; the sheet closes and the position is preserved.
    await page.getByRole("button", { name: "British Pound" }).click();
    await expect(page.getByRole("dialog", { name: "Choose currency" })).toHaveCount(0);
    expect(await scroller.evaluate((el: HTMLElement) => el.scrollTop)).toBe(settled);

    // The change took effect.
    await expect(currencyRow).toContainText("GBP");

    // The user can immediately continue scrolling to the very bottom.
    await scroller.evaluate((el: HTMLElement) => {
      el.scrollTop = el.scrollHeight;
    });
    await expect(page.getByText("Your financial data never leaves this device")).toBeVisible();
  });

  test("scrolls naturally from top to bottom and back in one container", async ({ page }) => {
    await openSettings(page);
    const scroller = page.locator(".app-scroll");

    // Settings is a single long page: content taller than the viewport.
    const metrics = await scroller.evaluate((el: HTMLElement) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));
    expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);

    // Reach the very bottom (no hidden nav, footer visible).
    await scroller.evaluate((el: HTMLElement) => {
      el.scrollTop = el.scrollHeight;
    });
    expect(await scroller.evaluate((el: HTMLElement) => el.scrollTop)).toBeGreaterThan(0);
    await expect(page.getByText("Your financial data never leaves this device")).toBeVisible();

    // Scroll back to the top; the header is reachable again.
    await scroller.evaluate((el: HTMLElement) => {
      el.scrollTop = 0;
    });
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  });
});
