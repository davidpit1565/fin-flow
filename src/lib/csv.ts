import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import type { Category, CurrencyCode, Subscription, Transaction } from "../types";
import { parseAmountToCents } from "./money";
import { isNative } from "./platform";

const RECURRING_FREQUENCIES = ["daily", "weekly", "monthly", "yearly"] as const;

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
  currency: CurrencyCode;
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
      bundle.currency,
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
  lines.push(["Service", "Amount", "Currency", "Frequency", "Next payment", "Status", "Category", "Notes", "Reminder days"]);
  for (const s of bundle.subscriptions) {
    lines.push([
      s.name,
      (s.amountCents / 100).toFixed(2),
      s.currency,
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

function parseCSV(text: string, delimiter: string = ","): string[][] {
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
    } else if (ch === delimiter) {
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

/** Falls back to "Other" (or the first category, if there's no "Other") when a
 *  category name from the file doesn't match anything the user has -- an
 *  unrecognized or missing category should never block an otherwise-valid row. */
function resolveCategoryId(categoryName: string, categories: Category[]): string {
  const category = categories.find((c) => c.name.toLowerCase() === categoryName.trim().toLowerCase());
  return category?.id ?? categories.find((c) => c.name === "Other")?.id ?? categories[0].id;
}

/** Parses a CSV that carries Flow's own `"# Transactions"` marker, exactly as
 *  Flow itself exports it (see `buildCSV` above) -- fixed column order, comma
 *  delimiter. This is what makes a Flow export round-trip perfectly. */
function parseFlowFormat(parsed: string[][], categories: Category[]): { rows: ImportRow[]; errors: string[]; total: number } {
  const errors: string[] = [];
  const rows: ImportRow[] = [];
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
    rows.push({
      type: isExpense ? "expense" : "income",
      amountCents,
      categoryId: resolveCategoryId(categoryName ?? "", categories),
      merchant: unguardFormulaCell((merchant ?? "").trim()),
      date,
      subscriptionId: null,
      notes: unguardFormulaCell((notes ?? "").trim()),
      recurring: /^y/i.test(recurring ?? ""),
      frequency: RECURRING_FREQUENCIES.find((f) => f === frequency?.trim().toLowerCase()) ?? null,
      nextOccurrence: null,
      paymentMethod: null,
    });
  }
  return { rows, errors, total };
}

/** Finds a header's column index by trying each synonym in turn (headers are
 *  already trimmed + lowercased). Returns -1 when none of the synonyms appear. */
function findColumn(headers: string[], synonyms: string[]): number {
  for (const syn of synonyms) {
    const idx = headers.indexOf(syn);
    if (idx !== -1) return idx;
  }
  return -1;
}

/** Picks whichever of comma/semicolon/tab splits the header row into the most
 *  columns -- comma is Flow's own and the most common default, but
 *  semicolon-delimited exports are common from European banks/tools. */
function detectDelimiter(headerLine: string): string {
  const counts: [string, number][] = [",", ";", "\t"].map((d) => [d, headerLine.split(d).length - 1]);
  let best = counts[0];
  for (const c of counts) {
    if (c[1] > best[1]) best = c;
  }
  return best[1] > 0 ? best[0] : ",";
}

/** Normalizes a date cell to `YYYY-MM-DD`, accepting Flow's own ISO format as
 *  well as the two common slash-separated bank/spreadsheet layouts
 *  (`MM/DD/YYYY` and `DD/MM/YYYY`). Those two are ambiguous with each other
 *  whenever both the day and month are <= 12, so we only resolve them when
 *  one side is unambiguously a day (> 12) -- otherwise we refuse to guess and
 *  report the row as invalid, matching today's ISO-only strictness. */
function normalizeDate(raw: string): string | null {
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,4})[/\-.](\d{1,2})[/\-.](\d{1,4})$/);
  if (!m) return null;
  const [, p1, p2, p3] = m;
  let year: number, month: number, day: number;
  if (p1.length === 4) {
    // YYYY/MM/DD (or with other separators)
    year = Number(p1);
    month = Number(p2);
    day = Number(p3);
  } else if (p3.length === 4) {
    const a = Number(p1);
    const b = Number(p2);
    year = Number(p3);
    if (a > 12 && b <= 12) {
      day = a;
      month = b; // unambiguous DD/MM/YYYY
    } else if (b > 12 && a <= 12) {
      month = a;
      day = b; // unambiguous MM/DD/YYYY
    } else {
      return null; // ambiguous (or both invalid) -- don't guess
    }
  } else {
    return null;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null; // rejects e.g. Feb 30
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const DATE_SYNONYMS = ["date", "transaction date", "posted date"];
const MERCHANT_SYNONYMS = ["merchant", "payee", "name"];
const AMOUNT_SYNONYMS = ["amount", "value", "sum"];
const CATEGORY_SYNONYMS = ["category"];
const TYPE_SYNONYMS = ["type"];
const NOTES_SYNONYMS = ["notes", "memo"];

/** Parses a CSV from a bank, spreadsheet, or another budgeting app -- no
 *  `"# Transactions"` marker, an arbitrary column order/naming, and possibly
 *  a different delimiter. The first non-blank row is treated as a header and
 *  matched case-insensitively against a small synonym list per field; any
 *  optional column that's missing just gets a sensible default instead of an
 *  error. */
function parseGenericFormat(text: string, categories: Category[]): { rows: ImportRow[]; errors: string[]; total: number } {
  const firstLine = text.split(/\r\n|\r|\n/).find((l) => l.trim() !== "") ?? "";
  const delimiter = detectDelimiter(firstLine);
  const parsed = parseCSV(text, delimiter);
  const errors: string[] = [];
  const rows: ImportRow[] = [];
  let total = 0;
  if (parsed.length === 0) return { rows, errors, total };

  const headers = parsed[0].map((h) => h.trim().toLowerCase());
  const dateIdx = findColumn(headers, DATE_SYNONYMS);
  const amountIdx = findColumn(headers, AMOUNT_SYNONYMS);
  const categoryIdx = findColumn(headers, CATEGORY_SYNONYMS);
  const typeIdx = findColumn(headers, TYPE_SYNONYMS);
  const recurringIdx = findColumn(headers, ["recurring"]);
  const frequencyIdx = findColumn(headers, ["frequency"]);

  // "description" can stand in for merchant when there's no dedicated
  // merchant/payee/name column -- but it should never be used for both
  // merchant AND notes at once, so once it's claimed by merchant it's off
  // the table for notes.
  const descriptionIdx = findColumn(headers, ["description"]);
  let merchantIdx = findColumn(headers, MERCHANT_SYNONYMS);
  let descriptionClaimedByMerchant = false;
  if (merchantIdx === -1 && descriptionIdx !== -1) {
    merchantIdx = descriptionIdx;
    descriptionClaimedByMerchant = true;
  }
  let notesIdx = findColumn(headers, NOTES_SYNONYMS);
  if (notesIdx === -1 && descriptionIdx !== -1 && !descriptionClaimedByMerchant) {
    notesIdx = descriptionIdx;
  }

  for (let i = 1; i < parsed.length; i++) {
    const raw = parsed[i];
    total++;

    const dateRaw = dateIdx !== -1 ? raw[dateIdx] : undefined;
    const date = dateRaw ? normalizeDate(dateRaw) : null;
    if (!date) {
      errors.push(`Row ${total}: missing or invalid date`);
      continue;
    }

    const amountRaw = amountIdx !== -1 ? (raw[amountIdx] ?? "") : "";
    // A leading/trailing "-" is a very common bank-export convention for an
    // expense; parseAmountToCents rejects negatives outright, so strip the
    // sign here -- the type column (or its absence) decides expense/income,
    // not the sign, matching today's "default to expense" behavior.
    const amountCents = parseAmountToCents(amountRaw.replace(/-/g, ""));
    if (amountCents === null) {
      errors.push(`Row ${total}: invalid amount "${amountRaw}"`);
      continue;
    }

    const typeRaw = typeIdx !== -1 ? raw[typeIdx] : undefined;
    const isExpense = !typeRaw || typeRaw.trim().toLowerCase().startsWith("e");
    const categoryName = categoryIdx !== -1 ? (raw[categoryIdx] ?? "") : "";
    const merchantRaw = merchantIdx !== -1 ? raw[merchantIdx] : undefined;
    const notesRaw = notesIdx !== -1 ? raw[notesIdx] : undefined;
    const recurringRaw = recurringIdx !== -1 ? raw[recurringIdx] : undefined;
    const frequencyRaw = frequencyIdx !== -1 ? raw[frequencyIdx] : undefined;

    rows.push({
      type: isExpense ? "expense" : "income",
      amountCents,
      categoryId: resolveCategoryId(categoryName, categories),
      merchant: unguardFormulaCell((merchantRaw ?? "").trim()),
      date,
      subscriptionId: null,
      notes: unguardFormulaCell((notesRaw ?? "").trim()),
      recurring: /^y/i.test(recurringRaw ?? ""),
      frequency: RECURRING_FREQUENCIES.find((f) => f === frequencyRaw?.trim().toLowerCase()) ?? null,
      nextOccurrence: null,
      paymentMethod: null,
    });
  }
  return { rows, errors, total };
}

/** Imports transactions from a CSV file: Flow's own export format (detected
 *  by its `"# Transactions"` marker line) or a generic CSV from a bank,
 *  spreadsheet, or another tracker (detected by its absence). */
export function parseImportCSV(text: string, categories: Category[]): { rows: ImportRow[]; errors: string[]; total: number } {
  const hasFlowMarker = text.split(/\r\n|\r|\n/).some((l) => l.trim() === "# Transactions");
  if (hasFlowMarker) {
    return parseFlowFormat(parseCSV(text), categories);
  }
  return parseGenericFormat(text, categories);
}

export function fileToText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsText(file);
  });
}
