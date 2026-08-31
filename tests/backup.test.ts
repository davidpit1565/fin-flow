import { describe, expect, test } from "bun:test";
import { decryptBackup, encryptBackup, type BackupPayload } from "../src/lib/backup";
import { cat, goal, installGlobals, sub, txn } from "./helpers";
import type { Debt, NetWorthItem, UserSettings } from "../src/types";

installGlobals("en-US");

function buildPayload(): BackupPayload {
  const settings: UserSettings = {
    id: "user",
    onboarded: true,
    currency: "USD",
    startBalanceCents: 10000,
    startWeekOn: "monday",
    dateFormat: "auto",
    theme: "system",
    notifications: {
      enabled: true,
      subscriptionReminders: true,
      budgetAlerts: false,
      monthlySummary: true,
    },
    appLockEnabled: false,
    createdAt: 1,
    updatedAt: 2,
  };

  const netWorthItem: NetWorthItem = {
    id: "nw1",
    kind: "asset",
    name: "Savings account",
    category: "Cash",
    valueCents: 500000,
    createdAt: 1,
    updatedAt: 1,
  };

  const debt: Debt = {
    id: "d1",
    name: "Visa card",
    remainingCents: 250000,
    aprPercent: 19.99,
    minPaymentCents: 5000,
    createdAt: 1,
    updatedAt: 1,
  };

  return {
    version: 1,
    settings,
    categories: [cat("food", "Food"), cat("subs", "Subscriptions")],
    transactions: [
      txn({ id: "t1", merchant: "Coffee Shop", amountCents: 480, categoryId: "food" }),
      txn({ id: "t2", merchant: "Salary", amountCents: 240000, type: "income", categoryId: "food" }),
    ],
    subscriptions: [sub({ id: "s1", name: "Netflix", amountCents: 1799, categoryId: "subs" })],
    budgets: [{ id: "b1", categoryId: "food", amountCents: 30000, period: "monthly" as const, createdAt: 1, updatedAt: 1 }],
    goals: [goal({ id: "g1", name: "Vacation", targetCents: 200000, currentCents: 50000 })],
    netWorthItems: [netWorthItem],
    debts: [debt],
  };
}

describe("encrypted backup round-trip", () => {
  test("decrypting with the right password returns the original payload", async () => {
    const payload = buildPayload();
    const encrypted = await encryptBackup(payload, "correct horse battery staple");
    const decrypted = await decryptBackup(encrypted, "correct horse battery staple");
    expect(decrypted).toEqual(payload);
  });

  test("the encrypted file is not readable plaintext (regression: never store data unencrypted)", async () => {
    const payload = buildPayload();
    const encrypted = await encryptBackup(payload, "hunter2");
    expect(encrypted).not.toContain("Coffee Shop");
    expect(encrypted).not.toContain("Netflix");
    expect(encrypted).not.toContain("Vacation");
  });

  test("uses a fresh random salt and IV on every call (regression: never a fixed salt/IV)", async () => {
    const payload = buildPayload();
    const a = JSON.parse(await encryptBackup(payload, "same-password"));
    const b = JSON.parse(await encryptBackup(payload, "same-password"));
    expect(a.salt).not.toBe(b.salt);
    expect(a.iv).not.toBe(b.iv);
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });

  test("wrong password throws a catchable error", async () => {
    const payload = buildPayload();
    const encrypted = await encryptBackup(payload, "right-password");
    await expect(decryptBackup(encrypted, "wrong-password")).rejects.toThrow();
  });

  test("corrupted/truncated ciphertext throws a catchable error", async () => {
    const payload = buildPayload();
    const encrypted = await encryptBackup(payload, "a-password");
    const envelope = JSON.parse(encrypted);
    envelope.ciphertext = envelope.ciphertext.slice(0, -10);
    await expect(decryptBackup(JSON.stringify(envelope), "a-password")).rejects.toThrow();
  });

  test("a file that isn't a Flow backup envelope at all throws a clear error, not a crash", async () => {
    await expect(decryptBackup('{"not":"a backup"}', "whatever")).rejects.toThrow();
  });

  test("garbage JSON (not even an object) throws a clear error", async () => {
    await expect(decryptBackup("not json at all", "whatever")).rejects.toThrow();
  });
});
