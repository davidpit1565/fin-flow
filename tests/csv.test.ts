import { describe, expect, test } from "bun:test";
import { buildCSV, parseImportCSV } from "../src/lib/csv";
import { cat, installGlobals, sub, txn } from "./helpers";

installGlobals("en-US");

const categories = [cat("food", "Food"), cat("subs", "Subscriptions"), cat("other", "Other")];

describe("CSV export/import round-trip", () => {
  test("transactions and subscriptions survive a round trip", () => {
    const transactions = [
      txn({ id: "t1", amountCents: 480, merchant: "Coffee Shop", categoryId: "food", type: "expense", recurring: true, frequency: "monthly", notes: "morning coffee" }),
      txn({ id: "t2", amountCents: 240000, merchant: "Salary", categoryId: "other", type: "income", date: "2026-08-01" }),
    ];
    const subscriptions = [sub({ id: "s1", name: "Netflix", amountCents: 1799, frequency: "monthly", categoryId: "subs", nextPaymentDate: "2026-08-20" })];
    const csv = buildCSV({ transactions, subscriptions, categories });

    const parsed = parseImportCSV(csv, categories);
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows.length).toBe(2);

    const coffee = parsed.rows.find((r) => r.merchant === "Coffee Shop");
    expect(coffee).toBeDefined();
    expect(coffee?.amountCents).toBe(480);
    expect(coffee?.categoryId).toBe("food");
    expect(coffee?.recurring).toBe(true);
    expect(coffee?.frequency).toBe("monthly");
    expect(coffee?.type).toBe("expense");

    const salary = parsed.rows.find((r) => r.merchant === "Salary");
    expect(salary?.type).toBe("income");
    expect(salary?.amountCents).toBe(240000);
  });

  test("round-trips quoted fields with commas", () => {
    const transactions = [txn({ id: "t3", merchant: "Store, Inc.", notes: "line1\nline2", amountCents: 1234 })];
    const csv = buildCSV({ transactions, subscriptions: [], categories });
    const parsed = parseImportCSV(csv, categories);
    expect(parsed.rows.length).toBe(1);
    expect(parsed.rows[0].merchant).toBe("Store, Inc.");
    expect(parsed.rows[0].notes).toBe("line1\nline2");
  });

  test("neutralizes formula-triggering merchant/notes on export, and round-trips the original text back (regression: CSV injection)", () => {
    const transactions = [
      txn({ id: "t4", merchant: "=1+1", notes: "@SUM(A1:A9)", amountCents: 1000 }),
      txn({ id: "t5", merchant: "+HYPERLINK(\"http://evil\")", notes: "-2+3", amountCents: 2000 }),
    ];
    const csv = buildCSV({ transactions, subscriptions: [], categories });
    // The raw CSV text must not contain a bare formula-triggering cell --
    // every such value is guarded with a leading single quote.
    expect(csv).not.toMatch(/,=1\+1,/);
    expect(csv).toContain("'=1+1");

    const parsed = parseImportCSV(csv, categories);
    expect(parsed.rows.length).toBe(2);
    expect(parsed.rows.find((r) => r.amountCents === 1000)?.merchant).toBe("=1+1");
    expect(parsed.rows.find((r) => r.amountCents === 1000)?.notes).toBe("@SUM(A1:A9)");
    expect(parsed.rows.find((r) => r.amountCents === 2000)?.merchant).toBe('+HYPERLINK("http://evil")');
    expect(parsed.rows.find((r) => r.amountCents === 2000)?.notes).toBe("-2+3");
  });

  test("a merchant that genuinely starts with an apostrophe is untouched", () => {
    const transactions = [txn({ id: "t6", merchant: "'Round Midnight Records", amountCents: 500 })];
    const csv = buildCSV({ transactions, subscriptions: [], categories });
    const parsed = parseImportCSV(csv, categories);
    expect(parsed.rows[0].merchant).toBe("'Round Midnight Records");
  });
});

describe("CSV import validation", () => {
  test("rejects invalid amounts and missing dates", () => {
    const csv = [
      "Flow export",
      "",
      "# Transactions",
      "Date,Merchant,Amount,Currency,Category,Type,Notes,Recurring,Frequency,Payment method",
      "2026-08-05,Bad,not-a-number,,Food,expense,,no,,",
      ",NoDate,5.00,,Food,expense,,no,,",
      "2026-08-05,Good,9.99,,Food,expense,,no,,",
    ].join("\r\n");
    const parsed = parseImportCSV(csv, categories);
    expect(parsed.errors.length).toBe(2);
    expect(parsed.rows.length).toBe(1);
    expect(parsed.rows[0].merchant).toBe("Good");
  });

  test("falls back to Other for unknown categories", () => {
    const csv = [
      "Flow export",
      "",
      "# Transactions",
      "Date,Merchant,Amount,Currency,Category,Type,Notes,Recurring,Frequency,Payment method",
      "2026-08-05,X,5.00,,UnknownCat,expense,,no,,",
    ].join("\r\n");
    const parsed = parseImportCSV(csv, categories);
    expect(parsed.rows.length).toBe(1);
    expect(parsed.rows[0].categoryId).toBe("other");
  });
});
