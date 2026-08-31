import { test, expect } from "@playwright/test";
import { completeOnboarding, openSettings } from "./helpers";

test.describe("accent color", () => {
  test("selecting a color applies it and persists across reload", async ({ page }) => {
    await completeOnboarding(page);
    await openSettings(page);

    await page.getByRole("radio", { name: "Blue", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-accent", "blue");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-accent", "blue");
  });
});
