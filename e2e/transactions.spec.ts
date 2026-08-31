import { test, expect } from "@playwright/test";
import { addExpense, addIncome, completeOnboarding, dragSwipeTrack, openAddSheet, seedTransactions, setLanguage } from "./helpers";

test.describe("transactions", () => {
  test.beforeEach(async ({ page }) => {
    await completeOnboarding(page);
  });

  test("edits a transaction", async ({ page }) => {
    await addExpense(page, { amount: "10.00", merchant: "Before" });
    await page.getByRole("button", { name: "Transactions", exact: true }).click();
    await page.getByText("Before").click();
    await expect(page.getByRole("button", { name: "Edit" })).toBeVisible();
    await page.getByRole("button", { name: "Edit" }).click();
    await expect(page.getByRole("heading", { name: "Edit transaction" })).toBeVisible();
    await page.getByLabel("Amount").fill("25.50");
    await page.getByLabel("Merchant").fill("After");
    await page.locator(".sheet-footer").getByRole("button", { name: "Save changes" }).click();
    await expect(page.locator(".toast")).toContainText("Changes saved");
    await expect(page.getByText("After")).toBeVisible();
    await expect(page.getByText("25.50")).toBeVisible();
  });

  test("deletes a transaction with confirmation", async ({ page }) => {
    await addExpense(page, { amount: "10.00", merchant: "Delete Me" });
    await page.getByRole("button", { name: "Transactions", exact: true }).click();
    await page.getByText("Delete Me").click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page.locator(".dialog")).toBeVisible();
    await page.locator(".dialog").getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page.locator(".toast")).toContainText("Deleted");
    await expect(page.getByText("Delete Me")).toHaveCount(0);
    await expect(page.getByText("Nothing here yet")).toBeVisible();
  });

  test("creates a recurring transaction and filters to it", async ({ page }) => {
    await openAddSheet(page);
    await page.getByLabel("Amount").fill("9.99");
    await page.getByRole("radio", { name: "Entertainment", exact: true }).click();
    await page.getByLabel("Merchant").fill("Netflix Monthly");
    await page.getByRole("switch", { name: "Recurring transaction" }).click();
    await page.locator(".sheet-footer").getByRole("button", { name: "Add expense" }).click();
    await expect(page.locator(".toast")).toContainText("Expense added");

    await page.getByRole("button", { name: "Transactions", exact: true }).click();
    await page.getByRole("radio", { name: "Recurring", exact: true }).click();
    await expect(page.getByText("Netflix Monthly")).toBeVisible();
  });

  test("searches and filters transactions", async ({ page }) => {
    await addExpense(page, { amount: "4.80", merchant: "Coffee Shop" });
    await addExpense(page, { amount: "16.40", merchant: "Uber" });
    await addIncome(page, { amount: "2400", merchant: "Salary" });
    await page.getByRole("button", { name: "Transactions", exact: true }).click();

    await page.getByLabel("Search transactions").fill("coffee");
    await expect(page.getByText("Coffee Shop")).toBeVisible();
    await expect(page.getByText("Uber")).toHaveCount(0);
    await page.getByLabel("Search transactions").fill("");

    await page.getByRole("radio", { name: "Income", exact: true }).click();
    await expect(page.getByText("Salary")).toBeVisible();
    await expect(page.getByText("Coffee Shop")).toHaveCount(0);

    await page.getByRole("radio", { name: "Expenses", exact: true }).click();
    await expect(page.getByText("Coffee Shop")).toBeVisible();
    await expect(page.getByText("Salary")).toHaveCount(0);
  });

  test("rejects an empty amount", async ({ page }) => {
    await openAddSheet(page);
    await page.locator(".sheet-footer").getByRole("button", { name: "Add expense" }).click();
    await expect(page.getByText("Enter a valid amount.")).toBeVisible();
  });

  test("ChipGroup exposes accessible single-selection state (regression)", async ({ page }) => {
    await openAddSheet(page);
    await page.getByRole("switch", { name: "Recurring transaction" }).click();

    const group = page.getByRole("radiogroup", { name: "Recurring frequency" });
    await expect(group).toBeVisible();

    const monthly = group.getByRole("radio", { name: "Monthly", exact: true });
    const weekly = group.getByRole("radio", { name: "Weekly", exact: true });
    await expect(monthly).toHaveAttribute("aria-checked", "true");
    await expect(weekly).toHaveAttribute("aria-checked", "false");

    await weekly.click();
    await expect(weekly).toHaveAttribute("aria-checked", "true");
    await expect(monthly).toHaveAttribute("aria-checked", "false");
  });

  test("suggests a category from past entries for the same merchant (on-device, no confirmation needed to change it)", async ({ page }) => {
    await addExpense(page, { amount: "4.50", category: "Food", merchant: "Corner Cafe" });

    await openAddSheet(page);
    await page.getByLabel("Amount").fill("5.00");
    await page.getByLabel("Merchant").fill("Corner Cafe");
    // Blur the merchant field without touching the category picker.
    await page.getByLabel("Amount").focus();

    await expect(page.getByRole("radio", { name: "Food", exact: true })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByText("Suggested from your past entries with this merchant")).toBeVisible();

    // Overriding it is a plain, unconfirmed click -- no special friction.
    await page.getByRole("radio", { name: "Transport", exact: true }).click();
    await expect(page.getByText("Suggested from your past entries with this merchant")).toHaveCount(0);

    await page.locator(".sheet-footer").getByRole("button", { name: "Add expense" }).click();
    await expect(page.locator(".toast")).toContainText("Expense added");
  });

  test("does not suggest a category for a brand-new merchant with no history", async ({ page }) => {
    await openAddSheet(page);
    await page.getByLabel("Merchant").fill("Never Seen Before Inc");
    await page.getByLabel("Amount").focus();
    await expect(page.getByText("Suggested from your past entries with this merchant")).toHaveCount(0);
  });

  test("ChipGroup supports roving-tabindex arrow-key navigation (regression)", async ({ page }) => {
    await openAddSheet(page);
    await page.getByRole("switch", { name: "Recurring transaction" }).click();

    const group = page.getByRole("radiogroup", { name: "Recurring frequency" });
    const daily = group.getByRole("radio", { name: "Daily", exact: true });
    const weekly = group.getByRole("radio", { name: "Weekly", exact: true });
    const monthly = group.getByRole("radio", { name: "Monthly", exact: true });

    // Only the checked option is a tab stop; the rest are out of the tab order.
    await expect(monthly).toHaveAttribute("tabindex", "0");
    await expect(weekly).toHaveAttribute("tabindex", "-1");

    await monthly.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(weekly).toBeFocused();
    await expect(weekly).toHaveAttribute("aria-checked", "true");
    await expect(monthly).toHaveAttribute("aria-checked", "false");

    await page.keyboard.press("ArrowLeft");
    await expect(daily).toBeFocused();
    await expect(daily).toHaveAttribute("aria-checked", "true");
  });

  test("CategoryPicker supports roving-tabindex arrow-key navigation (regression)", async ({ page }) => {
    await openAddSheet(page);
    const group = page.getByRole("radiogroup", { name: "Category" });
    const other = group.getByRole("radio", { name: "Other", exact: true });
    const personal = group.getByRole("radio", { name: "Personal", exact: true });

    // "Other" is the default category, so it's the only tab stop to start.
    await expect(other).toHaveAttribute("aria-checked", "true");
    await expect(other).toHaveAttribute("tabindex", "0");
    await expect(personal).toHaveAttribute("tabindex", "-1");

    await other.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(personal).toBeFocused();
    await expect(personal).toHaveAttribute("aria-checked", "true");
    await expect(other).toHaveAttribute("aria-checked", "false");
  });

  test("a large history renders incrementally instead of mounting every row at once (regression)", async ({ page }) => {
    await seedTransactions(page, 400);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Your finances" })).toBeVisible();

    await page.getByRole("button", { name: "Transactions", exact: true }).click();
    await expect(page.locator(".txn-groups")).toBeVisible();

    const initialRows = await page.locator(".txn-groups .row").count();
    expect(initialRows).toBeLessThan(100);
    expect(initialRows).toBeGreaterThan(0);

    // Scrolling to the bottom of the shared scroll container loads more.
    for (let i = 0; i < 6; i++) {
      await page.evaluate(() => {
        const el = document.querySelector(".app-scroll");
        if (el) el.scrollTop = el.scrollHeight;
      });
      await page.waitForTimeout(120);
    }
    const grownRows = await page.locator(".txn-groups .row").count();
    expect(grownRows).toBe(400);
  });

  test.describe("SwipeRow gesture", () => {
    // Physical drag direction is intentionally the same in LTR and RTL (see
    // the comment on SwipeRow in src/components/rows.tsx) -- what mirrors is
    // *which action* sits on which physical side. LTR: dragging left (away
    // from the leading edge) reveals Delete on the physical right; dragging
    // right reveals "Mark as recurring" on the physical left. RTL: the same
    // physical drags reveal the mirrored action, because the CSS panels swap
    // physical sides via inset-inline-start/end, not the gesture math.

    test("LTR: swipe left reveals delete, swipe right reveals recurring toggle", async ({ page }) => {
      await addExpense(page, { amount: "10.00", merchant: "Swipe LTR Delete" });
      await page.getByRole("button", { name: "Transactions", exact: true }).click();
      const row = page.locator(".swipe-row").filter({ hasText: "Swipe LTR Delete" });
      const track = row.locator(".swipe-track");

      await dragSwipeTrack(page, track, -100);
      await row.getByRole("button", { name: "Delete transaction" }).click();
      await expect(page.locator(".dialog")).toBeVisible();
      await page.locator(".dialog").getByRole("button", { name: "Delete", exact: true }).click();
      await expect(page.locator(".toast")).toContainText("Deleted");
      await expect(page.getByText("Swipe LTR Delete")).toHaveCount(0);
    });

    test("LTR: swipe right reveals the recurring toggle on the leading side", async ({ page }) => {
      await addExpense(page, { amount: "10.00", merchant: "Swipe LTR Recurring" });
      await page.getByRole("button", { name: "Transactions", exact: true }).click();
      const row = page.locator(".swipe-row").filter({ hasText: "Swipe LTR Recurring" });
      const track = row.locator(".swipe-track");

      await dragSwipeTrack(page, track, 100);
      await row.getByRole("button", { name: "Mark as recurring" }).click();
      await expect(page.locator(".toast")).toContainText("Marked as recurring");
    });

    test("RTL: the swipe gesture mirrors -- physical swipe right reveals delete, swipe left reveals recurring", async ({
      page,
    }) => {
      // Create both transactions while still in English (the shared
      // addExpense/openAddSheet helpers use English locators), then switch to
      // Hebrew -- which also translates every button/toast, not just `dir` --
      // for the actual swipe-mirroring assertions below.
      await addExpense(page, { amount: "10.00", merchant: "Swipe RTL Delete" });
      await addExpense(page, { amount: "10.00", merchant: "Swipe RTL Recurring" });
      await setLanguage(page, "he");
      await page.getByRole("button", { name: "תנועות", exact: true }).click();
      const deleteRow = page.locator(".swipe-row").filter({ hasText: "Swipe RTL Delete" });
      const deleteTrack = deleteRow.locator(".swipe-track");

      // Mirrored from the LTR case: dragging right (not left) now reveals delete.
      await dragSwipeTrack(page, deleteTrack, 100);
      await deleteRow.getByRole("button", { name: "מחיקת התנועה" }).click();
      await expect(page.locator(".dialog")).toBeVisible();
      await page.locator(".dialog").getByRole("button", { name: "מחיקה", exact: true }).click();
      await expect(page.locator(".toast")).toContainText("נמחק");
      await expect(page.getByText("Swipe RTL Delete")).toHaveCount(0);

      const recurringRow = page.locator(".swipe-row").filter({ hasText: "Swipe RTL Recurring" });
      const recurringTrack = recurringRow.locator(".swipe-track");

      // Mirrored from the LTR case: dragging left (not right) now reveals recurring.
      await dragSwipeTrack(page, recurringTrack, -100);
      await recurringRow.getByRole("button", { name: "סימון כתנועה חוזרת" }).click();
      await expect(page.locator(".toast")).toContainText("סומנה כחוזרת");
    });
  });
});
