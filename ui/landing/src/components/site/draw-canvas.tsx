"use client";

import { CandlePnl } from "./candle-pnl";
import { ExpandButton } from "./expandable";
import { Candles, spacing } from "./chart";
import { SoonButton } from "./soon";
import { Kicker } from "./type";
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import { type Candle, fmtUsd, smoothPath } from "./market-data";

/**
 * The drawable chart, running.
 *
 * The landing page's whole problem was that it had to *describe* a gesture. A
 * picture of a drawn line cannot teach the thing the product is; you have to be
 * able to put a finger on it. So this is the real interaction: drag across the
 * empty half, and then watch the market walk into the line you left.
 *
 * The candles are a simulation, and the chip says so. What matters is that they
 * move: a still chart asks you to imagine a market, and nobody imagines one. A
 * second per candle is fast enough that the next bar is always nearly here,
 * which is the whole reason it is worth sitting through. Real BTC history seeds
 * the walk, so the shape you draw onto is one a market actually made.
 *
 * Deliberately no vocabulary. Nothing here says entry, target, invalidation,
 * leverage or liquidation; see ui/landing/CONTENT.md §4 for the word list this
 * component is written against. The stake and the multiple are fixed and shown
 * as one chip, because a demo that opens with settings is a demo that opens
 * with homework.
 *
 * The level rule matches the one in the FAQ, via `levelsFor`: the end of the
 * curve is what you're aiming at, and the furthest it strays the wrong way is
 * where you're out.
 */

// --- fixed geometry --------------------------------------------------------

const W = 760;
const H = 340;
const PLOT_L = 14;
const PLOT_R = 690;
const PLOT_T = 20;
const PLOT_B = 296;
/** Where history stops and the empty half you draw into begins. */
const SPLIT = 366;

/** Evenly spaced samples of the drawn shape, which is what `levelsFor` reads. */
const SAMPLES = 26;

// --- the clock -------------------------------------------------------------

/** One candle per second. This is the number that makes it worth watching. */
const TICK_MS = 1000;
/** How often the candle that is still forming redraws inside its second. */
const SUB_MS = 80;
/** Candles left of the split. */
const HISTORY = 46;
/** How many candles a drawn trade gets before it is settled where it stands. */
const RUN_BARS = 22;

// --- money -----------------------------------------------------------------

/**
 * The account, on the model from the Trace prototype.
 *
 * $100 of isolated margin at 5×, so each leg may open $500 of BTC. Quantity is
 * fixed at entry from the live price (`notional / price`), which is why P&L is
 * `dir × qty × (price − entry)` rather than a percentage of the stake: the
 * price move is applied to the position, and nothing multiplies it twice.
 */
const MARGIN = 100;
const LEVERAGE = 5;
const NOTIONAL = MARGIN * LEVERAGE;
/** Taker fee per side, charged on every fill. */
const FEE = 0.00045;
/** The venue closes you when equity falls to this fraction of the notional. */
const MAINT = 0.0125;

/** Moves smaller than this are wobble, not a turn. */
const TOL = 0.0022;
/** Under this total travel, the drawing says nothing worth trading. */
const FLAT = 0.004;

/**
 * A point of the drawn line, held as a price at a moment: never as a pixel.
 *
 * The scale re-centres on the live price every tick. A line stored in pixels
 * stays where it was put while the axis slides underneath it, so it drifts off
 * the prices it was drawn at, and `resample` reads those same pixels back
 * through the new scale, quietly changing the legs and the money after the
 * trade is already open. Storing the price means the line moves with the chart
 * and says the same thing for as long as it is on screen.
 */
type Pt = {
  /** Position across the forecast half, 0 at the split and 1 at the edge. */
  t: number;
  price: number;
};
type Phase = "live" | "drawing" | "running" | "settled";

// --- the feed --------------------------------------------------------------

/**
 * One candle of a random walk.
 *
 * Volatility is a fraction of price so the series behaves the same whatever it
 * is seeded at, and the body is built from an open and a close with wicks
 * outside both: a candle drawn as a single segment reads as a bar chart, not
 * as a market.
 */
