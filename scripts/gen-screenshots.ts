/**
 * Regenerates the App Store screenshots in ios/fastlane/screenshots/en-US/
 * from the actual running app, with realistic sample data, at the exact
 * pixel dimensions Apple requires. Run with the dev server already up:
 *
 *   bun run dev &
 *   bun run scripts/gen-screenshots.ts
 *
 * Requires `playwright` (already a project dependency via @playwright/test)
 * and a Chromium binary -- set PLAYWRIGHT_EXECUTABLE_PATH if the default
 * one Playwright looks for isn't installed in this environment.
 */
import { chromium, type Page } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "ios", "fastlane", "screenshots", "en-US");
const BASE_URL = process.env.SCREENSHOT_BASE_URL ?? "http://127.0.0.1:5173";
const EXECUTABLE_PATH = process.env.PLAYWRIGHT_EXECUTABLE_PATH;

/* ---------- device profiles: CSS viewport x deviceScaleFactor = Apple's required pixel size ---------- */

const DEVICES = [
  // iPhone 6.9" (e.g. iPhone 16 Pro Max): 1290x2796 px @3x
  { dir: "iphone_6.9", viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 },
  // iPad 13" (e.g. iPad Pro 13"): 2048x2732 px @2x
  { dir: "ipad_13", viewport: { width: 1024, height: 1366 }, deviceScaleFactor: 2 },
] as const;

/* ---------- minimal inline copies of the e2e helpers this needs ---------- */

async function completeOnboarding(page: Page) {
  await page.goto(BASE_URL);
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: "Continue" }).click();
  }
  await page.getByRole("button", { name: /Get started/ }).click();
  await page.getByRole("heading", { name: "Your finances" }).waitFor();
}

async function openAddSheet(page: Page) {
  await page.getByRole("button", { name: "Add transaction" }).click();
  await page.getByRole("heading", { name: "Add transaction" }).waitFor();
}

async function addExpense(page: Page, amount: string, category: string, merchant: string, date?: string) {
  await openAddSheet(page);
  await page.getByLabel("Amount").fill(amount);
  await page.getByRole("radio", { name: category, exact: true }).click();
  await page.getByLabel("Merchant").fill(merchant);
  if (date) await page.getByLabel("Date").fill(date);
  await page.locator(".sheet-footer").getByRole("button", { name: "Add expense" }).click();
  await page.locator(".toast").waitFor();
  await page.locator(".toast").waitFor({ state: "hidden" });
}

async function addIncome(page: Page, amount: string, merchant: string) {
  await openAddSheet(page);
  await page.getByLabel("Amount").fill(amount);
  await page.getByRole("tab", { name: "Income" }).click();
  await page.getByLabel("Merchant").fill(merchant);
  await page.locator(".sheet-footer").getByRole("button", { name: "Add income" }).click();
  await page.locator(".toast").waitFor();
  await page.locator(".toast").waitFor({ state: "hidden" });
}

async function addSubscription(page: Page, name: string, amount: string, frequency: string, category: string) {
  await page.getByRole("button", { name: "Subscriptions" }).click();
  await page.getByRole("heading", { name: "Subscriptions", exact: true }).waitFor();
  await page.locator(".sub-toolbar").getByRole("button", { name: "Add subscription" }).click();
  await page.getByRole("heading", { name: "Add subscription" }).waitFor();
  await page.getByLabel("Service name").fill(name);
  await page.getByLabel("Amount").fill(amount);
  await page.getByRole("radio", { name: frequency, exact: true }).click();
  await page.getByRole("radio", { name: category, exact: true }).click();
  await page.locator(".sheet-footer").getByRole("button", { name: "Add subscription" }).click();
  await page.locator(".toast").waitFor();
  await page.locator(".toast").waitFor({ state: "hidden" });
}

async function goToTab(page: Page, label: string) {
  await page.getByRole("button", { name: label, exact: true }).click();
  await page.waitForTimeout(200);
}

/* ---------- realistic sample data ---------- */

async function seedRealisticData(page: Page) {
  await addIncome(page, "4200", "Acme Corp Payroll");
  await addExpense(page, "1450", "Housing", "Maple Street Rent");
  await addExpense(page, "182.40", "Groceries", "Trader Joe's");
  await addExpense(page, "64.90", "Transport", "Shell Gas Station");
  await addExpense(page, "38.50", "Entertainment", "AMC Theatres");
  await addExpense(page, "22.00", "Food", "Blue Bottle Coffee");
  await addSubscription(page, "Netflix", "15.49", "Monthly", "Subscriptions");
  await addSubscription(page, "Spotify", "10.99", "Monthly", "Subscriptions");
  await addSubscription(page, "iCloud+", "2.99", "Monthly", "Subscriptions");
}

async function run() {
  const browser = await chromium.launch({ executablePath: EXECUTABLE_PATH });

  for (const device of DEVICES) {
    const outDir = join(OUT, device.dir);
    mkdirSync(outDir, { recursive: true });

    const context = await browser.newContext({
      viewport: device.viewport,
      deviceScaleFactor: device.deviceScaleFactor,
      colorScheme: "light",
    });
    const page = await context.newPage();

    await completeOnboarding(page);
    await seedRealisticData(page);

    await goToTab(page, "Home");
    await page.screenshot({ path: join(outDir, "01_home.png") });

    await goToTab(page, "Subscriptions");
    await page.screenshot({ path: join(outDir, "02_subscriptions.png") });

    await goToTab(page, "Insights");
    await page.waitForTimeout(300); // let the AI insight cards' scoring settle
    await page.screenshot({ path: join(outDir, "03_insights.png") });

    await goToTab(page, "Home");
    await openAddSheet(page);
    await page.getByLabel("Amount").fill("24.90");
    await page.getByRole("radio", { name: "Food", exact: true }).click();
    await page.getByLabel("Merchant").fill("Corner Bakery");
    await page.waitForTimeout(350); // sheet entrance animation
    await page.screenshot({ path: join(outDir, "04_add_transaction.png") });

    await context.close();
    console.log(`✓ ${device.dir}`);
  }

  await browser.close();
}

run();
