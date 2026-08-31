import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import type { Budget, Category, Debt, Goal, NetWorthItem, Subscription, Transaction, UserSettings } from "../types";
import { isNative } from "./platform";

/** A full, point-in-time snapshot of every piece of data Flow stores.
 *  Unlike the CSV export (transactions + subscriptions only), this is
 *  everything needed to fully restore the app on a new device. */
export interface BackupPayload {
  version: 1;
  settings: UserSettings;
  categories: Category[];
  transactions: Transaction[];
  subscriptions: Subscription[];
  budgets: Budget[];
  goals: Goal[];
  netWorthItems: NetWorthItem[];
  debts: Debt[];
}

/** On-disk envelope written to the `.flowbackup` file. Every secret-derived
 *  value (salt, IV, ciphertext) is base64-encoded so the whole thing is a
 *  single portable JSON string. */
interface BackupEnvelope {
  flowBackup: 1;
  salt: string;
  iv: string;
  ciphertext: string;
}

const PBKDF2_ITERATIONS = 200_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

const WRONG_PASSWORD_ERROR = "Wrong password or corrupted file";

function bufToBase64(buf: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBuf(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/** Encrypt a full-data backup with a user-chosen password. The password is
 *  never stored or transmitted anywhere -- it only lives in memory long
 *  enough to derive the AES key below. */
export async function encryptBackup(payload: BackupPayload, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(password, salt);
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, plaintext);
  const envelope: BackupEnvelope = {
    flowBackup: 1,
    salt: bufToBase64(salt.buffer),
    iv: bufToBase64(iv.buffer),
    ciphertext: bufToBase64(ciphertext),
  };
  return JSON.stringify(envelope);
}

function isBackupPayloadShape(v: unknown): v is BackupPayload {
  if (!v || typeof v !== "object") return false;
  const p = v as Record<string, unknown>;
  return (
    p.version === 1 &&
    typeof p.settings === "object" &&
    p.settings !== null &&
    Array.isArray(p.categories) &&
    Array.isArray(p.transactions) &&
    Array.isArray(p.subscriptions) &&
    Array.isArray(p.budgets) &&
    Array.isArray(p.goals) &&
    Array.isArray(p.netWorthItems) &&
    Array.isArray(p.debts)
  );
}

/** Decrypt a backup file's contents with the given password. Throws a clear,
 *  catchable error for every failure mode -- wrong password, tampered or
 *  truncated ciphertext, or a JSON file that isn't a Flow backup at all --
 *  so the UI can show one honest message instead of a raw DOMException or
 *  an app-crashing exception on garbage data. */
export async function decryptBackup(fileContent: string, password: string): Promise<BackupPayload> {
  let envelope: BackupEnvelope;
  try {
    const parsed = JSON.parse(fileContent) as unknown;
    const p = parsed as Partial<BackupEnvelope>;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      p.flowBackup !== 1 ||
      typeof p.salt !== "string" ||
      typeof p.iv !== "string" ||
      typeof p.ciphertext !== "string"
    ) {
      throw new Error(WRONG_PASSWORD_ERROR);
    }
    envelope = p as BackupEnvelope;
  } catch {
    throw new Error(WRONG_PASSWORD_ERROR);
  }

  let plaintext: ArrayBuffer;
  try {
    const salt = new Uint8Array(base64ToBuf(envelope.salt));
    const iv = new Uint8Array(base64ToBuf(envelope.iv));
    const ciphertext = base64ToBuf(envelope.ciphertext);
    const key = await deriveKey(password, salt);
    plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, ciphertext);
  } catch {
    // Wrong password or a tampered/truncated ciphertext both fail the
    // AES-GCM auth-tag check inside crypto.subtle.decrypt -- never let that
    // raw DOMException reach the UI.
    throw new Error(WRONG_PASSWORD_ERROR);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(new TextDecoder().decode(plaintext));
  } catch {
    throw new Error(WRONG_PASSWORD_ERROR);
  }

  if (!isBackupPayloadShape(payload)) throw new Error(WRONG_PASSWORD_ERROR);
  return payload;
}

/** Save the encrypted backup file. Mirrors downloadCSV's native-vs-web
 *  branching in src/lib/csv.ts, kept as a self-contained copy here so this
 *  feature doesn't touch csv.ts. */
export async function downloadBackupFile(content: string, filename: string, dialogTitle: string): Promise<void> {
  if (isNative()) {
    const written = await Filesystem.writeFile({
      path: filename,
      data: content,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    await Share.share({ url: written.uri, dialogTitle });
    return;
  }
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
