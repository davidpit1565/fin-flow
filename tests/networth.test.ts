import { describe, expect, test } from "bun:test";
import { computeNetWorth } from "../src/lib/calc";
import type { NetWorthItem } from "../src/types";

function item(over: Partial<NetWorthItem>): NetWorthItem {
  return {
    id: crypto.randomUUID(),
    kind: "asset",
    name: "Item",
    category: "Other",
    valueCents: 1000,
    createdAt: 1,
    updatedAt: 1,
    ...over,
  };
}

describe("computeNetWorth", () => {
  test("empty array yields all zeros", () => {
    expect(computeNetWorth([])).toEqual({ assetsCents: 0, liabilitiesCents: 0, netCents: 0 });
  });

  test("assets only", () => {
    const items = [
      item({ kind: "asset", valueCents: 500000 }),
      item({ kind: "asset", valueCents: 250000 }),
    ];
    expect(computeNetWorth(items)).toEqual({ assetsCents: 750000, liabilitiesCents: 0, netCents: 750000 });
  });

  test("liabilities only", () => {
    const items = [
      item({ kind: "liability", valueCents: 300000 }),
      item({ kind: "liability", valueCents: 50000 }),
    ];
    expect(computeNetWorth(items)).toEqual({ assetsCents: 0, liabilitiesCents: 350000, netCents: -350000 });
  });

  test("mixed assets and liabilities can yield a negative net worth", () => {
    const items = [
      item({ kind: "asset", valueCents: 200000 }),
      item({ kind: "liability", valueCents: 350000 }),
    ];
    expect(computeNetWorth(items)).toEqual({ assetsCents: 200000, liabilitiesCents: 350000, netCents: -150000 });
  });

  test("mixed assets and liabilities can yield a positive net worth", () => {
    const items = [
      item({ kind: "asset", valueCents: 500000 }),
      item({ kind: "asset", valueCents: 100000 }),
      item({ kind: "liability", valueCents: 200000 }),
    ];
    expect(computeNetWorth(items)).toEqual({ assetsCents: 600000, liabilitiesCents: 200000, netCents: 400000 });
  });

  test("liability values are always summed as a positive magnitude", () => {
    const items = [item({ kind: "liability", valueCents: 42 })];
    const result = computeNetWorth(items);
    expect(result.liabilitiesCents).toBe(42);
    expect(result.netCents).toBe(-42);
  });
});
