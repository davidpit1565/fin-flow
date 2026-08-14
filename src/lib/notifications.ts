/** Local notifications. Reminders are scheduled with the Notification Triggers API
 *  (TimestampTrigger) where the browser supports it, and degrade gracefully elsewhere.
 *  Financial data never leaves the device. */

const DEFAULT_HOUR = 9; // 9:00 AM local time

interface TriggerNotificationOptions {
  title: string;
  body: string;
  tag: string;
  timestamp: number;
}

export function notificationsSupported(): boolean {
  return "Notification" in window;
}

export function triggersSupported(): boolean {
  return "showTrigger" in Notification.prototype;
}

export async function requestPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    const result = await Notification.requestPermission();
    return result === "granted";
  } catch {
    return false;
  }
}

export function permissionState(): NotificationPermission | "unsupported" {
  if (!notificationsSupported()) return "unsupported";
  return Notification.permission;
}

declare class TimestampTrigger {
  constructor(timestamp: number);
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return (await navigator.serviceWorker.getRegistration()) ?? null;
  } catch {
    return null;
  }
}

export async function scheduleNotification(opts: TriggerNotificationOptions): Promise<boolean> {
  if (!triggersSupported() || !notificationsSupported()) return false;
  if (Notification.permission !== "granted") return false;
  try {
    const reg = await registration();
    if (!reg) return false;
    const sw = (reg as unknown as { showNotification: (t: string, o: unknown) => Promise<void> }).showNotification;
    await sw.call(reg, opts.title, {
      body: opts.body,
      tag: opts.tag,
      showTrigger: new TimestampTrigger(opts.timestamp),
    });
    return true;
  } catch {
    return false;
  }
}

export async function cancelNotifications(tag: string): Promise<void> {
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  try {
    const reg = await registration();
    if (!reg) return;
    const existing = await reg.getNotifications({ tag });
    for (const n of existing) n.close();
  } catch {
    /* ignore */
  }
}

/** 9:00 AM local time on the given ISO date. */
export function reminderTimestamp(isoDate: string, daysBefore: number, hour = DEFAULT_HOUR): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, (d ?? 1) - daysBefore, hour, 0, 0, 0);
  return date.getTime();
}

export function tagForSubscription(id: string): string {
  return `flow-sub-${id}`;
}

export function tagForMonthlySummary(): string {
  return `flow-monthly-summary`;
}

/** First day of next month at 9 AM local time. */
export function nextMonthSummaryTimestamp(now = new Date()): number {
  return new Date(now.getFullYear(), now.getMonth() + 1, 1, DEFAULT_HOUR, 0, 0, 0).getTime();
}

/** In-app fallback when triggers are unsupported: show a notification right now. */
export function notifyNow(title: string, body: string): void {
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body });
  } catch {
    /* ignore */
  }
}