function nextCandle(
  open: number,
  vol: number,
  toward: number | null = null,
  follow = 0,
): Candle {
  // Pulled toward the line you drew, by however much this particular market
  // feels like respecting it. `follow` is fixed for the whole trade: near zero
  // the price ignores the drawing, high and it tracks it, negative and it
  // walks off the other way.
  const pull = toward === null ? 0 : (toward - open) * follow;
  const close = open + pull + open * vol * (Math.random() - 0.5) * 2;
  const wick = open * vol * (0.3 + Math.random() * 0.8);
  return {
    o: open,
    c: close,
    h: Math.max(open, close) + Math.random() * wick,
    l: Math.min(open, close) - Math.random() * wick,
  };
}

/** Extend the candle still forming, so the right edge is never static. */
function extend(c: Candle, vol: number): Candle {
  const close = c.c * (1 + (Math.random() - 0.5) * vol * 0.55);
  return {
    o: c.o,
    c: close,
    h: Math.max(c.h, close),
    l: Math.min(c.l, close),
  };
}

// --- scale -----------------------------------------------------------------

type Band = { lo: number; hi: number };

/**
 * The visible price range, centred on where price is now.
 *
 * Not on the candles: a chart scaled to fit its own history puts the last
 * close wherever that history happens to leave it, and on a run of green bars
 * that is near the top of the plot with almost no room above to draw into. The
 * whole gesture is choosing up or down, so up and down get half the canvas
 * each, whatever the market has been doing.
 */
function bandFor(candles: Candle[], center: number, extra: number[] = []): Band {
  let reach = center * 0.012;
  for (const c of candles) {
    reach = Math.max(reach, Math.abs(c.h - center), Math.abs(c.l - center));
  }
  // The drawn line has to stay on screen too. It widens the band rather than
  // shifting it, so the current price keeps the middle and the reach is still
  // the same in both directions.
  for (const p of extra) {
    reach = Math.max(reach, Math.abs(p - center));
  }
  const pad = reach * 1.2;
  return { lo: center - pad, hi: center + pad };
}

/**
 * Chase the band rather than snapping to it.
 *
 * Recomputing the scale outright every tick makes the whole chart jump each
 * time one wick clears the old high. Easing towards the new bounds is what a
 * real chart does, and it keeps the candles reading as the thing that moved.
 */
function easeBand(from: Band, to: Band): Band {
  const k = 0.12;
  return {
    lo: from.lo + (to.lo - from.lo) * k,
    hi: from.hi + (to.hi - from.hi) * k,
  };
}

function makeScale(band: Band, count: number) {
  const span = band.hi - band.lo || 1;
  const step = (SPLIT - PLOT_L) / Math.max(1, count);
  return {
    y: (p: number) => PLOT_T + ((band.hi - p) / span) * (PLOT_B - PLOT_T),
    priceAtY: (yy: number) =>
      band.hi - ((yy - PLOT_T) / (PLOT_B - PLOT_T)) * span,
    step,
    body: Math.max(2.6, step * 0.58),
  };
}

type Scale = ReturnType<typeof makeScale>;

// --- reading the drawing ---------------------------------------------------

