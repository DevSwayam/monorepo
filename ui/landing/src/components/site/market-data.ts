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

// --- the three endings -----------------------------------------------------

/** Forecast candles per scenario. One per tick of the animation. */
export const FORECAST_BARS = 24;

type Waypoint = { t: number; price: number };

/** Piecewise linear read of a waypoint list at any t. */
function priceAt(pts: Waypoint[], t: number) {
  if (t <= pts[0].t) return pts[0].price;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (t <= b.t) {
      const k = (t - a.t) / (b.t - a.t || 1);
      return a.price + (b.price - a.price) * k;
    }
  }
  return pts[pts.length - 1].price;
}

/** Evenly spaced waypoints, so a scenario is written as a list of prices. */
const shape = (prices: number[]): Waypoint[] =>
  prices.map((price, i) => ({ t: i / (prices.length - 1), price }));

/**
 * Candles along a shape, with the last close pinned to where the trade ends.
 *
 * Pinning matters: the exit price is quoted in the caption and shown as a
 * level on the chart, and a series that finishes three dollars off it makes
 * the whole frame read as approximate.
 */
function forecast(
  seed: number,
  pts: Waypoint[],
  vol: number,
  /**
   * Nothing may trade through the exit before the last bar. Without this a
   * wick strays past the invalidation four candles early, and a trader reading
   * the frame sees a position that should already have closed.
   */
  keepInside: { min: number; max: number },
): Candle[] {
  const rand = mulberry32(seed);
  const hold = (v: number) =>
    Math.min(keepInside.max, Math.max(keepInside.min, v));
  const out: Candle[] = [];
  let open = pts[0].price;
  for (let i = 0; i < FORECAST_BARS; i++) {
    const t = (i + 1) / FORECAST_BARS;
    const finalBar = i === FORECAST_BARS - 1;
    const close = finalBar
      ? pts[pts.length - 1].price
      : hold(priceAt(pts, t) + (rand() - 0.5) * vol);
    const wick = vol * (0.25 + rand() * 0.45);
    const high = Math.max(open, close) + rand() * wick;
    const low = Math.min(open, close) - rand() * wick;
    out.push({
      o: open,
      c: close,
      h: finalBar ? Math.max(open, close) : hold(high),
      l: finalBar ? Math.min(open, close) : hold(low),
    });
    open = close;
  }
  return out;
}

/** A hair inside a level, so a candle can approach it without touching. */
const INSIDE = 60;

export type Scenario = {
  key: string;
  n: string;
  title: string;
  caption: string;
  /** Where the position actually closes, and what it is worth there. */
  exit: number;
  exitLabel: string;
  bars: Candle[];
};

export const SCENARIOS: Scenario[] = [
  {
    key: "runs",
    n: "01",
    title: "It runs",
    caption:
      "Price does roughly what you drew. It dips under you first, which is when most people bail.",
    exit: ORDER.target,
    exitLabel: "Out at your number",
    bars: forecast(
      7301,
      shape([
        ORDER.entry, 64_640, 64_210, 63_880, 64_390, 65_060, 64_820, 65_540,
        66_280, 66_010, 66_880, ORDER.target,
      ]),
      210,
      { min: ORDER.invalidation + INSIDE, max: ORDER.target - INSIDE },
    ),
  },
  {
    key: "stalls",
    n: "02",
    title: "It goes nowhere",
    caption:
      "An hour of nothing. You take it off where you got in, and leave with what you came with.",
    exit: ORDER.entry,
    exitLabel: "Out flat",
    bars: forecast(
      4417,
      shape([
        ORDER.entry, 64_430, 64_090, 64_340, 63_970, 64_260, 64_030, 64_370,
        64_140, 64_290, 64_070, ORDER.entry,
      ]),
      175,
      { min: ORDER.invalidation + INSIDE, max: ORDER.target - INSIDE },
    ),
  },
  {
    key: "breaks",
    n: "03",
    title: "It breaks",
    caption:
      "It goes the wrong way and keeps going. You're out at the line you drew, and nobody had to call you.",
    exit: ORDER.invalidation,
    exitLabel: "Out at your line",
    bars: forecast(
      9152,
      shape([
        ORDER.entry, 64_460, 64_070, 64_250, 63_810, 63_940, 63_560, 63_710,
        63_310, 63_430, 63_060, ORDER.invalidation,
      ]),
      195,
      { min: ORDER.invalidation + INSIDE, max: ORDER.target - INSIDE },
    ),
  },
];

