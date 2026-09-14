/**
 * Illustrative market data for the product frames on this page.
 *
 * Everything here is a mock of the interface, not a claim about the exchange:
 * prices, sizes and P&L are internally consistent with each other so that a
 * trader reading the frame does not find arithmetic that does not add up, but
 * they are placeholders. Swap them for a live feed, or for real numbers, before
 * launch.
 *
 * The series is generated from a fixed seed so the server and the client render
 * identical geometry, a random walk evaluated twice would hydrate mismatched.
 */

export const MARKET = {
  symbol: "BTC-PERP",
  last: 64_182.5,
  change24h: 2.41,
  funding: 0.0041,
  markPrice: 64_180.0,
} as const;

/** The order the drawn path produces. 5× long, entered at the last price. */
export const ORDER = {
  side: "long",
  entry: 64_180,
  target: 67_400,
  invalidation: 62_900,
  size: 2.5,
  leverage: 5,
  /** entry × (1 − 1/leverage + maintenance margin 0.5%) */
  liquidation: 51_665,
} as const;

const notional = ORDER.entry * ORDER.size;
export const DERIVED = {
  notional,
  margin: notional / ORDER.leverage,
  reward: (ORDER.target - ORDER.entry) * ORDER.size,
  risk: (ORDER.entry - ORDER.invalidation) * ORDER.size,
  get rr() {
    return this.reward / this.risk;
  },
};

// --- series ----------------------------------------------------------------

export function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Candle = {
  o: number;
  h: number;
  l: number;
  c: number;
};

/** 56 candles walking up into the entry price. */
export const CANDLES: Candle[] = (() => {
  const rand = mulberry32(20260912);
  const n = 56;
  const start = 58_900;
  const out: Candle[] = [];
  let price = start;
  for (let i = 0; i < n; i++) {
    // Gentle uptrend with enough chop that it does not read as a smooth ramp.
    const drift = (ORDER.entry - start) / n;
    const noise = (rand() - 0.46) * 620;
    const o = price;
    const c = o + drift + noise;
    const wick = 120 + rand() * 320;
    out.push({
      o,
      c,
      h: Math.max(o, c) + rand() * wick,
      l: Math.min(o, c) - rand() * wick,
    });
    price = c;
  }
  // Land the last close exactly on the entry so the drawn path starts there.
  const last = out[out.length - 1];
  const shift = ORDER.entry - last.c;
  last.c = ORDER.entry;
  last.h = Math.max(last.h + shift, ORDER.entry);
  return out;
})();

/**
 * The drawn path, as price points across the forecast window. Dips toward the
 * invalidation before running to target, the shape a trader actually draws,
 * not a clean diagonal.
 */
export const DRAWN_PATH: { t: number; price: number }[] = [
  { t: 0, price: ORDER.entry },
  { t: 0.08, price: 64_820 },
  { t: 0.17, price: 64_240 },
  { t: 0.28, price: 63_480 },
  { t: 0.36, price: 63_720 },
  { t: 0.46, price: 64_950 },
  { t: 0.56, price: 64_600 },
  { t: 0.67, price: 65_680 },
  { t: 0.78, price: 66_420 },
  { t: 0.88, price: 66_180 },
  { t: 1, price: ORDER.target },
];

export const fmtUsd = (n: number, dp = 0) =>
  n.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });

export const fmtSigned = (n: number, dp = 2) =>
  `${n >= 0 ? "+" : "−"}${Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  })}`;

/** Strip under the hero. Illustrative, same caveat as everything above. */
export const TICKER = [
  { symbol: "BTC-PERP", price: 64_182.5, change: 2.41 },
  { symbol: "ETH-PERP", price: 3_284.18, change: 1.87 },
  { symbol: "SOL-PERP", price: 214.06, change: -0.94 },
  { symbol: "HYPE-PERP", price: 41.23, change: 5.12 },
  { symbol: "XRP-PERP", price: 2.418, change: -1.36 },
  { symbol: "DOGE-PERP", price: 0.3914, change: 3.08 },
] as const;

/**
 * A short price trace per market, for the sparkline on each tile. Seeded from
 * the symbol so every render agrees, and shaped to end in the direction the
 * 24h change implies, a tile whose line disagrees with its number is worse
 * than no line at all.
 */
export function sparkline(symbol: string, change: number, points = 24): number[] {
  let seed = 0;
  for (const ch of symbol) seed = (seed * 31 + ch.charCodeAt(0)) | 0;
  const rand = mulberry32(Math.abs(seed) + 7);
  const out: number[] = [];
  let v = 0;
  for (let i = 0; i < points; i++) {
    const drift = (change / points) * 0.9;
    v += drift + (rand() - 0.5) * Math.abs(change || 1) * 0.55;
    out.push(v);
  }
  // Land the trace on the real 24h move so the line and the label agree, but
  // spread the correction across the whole series rather than pinning the last
  // point, which leaves a spike on the final segment.
  const delta = change - out[out.length - 1];
  return out.map((v, i) => v + delta * (i / (points - 1)));
}

/**
 * Catmull-rom through a list of plotted points, emitted as one cubic path.
 *
 * A polyline through forecast waypoints reads as a machine's idea of a
 * forecast. This reads as one movement of a hand, which is the whole product.
 */
export function smoothPath(pts: { x: number; y: number }[]) {
  if (pts.length === 0) return "";
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    d +=
      ` C ${(p1.x + (p2.x - p0.x) / 6).toFixed(1)} ${(p1.y + (p2.y - p0.y) / 6).toFixed(1)}` +
      ` ${(p2.x - (p3.x - p1.x) / 6).toFixed(1)} ${(p2.y - (p3.y - p1.y) / 6).toFixed(1)}` +
      ` ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

/**
 * The other ending. Same entry, same size, price walks down through the
 * invalidation instead of up to the target. Not something the trader drew, it
 * is what the market does to the drawing, so it is dashed wherever it is shown.
 */
export const BREAK_PATH: { t: number; price: number }[] = [
  { t: 0, price: ORDER.entry },
  { t: 0.09, price: 64_520 },
  { t: 0.2, price: 64_010 },
  { t: 0.31, price: 64_240 },
  { t: 0.43, price: 63_540 },
  { t: 0.55, price: 63_720 },
  { t: 0.68, price: 63_180 },
  { t: 0.8, price: 63_390 },
  { t: 0.9, price: 62_960 },
  { t: 1, price: ORDER.invalidation },
];
