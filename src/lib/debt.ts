import type { Debt } from "../types";

/** Debt payoff planning: month-by-month amortization simulation. */

export type PayoffStrategy = "snowball" | "avalanche";

export interface DebtPayoffResult {
  neverPaysOff: boolean; // true if minimum payments don't even cover accruing interest and the extra payment isn't enough to fix that
  totalMonths: number; // months until every debt reaches 0 (0 if neverPaysOff)
  totalInterestPaidCents: number;
  perDebt: { debtId: string; payoffMonth: number }[]; // month index (1-based) each debt reaches 0, in payoff order
}

/** 100 years -- far beyond any real payoff plan. Guards against an infinite
 *  loop when payments never outpace accruing interest. */
const MAX_MONTHS = 1200;

/** Highest-priority debt first: snowball orders by smallest balance,
 *  avalanche by highest interest rate. Only ever called with debts that
 *  still have a balance, so ties don't matter beyond stable ordering. */
function orderByPriority(ids: string[], strategy: PayoffStrategy, balances: Map<string, number>, aprs: Map<string, number>): string[] {
  return [...ids].sort((a, b) =>
    strategy === "snowball" ? balances.get(a)! - balances.get(b)! : aprs.get(b)! - aprs.get(a)!
  );
}

export function debtPayoffPlan(debts: Debt[], extraMonthlyCents: number, strategy: PayoffStrategy): DebtPayoffResult {
  const active = debts.filter((d) => d.remainingCents > 0);
  if (active.length === 0) {
    return { neverPaysOff: false, totalMonths: 0, totalInterestPaidCents: 0, perDebt: [] };
  }

  const balances = new Map(active.map((d) => [d.id, d.remainingCents]));
  const minPayments = new Map(active.map((d) => [d.id, d.minPaymentCents]));
  const aprs = new Map(active.map((d) => [d.id, d.aprPercent]));
  const payoffMonth = new Map<string, number>();
  // Minimum payments freed up by debts paid off in *earlier* months, folded
  // into this month's extra payment -- the "snowball" effect.
  let freedMinPaymentsCents = 0;
  let totalInterestPaidCents = 0;

  for (let month = 1; month <= MAX_MONTHS; month++) {
    const remainingIds = active.map((d) => d.id).filter((id) => balances.get(id)! > 0);
    if (remainingIds.length === 0) {
      return {
        neverPaysOff: false,
        totalMonths: month - 1,
        totalInterestPaidCents,
        perDebt: [...payoffMonth.entries()]
          .sort((a, b) => a[1] - b[1])
          .map(([debtId, m]) => ({ debtId, payoffMonth: m })),
      };
    }

    // Accrue interest, then apply each debt's minimum payment (capped so it
    // never goes negative).
    for (const id of remainingIds) {
      const balance = balances.get(id)!;
      const interest = Math.round((balance * aprs.get(id)!) / 100 / 12);
      totalInterestPaidCents += interest;
      const afterInterest = balance + interest;
      const minPayment = Math.min(minPayments.get(id)!, afterInterest);
      balances.set(id, afterInterest - minPayment);
    }

    const newlyZero = (id: string) => balances.get(id) === 0 && !payoffMonth.has(id);
    for (const id of remainingIds) {
      if (newlyZero(id)) payoffMonth.set(id, month);
    }

    // Extra payment (plus freed-up minimums from earlier payoffs) goes
    // entirely to the single highest-priority debt still owing.
    const stillUnpaid = remainingIds.filter((id) => balances.get(id)! > 0);
    if (stillUnpaid.length > 0) {
      const ordered = orderByPriority(stillUnpaid, strategy, balances, aprs);
      const target = ordered[0];
      const extra = extraMonthlyCents + freedMinPaymentsCents;
      const balance = balances.get(target)!;
      const payment = Math.min(extra, balance);
      balances.set(target, balance - payment);
      if (newlyZero(target)) payoffMonth.set(target, month);
    }

    // Free up this month's newly-paid-off minimum payments for next month.
    for (const id of remainingIds) {
      if (payoffMonth.get(id) === month) freedMinPaymentsCents += minPayments.get(id)!;
    }
  }

  return { neverPaysOff: true, totalMonths: 0, totalInterestPaidCents: 0, perDebt: [] };
}
