import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import type { CurrencyCode } from "../types";
import { formatMoney } from "./currency";
import { isNative } from "./platform";
import type { YearInReview } from "./yearInReview";

/** Portrait, matching Instagram/TikTok Stories' native canvas -- the whole
 *  point of this card is to be shared there, so it should never need
 *  cropping. */
const WIDTH = 1080;
const HEIGHT = 1920;

/** A fixed brand palette, independent of the viewer's in-app accent color.
 *  Every card anyone shares should look like it came from the same app --
 *  that visual consistency across many different people's posts is what
 *  makes the brand recognizable, which matters more here than matching one
 *  sharer's personal theme. */
const BG_TOP = "#0e1f18";
const BG_BOTTOM = "#0a0f0c";
const ACCENT = "#34c98a";
const TEXT_PRIMARY = "#f5f7f5";
const TEXT_SECONDARY = "rgba(245, 247, 245, 0.6)";

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Wraps `text` to fit within `maxWidth`, returning one line per array
 *  entry. Only used for the biggest-expense merchant name, which is the
 *  one field here with no length limit from the data model. */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 2);
}

export interface ShareCardStat {
  label: string;
  value: string;
}

/** Draws the "Year in Flow" share card and returns it as a PNG blob.
 *  Pure canvas 2D, deliberately -- no DOM-to-image library, so there's
 *  nothing that depends on how one particular engine serializes live CSS
 *  (a real, previously-hit source of look-wrong-only-on-WebKit bugs in this
 *  app). Every value drawn here is plain text/number layout. */
export async function renderYearInReviewCard(
  review: YearInReview,
  currency: CurrencyCode,
  appName: string
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  // Background: a soft vertical gradient, not a flat fill, so the card
  // reads as designed rather than a plain screenshot.
  const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  bg.addColorStop(0, BG_TOP);
  bg.addColorStop(1, BG_BOTTOM);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // A large, soft accent glow centered on the card's main content mass
  // (hero number down through the stat cards) rather than just the hero --
  // at the original tighter radius the lower two-thirds of a 9:16 canvas
  // read as an empty void once only 2-3 stats were drawn.
  const glow = ctx.createRadialGradient(WIDTH / 2, 820, 60, WIDTH / 2, 820, 900);
  glow.addColorStop(0, "rgba(52, 201, 138, 0.32)");
  glow.addColorStop(1, "rgba(52, 201, 138, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const marginX = 96;
  let y = 200;

  // Wordmark
  ctx.fillStyle = ACCENT;
  ctx.font = "700 40px -apple-system, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(appName, marginX, y);

  y += 96;
  ctx.fillStyle = TEXT_SECONDARY;
  ctx.font = "500 36px -apple-system, system-ui, sans-serif";
  ctx.fillText(`My ${review.year} in numbers`, marginX, y);

  // Hero: total spent, the single biggest number on the card.
  y += 200;
  ctx.fillStyle = TEXT_PRIMARY;
  ctx.font = "700 128px -apple-system, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(formatMoney(review.totalSpentCents, currency), WIDTH / 2, y);

  ctx.font = "500 34px -apple-system, system-ui, sans-serif";
  ctx.fillStyle = TEXT_SECONDARY;
  y += 64;
  const txnWord = review.expenseCount === 1 ? "expense" : "expenses";
  ctx.fillText(`tracked across ${review.expenseCount} ${txnWord}`, WIDTH / 2, y);

  // Stat rows: up to four of the most tellable facts, each as a small
  // label/value card. Skips any that have no data for the year instead of
  // showing a placeholder -- a card with 2 real stats reads better than one
  // padded out with empty ones.
  const stats: ShareCardStat[] = [];
  if (review.topCategory) {
    const pct = review.totalSpentCents > 0 ? Math.round((review.topCategory.spentCents / review.totalSpentCents) * 100) : 0;
    stats.push({ label: "Top category", value: `${formatMoney(review.topCategory.spentCents, currency)} · ${pct}%` });
  }
  if (review.subscriptionTotalCents > 0) {
    stats.push({ label: "Subscriptions this year", value: formatMoney(review.subscriptionTotalCents, currency) });
  }
  if (review.biggestExpense) {
    stats.push({ label: "Biggest single expense", value: formatMoney(review.biggestExpense.amountCents, currency) });
  }
  if (review.busiestMonth) {
    stats.push({ label: "Busiest month", value: `${review.busiestMonth.label} · ${formatMoney(review.busiestMonth.spentCents, currency)}` });
  }

  y += 168;
  const cardH = 160;
  const cardGap = 32;
  ctx.textAlign = "left";
  for (const stat of stats.slice(0, 4)) {
    roundRect(ctx, marginX, y, WIDTH - marginX * 2, cardH, 28);
    ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = TEXT_SECONDARY;
    ctx.font = "500 30px -apple-system, system-ui, sans-serif";
    ctx.fillText(stat.label, marginX + 40, y + 62);

    ctx.fillStyle = TEXT_PRIMARY;
    ctx.font = "700 44px -apple-system, system-ui, sans-serif";
    const lines = wrapText(ctx, stat.value, WIDTH - marginX * 2 - 80);
    ctx.fillText(lines[0] ?? "", marginX + 40, y + 118);

    y += cardH + cardGap;
  }

  // Footer wordmark, anchored to the bottom regardless of how many stat
  // cards were drawn above.
  ctx.textAlign = "center";
  ctx.fillStyle = TEXT_SECONDARY;
  ctx.font = "500 30px -apple-system, system-ui, sans-serif";
  ctx.fillText(`Tracked with ${appName} — 100% on-device, no bank connection`, WIDTH / 2, HEIGHT - 100);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))), "image/png");
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // `readAsDataURL` yields "data:image/png;base64,AAAA..." -- Filesystem
      // wants just the base64 payload.
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Hands the rendered card to the platform's real share sheet -- AirDrop,
 *  Messages, Instagram Stories, Save Image, all of it -- rather than just
 *  downloading a file nobody then does anything with. Mirrors the
 *  write-then-share pattern csv.ts/backup.ts already use for exports: on
 *  native there's no download manager, so the file goes to the app's cache
 *  and gets handed to the system share sheet; in a browser, the Web Share
 *  API (Level 2, file sharing) does the same thing where it's supported,
 *  falling back to a plain download when it isn't. */
export async function shareYearInReviewCard(blob: Blob, filename: string, dialogTitle: string): Promise<void> {
  if (isNative()) {
    const base64 = await blobToBase64(blob);
    const written = await Filesystem.writeFile({ path: filename, data: base64, directory: Directory.Cache });
    await Share.share({ url: written.uri, dialogTitle });
    return;
  }

  const file = new File([blob], filename, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: dialogTitle });
    return;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
