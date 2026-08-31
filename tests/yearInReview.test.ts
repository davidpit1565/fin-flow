import { describe, expect, test } from "bun:test";
import { buildYearInReview } from "../src/lib/yearInReview";
import { cat, installGlobals, sub, txn } from "./helpers";

installGlobals("en-US");

describe("buildYearInReview", () => {
  const categories = [cat("food", "Food"), cat("travel", "Travel"), cat("rent", "Rent")];

  test("identifies top category, biggest expense and busiest month across a healthy mix", () => {
    const transactions = [
      // Food: 3 expenses in Jan totaling 9000.
      txn({ amountCents: 3000, categoryId: "food", date: "2026-01-05", merchant: "Groceries" }),
      txn({ amountCents: 3000, categoryId: "food", date: "2026-01-12", merchant: "Groceries" }),
      txn({ amountCents: 3000, categoryId: "food", date: "2026-01-20", merchant: "Groceries" }),
      // Travel: 1 big expense in March -- biggest single transaction, and
      // March ends up the busiest month even though Food's yearly total is higher.
      txn({ amountCents: 20000, categoryId: "travel", date: "2026-03-10", merchant: "Flights" }),
      // Rent: spread across the year, smaller total than Food.
      txn({ amountCents: 1000, categoryId: "rent", date: "2026-06-01", merchant: "Landlord" }),
      txn({ amountCents: 1000, categoryId: "rent", date: "2026-09-01", merchant: "Landlord" }),
      // Income.
      txn({ type: "income", amountCents: 50000, categoryId: "food", date: "2026-01-15", merchant: "Salary" }),
      txn({ type: "income", amountCents: 50000, categoryId: "food", date: "2026-07-15", merchant: "Salary" }),
    ];
    const subscriptions = [
      sub({ id: "a", amountCents: 1000, frequency: "monthly" }), // 12000/yr
      sub({ id: "b", amountCents: 12000, frequency: "yearly", status: "paused" }), // excluded, inactive
    ];

    const review = buildYearInReview(2026, transactions, subscriptions, categories);

    // Hand-computed totals: expenses = 9000 + 20000 + 1000 + 1000 = 31000.
    expect(review.totalSpentCents).toBe(31000);
    // Income = 50000 + 50000 = 100000.
    expect(review.totalIncomeCents).toBe(100000);
    expect(review.netSavedCents).toBe(100000 - 31000);
    expect(review.transactionCount).toBe(transactions.length);
    // Expense-only count: the 3 Food + 1 Travel + 2 Rent expenses (income excluded).
    expect(review.expenseCount).toBe(6);

    // Top category by total spend: Travel (20000) beats Food (9000) and Rent (2000).
    expect(review.topCategory?.category.id).toBe("travel");
    expect(review.topCategory?.spentCents).toBe(20000);

    // Biggest single expense transaction: the 20000 flight.
    expect(review.biggestExpense?.merchant).toBe("Flights");
    expect(review.biggestExpense?.amountCents).toBe(20000);

    // Busiest month by total expense spend: March (20000) beats January (9000).
    expect(review.busiestMonth?.monthIndex).toBe(2); // March = index 2
    expect(review.busiestMonth?.spentCents).toBe(20000);

    // Only the active monthly subscription counts toward the yearly total.
    expect(review.subscriptionTotalCents).toBe(12000);
  });

  test("a year with zero transactions returns sane zeros/nulls, never NaN/throw", () => {
    const review = buildYearInReview(2026, [], [], categories);
    expect(review.totalSpentCents).toBe(0);
    expect(review.totalIncomeCents).toBe(0);
    expect(review.netSavedCents).toBe(0);
    expect(review.topCategory).toBeNull();
    expect(review.biggestExpense).toBeNull();
    expect(review.busiestMonth).toBeNull();
    expect(review.transactionCount).toBe(0);
    expect(review.expenseCount).toBe(0);
    expect(review.subscriptionTotalCents).toBe(0);
    expect(Number.isNaN(review.netSavedCents)).toBe(false);
  });

  test("excludes transactions from other years", () => {
    const transactions = [
      txn({ amountCents: 5000, categoryId: "food", date: "2025-12-31", merchant: "Last year" }),
      txn({ amountCents: 7000, categoryId: "travel", date: "2027-01-01", merchant: "Next year" }),
      txn({ amountCents: 1500, categoryId: "food", date: "2026-06-15", merchant: "This year" }),
    ];
    const review = buildYearInReview(2026, transactions, [], categories);
    expect(review.transactionCount).toBe(1);
    expect(review.totalSpentCents).toBe(1500);
    expect(review.topCategory?.category.id).toBe("food");
    expect(review.topCategory?.spentCents).toBe(1500);
    expect(review.biggestExpense?.merchant).toBe("This year");
    expect(review.busiestMonth?.monthIndex).toBe(5); // June
  });
});
