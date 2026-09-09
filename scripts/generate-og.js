// 生成品牌分享图 public/og-cover.png（1200×630，无文字）
// 视觉 = 即懂 mark：深 navy 蓝光晕背景 + 白色对钩 + 橙色光点（问题被点亮）。
// 平台在缩略图下方渲染 og:title/description；图片只需品牌识别。
// 纯 Node 实现 PNG 编码（zlib 内建），无第三方依赖：`npm run og:image`
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const W = 1200;
const H = 630;
const img = new Uint8Array(W * H * 3);

// ── 调色板（与 BrandLogo / favicon 同源）────────────
const INK = [245, 245, 247]; // #F5F5F7 对钩
const ORANGE = [255, 106, 61]; // #FF6A3D 光点
const BG_TOP = [27, 46, 85]; // #1B2E55
const BG_BOT = [13, 27, 51]; // #0D1B33
const GLOW_BLUE = [91, 125, 255]; // #5B7DFF 蓝光晕

// ── Mark 几何（32 单位坐标，与 favicon.svg 一致）───
// 光点 (10.9, 17.4) r2.1 / 光晕环 r4.1 宽1.1
// 对钩 M13.3,19.0 L16.7,22.5 L25.0,10.9 宽3.0
const DOT = { x: 10.9, y: 17.4, r: 2.1 };
const HALO = { r: 4.1, w: 1.1, alpha: 0.3 };
const HOOK = {
  a: { x: 13.3, y: 19.0 },
  b: { x: 16.7, y: 22.5 },
  c: { x: 25.0, y: 10.9 },
  w: 3.0,
};
const K = 30; // 32 单位 → 像素 放大倍率（mark 高约 9.2 单位 → ~276px + 光晕）
// 画布内平移：mark 包围盒居中
const BBOX = (() => {
  const xs = [DOT.x - HALO.r, HOOK.a.x, HOOK.b.x, HOOK.c.x + HOOK.w / 2];
  const ys = [DOT.y - HALO.r, HOOK.a.y, HOOK.b.y, HOOK.c.y - HOOK.w / 2];
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  return { cx, cy };
})();
const SHIFT_X = W / 2 - BBOX.cx * K;
const SHIFT_Y = H / 2 - BBOX.cy * K;

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

/** 点到线段距离（单位坐标，同 favicon 布局） */
function segDistU(x, y, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((x - a.x) * dx + (y - a.y) * dy) / lenSq;
  t = clamp(t, 0, 1);
  const cx = a.x + t * dx;
  const cy = a.y + t * dy;
  return Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
}

// ── 渲染 ────────────────────────────────────────
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    // 背景：深 navy 垂直渐变（左上亮 → 右下暗）
    const t = (x / W + y / H) / 2;
    let r = BG_TOP[0] + (BG_BOT[0] - BG_TOP[0]) * t;
    let g = BG_TOP[1] + (BG_BOT[1] - BG_TOP[1]) * t;
    let b = BG_TOP[2] + (BG_BOT[2] - BG_TOP[2]) * t;

    // 中央蓝光晕：知识空间感
    const dx0 = x - W / 2;
    const dy0 = y - H / 2;
    const gd = Math.sqrt(dx0 * dx0 + dy0 * dy0);
    const glow = Math.max(0, 1 - gd / 560);
    const glow2 = glow * glow;
    r += glow2 * GLOW_BLUE[0] * 0.2;
    g += glow2 * GLOW_BLUE[1] * 0.2;
    b += glow2 * GLOW_BLUE[2] * 0.22;

    // ═══ Mark：从像素 → 32 单位坐标 ═══
    const ux = (x - SHIFT_X) / K;
    const uy = (y - SHIFT_Y) / K;

    // 1) 橙光点（实心）
    const ddot = Math.sqrt((ux - DOT.x) ** 2 + (uy - DOT.y) ** 2);
    if (ddot <= DOT.r + 0.06) {
      const cov = clamp((DOT.r - ddot) / 0.06 + 1, 0, 1);
      r = r * (1 - cov) + ORANGE[0] * cov;
      g = g * (1 - cov) + ORANGE[1] * cov;
      b = b * (1 - cov) + ORANGE[2] * cov;
    }

    // 2) 光晕环（圆环描边）
    const dr = Math.abs(ddot - HALO.r) - HALO.w / 2;
    if (dr <= 0.06) {
      const cov = clamp(0.5 - dr / 0.12, 0, 1) * HALO.alpha;
      r = r * (1 - cov) + ORANGE[0] * cov;
      g = g * (1 - cov) + ORANGE[1] * cov;
      b = b * (1 - cov) + ORANGE[2] * cov;
    }

    // 3) 对钩（两笔，圆角 round cap/join → 段距离场）
    const d1 = segDistU(ux, uy, HOOK.a, HOOK.b);
    const d2 = segDistU(ux, uy, HOOK.b, HOOK.c);
    const minD = Math.min(d1, d2) - HOOK.w / 2;
    if (minD <= 0.06) {
      const cov = clamp(0.5 - minD / 0.12, 0, 1);
      r = r * (1 - cov) + INK[0] * cov;
      g = g * (1 - cov) + INK[1] * cov;
      b = b * (1 - cov) + INK[2] * cov;
    }

    const i = (y * W + x) * 3;
    img[i] = clamp(Math.round(r), 0, 255);
    img[i + 1] = clamp(Math.round(g), 0, 255);
    img[i + 2] = clamp(Math.round(b), 0, 255);
  }
}

// ── PNG 编码 ────────────────────────────────────
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgb) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (width * 3 + 1);
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < width * 3; x++) raw[rowStart + 1 + x] = rgb[y * width * 3 + x];
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "og-cover.png");
writeFileSync(outPath, encodePNG(W, H, img));
console.log(`✅ 已生成 ${outPath} (${W}×${H})`);