/**
 * What the trade is worth at a price, in the money this page quotes.
 *
 * The page sells to someone putting in a hundred dollars, not 2.5 BTC, so
 * every figure on it is a $100 stake trading like $500 — the same arithmetic
 * the drawable chart in the hero uses. Quoting +$8,050 beside a canvas quoting
 * +$26 made the page read as though it were written for two different people.
 */
export const STAKE = 100;
export const TRADE_LIKE = 5;

export const pnlAt = (price: number) =>
  ((price - ORDER.entry) / ORDER.entry) * STAKE * TRADE_LIKE;

// --- drawing over your own line --------------------------------------------

/**
 * The line as first drawn: down, from the entry to 62,400.
 *
 * Everything in the redraw section is this shape with its tail lifted. Points
 * are evenly spaced across the forecast window and the first one is pinned to
 * the entry, because the start of a curve is where you got in and dragging the
 * far end must not move it.
 */
export const DRAWN_DOWN = [
  ORDER.entry, 64_720, 64_150, 63_400, 63_600, 62_950, 63_150, 62_620, 62_400,
];

/** Where the walkthrough drags the tail to. */
export const DRAG_TO = 66_200;
/** How far a hand, or an arrow key, may take it. */
export const DRAG_MIN = 62_100;
export const DRAG_MAX = 67_000;

/**
 * Weight per point, so a drag on the tail barely disturbs the start.
 *
 * Squared rather than linear: with a linear falloff the whole line slides up
 * like a rigid bar, which is not what dragging one end of a curve does.
 */
const PULL = DRAWN_DOWN.map(
  (_, i) => (i / (DRAWN_DOWN.length - 1)) ** 2,
);

/** The drawn line with its last point at `end`. */
export function lineTo(end: number) {
  const shift = end - DRAWN_DOWN[DRAWN_DOWN.length - 1];
  return DRAWN_DOWN.map((price, i) => price + PULL[i] * shift);
}

/**
 * The prices a shape implies.
 *
 * The whole drawn path counts, not just where it stopped. Reading the target
 * off the last point threw away everything in between: a line that dives five
 * percent and climbs back to where it started came out as a flat trade with an
 * enormous drawdown, which is the opposite of what was drawn. So the target is
 * the furthest the line ever gets from the entry, whichever side that is on,
 * and the floor is the furthest it goes the other way — the drawdown you drew
 * yourself and therefore agreed to sit through.
 *
 * Which way the trade faces falls out of the same test rather than being read
 * off the end, so a line dragged through the entry turns the position around
 * with it.
 */
export function levelsFor(prices: number[], entry: number = ORDER.entry) {
  const rest = prices.slice(1);
  let hi = entry;
  let lo = entry;
  for (const p of rest) {
    if (p > hi) {
      hi = p;
    }
    if (p < lo) {
      lo = p;
    }
  }
  const long = hi - entry >= entry - lo;
  const target = long ? hi : lo;
  const invalidation = long ? lo : hi;
  return {
    target,
    invalidation,
    long,
    reward: Math.abs(target - entry) * ORDER.size,
    risk: Math.abs(invalidation - entry) * ORDER.size,
  };
}

/** Price going the other way to the line, which is what starts the drag. */
export const RISING_BARS: Candle[] = (() => {
  const rand = mulberry32(51_207);
  const n = 18;
  const out: Candle[] = [];
  let open: number = ORDER.entry;
  for (let i = 0; i < n; i++) {
    const close = open + 70 + (rand() - 0.38) * 320;
    const wick = 90 + rand() * 190;
    out.push({
      o: open,
      c: close,
      h: Math.max(open, close) + rand() * wick,
      l: Math.min(open, close) - rand() * wick,
    });
    open = close;
  }
  return out;
})();
