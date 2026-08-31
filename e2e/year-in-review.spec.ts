import { test, expect, type Page } from "@playwright/test";
import { completeOnboarding, openSettings } from "./helpers";

/**
 * Seeds a handful of transactions directly into IndexedDB across the current
 * year and two years back, leaving the year in between empty -- like
 * e2e/insights-ai.spec.ts's seedInsightsData, dates are computed from the
 * real "now" so the test is correct regardless of when it actually runs.
 */
async function seedYearData(page: Page) {
  await page.evaluate(() => {
    function req<T>(r: IDBRequest<T>): Promise<T> {
      return new Promise((resolve, reject) => {
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
    }

    return new Promise<void>((resolve, reject) => {
      const openReq = indexedDB.open("flow-db");
      openReq.onsuccess = async () => {
        try {
          const db = openReq.result;
          const cats = await req<{ id: string; name: string }[]>(
            db.transaction("categories", "readonly").objectStore("categories").getAll()
          );
          const food = cats.find((c) => c.name === "Food");
          const travel = cats.find((c) => c.name === "Travel");
          if (!food || !travel) throw new Error("Expected default categories not found");

          const now = Date.now();
          const currentYear = new Date().getFullYear();
          const txStore = db.transaction("transactions", "readwrite").objectStore("transactions");

          // Current year: Food gets three smaller expenses (top category by
          // total), Travel gets one big expense (biggest single transaction,
          // and its month becomes the busiest month by total spend).
          const seedTxns: { id: string; type: "expense" | "income"; amountCents: number; categoryId: string; merchant: string; date: string }[] = [
            { id: "e2e-yir-food-1", type: "expense", amountCents: 3000, categoryId: food.id, merchant: "Groceries", date: `${currentYear}-01-05` },
            { id: "e2e-yir-food-2", type: "expense", amountCents: 3000, categoryId: food.id, merchant: "Groceries", date: `${currentYear}-01-12` },
            { id: "e2e-yir-food-3", type: "expense", amountCents: 3000, categoryId: food.id, merchant: "Groceries", date: `${currentYear}-01-20` },
            { id: "e2e-yir-travel-1", type: "expense", amountCents: 50000, categoryId: travel.id, merchant: "Big Trip", date: `${currentYear}-03-10` },
            { id: "e2e-yir-income-1", type: "income", amountCents: 200000, categoryId: food.id, merchant: "Salary", date: `${currentYear}-01-15` },
          ];
          seedTxns.forEach((t, i) => {
            txStore.put({
              id: t.id,
              type: t.type,
              amountCents: t.amountCents,
              categoryId: t.categoryId,
              merchant: t.merchant,
              date: t.date,
              subscriptionId: null,
              notes: "",
              recurring: false,
              frequency: null,
              nextOccurrence: null,
              paymentMethod: null,
              createdAt: now - i,
              updatedAt: now - i,
            });
          });

          // Two years back: one transaction, just so that year (and the
          // empty year in between) become reachable via the year picker.
          const oldPut = txStore.put({
            id: "e2e-yir-old",
            type: "expense",
            amountCents: 1000,
            categoryId: food.id,
            merchant: "Old expense",
            date: `${currentYear - 2}-05-01`,
            subscriptionId: null,
            notes: "",
            recurring: false,
            frequency: null,
            nextOccurrence: null,
            paymentMethod: null,
            createdAt: now - 100,
            updatedAt: now - 100,
          });

          oldPut.onerror = () => reject(oldPut.error);
          oldPut.onsuccess = () => resolve();
        } catch (e) {
          reject(e);
        }
      };
      openReq.onerror = () => reject(openReq.error);
    });
  });
}

test.describe("year in review", () => {
  test.beforeEach(async ({ page }) => {
    await completeOnboarding(page);
    await seedYearData(page);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Your finances" })).toBeVisible();
  });

  test("navigates from Settings and shows the current year's recap", async ({ page }) => {
    await openSettings(page);
    await page.getByRole("button", { name: "Year in review" }).click();
    await expect(page.getByRole("heading", { name: "Year in review" })).toBeVisible();

    const currentYear = new Date().getFullYear();
    await expect(page.locator(".year-picker-value")).toHaveText(String(currentYear));

    // Total spent = 3000*3 (Food) + 50000 (Travel) = 59000 -> $590.00.
    await expect(page.locator(".wrapped-hero")).toContainText("590.00");
    await expect(page.locator(".wrapped-hero")).toContainText("4 transactions");

    // Top category is Travel (50000 beats Food's 9000).
    await expect(page.locator(".insight-tile", { hasText: "Top category" })).toContainText("Travel");
    await expect(page.locator(".insight-tile", { hasText: "Top category" })).toContainText("500.00");

    // Biggest single expense is the Travel transaction.
    await expect(page.locator(".insight-tile", { hasText: "Biggest single expense" })).toContainText("Big Trip");
    await expect(page.locator(".insight-tile", { hasText: "Biggest single expense" })).toContainText("500.00");

    // Busiest month is March (the 50000 Travel expense).
    await expect(page.locator(".insight-tile", { hasText: "Busiest month" })).toContainText("500.00");
  });

  test("shows a friendly empty message for a past year with no transactions", async ({ page }) => {
    await openSettings(page);
    await page.getByRole("button", { name: "Year in review" }).click();
    await expect(page.getByRole("heading", { name: "Year in review" })).toBeVisible();

    // Step back one year from the current year, into the empty year seeded
    // above (data exists for the current year and two years back, but not
    // the year in between).
    await page.getByRole("button", { name: "Previous year" }).click();
    const emptyYear = new Date().getFullYear() - 1;
    await expect(page.locator(".year-picker-value")).toHaveText(String(emptyYear));
    await expect(page.getByText(`No transactions yet in ${emptyYear}.`)).toBeVisible();
    await expect(page.locator(".wrapped-hero")).toHaveCount(0);
  });
});
