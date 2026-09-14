"use client";

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

type Pt = { x: number; y: number };
type Phase = "live" | "drawing" | "running";

// --- the feed --------------------------------------------------------------

/**
 * One candle of a random walk.
 *
 * Volatility is a fraction of price so the series behaves the same whatever it
 * is seeded at, and the body is built from an open and a close with wicks
 * outside both — a candle drawn as a single segment reads as a bar chart, not
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
function bandFor(candles: Candle[], center: number): Band {
  let reach = center * 0.012;
  for (const c of candles) {
    reach = Math.max(reach, Math.abs(c.h - center), Math.abs(c.l - center));
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

/** Price of the drawn polyline at an x, flat past either end. */
function priceAtX(pts: Pt[], x: number, sc: Scale, entry: number) {
  if (pts.length === 0) {
    return entry;
  }
  if (x <= pts[0].x) {
    return sc.priceAtY(pts[0].y);
  }
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (x <= b.x) {
      const k = (x - a.x) / (b.x - a.x || 1);
      return sc.priceAtY(a.y + (b.y - a.y) * k);
    }
  }
  return sc.priceAtY(pts[pts.length - 1].y);
}

function resample(pts: Pt[], sc: Scale, entry: number) {
  const out: number[] = [];
  for (let i = 0; i < SAMPLES; i++) {
    out.push(
      priceAtX(pts, SPLIT + (i / (SAMPLES - 1)) * (PLOT_R - SPLIT), sc, entry),
    );
  }
  // The line starts where you get in, which is now, at the last close. The
  // drag sets the shape from there; it cannot move the start.
  out[0] = entry;
  return out;
}