/** Price of the drawn line at a moment, flat past either end. */
function priceAt(pts: Pt[], t: number, entry: number) {
  if (pts.length === 0) {
    return entry;
  }
  if (t <= pts[0].t) {
    return pts[0].price;
  }
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

function resample(pts: Pt[], entry: number) {
  const out: number[] = [];
  for (let i = 0; i < SAMPLES; i++) {
    out.push(priceAt(pts, i / (SAMPLES - 1), entry));
  }
  // The line starts where you get in, which is now, at the last close. The
  // drag sets the shape from there; it cannot move the start.
  out[0] = entry;
  return out;
}

/** Where a drawn point sits on screen, under whatever scale is current. */
const plot = (pt: Pt, sc: Scale) => ({
  x: SPLIT + pt.t * (PLOT_R - SPLIT),
  y: sc.y(pt.price),
});

/**
 * The drawing, as the orders it stands for.
 *
 * A rising stretch is a long, a falling stretch is a short, and a turn is a
 * close plus an open. Reading only the first and last point would throw away
 * everything drawn in between: a line that dives and comes back would be a
 * trade in nothing, when what was drawn was plainly a short and then a long.
 *
 * `TOL` is what separates a turn from a wobble: a reversal smaller than that is
 * absorbed into the leg around it, so a shaky hand does not buy and sell twenty
 * times on the way up.
 */
function legsFrom(prices: number[]) {
  const tol = prices[0] * TOL;
  const legs: { from: number; to: number; dir: number }[] = [];
  let start = 0;
  let extIdx = 0;
  let dir = 0;

  for (let i = 1; i < prices.length; i++) {
    const p = prices[i];
    if (dir === 0) {
      if (Math.abs(p - prices[start]) >= tol) {
        dir = Math.sign(p - prices[start]);
        extIdx = i;
      }
      continue;
    }
    if ((p - prices[extIdx]) * dir > 0) {
      extIdx = i;
      continue;
    }
    // Come back far enough against the leg and the turn is real: the leg ends
    // at its extreme, and the next one starts there.
    if (Math.abs(p - prices[extIdx]) >= tol) {
      legs.push({ from: start, to: extIdx, dir });
      start = extIdx;
      dir = Math.sign(p - prices[extIdx]);
      extIdx = i;
    }
  }
  if (dir !== 0 && extIdx > start) {
    legs.push({ from: start, to: prices.length - 1, dir });
  }
  return legs;
}

/**
 * Run the legs against the candles that actually arrived.
 *
 * Recomputed from scratch on every tick rather than accumulated, so there is
 * one place where money is decided and no running total to drift. Fees come off
 * at each fill, and a bar whose wick takes equity down to the maintenance
 * requirement liquidates the position: which is the only thing that can end a
 * trade early, since the drawing sets no stop and no target.
 */
function settle(bars: Candle[], legs: ReturnType<typeof legsFrom>, span: number) {
  let cash = MARGIN;
  let pos: { d: number; q: number; p0: number } | null = null;
  let liquidated = false;
  let fees = 0;

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    const u = (i / RUN_BARS) * span;
    const leg = legs.find((l) => u >= l.from && u < l.to);
    const want = leg ? leg.dir : 0;
    const px = bar.o;

    if (pos && pos.d !== want) {
      const fee = FEE * pos.q * px;
      cash += pos.d * pos.q * (px - pos.p0) - fee;
      fees += fee;
      pos = null;
    }
    if (!pos && want !== 0) {
      const q = Math.min(NOTIONAL, LEVERAGE * Math.max(0, cash)) / px;
      const fee = FEE * q * px;
      cash -= fee;
      fees += fee;
      pos = { d: want, q, p0: px };
    }
    if (pos) {
      // Tested on the wick, not the close: a level you traded through is a
      // level you were closed at.
      const worst = pos.d > 0 ? bar.l : bar.h;
      const eq = cash + pos.d * pos.q * (worst - pos.p0);
      if (eq <= MAINT * pos.q * worst) {
        cash = 0;
        pos = null;
        liquidated = true;
        break;
      }
    }
  }

  const last = bars.at(-1);
  const equity = pos && last ? cash + pos.d * pos.q * (last.c - pos.p0) : cash;
  return { equity, net: equity - MARGIN, pos, liquidated, fees };
}

/** The shape the hint draws for itself: a dip, then a run. */
const HINT = [
  1, 1.006, 0.998, 0.988, 0.979, 0.975, 0.984, 0.996, 1.008, 1.022, 1.038,
  1.052,
] as const;

const hintPath = (entry: number, sc: Scale) =>
  smoothPath(
    HINT.map((m, i) => ({
      x: SPLIT + (i / (HINT.length - 1)) * (PLOT_R - SPLIT),
      // Clamped into the marked-out area. The scale widens with volatility, so
      // a fixed set of multiples will otherwise wander outside the very box
      // that is telling you where to draw.
      y: Math.min(PLOT_B - 26, Math.max(PLOT_T + 26, sc.y(entry * m))),
    })),
  );

// --- component -------------------------------------------------------------

/**
 * The Bitcoin mark.
 *
 * The official one, path data verbatim from the public-domain original
 * (bitcoin.org / Wikimedia), not a redraw: the disc is a tilted circle and the
 * glyph is set at an angle inside it, which is the part an approximation gets
 * wrong. #f7931a is Bitcoin's own orange, the one colour on this page that is
 * not ours to pick, and it is scoped here so it never enters the palette.
 */
