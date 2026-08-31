import { test, expect, type Page } from "@playwright/test";
import { completeOnboarding, goToTab } from "./helpers";

/**
 * Seeds data for the "AI Insights" cards directly into IndexedDB (like
 * e2e/helpers.ts's seedTransactions does), then reloads so the app picks it
 * up. All dates are computed inside the browser with plain `Date` math so
 * they always land on "3 full months ago" / "this month" relative to
 * whenever the test actually runs.
 */
async function seedInsightsData(page: Page) {
  await page.evaluate(() => {
    function req<T>(r: IDBRequest<T>): Promise<T> {
      return new Promise((resolve, reject) => {
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
    }
    function iso(d: Date): string {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
    function monthsAgo(n: number, day: number): string {
      const d = new Date();
      d.setDate(1); // pin to the 1st first so subtracting months never overflows into a different month
      d.setMonth(d.getMonth() - n);
      d.setDate(day);
      return iso(d);
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
          if (!food) throw new Error("Food category not found");

          const now = Date.now();
          const txStore = db.transaction("transactions", "readwrite").objectStore("transactions");
          // Trailing 3 full months: a steady ~30.00 spend in Food.
          [1, 2, 3].forEach((n, i) => {
            txStore.put({
              id: `e2e-anomaly-prior-${n}`,
              type: "expense",
              amountCents: 3000,
              categoryId: food.id,
              merchant: "Groceries",
              date: monthsAgo(n, 5),
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
          // This month: a spike, well over 30% up and well past the
          // "trivial amount" floor -- also busts the budget seeded below.
          const spikeTx = txStore.put({
            id: "e2e-anomaly-spike",
            type: "expense",
            amountCents: 9000,
            categoryId: food.id,
            merchant: "Big grocery run",
            date: monthsAgo(0, 5),
            subscriptionId: null,
            notes: "",
            recurring: false,
            frequency: null,
            nextOccurrence: null,
            paymentMethod: null,
            createdAt: now,
            updatedAt: now,
          });

          const budgetStore = db.transaction("budgets", "readwrite").objectStore("budgets");
          budgetStore.put({
            id: "e2e-food-budget",
            categoryId: food.id,
            amountCents: 5000, // busted by the 9000-cent spike above
            period: "monthly",
            createdAt: now,
            updatedAt: now,
          });

          const subStore = db.transaction("subscriptions", "readwrite").objectStore("subscriptions");
          const subPut = subStore.put({
            id: "e2e-unused-sub",
            name: "Forgotten Gym",
            amountCents: 4500,
            currency: "USD",
            frequency: "monthly",
            nextPaymentDate: iso(new Date(now + 30 * 86400000)),
            categoryId: food.id,
            paymentMethod: null,
            notes: "",
            reminderDays: null,
            status: "active",
            usage: "unused",
            payments: [],
            createdAt: now,
            updatedAt: now,
          });

          spikeTx.onerror = () => reject(spikeTx.error);
          subPut.onerror = () => reject(subPut.error);
          subPut.onsuccess = () => resolve();
        } catch (e) {
          reject(e);
        }
      };
      openReq.onerror = () => reject(openReq.error);
    });
  });
}

test.describe("insights - AI cards", () => {
  test("renders financial health, narrative, unused-subscription and anomaly callouts", async ({ page }) => {
    await completeOnboarding(page);
    await seedInsightsData(page);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Your finances" })).toBeVisible();

    await goToTab(page, "Insights");
    await expect(page.getByRole("heading", { name: "Insights" })).toBeVisible();

    // Financial health card: a score, a tier label, and a factor breakdown.
    await expect(page.getByText("Financial health")).toBeVisible();

    // Monthly narrative section.
    await expect(page.getByText("This month")).toBeVisible();

    // Unused subscriptions callout.
    await expect(page.getByText("Unused subscriptions")).toBeVisible();
    await expect(page.getByText("Forgotten Gym")).toBeVisible();

    // Spending anomaly callout.
    await expect(page.getByText("Worth a look")).toBeVisible();
    await expect(page.locator(".anomaly-item", { hasText: "Food" })).toBeVisible();
  });
});
