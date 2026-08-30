import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import type { Category, Subscription, Transaction } from "../types";
import { parseAmountToCents } from "./money";
import { isNative } from "./platform";

/** A cell starting with one of these can be interpreted as a formula by
 *  Excel/Sheets/Numbers when the exported file is later opened there --
 *  "CSV injection" -- letting an arbitrary merchant/notes value someone
 *  typed (or a maliciously crafted import) run as a formula, e.g. pulling
 *  in a remote URL. A leading single quote is the standard, widely
 *  supported way to force spreadsheet apps to read the cell as literal text. */
const FORMULA_TRIGGER = /^[=+\-@\t\r]/;

function escapeCell(value: string | number): string {
  let s = String(value);
  if (FORMULA_TRIGGER.test(s)) s = `'${s}`;
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Reverses the formula-injection guard above when re-importing a
 *  Flow-exported CSV, so a merchant/notes value round-trips unchanged. */
function unguardFormulaCell(s: string): string {
  return s.startsWith("'") && FORMULA_TRIGGER.test(s.slice(1)) ? s.slice(1) : s;
}

function toCSV(rows: (string | number)[][]): string {
  return rows.map((r) => r.map(escapeCell).join(",")).join("\r\n");
}

export interface ExportBundle {
  transactions: Transaction[];
  subscriptions: Subscription[];
  categories: Category[];
}

export function buildCSV(bundle: ExportBundle): string {
  const lines: (string | number)[][] = [];
  lines.push(["Flow export", new Date().toISOString()]);
  lines.push([]);
  lines.push(["# Transactions"]);
  lines.push(["Date", "Merchant", "Amount", "Currency", "Category", "Type", "Notes", "Recurring", "Frequency", "Payment method"]);
  for (const t of bundle.transactions) {
    lines.push([
      t.date,
      t.merchant,
      (t.amountCents / 100).toFixed(2),
      "app currency",
      bundle.categories.find((c) => c.id === t.categoryId)?.name ?? "",
      t.type,
      t.notes,
      t.recurring ? "yes" : "no",
      t.frequency ?? "",
      t.paymentMethod ?? "",
    ]);
  }
  lines.push([]);
  lines.push(["# Subscriptions"]);
  lines.push(["Service", "Amount", "Frequency", "Next payment", "Status", "Category", "Notes", "Reminder days"]);
  for (const s of bundle.subscriptions) {
    lines.push([
      s.name,
      (s.amountCents / 100).toFixed(2),
      s.frequency,
      s.nextPaymentDate,
      s.status,
      bundle.categories.find((c) => c.id === s.categoryId)?.name ?? "",
      s.notes,
      s.reminderDays ?? "",
    ]);
  }
  return toCSV(lines);
}

/** Save the export. On the native shell there's no download manager, so the file is
 *  written to the app's cache and handed to the system share sheet (Save to Files,
 *  AirDrop, Mail, etc.). In a browser this is a normal blob download. */
export async function downloadCSV(content: string, filename: string): Promise<void> {
  if (isNative()) {
    const written = await Filesystem.writeFile({
      path: filename,
      data: content,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    await Share.share({ url: written.uri, dialogTitle: "Save export" });
    return;
  }
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ---------- import ---------- */

export type ImportRow = Omit<Transaction, "id" | "createdAt" | "updatedAt">;

export interface ImportResult {
  added: number;
  skipped: number;
  errors: string[];
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

/** Import transactions from a Flow-format CSV. Returns rows + errors. */
export function parseImportCSV(text: string, categories: Category[]): { rows: ImportRow[]; errors: string[]; total: number } {
  const parsed = parseCSV(text);
  const errors: string[] = [];
  const rows: Omit<Transaction, "id" | "createdAt" | "updatedAt">[] = [];
  let total = 0;
  let inTransactions = false;
  for (const raw of parsed) {
    const first = raw[0]?.trim() ?? "";
    if (first === "# Transactions") {
      inTransactions = true;
      continue;
    }
    if (first.startsWith("#")) {
      inTransactions = false;
      continue;
    }
    if (!inTransactions) continue;
    if (/^Date$/i.test(first)) continue; // header
    total++;
    const [date, merchant, amount, , categoryName, type, notes, recurring, frequency] = raw;
    const amountCents = parseAmountToCents(amount ?? "");
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      errors.push(`Row ${total}: missing or invalid date`);
      continue;
    }
    if (amountCents === null) {
      errors.push(`Row ${total}: invalid amount "${amount}"`);
      continue;
    }
    const isExpense = !type || type.toLowerCase().startsWith("e");
    const category = categories.find((c) => c.name.toLowerCase() === (categoryName ?? "").trim().toLowerCase());
    rows.push({
      type: isExpense ? "expense" : "income",
      amountCents,
      categoryId: category?.id ?? categories.find((c) => c.name === "Other")?.id ?? categories[0].id,
      merchant: unguardFormulaCell((merchant ?? "").trim()),
      date,
      subscriptionId: null,
      notes: unguardFormulaCell((notes ?? "").trim()),
      recurring: /^y/i.test(recurring ?? ""),
      frequency: (["daily", "weekly", "monthly", "yearly"] as const).find((f) => f === frequency?.trim().toLowerCase()) ?? null,
      nextOccurrence: null,
      paymentMethod: null,
    });
  }
  return { rows, errors, total };
}

export function fileToText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsText(file);
  });
}