function BitcoinMark() {
  return (
    <svg
      aria-hidden="true"
      className="size-[1.125rem] shrink-0"
      viewBox="0 0 64 64"
    >
      <g transform="translate(0.00630876,-0.00301984)">
        <path
          d="m63.033,39.744c-4.274,17.143-21.637,27.576-38.782,23.301-17.138-4.274-27.571-21.638-23.295-38.78,4.272-17.145,21.635-27.579,38.775-23.305,17.144,4.274,27.576,21.64,23.302,38.784z"
          fill="#f7931a"
        />
        <path
          d="m46.103,27.444c0.637-4.258-2.605-6.547-7.038-8.074l1.438-5.768-3.511-0.875-1.4,5.616c-0.923-0.23-1.871-0.447-2.813-0.662l1.41-5.653-3.509-0.875-1.439,5.766c-0.764-0.174-1.514-0.346-2.242-0.527l0.004-0.018-4.842-1.209-0.934,3.75s2.605,0.597,2.55,0.634c1.422,0.355,1.679,1.296,1.636,2.042l-1.638,6.571c0.098,0.025,0.225,0.061,0.365,0.117-0.117-0.029-0.242-0.061-0.371-0.092l-2.296,9.205c-0.174,0.432-0.615,1.08-1.609,0.834,0.035,0.051-2.552-0.637-2.552-0.637l-1.743,4.019,4.569,1.139c0.85,0.213,1.683,0.436,2.503,0.646l-1.453,5.834,3.507,0.875,1.439-5.772c0.958,0.26,1.888,0.5,2.798,0.726l-1.434,5.745,3.511,0.875,1.453-5.823c5.987,1.133,10.489,0.676,12.384-4.739,1.527-4.36-0.076-6.875-3.226-8.515,2.294-0.529,4.022-2.038,4.483-5.155zm-8.022,11.249c-1.085,4.36-8.426,2.003-10.806,1.412l1.928-7.729c2.38,0.594,10.012,1.77,8.878,6.317zm1.086-11.312c-0.99,3.966-7.1,1.951-9.082,1.457l1.748-7.01c1.982,0.494,8.365,1.416,7.334,5.553z"
          fill="#fff"
        />
      </g>
    </svg>
  );
}

/**
 * The price, on the right edge of the line it belongs to.
 *
 * Clamped inside the plot so it cannot ride off the top or bottom when the
 * band moves: the line itself can sit anywhere, but a label half outside the
 * card reads as a rendering fault.
 */
function PriceTag({ price, y }: { price: number; y: number }) {
  const x = PLOT_R + 6;
  const w = W - x - 4;
  const top = Math.min(PLOT_B - 20, Math.max(PLOT_T + 2, y - 9));
  return (
    <g>
      <rect
        fill="var(--surface-2)"
        height="18"
        rx="5"
        width={w}
        x={x}
        y={top}
      />
      <text
        fill="var(--fg-muted)"
        fontSize="10.5"
        style={{ fontFamily: "var(--font-sans)" }}
        textAnchor="middle"
        x={x + w / 2}
        y={top + 12.5}
      >
        {fmtUsd(price)}
      </text>
    </g>
  );
}

