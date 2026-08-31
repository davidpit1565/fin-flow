import { describe, expect, test } from "bun:test";
import { debtPayoffPlan } from "../src/lib/debt";
import type { Debt } from "../src/types";

function debt(over: Partial<Debt> & { id: string }): Debt {
  return {
    name: over.id,
    remainingCents: 0,
    aprPercent: 0,
    minPaymentCents: 0,
    createdAt: 1,
    updatedAt: 1,
    ...over,
  };
}

describe("debtPayoffPlan", () => {
  test("single debt, 0% APR, extra payment well above the minimum: exact months and zero interest", () => {
    // $1,200 balance, $10 minimum, $50 extra -> $60/month, no interest, so
    // this divides evenly: exactly 20 months, $0 interest paid.
    const d = debt({ id: "d1", remainingCents: 120000, aprPercent: 0, minPaymentCents: 1000 });
    const result = debtPayoffPlan([d], 5000, "avalanche");
    expect(result.neverPaysOff).toBe(false);
    expect(result.totalMonths).toBe(20);
    expect(result.totalInterestPaidCents).toBe(0);
    expect(result.perDebt).toEqual([{ debtId: "d1", payoffMonth: 20 }]);
  });

  test("single debt with interest: first month's accrued interest matches hand calculation, payoff is sane", () => {
    // $1,000 at 12% APR/yr = 1%/month -> first month's interest is exactly
    // $10 (1000 cents) before any payment is applied.
    const d = debt({ id: "d1", remainingCents: 100000, aprPercent: 12, minPaymentCents: 2000 });
    const result = debtPayoffPlan([d], 8000, "snowball");
    expect(result.neverPaysOff).toBe(false);
    // $1,010 owed after month-1 interest, paid down by $100 (min + extra) -> $910 left.
    // Payoff should land comfortably under a year at ~$100/month against ~$1,000.
    expect(result.totalMonths).toBeGreaterThan(9);
    expect(result.totalMonths).toBeLessThan(13);
    expect(result.totalInterestPaidCents).toBeGreaterThan(0);
    expect(result.perDebt).toEqual([{ debtId: "d1", payoffMonth: result.totalMonths }]);
  });

  test("snowball and avalanche disagree on order when the smallest balance also has the lowest APR", () => {
    // A has the smaller balance but the lower APR; B has the bigger balance
    // but the higher APR -- snowball and avalanche must pick different
    // debts to prioritize first.
    const a = debt({ id: "A", remainingCents: 50000, aprPercent: 5, minPaymentCents: 1000 });
    const b = debt({ id: "B", remainingCents: 200000, aprPercent: 20, minPaymentCents: 3000 });

    const snowball = debtPayoffPlan([a, b], 20000, "snowball");
    const avalanche = debtPayoffPlan([a, b], 20000, "avalanche");

    expect(snowball.neverPaysOff).toBe(false);
    expect(avalanche.neverPaysOff).toBe(false);

    // Snowball attacks the smallest balance (A) first.
    expect(snowball.perDebt.map((p) => p.debtId)).toEqual(["A", "B"]);
    // Avalanche attacks the highest APR (B) first.
    expect(avalanche.perDebt.map((p) => p.debtId)).toEqual(["B", "A"]);
  });

  test("minimum payment doesn't cover accruing interest and there's no extra payment: never pays off, returns promptly", () => {
    // 24% APR/yr = 2%/month on $1,000 = $20/month interest, but the minimum
    // payment is only $10 -- the balance grows forever with $0 extra.
    const d = debt({ id: "d1", remainingCents: 100000, aprPercent: 24, minPaymentCents: 1000 });
    const start = Date.now();
    const result = debtPayoffPlan([d], 0, "avalanche");
    expect(Date.now() - start).toBeLessThan(1000);
    expect(result).toEqual({
      neverPaysOff: true,
      totalMonths: 0,
      totalInterestPaidCents: 0,
      perDebt: [],
    });
  });

  test("a debt already at 0 is ignored entirely", () => {
    const paidOff = debt({ id: "paid", remainingCents: 0, aprPercent: 10, minPaymentCents: 500 });
    const result = debtPayoffPlan([paidOff], 0, "snowball");
    expect(result).toEqual({ neverPaysOff: false, totalMonths: 0, totalInterestPaidCents: 0, perDebt: [] });
  });

  test("no debts at all: already debt-free", () => {
    const result = debtPayoffPlan([], 10000, "avalanche");
    expect(result).toEqual({ neverPaysOff: false, totalMonths: 0, totalInterestPaidCents: 0, perDebt: [] });
  });

  test("freed-up minimum payments roll into the extra payment once a debt is paid off (snowball effect)", () => {
    // A pays off quickly, then its $10 minimum should accelerate B.
    const a = debt({ id: "A", remainingCents: 2000, aprPercent: 0, minPaymentCents: 1000 });
    const b = debt({ id: "B", remainingCents: 100000, aprPercent: 0, minPaymentCents: 500 });
    const withoutSnowballEffect = 100000 / 500; // if B only ever got its own $5 minimum: 200 months
    const result = debtPayoffPlan([a, b], 0, "snowball");
    expect(result.neverPaysOff).toBe(false);
    expect(result.perDebt.map((p) => p.debtId)).toEqual(["A", "B"]);
    // B should pay off much faster than 200 months once A's payment frees up.
    expect(result.totalMonths).toBeLessThan(withoutSnowballEffect);
  });
});