/**
 * The drawing, as the orders it stands for.
 *
 * A rising stretch is a long, a falling stretch is a short, and a turn is a
 * close plus an open. Reading only the first and last point would throw away
 * everything drawn in between — a line that dives and comes back would be a
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
 * requirement liquidates the position — which is the only thing that can end a
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
  const [result, setResult] = useState<{ won: boolean; pnl: number } | null>(
    null,
  );
  const [note, setNote] = useState<string | null>(null);
  /**
   * How closely this market respects the line, fixed for the whole trade.
   *
   * Re-rolling it per candle would average out to indifference and the run
   * would be a plain random walk again. One roll per trade is what makes a run
   * feel like it has a character — this one is tracking your drawing, that one
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
    const prices = resample(pts, sc, entry);
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
  }, [pts, sc, entry]);

  /** What the drawing is worth against the candles that have arrived. */
  const book = useMemo(
    () => (shape ? settle(run, shape.legs, shape.span) : null),
    [run, shape],
  );

  /** What the position is worth at a price. Never worse than the stake. */
  /**
   * The current trade, for the clock to read.
   *
   * Held in a ref so the interval below can be started once and left alone.
   * Listing `shape` or `run` as deps would tear the interval down and rebuild
   * it — restarting its countdown — on every single tick, and the candles
   * would never arrive a second apart.
   */
  const live = useRef({ phase, shape, run, feed });
  // After every commit, never during render: a ref written mid-render is torn
  // between the two halves of a concurrent pass.
  useEffect(() => {
    live.current = { phase, shape, run, feed };
  });

  /** Ease the price scale onto the candles, kept centred on the last price. */
  const rescale = useCallback((f: Candle[], r: Candle[]) => {
    const all = [...f, ...r];
    const at = all.at(-1)?.c ?? seedPrice;
    setBand((b) => easeBand(b, bandFor(all.slice(-HISTORY), at)));
  }, [seedPrice]);

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

      // Anything that is not a running trade keeps history scrolling — being
      // mid-drag included. A chart that freezes under the finger is the one
      // thing that gives away that it was never running.
      if (ph !== "running" || !sh) {
        const nextFeed = [
          ...fd.slice(1),
          nextCandle(fd.at(-1)?.c ?? seedPrice, vol),
        ];
        setFeed(nextFeed);
        rescale(nextFeed, []);
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
      rescale(fd, next);

      // The drawing sets no stop and no target, so only two things end a
      // trade: the venue liquidating a leg, or the bars running out.
      const finish = (net: number) => {
        setResult({ won: net >= 0, pnl: net });
        setFeed((f) => [...f, ...next].slice(-HISTORY));
        setRun([]);
        setPts([]);
        setPhase("live");
      };

      const bk = settle(next, sh.legs, sh.span);
      if (bk.liquidated) {
        finish(-MARGIN);
      } else if (next.length >= RUN_BARS) {
        finish(bk.net);
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
  const push = useCallback((p: Pt) => {
    const x = Math.min(PLOT_R, Math.max(SPLIT, p.x));
    const yy = Math.min(PLOT_B, Math.max(PLOT_T, p.y));
    if (x - lastX.current < 5) {
      return;
    }
    lastX.current = x;
    kept.current += 1;
    setPts((prev) => [...prev, { x, y: yy }]);
  }, []);

  const onDown = (e: ReactPointerEvent) => {
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
    setPts([{ x: SPLIT, y: sc.y(at) }]);
    push(p);
  };

  const onMove = (e: ReactPointerEvent) => {
    if (!active.current) {
      return;
    }
    const p = toLocal(e);
    if (p) {
      push(p);
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
      setNote("Too flat to trade — draw a bigger move.");
      return;
    }
    setPhase("running");
  };

  /**
   * What the card shows: a live trade, the last result, or nothing at all.
   *
   * A result outlives its trade on purpose — the run has already been folded
   * into history by the time it is set, and a number that vanished the instant
   * it resolved would be a number nobody read.
   */
  const stats =
    shape && phase === "running"
      ? ({
          kind: "open" as const,
          now: book?.net ?? 0,
          side: book?.pos ? (book.pos.d > 0 ? "long" : "short") : "flat",
        })
      : result
        ? ({ kind: "settled" as const, ...result })
        : note
          ? ({ kind: "note" as const, note })
          : null;

  const drawing = phase === "drawing";
  const hasLine = phase !== "live" && shape;
  const runWidth = (PLOT_R - SPLIT) / RUN_BARS;

  return (
    <div className={cn("flex flex-col gap-3 p-3 md:gap-4 md:p-4", className)}>
      <div className="flex items-center justify-between px-2 pt-1">
        <div className="flex items-baseline gap-2.5">
          <span className="rounded-full bg-surface-3 px-3 py-1 font-medium text-foreground text-sm">
            Bitcoin
          </span>
          <span className="font-mono text-foreground text-sm tabular-nums">
            ${fmtUsd(price)}
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="rounded-full bg-surface-2 px-2.5 py-1 font-mono text-fg-muted text-xs tabular-nums">
            ${MARGIN} · {LEVERAGE}×
          </span>
          {/* Honest label. These candles are a random walk, and a page that
              prints "live" over one is lying about market data. */}
          <span className="flex items-center gap-1.5 text-fg-subtle text-xs">
            <span className="dc-live size-1.5 rounded-full bg-[var(--up)]" />
            practice
          </span>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl bg-background/60 shadow-[inset_0_0_0_1px_var(--edge)]">
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

          {/* history */}
          {feed.map((c, i) => {
            const cx = PLOT_L + i * sc.step + sc.step / 2;
            const up = c.c >= c.o;
            const top = sc.y(Math.max(c.o, c.c));
            const bottom = sc.y(Math.min(c.o, c.c));
            return (
              <g
                fill={up ? "var(--up)" : "var(--down)"}
                // biome-ignore lint/suspicious/noArrayIndexKey: rolling window
                key={i}
                opacity={hasLine ? "0.4" : "0.7"}
                stroke={up ? "var(--up)" : "var(--down)"}
              >
                <line
                  strokeWidth="0.9"
                  x1={cx}
                  x2={cx}
                  y1={sc.y(c.h)}
                  y2={sc.y(c.l)}
                />
                <rect
                  height={Math.max(1, bottom - top)}
                  width={sc.body}
                  x={cx - sc.body / 2}
                  y={top}
                />
              </g>
            );
          })}

          {/* what the market is actually doing about it */}
          {run.map((c, i) => {
            const cx = SPLIT + i * runWidth + runWidth / 2;
            const up = c.c >= c.o;
            const top = sc.y(Math.max(c.o, c.c));
            const bottom = sc.y(Math.min(c.o, c.c));
            const bw = Math.max(2.4, runWidth * 0.58);
            return (
              <g
                fill={up ? "var(--up)" : "var(--down)"}
                // biome-ignore lint/suspicious/noArrayIndexKey: append-only
                key={i}
                stroke={up ? "var(--up)" : "var(--down)"}
              >
                <line
                  strokeWidth="0.9"
                  x1={cx}
                  x2={cx}
                  y1={sc.y(c.h)}
                  y2={sc.y(c.l)}
                />
                <rect
                  height={Math.max(1, bottom - top)}
                  width={bw}
                  x={cx - bw / 2}
                  y={top}
                />
              </g>
            );
          })}

          {/* the line */}
          {pts.length > 1 ? (
            <g>
              <path
                d={smoothPath(pts)}
                fill="none"
                stroke="var(--brand)"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.4"
              />
              {drawing ? null : (
                <g>
                  <circle
                    cx={pts[pts.length - 1].x}
                    cy={pts[pts.length - 1].y}
                    fill="var(--brand)"
                    filter="url(#dc-head)"
                    r="7"
                  />
                  <circle
                    cx={pts[pts.length - 1].x}
                    cy={pts[pts.length - 1].y}
                    fill="#fff"
                    r="3.4"
                  />
                </g>
              )}
            </g>
          ) : null}

          {/* the invitation */}
          {phase === "live" ? (
            <g pointerEvents="none">
              {/* Marked out, so the empty half reads as the part you are meant
                  to touch rather than as a chart that failed to load. */}
              <rect
                className="dc-zone"
                fill="none"
                height={PLOT_B - PLOT_T - 12}
                rx="14"
                stroke="var(--brand)"
                strokeDasharray="7 7"
                strokeWidth="1.5"
                width={PLOT_R - SPLIT - 12}
                x={SPLIT + 6}
                y={PLOT_T + 6}
              />
              <g className="dc-hint">
                <path
                  d={hintPath(price, sc)}
                  fill="none"
                  stroke="var(--brand)"
                  strokeDasharray="4 7"
                  strokeLinecap="round"
                  strokeOpacity="0.32"
                  strokeWidth="2"
                />
                <circle cx={SPLIT} cy={sc.y(price)} fill="var(--brand)" r="4" />
              </g>
              <g className="dc-call">
                {/* A plate, the same trick the price labels use. The entry line
                    and the hint both run through here and 10px type on top of
                    either is unreadable. */}
                <rect
                  fill="var(--surface)"
                  height="44"
                  rx="10"
                  width="188"
                  x={(SPLIT + PLOT_R) / 2 - 94}
                  y={PLOT_T + 26}
                />
                <text
                  fill="var(--brand)"
                  fontSize="15"
                  fontWeight="600"
                  letterSpacing="2.5"
                  style={{ fontFamily: "var(--font-sans)" }}
                  textAnchor="middle"
                  x={(SPLIT + PLOT_R) / 2 + 1}
                  y={PLOT_T + 44}
                >
                  DRAW HERE
                </text>
                <text
                  fill="var(--fg-subtle)"
                  fontSize="10.5"
                  style={{ fontFamily: "var(--font-sans)" }}
                  textAnchor="middle"
                  x={(SPLIT + PLOT_R) / 2}
                  y={PLOT_T + 61}
                >
                  drag where you think it goes
                </text>
              </g>
            </g>
          ) : null}
        </svg>

        {/*
          The numbers, on the chart rather than under it.
          
          A panel below the canvas meant the figure you are watching and the
          candles that move it were never in one glance. Up here they are, and
          the card gets out of the way when there is nothing to say.
          
          `pointer-events-none` throughout: this sits over the top-right of the
          drawing surface, and it must never eat a drag that starts under it.
        */}
        {stats ? (
          <div
            aria-live="polite"
            className="glass pointer-events-none absolute top-3 right-3 min-w-[9.5rem] rounded-xl px-3.5 py-3"
          >
            {stats.kind === "note" ? (
              <span className="text-fg-muted text-xs">{stats.note}</span>
            ) : stats.kind === "open" ? (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-5">
                  <span className="text-fg-subtle text-xs">Right now</span>
                  <span
                    className={cn(
                      "font-mono text-base tabular-nums",
                      stats.now >= 0
                        ? "text-[var(--up)]"
                        : "text-[var(--down)]",
                    )}
                  >
                    {stats.now >= 0 ? "+" : "−"}${fmtUsd(Math.abs(stats.now))}
                  </span>
                </div>
                {/* Which order the drawing has open right now. */}
                <span className="text-fg-subtle text-[0.6875rem]">
                  {stats.side === "flat"
                    ? "between legs"
                    : `${stats.side} · $${NOTIONAL} of BTC`}
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <span className="text-fg-subtle text-xs">
                  {stats.won ? "Called it" : "Went the other way"}
                </span>
                <span
                  className={cn(
                    "font-mono text-lg tabular-nums",
                    stats.won ? "text-[var(--up)]" : "text-[var(--down)]",
                  )}
                >
                  {stats.won ? "+" : "−"}${fmtUsd(Math.abs(stats.pnl))}
                </span>
                <span className="text-fg-subtle text-[0.6875rem]">
                  draw again any time
                </span>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