export function DrawCanvas({
  candles: seed,
  price: seedPrice,
  className,
}: {
  /** Real BTC history, used to seed the walk. */
  candles: Candle[];
  /** Last real close, where the simulation starts. */
  price: number;
  live?: boolean;
  className?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  /** Points actually kept, so a stray click is not a trade. */
  const kept = useRef(0);
  /** Rightmost x committed so far, for the spacing test in `push`. */
  const lastX = useRef(Number.NEGATIVE_INFINITY);
  /**
   * Whether a drag is in flight, held in a ref rather than read off `phase`.
   * Pointer moves can arrive faster than React commits, and a move handler
   * that gates on state can miss the whole gesture when they do.
   */
  const active = useRef(false);

  const [phase, setPhase] = useState<Phase>("live");
  const [pts, setPts] = useState<Pt[]>([]);
  const [feed, setFeed] = useState<Candle[]>(() => seed.slice(-HISTORY));
  const [run, setRun] = useState<Candle[]>([]);
  const [entry, setEntry] = useState(seedPrice);
  type Result = { won: boolean; pnl: number; liquidated: boolean };
  const [result, setResult] = useState<Result | null>(null);
  const [note, setNote] = useState<string | null>(null);
  /**
   * How closely this market respects the line, fixed for the whole trade.
   *
   * Re-rolling it per candle would average out to indifference and the run
   * would be a plain random walk again. One roll per trade is what makes a run
   * feel like it has a character: this one is tracking your drawing, that one
   * never had any intention of it.
   */
  const follow = useRef(0);
  const [band, setBand] = useState<Band>(() =>
    bandFor(seed.slice(-HISTORY), seedPrice),
  );

  /**
   * Volatility per candle.
   *
   * Once the run is pulled along the drawn line, the noise no longer has to
   * carry the whole move, so it comes down. At 0.6% a trade was resolving
   * three bars in and the line you drew was never walked; this is loose enough
   * to stay uncertain and tight enough that the run crosses the chart.
   */
  const vol = 0.0032;
  const price = run.at(-1)?.c ?? feed.at(-1)?.c ?? seedPrice;

  const sc = useMemo(() => makeScale(band, feed.length), [band, feed.length]);

  const shape = useMemo(() => {
    if (pts.length < 2) {
      return null;
    }
    const prices = resample(pts, entry);
    const legs = legsFrom(prices);
    let travel = 0;
    for (const l of legs) {
      travel += Math.abs(prices[l.to] - prices[l.from]);
    }
    return {
      prices,
      legs,
      span: prices.length - 1,
      /** Total distance the drawing asks price to cover, as a fraction. */
      travel: travel / entry,
      flat: legs.length === 0 || travel / entry < FLAT,
    };
  }, [pts, entry]);

  // Each prefix uses the same accounting as settlement, including fees and
  // direction changes. Closed bars stay fixed; only the forming bar updates.
  const candlePnls = useMemo(
    () => shape ? run.map((_, index) => settle(run.slice(0, index + 1), shape.legs, shape.span).net) : [],
    [run, shape],
  );

  /** What the position is worth at a price. Never worse than the stake. */
  /**
   * The current trade, for the clock to read.
   *
   * Held in a ref so the interval below can be started once and left alone.
   * Listing `shape` or `run` as deps would tear the interval down and rebuild
   * it, restarting its countdown, on every single tick, and the candles
   * would never arrive a second apart.
   */
  const live = useRef({ phase, shape, run, feed });
  // After every commit, never during render: a ref written mid-render is torn
  // between the two halves of a concurrent pass.
  useEffect(() => {
    live.current = { phase, shape, run, feed };
  });

  /** Ease the price scale onto the candles, kept centred on the last price. */
  const rescale = useCallback(
    (f: Candle[], r: Candle[], line: number[] = []) => {
      const all = [...f, ...r];
      const at = all.at(-1)?.c ?? seedPrice;
      setBand((b) => easeBand(b, bandFor(all.slice(-HISTORY), at, line)));
    },
    [seedPrice],
  );

  /**
   * The clock.
   *
   * While nothing is drawn it scrolls history. Once a line is down, new candles
   * walk into the half you drew on and the first one to touch either level ends
   * it. Drawing pauses it, because a target that moves under the finger is not
   * a target.
   */
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const tick = setInterval(() => {
      const { phase: ph, shape: sh, run: rn, feed: fd } = live.current;

      // Anything that is not a running trade keeps history scrolling, being
      // mid-drag included. A chart that freezes under the finger is the one
      // thing that gives away that it was never running.
      if (ph !== "running" || !sh) {
        const nextFeed = [
          ...fd.slice(1),
          nextCandle(fd.at(-1)?.c ?? seedPrice, vol),
        ];
        setFeed(nextFeed);
        rescale(nextFeed, [], sh ? sh.prices : []);
        return;
      }

      const open = rn.at(-1)?.c ?? entry;
      // Where the drawing says price should be by this bar.
      const along =
        sh.prices[
          Math.min(
            sh.prices.length - 1,
            Math.round(((rn.length + 1) / RUN_BARS) * (sh.prices.length - 1)),
          )
        ];
      const bar = nextCandle(open, vol, along, follow.current);
      const next = [...rn, bar];
      setRun(next);
      rescale(fd, next, sh.prices);

      // The drawing sets no stop and no target, so only two things end a
      // trade: the venue liquidating a leg, or the bars running out.
      // The run folds into history so the chart carries straight on, but the
      // canvas does not clear itself: a trade that wiped the board the instant
      // it ended was a trade nobody got to read the end of.
      const finish = (net: number, bk: ReturnType<typeof settle>) => {
        setResult({ won: net >= 0, pnl: net, liquidated: bk.liquidated });
        setFeed((f) => [...f, ...next].slice(-HISTORY));
        setRun([]);
        setPts([]);
        setPhase("settled");
      };

      const bk = settle(next, sh.legs, sh.span);
      if (bk.liquidated) {
        finish(-MARGIN, bk);
      } else if (next.length >= RUN_BARS) {
        finish(bk.net, bk);
      }

    }, TICK_MS);

    // The candle still forming. This is most of what makes the chart read as
    // switched on rather than as a slideshow of bars.
    const sub = setInterval(() => {
      const { phase: ph, run: rn } = live.current;
      if (ph === "running" && rn.length) {
        setRun((r) =>
          r.length ? [...r.slice(0, -1), extend(r[r.length - 1], vol)] : r,
        );
      } else {
        setFeed((f) =>
          f.length ? [...f.slice(0, -1), extend(f[f.length - 1], vol)] : f,
        );
      }
    }, SUB_MS);

    return () => {
      clearInterval(tick);
      clearInterval(sub);
    };
  }, [entry, seedPrice, rescale]);

  const toLocal = useCallback((e: ReactPointerEvent) => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) {
      return null;
    }
    return {
      x: ((e.clientX - r.left) / r.width) * W,
      y: ((e.clientY - r.top) / r.height) * H,
    };
  }, []);

  /**
   * Clamped into the empty half, and never backwards: time only goes one way.
   *
   * The spacing test reads a ref rather than the previous state array, so the
   * decision does not live inside the updater. Pointer moves can outrun React's
   * commits, and anything that has to consult rendered state mid-gesture will
   * sooner or later consult a stale copy of it.
   */
  const push = useCallback(
    (raw: { x: number; y: number }, sc: Scale) => {
      const x = Math.min(PLOT_R, Math.max(SPLIT, raw.x));
      const y = Math.min(PLOT_B, Math.max(PLOT_T, raw.y));
      if (x - lastX.current < 5) {
        return;
      }
      lastX.current = x;
      kept.current += 1;
      // Converted here, once, while this scale is the one the hand can see.
      setPts((prev) => [
        ...prev,
        { t: (x - SPLIT) / (PLOT_R - SPLIT), price: sc.priceAtY(y) },
      ]);
    },
    [],
  );

  const onDown = (e: ReactPointerEvent) => {
    // The summary covers the canvas, so this should never fire while it is up.
    // Guarded anyway: a drag that started a trade behind the card would be a
    // trade nobody meant to place.
    if (phase === "settled") {
      return;
    }
    const p = toLocal(e);
    if (!p) {
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    kept.current = 0;
    lastX.current = Number.NEGATIVE_INFINITY;
    active.current = true;
    // Whatever is on screen the moment you press is what you got in at.
    const at = price;
    setEntry(at);
    setRun([]);
    setResult(null);
    setNote(null);
    follow.current = -0.12 + Math.random() * 0.62;
    setPhase("drawing");
    setPts([{ t: 0, price: at }]);
    push(p, sc);
  };

  const onMove = (e: ReactPointerEvent) => {
    if (!active.current) {
      return;
    }
    const p = toLocal(e);
    if (p) {
      push(p, sc);
    }
  };

  const onUp = () => {
    if (!active.current) {
      return;
    }
    active.current = false;
    // A press with no drag would otherwise resolve into a straight line and a
    // set of prices, which is a trade nobody meant to place.
    if (kept.current < 3) {
      setPts([]);
      setPhase("live");
      return;
    }
    if (shape?.flat) {
      setPts([]);
      setPhase("live");
      setNote("Too flat to trade. Draw a bigger move.");
      return;
    }
    setPhase("running");
  };

  /** The line in screen space. Follows the scale, so it tracks the candles. */
  const drawn = useMemo(() => pts.map((pt) => plot(pt, sc)), [pts, sc]);

  const drawing = phase === "drawing";
  const hasLine = phase !== "live" && shape;
  const runWidth = (PLOT_R - SPLIT) / RUN_BARS;

  return (
    <div className={cn("relative flex flex-col gap-3 p-3 md:gap-4 md:p-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-2 pt-1">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1.5 rounded-full bg-surface-3 py-1 pr-3 pl-1.5 font-medium text-foreground text-sm">
            <BitcoinMark />
            Bitcoin
          </span>
          <span className="figures text-foreground text-sm">
            ${fmtUsd(price)}
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="rounded-full bg-surface-2 figures px-2.5 py-1 text-fg-muted text-xs">
            ${MARGIN} · {LEVERAGE}×
          </span>
          {/* Honest label, and it stays: these candles are a random walk, and a
              page that lets one pass for market data is lying. What went is the
              pulsing green dot that used to sit next to it, which is the
              universal "live feed" tell and was claiming the opposite. */}
          <span className="text-fg-subtle text-xs">practice</span>
          <ExpandButton />
        </div>
      </div>

      <div data-practice-plot="" className="relative overflow-hidden rounded-xl bg-background/60 shadow-[inset_0_0_0_1px_var(--edge)]">
        <svg
          aria-label="A moving Bitcoin-style price chart you can draw on. Drag across the empty right-hand side to draw where you think the price is going."
          className={cn(
            "block w-full touch-none select-none",
            "cursor-crosshair",
          )}
          onPointerCancel={onUp}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          ref={svgRef}
          role="img"
          viewBox={`0 0 ${W} ${H}`}
        >
          <defs>
            <pattern
              height="14"
              id="dc-dots"
              patternUnits="userSpaceOnUse"
              width="14"
            >
              <path
                d="M14 0 H0 V14"
                fill="none"
                stroke="var(--grid-line)"
                strokeWidth="1"
              />
            </pattern>
            <filter height="500%" id="dc-head" width="500%" x="-200%" y="-200%">
              <feGaussianBlur stdDeviation="7" />
            </filter>
          </defs>

          {/* The half you draw into reads as unwritten space. */}
          <rect
            fill="url(#dc-dots)"
            height={PLOT_B - PLOT_T}
            width={PLOT_R - SPLIT}
            x={SPLIT}
            y={PLOT_T}
          />

          {/* Where you get in. Always on, because it is always true. */}
          <line
            stroke="var(--fg-subtle)"
            strokeDasharray="3 4"
            strokeOpacity="0.35"
            x1={PLOT_L}
            x2={PLOT_R}
            y1={sc.y(hasLine ? entry : price)}
            y2={sc.y(hasLine ? entry : price)}
          />

          {/*
            The number that line stands for, parked in the gutter at the right.
            A rule across a chart with no figure on it makes you go and find the
            price in the header and hold both in your head; putting it on the
            end of the rule is how every trading screen does it, and it costs
            the 70px the plot already leaves free.
          */}
          <PriceTag price={hasLine ? entry : price} y={sc.y(hasLine ? entry : price)} />

          {/* history */}
          <Candles
            bars={feed}
            body={sc.body}
            opacity={hasLine ? "0.4" : "0.7"}
            x={spacing(PLOT_L, sc.step)}
            y={sc.y}
          />

          {/* what the market is actually doing about it */}
          <Candles
            bars={run}
            body={Math.max(2.4, runWidth * 0.58)}
            x={spacing(SPLIT, runWidth)}
            y={sc.y}
          />

          {/* the line, projected through whatever scale is current */}
          {drawn.length > 1 ? (
            <g>
              <path
                d={smoothPath(drawn)}
                fill="none"
                stroke="var(--brand)"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.4"
              />
              {drawing ? null : (
                <g>
                  <circle
                    cx={drawn[drawn.length - 1].x}
                    cy={drawn[drawn.length - 1].y}
                    fill="var(--brand)"
                    filter="url(#dc-head)"
                    r="7"
                  />
                  <circle
                    cx={drawn[drawn.length - 1].x}
                    cy={drawn[drawn.length - 1].y}
                    fill="#fff"
                    r="3.4"
                  />
                </g>
              )}
            </g>
          ) : null}

          {/*
            The invitation.

            This was five things at once: a marching dashed box around the
            region, a ghost curve pulsing inside it, a plate, "DRAW HERE" in
            letterspaced caps, and a second line of microcopy under that. Five
            devices for one gesture is what a UI does when it does not trust
            itself, and it read as a tutorial overlay rather than a chart.

            What is left is the part that actually teaches: a mark at the
            present, the shape of the gesture drawn faintly from it, and one
            lowercase line. The crosshair cursor on the surface does the rest.

            `!result` keeps it from reappearing under the summary card.
          */}
          {phase === "live" && !result ? (
            <g pointerEvents="none">
              {/* Now. The boundary is real information, unlike the box. */}
              <line
                stroke="var(--fg-subtle)"
                strokeDasharray="2 5"
                strokeOpacity="0.28"
                strokeWidth="1"
                x1={SPLIT}
                x2={SPLIT}
                y1={PLOT_T + 4}
                y2={PLOT_B - 4}
              />

              {/* The gesture, shown rather than described. Static: a hint that
                  breathes is a hint that will not stop talking. */}
              <path
                d={hintPath(price, sc)}
                fill="none"
                stroke="var(--brand)"
                strokeDasharray="3 8"
                strokeLinecap="round"
                strokeOpacity="0.28"
                strokeWidth="2"
              />
              <circle
                cx={SPLIT}
                cy={sc.y(price)}
                fill="var(--brand)"
                fillOpacity="0.9"
                r="3.5"
              />

              <text
                fill="var(--fg-subtle)"
                fontSize="11"
                style={{ fontFamily: "var(--font-sans)" }}
                textAnchor="middle"
                x={(SPLIT + PLOT_R) / 2}
                y={PLOT_B - 10}
              >
                drag to draw your line
              </text>
            </g>
          ) : null}
        </svg>

        {phase === "running" && run.length > 0 && <CandlePnl candles={run.map((bar, index) => ({
          x: (SPLIT + (index + 0.5) * runWidth) / W * 100,
          y: sc.y(bar.h) / H * 100,
          bottom: sc.y(bar.l) / H * 100,
          pnl: candlePnls[index],
        }))} />}
        {note && <div role="status" className="pointer-events-none absolute top-3 right-3 rounded-xl border border-edge bg-surface-2 px-3 py-2 text-fg-muted text-xs">{note}</div>}

      </div>
      {/*
        The end of the trade, held up rather than swept away.

        It sits over the canvas because the canvas is what it is about, and
        the chart keeps running behind it — the market does not wait for
        anyone to finish reading. Drawing again is one button; the other is
        the only place on the page that asks for anything.

        Anchored to the whole widget rather than to the plot box it used to
        sit inside. The plot is only as tall as the chart's 760x340 viewBox
        makes it, and on a phone that is 153px against a 230px card: the card
        overflowed by 93px, the plot box clips its overflow, and both buttons
        ended up outside it. Not merely cut off — `elementFromPoint` at their
        centres returned what was behind them, so "Start drawing for real"
        and "Draw another" could not be tapped at all. The shell is 273px at
        the same width, which the card fits inside with room over.
      */}
      {phase === "settled" && result ? (
        <div className="absolute inset-0 z-20 grid place-items-center p-3 sm:p-4">
          {/* The scrim. A card this size over moving candles is unreadable
              without one, and pushing the market back is also what says the
              trade is over. */}
          <div
            aria-hidden="true"
            className="dc-scrim absolute inset-0 bg-background/72 backdrop-blur-[3px]"
          />
          <div
            aria-live="polite"
            className="dc-summary surface-raised relative w-full max-w-[21rem] rounded-2xl p-5 sm:p-6"
          >
            {/* Outcome first, in three words, carrying the colour. */}
            <Kicker className="flex items-center justify-center gap-2">
              <span
                aria-hidden="true"
                className={cn(
                  "size-1.5 rounded-full",
                  result.won ? "bg-[var(--up)]" : "bg-[var(--down)]",
                )}
              />
              <span
                className={
                  result.won ? "text-[var(--up)]" : "text-[var(--down)]"
                }
              >
                {result.liquidated
                  ? "Liquidated"
                  : result.won
                    ? "Profit"
                    : "Loss"}
              </span>
            </Kicker>

            {/* The figure is the point, so nothing else on the card competes
                with it for size. */}
            <p
              className={cn(
                "mt-2 figures text-center text-[2.25rem] leading-none tracking-[-0.03em] sm:text-[2.75rem]",
                result.won ? "text-[var(--up)]" : "text-[var(--down)]",
              )}
            >
              {result.won ? "+" : "−"}${fmtUsd(Math.abs(result.pnl))}
            </p>

            <div className="mt-5 flex flex-col gap-2 sm:mt-6">
              <SoonButton
                className="pressable h-11 w-full rounded-full bg-primary text-base text-primary-foreground transition-colors duration-micro ease-smooth-out hover:bg-primary/90 sm:h-11 sm:text-base"
                detail="Drawing with real money opens with the public testnet."
                size="sm"
              >
                Start drawing for real
              </SoonButton>
              <button
                className="pressable h-9 rounded-full text-fg-muted text-sm transition-colors duration-fast ease-smooth-out hover:text-foreground"
                onClick={() => {
                  setResult(null);
                  setPhase("live");
                }}
                type="button"
              >
                Draw another
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
