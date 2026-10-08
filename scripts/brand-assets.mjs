/**
 * Builds brand assets from the official FCGBS logo:
 *  - removes the white background by flood-filling from the image edges
 *    (interior whites such as the "F" and book pages are preserved),
 *  - trims, and writes the full logo plus a crest-only mark,
 *  - generates favicon / apple-touch / PWA icon sizes.
 * Usage: node scripts/brand-assets.mjs <source.png>
 */
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const src = process.argv[2];
if (!src) throw new Error("Pass the source logo path");
const out = path.resolve("public/brand");
fs.mkdirSync(out, { recursive: true });

const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const whiteness = (i) => Math.min(data[i], data[i + 1], data[i + 2]);
const sat = (i) => Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]);
const isBg = (i) => whiteness(i) > 225 && sat(i) < 28;

// BFS flood fill from all edge pixels.
const seen = new Uint8Array(W * H);
const q = new Int32Array(W * H);
let head = 0, tail = 0;
const push = (x, y) => {
  const k = y * W + x;
  if (seen[k]) return;
  if (!isBg(k * 4)) return;
  seen[k] = 1;
  q[tail++] = k;
};
for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1); }
for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y); }
while (head < tail) {
  const k = q[head++];
  const x = k % W, y = (k / W) | 0;
  if (x > 0) push(x - 1, y);
  if (x < W - 1) push(x + 1, y);
  if (y > 0) push(x, y - 1);
  if (y < H - 1) push(x, y + 1);
}
// Enclosed white regions inside the wordmark (letter counters of O, D, A…) are
// background too. The crest's white "F" and book pages sit above WORDMARK_TOP.
const WORDMARK_TOP = Math.round(H * 0.6);
for (let y = WORDMARK_TOP; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const k = y * W + x;
    if (seen[k] || !isBg(k * 4)) continue;
    // flood this enclosed component; keep it only if it reaches above the wordmark
    const start = tail;
    seen[k] = 1;
    q[tail++] = k;
    let h2 = start;
    let reachesCrest = false;
    while (h2 < tail) {
      const c = q[h2++];
      const cx = c % W, cy = (c / W) | 0;
      if (cy < WORDMARK_TOP) reachesCrest = true;
      for (const [nx, ny] of [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]]) {
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const n = ny * W + nx;
        if (!seen[n] && isBg(n * 4)) { seen[n] = 1; q[tail++] = n; }
      }
    }
    if (reachesCrest) for (let j = start; j < tail; j++) seen[q[j]] = 0;
  }
}

// Clear background; soften the anti-aliased fringe next to it.
for (let k = 0; k < W * H; k++) {
  const i = k * 4;
  if (seen[k]) { data[i + 3] = 0; continue; }
  const x = k % W, y = (k / W) | 0;
  const nearBg = (x > 0 && seen[k - 1]) || (x < W - 1 && seen[k + 1]) || (y > 0 && seen[k - W]) || (y < H - 1 && seen[k + W]);
  if (nearBg && whiteness(i) > 190 && sat(i) < 40) data[i + 3] = Math.round(255 * (1 - (whiteness(i) - 190) / 65));
}

const transparent = sharp(data, { raw: { width: W, height: H, channels: 4 } }).png();
const full = await transparent.toBuffer();
const trimmed = await sharp(full).trim({ threshold: 1 }).png({ compressionLevel: 9 }).toBuffer();
const meta = await sharp(trimmed).metadata();
await sharp(trimmed).resize({ width: 1000 }).png({ compressionLevel: 9 }).toFile(path.join(out, "logo-full.png"));
await sharp(trimmed).resize({ width: 480 }).png({ compressionLevel: 9 }).toFile(path.join(out, "logo-full-480.png"));
await sharp(trimmed).resize({ width: 480 }).webp({ quality: 90 }).toFile(path.join(out, "logo-full-480.webp"));

// Crest: the emblem above the wordmark (top ~62% of the trimmed logo).
const crestH = Math.round(meta.height * 0.6);
const crestBuf = await sharp(trimmed).extract({ left: 0, top: 0, width: meta.width, height: crestH }).trim({ threshold: 1 }).png().toBuffer();
// Tighter shield (cap + FC shield, no laurels) stays legible at favicon sizes.
const shieldBuf = await sharp(crestBuf)
  .extract({ left: Math.round(meta.width * 0.26), top: 0, width: Math.round(meta.width * 0.5), height: Math.round(crestH * 0.86) })
  .trim({ threshold: 1 })
  .png()
  .toBuffer();
const crestSquare = async (size, pad = 0.06, bg = { r: 0, g: 0, b: 0, alpha: 0 }) => {
  const inner = Math.round(size * (1 - 2 * pad));
  const r = await sharp(size <= 64 ? shieldBuf : crestBuf).resize({ width: inner, height: inner, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: bg } }).composite([{ input: r, gravity: "center" }]).png({ compressionLevel: 9 });
};
for (const s of [16, 32, 48, 64, 128, 192, 256, 512]) await (await crestSquare(s, s <= 32 ? 0.02 : 0.06)).toFile(path.join(out, `logo-mark-${s}.png`));
// Apple touch & maskable icons need an opaque background.
await (await crestSquare(180, 0.1, { r: 255, g: 255, b: 255, alpha: 1 })).toFile(path.resolve("src/app/apple-icon.png"));
await (await crestSquare(512, 0.16, { r: 255, g: 255, b: 255, alpha: 1 })).toFile(path.join(out, "maskable-512.png"));
await (await crestSquare(192, 0.16, { r: 255, g: 255, b: 255, alpha: 1 })).toFile(path.join(out, "maskable-192.png"));
await (await crestSquare(64, 0.02)).toFile(path.resolve("src/app/icon.png"));

// Multi-size favicon.ico (PNG-compressed entries: 16, 32, 48).
const sizes = [16, 32, 48];
const pngs = await Promise.all(sizes.map(async (s) => (await crestSquare(s, 0.02)).toBuffer()));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((s, i) => {
  const e = 6 + i * 16;
  header.writeUInt8(s, e); header.writeUInt8(s, e + 1); header.writeUInt8(0, e + 2); header.writeUInt8(0, e + 3);
  header.writeUInt16LE(1, e + 4); header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(pngs[i].length, e + 8); header.writeUInt32LE(offset, e + 12);
  offset += pngs[i].length;
});
fs.writeFileSync(path.resolve("src/app/favicon.ico"), Buffer.concat([header, ...pngs]));

// Embedded logo for server-generated PDFs (works on serverless without file access).
const pdfLogo = await sharp(trimmed).resize({ width: 256 }).png({ compressionLevel: 9 }).toBuffer();
fs.writeFileSync(
  path.resolve("src/server/brand-logo.ts"),
  `// Generated by scripts/brand-assets.mjs — official FCGBS logo (transparent, 256px) for PDFs.\nexport const BRAND_LOGO_PNG_BASE64 =\n  "${pdfLogo.toString("base64")}";\n`,
);
console.log("brand assets written", { width: meta.width, height: meta.height });
