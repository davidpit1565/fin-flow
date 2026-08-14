import { describe, expect, test } from "bun:test";
import { parseAmountToCents, centsToInput } from "../src/lib/money";
import { formatMoney } from "../src/lib/currency";
import { installGlobals } from "./helpers";

installGlobals("en-US");

describe("parseAmountToCents", () => {
  test("parses simple decimals", () => {
    expect(parseAmountToCents("12.34")).toBe(1234);
    expect(parseAmountToCents("0.05")).toBe(5);
    expect(parseAmountToCents("5")).toBe(500);
    expect(parseAmountToCents("5.00")).toBe(500);
  });

  test("parses comma decimal separator", () => {
    expect(parseAmountToCents("12,34")).toBe(1234);
    expect(parseAmountToCents("1.234,56")).toBe(123456);
  });

  test("parses thousand separators", () => {
    expect(parseAmountToCents("1,247.80")).toBe(124780);
    expect(parseAmountToCents("12 480,90".replace(/ /g, ""))).toBe(1248090);
  });

  test("plain integers are whole amounts, not cents", () => {
    expect(parseAmountToCents("100")).toBe(10000);
    expect(parseAmountToCents("5")).toBe(500);
    expect(parseAmountToCents("1234")).toBe(123400);
  });

  test("trailing separator mid-entry is a whole amount", () => {
    expect(parseAmountToCents("12.")).toBe(1200);
    expect(parseAmountToCents("12,")).toBe(1200);
  });

  test("rejects invalid input", () => {
    expect(parseAmountToCents("")).toBeNull();
    expect(parseAmountToCents("-5")).toBeNull();
    expect(parseAmountToCents("abc")).toBeNull();
    expect(parseAmountToCents("0")).toBeNull();
  });
});

describe("centsToInput", () => {
  test("formats cents for editing", () => {
    expect(centsToInput(1234)).toBe("12.34");
    expect(centsToInput(5)).toBe("0.05");
  });
});

describe("formatMoney", () => {
  test("formats currency with 2 decimals", () => {
    const eur = formatMoney(124780, "EUR");
    expect(eur).toContain("1,247.80");
    expect(eur).toContain("€");

    const usd = formatMoney(500, "USD");
    expect(usd).toContain("5.00");
    expect(usd).toContain("$");

    const gbp = formatMoney(999, "GBP");
    expect(gbp).toContain("9.99");
    expect(gbp).toContain("£");
  });

  test("signed formatting", () => {
    expect(formatMoney(500, "USD", { sign: true })).toContain("+");
  });
});
