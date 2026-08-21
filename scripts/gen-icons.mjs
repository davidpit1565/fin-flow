/**
 * Generates the Flow app icon and iOS icon/splash PNGs with pure Node (no
 * dependencies). The icon: a near-black square, a flowing white line, one
 * green dot.
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "icons");
const IOS_APPICON = join(ROOT, "ios", "App", "App", "Assets.xcassets", "AppIcon.appiconset");
const IOS_SPLASH = join(ROOT, "ios", "App", "App", "Assets.xcassets", "Splash.imageset");

/* ---------- PNG encoding ---------- */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePNG(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Same as encodePNG but drops the alpha channel entirely (RGB truecolor).
 *  App Store Connect rejects app/marketing icons that carry an alpha channel,
 *  even when every pixel in it is fully opaque. */
function encodePNGOpaque(width, height, rgba) {
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4;
      const dst = y * (stride + 1) + 1 + x * 3;
      raw[dst] = rgba[src];
      raw[dst + 1] = rgba[src + 1];
      raw[dst + 2] = rgba[src + 2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB truecolor, no alpha
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ---------- shapes (in unit space, y down) ---------- */

// Cubic bezier evaluation.
function cubic(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  const a = mt * mt * mt;
  const b = 3 * mt * mt * t;
  const c = 3 * mt * t * t;
  const d = t * t * t;
  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
  };
}

function samplePath() {
  const pts = [];
  const segments = [
    [
      { x: 0.281, y: 0.656 },
      { x: 0.531, y: 0.688 },
      { x: 0.656, y: 0.531 },
      { x: 0.469, y: 0.406 },
    ],
    [
      { x: 0.469, y: 0.406 },
      { x: 0.344, y: 0.328 },
      { x: 0.406, y: 0.219 },
      { x: 0.656, y: 0.281 },
    ],
  ];
  for (const [p0, p1, p2, p3] of segments) {
    for (let i = 0; i <= 60; i++) pts.push(cubic(p0, p1, p2, p3, i / 60));
  }
  return pts;
}

function distToSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/** @param {{ glyphScale?: number, glyphOffsetY?: number }} [opts]
 *  glyphScale shrinks the glyph toward the canvas center (1 = full-bleed icon
 *  layout); glyphOffsetY nudges it vertically, both in unit-square terms.
 *  Used to keep the glyph inside the safe zone of a splash image, which iOS
 *  aspect-fills (and therefore crops) to very different screen ratios. */
function render(size, opts = {}) {
  const { glyphScale = 1, glyphOffsetY = 0 } = opts;
  const SS = 2; // supersample
  const S = size * SS;
  const pts = samplePath().map((p) => ({
    x: 0.5 + (p.x - 0.5) * glyphScale,
    y: 0.5 + (p.y - 0.5 + glyphOffsetY) * glyphScale,
  }));
  const stroke = 0.078 * S * glyphScale;
  const dotUnit = { x: 0.664, y: 0.289, r: 0.094 };
  const dot = {
    x: (0.5 + (dotUnit.x - 0.5) * glyphScale) * S,
    y: (0.5 + (dotUnit.y - 0.5 + glyphOffsetY) * glyphScale) * S,
    r: dotUnit.r * S * glyphScale,
  };

  const pxBuf = Buffer.alloc(size * size * 4);

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = (px + (sx + 0.5) / SS) * SS;
          const y = (py + (sy + 0.5) / SS) * SS;
          let color = [20, 22, 26]; // bg
          let dLine = Infinity;
          for (let i = 0; i < pts.length - 1; i++) {
            const d = distToSeg(x, y, pts[i].x * S, pts[i].y * S, pts[i + 1].x * S, pts[i + 1].y * S);
            if (d < dLine) dLine = d;
          }
          if (dLine <= stroke / 2) {
            color = [242, 243, 245]; // line
          } else {
            const dd = Math.hypot(x - dot.x, y - dot.y);
            if (dd <= dot.r) color = [52, 201, 138]; // dot
          }
          r += color[0];
          g += color[1];
          b += color[2];
        }
      }
      const n = SS * SS;
      const i = (py * size + px) * 4;
      pxBuf[i] = Math.round(r / n);
      pxBuf[i + 1] = Math.round(g / n);
      pxBuf[i + 2] = Math.round(b / n);
      pxBuf[i + 3] = 255;
    }
  }
  return pxBuf;
}

mkdirSync(OUT, { recursive: true });

const targets = [
  [192, "icon-192.png"],
  [512, "icon-512.png"],
  [1024, "icon-1024.png"],
  [180, "apple-touch-icon.png"],
  [32, "favicon-32.png"],
];

for (const [size, name] of targets) {
  writeFileSync(join(OUT, name), encodePNG(size, size, render(size)));
  console.log(`wrote public/icons/${name} (${size}x${size})`);
}

// iOS AppIcon: modern single-size (1024x1024) asset catalog entry, no alpha
// channel (App Store Connect rejects icons that carry one).
try {
  mkdirSync(IOS_APPICON, { recursive: true });
  writeFileSync(join(IOS_APPICON, "AppIcon-512@2x.png"), encodePNGOpaque(1024, 1024, render(1024)));
  console.log("wrote ios AppIcon-512@2x.png (1024x1024, no alpha)");
} catch {
  console.log("skipped iOS AppIcon (ios/ project not present -- run `npx cap add ios` first)");
}

// iOS launch screen: LaunchScreen.storyboard shows this with contentMode
// scaleAspectFill, so a full-bleed icon layout would get cropped unpredictably
// across phone/tablet aspect ratios. Shrink the glyph into a safe centered
// zone on the same background color instead.
try {
  mkdirSync(IOS_SPLASH, { recursive: true });
  const splash = encodePNGOpaque(2732, 2732, render(2732, { glyphScale: 0.34, glyphOffsetY: 0.02 }));
  for (const name of ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"]) {
    writeFileSync(join(IOS_SPLASH, name), splash);
  }
  console.log("wrote ios splash-2732x2732*.png (3 files, 2732x2732, no alpha)");
} catch {
  console.log("skipped iOS splash (ios/ project not present -- run `npx cap add ios` first)");
}
