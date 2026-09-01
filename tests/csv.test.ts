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
    const csv = buildCSV({ transactions, subscriptions, categories, currency: "USD" });

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
    const csv = buildCSV({ transactions, subscriptions: [], categories, currency: "USD" });
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
    const csv = buildCSV({ transactions, subscriptions: [], categories, currency: "USD" });
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

  test("exports the real currency code, not a placeholder string (regression)", () => {
    const transactions = [txn({ id: "t7", merchant: "Cafe", amountCents: 500 })];
    const subscriptions = [sub({ id: "s2", name: "Netflix", amountCents: 1799, currency: "EUR" })];
    const csv = buildCSV({ transactions, subscriptions, categories, currency: "ILS" });

    expect(csv).not.toContain("app currency");
    // Transactions use the app-wide currency setting (they don't store their own).
    const txnLine = csv.split("\r\n").find((l) => l.startsWith("2026-08-05,Cafe"));
    expect(txnLine).toContain(",ILS,");
    // Subscriptions store their own currency, which can differ from the
    // app's current setting if it was changed after the subscription was added.
    const subLine = csv.split("\r\n").find((l) => l.startsWith("Netflix,"));
    expect(subLine).toContain(",EUR,");
  });

  test("a merchant that genuinely starts with an apostrophe is untouched", () => {
    const transactions = [txn({ id: "t6", merchant: "'Round Midnight Records", amountCents: 500 })];
    const csv = buildCSV({ transactions, subscriptions: [], categories, currency: "USD" });
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

  test("malformed/empty file returns no rows and no throw", () => {
    expect(parseImportCSV("", categories)).toEqual({ rows: [], errors: [], total: 0 });
    expect(parseImportCSV("\r\n\r\n", categories)).toEqual({ rows: [], errors: [], total: 0 });
  });
});

describe("generic CSV import (bank/spreadsheet/other tracker format)", () => {
  test("imports a generic CSV with reordered, synonym column names", () => {
    const csv = ["Payee,Transaction Date,Value,Category", "Whole Foods,2026-08-10,42.50,Food"].join("\r\n");
    const parsed = parseImportCSV(csv, categories);
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows.length).toBe(1);
    expect(parsed.rows[0].merchant).toBe("Whole Foods");
    expect(parsed.rows[0].date).toBe("2026-08-10");
    expect(parsed.rows[0].amountCents).toBe(4250);
    expect(parsed.rows[0].categoryId).toBe("food");
    expect(parsed.rows[0].type).toBe("expense");
  });

  test("imports a semicolon-delimited generic CSV", () => {
    const csv = ["Date;Merchant;Amount;Category", "2026-08-11;Bakery;12,50;Food"].join("\r\n");
    const parsed = parseImportCSV(csv, categories);
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows.length).toBe(1);
    expect(parsed.rows[0].merchant).toBe("Bakery");
    expect(parsed.rows[0].amountCents).toBe(1250);
    expect(parsed.rows[0].categoryId).toBe("food");
  });

  test("a negative amount with no type column is treated as an expense", () => {
    const csv = ["Date,Merchant,Amount", "2026-08-12,Landlord,-1200.00"].join("\r\n");
    const parsed = parseImportCSV(csv, categories);
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows.length).toBe(1);
    expect(parsed.rows[0].type).toBe("expense");
    expect(parsed.rows[0].amountCents).toBe(120000);
  });

  test("a positive amount with no type column also defaults to expense", () => {
    const csv = ["Date,Merchant,Amount", "2026-08-12,Landlord,1200.00"].join("\r\n");
    const parsed = parseImportCSV(csv, categories);
    expect(parsed.rows.length).toBe(1);
    expect(parsed.rows[0].type).toBe("expense");
    expect(parsed.rows[0].amountCents).toBe(120000);
  });

  test("an explicit type column still overrides the default", () => {
    const csv = ["Date,Merchant,Amount,Type", "2026-08-12,Employer,3000.00,income"].join("\r\n");
    const parsed = parseImportCSV(csv, categories);
    expect(parsed.rows.length).toBe(1);
    expect(parsed.rows[0].type).toBe("income");
  });

  test("a missing category column falls back to Other, not an error", () => {
    const csv = ["Date,Merchant,Amount", "2026-08-13,Corner Store,7.25"].join("\r\n");
    const parsed = parseImportCSV(csv, categories);
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows.length).toBe(1);
    expect(parsed.rows[0].categoryId).toBe("other");
  });

  test("uses description as merchant when there's no dedicated merchant/payee column", () => {
    const csv = ["Date,Description,Amount", "2026-08-14,Gas Station,30.00"].join("\r\n");
    const parsed = parseImportCSV(csv, categories);
    expect(parsed.rows.length).toBe(1);
    expect(parsed.rows[0].merchant).toBe("Gas Station");
    expect(parsed.rows[0].notes).toBe("");
  });

  test("uses description as notes when a separate merchant column exists", () => {
    const csv = ["Date,Merchant,Description,Amount", "2026-08-14,Shell,Fuel for the trip,30.00"].join("\r\n");
    const parsed = parseImportCSV(csv, categories);
    expect(parsed.rows.length).toBe(1);
    expect(parsed.rows[0].merchant).toBe("Shell");
    expect(parsed.rows[0].notes).toBe("Fuel for the trip");
  });

  test("normalizes unambiguous MM/DD/YYYY and DD/MM/YYYY dates", () => {
    const csv = ["Date,Merchant,Amount", "01/31/2026,US Store,10.00", "31/01/2026,EU Store,10.00"].join("\r\n");
    const parsed = parseImportCSV(csv, categories);
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows.find((r) => r.merchant === "US Store")?.date).toBe("2026-01-31");
    expect(parsed.rows.find((r) => r.merchant === "EU Store")?.date).toBe("2026-01-31");
  });

  test("refuses to guess a truly ambiguous slash date", () => {
    const csv = ["Date,Merchant,Amount", "01/02/2026,Mystery Store,10.00"].join("\r\n");
    const parsed = parseImportCSV(csv, categories);
    expect(parsed.rows.length).toBe(0);
    expect(parsed.errors.length).toBe(1);
  });

  test("rejects an invalid amount and missing date in a generic CSV", () => {
    const csv = ["Date,Merchant,Amount", "2026-08-15,Bad Amount,not-a-number", ",No Date,5.00"].join("\r\n");
    const parsed = parseImportCSV(csv, categories);
    expect(parsed.total).toBe(2);
    expect(parsed.errors.length).toBe(2);
    expect(parsed.rows.length).toBe(0);
  });
});
