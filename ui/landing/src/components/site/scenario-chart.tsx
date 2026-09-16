"use client";

import { memo } from "react";
import { Candles, spacing } from "./chart";
import {
  type Candle,
  CANDLES,
  DRAWN_PATH,
  FORECAST_BARS,
  fmtUsd,
  ORDER,
  pnlAt,
  SCENARIOS,
  type Scenario,
  smoothPath,
} from "./market-data";

const W = 760;
const H = 360;
const PLOT_L = 16;
const PLOT_R = 626; // the gutter to its right holds the price tags
const PLOT_T = 44;
const PLOT_B = 340;
const SPLIT = 312; // last candle, and where the forecast starts

const HISTORY = CANDLES.slice(-30);

/**
 * One price scale for all three scenarios.
 *
 * Scaling each to its own range would put the entry line at a different height
 * every time the panel switches, and the whole point of switching is that you
 * are comparing the same trade.
 */
const prices = [
  ...HISTORY.flatMap((c) => [c.h, c.l]),
  ...DRAWN_PATH.map((p) => p.price),
  ...SCENARIOS.flatMap((s) => s.bars.flatMap((b) => [b.h, b.l])),
  ORDER.target,
  ORDER.invalidation,
];
const lo = Math.min(...prices);
const hi = Math.max(...prices);
const pad = (hi - lo) * 0.035;
const y = (p: number) =>
  PLOT_T + ((hi + pad - p) / (hi - lo + pad * 2)) * (PLOT_B - PLOT_T);

const hstep = (SPLIT - PLOT_L) / HISTORY.length;
const hbody = Math.max(2.6, hstep * 0.6);
const fstep = (PLOT_R - SPLIT) / FORECAST_BARS;
const fbody = Math.max(3, fstep * 0.6);

const DRAWN_D = smoothPath(
  DRAWN_PATH.map((p) => ({
    x: SPLIT + p.t * (PLOT_R - SPLIT),
    y: y(p.price),
  })),
);

const ENTRY_Y = y(ORDER.entry);
const stopAt = (price: number) => (y(price) - PLOT_T) / (PLOT_B - PLOT_T);
/**
 * The wash reaches full strength at the two prices that end the trade, not at
 * the edges of the plot. Ramping to the plot edge instead leaves the losing
 * side washed out, because the invalidation is a third as far from the entry
 * as the bottom of the chart is.
 */
const TARGET_STOP = stopAt(ORDER.target);
const ENTRY_STOP = stopAt(ORDER.entry);
const INVAL_STOP = stopAt(ORDER.invalidation);

const LEVELS = [
  { price: ORDER.target, label: "Aiming for", accent: true },
  { price: ORDER.entry, label: "You're in at", accent: false },
  { price: ORDER.invalidation, label: "You're out at", accent: false },
];

/** Percentages, because the labels are HTML sitting on top of the viewBox. */
const at = (x: number, yy: number) => ({
  left: `${(x / W) * 100}%`,
  top: `${(yy / H) * 100}%`,
});

/** Price after this many candles of the forecast. */
export function markAt(scenario: Scenario, step: number) {
  return step > 0 ? scenario.bars[step - 1].c : ORDER.entry;
}

/** The filled region between the price so far and the entry level. */
function pnlArea(bars: Candle[]) {
  if (bars.length === 0) return "";
  const pts = bars.map((b, i) => ({ x: SPLIT + (i + 1) * fstep, y: y(b.c) }));
  const endX = pts[pts.length - 1].x;
  return `M ${SPLIT} ${ENTRY_Y} ${pts
    .map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ")} L ${endX.toFixed(1)} ${ENTRY_Y} Z`;
}

/**
 * The hero's chart, running.
 *
 * Candles arrive one at a time and the region between price and the entry
 * fills green above it or red below, so the figure in the rail and the shape
 * on the chart are the same fact told twice. Nothing else moves: the line you
 * drew is already there, which is the whole idea.
 *
 * Memoised because the carousel mounts all three scenarios so their edges can
 * be seen, and the running one calls `setStep` on every frame. Without this,
 * one animating chart would redraw the two parked ones sixty times a second to
 * produce exactly the picture they already had.
 */
export const ScenarioChart = memo(function ScenarioChart({
  scenario,
  step,
}: {
  scenario: Scenario;
  /** Candles revealed so far, 0 to FORECAST_BARS. The panel owns the clock. */
  step: number;
}) {
  const uid = scenario.key;
  const bars = scenario.bars.slice(0, step);
  const mark = markAt(scenario, step);
  const done = step >= FORECAST_BARS;
  const headX = SPLIT + step * fstep;
  const headY = y(mark);
  const drift = mark - ORDER.entry;
  const headTone =
    Math.abs(drift) < 40
      ? "var(--fg-subtle)"
      : drift > 0
        ? "var(--up)"
        : "var(--down)";

  return (
    <div className="relative">
      <svg
        aria-label={`BTC, long from ${fmtUsd(ORDER.entry)}. ${scenario.title}: price ${
          done ? `ends at ${fmtUsd(scenario.exit)}` : `is at ${fmtUsd(mark)}`
        }, for ${pnlAt(mark) >= 0 ? "a profit" : "a loss"} of ${fmtUsd(
          Math.abs(pnlAt(mark)),
        )} dollars.`}
        className="h-auto w-full"
        role="img"
        viewBox={`0 0 ${W} ${H}`}
      >
        <defs>
          <pattern
            height="14"
            id={`grid-${uid}`}
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
          <linearGradient id={`gridfade-${uid}`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#000" />
            <stop offset="0.16" stopColor="#fff" />
          </linearGradient>
          <mask id={`gridmask-${uid}`}>
            <rect
              fill={`url(#gridfade-${uid})`}
              height={PLOT_B - PLOT_T}
              width={PLOT_R - SPLIT}
              x={SPLIT}
              y={PLOT_T}
            />
          </mask>
          {/* Two stops at the same offset, so the wash flips colour exactly on
              the entry line instead of blending through it. */}
          <linearGradient
            gradientUnits="userSpaceOnUse"
            id={`pnl-${uid}`}
            x1="0"
            x2="0"
            y1={PLOT_T}
            y2={PLOT_B}
          >
            <stop offset="0" stopColor="var(--up)" stopOpacity="0.32" />
            <stop
              offset={TARGET_STOP}
              stopColor="var(--up)"
              stopOpacity="0.32"
            />
            <stop
              offset={ENTRY_STOP}
              stopColor="var(--up)"
              stopOpacity="0.04"
            />
            <stop
              offset={ENTRY_STOP}
              stopColor="var(--down)"
              stopOpacity="0.04"
            />
            <stop
              offset={INVAL_STOP}
              stopColor="var(--down)"
              stopOpacity="0.32"
            />
            <stop offset="1" stopColor="var(--down)" stopOpacity="0.32" />
          </linearGradient>
          <filter
            height="500%"
            id={`head-${uid}`}
            width="500%"
            x="-200%"
            y="-200%"
          >
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        {/* the part that has not happened yet */}
        <rect
          fill={`url(#grid-${uid})`}
          height={PLOT_B - PLOT_T}
          mask={`url(#gridmask-${uid})`}
          width={PLOT_R - SPLIT}
          x={SPLIT}
          y={PLOT_T}
        />

        {bars.length > 0 ? (
          <path d={pnlArea(bars)} fill={`url(#pnl-${uid})`} />
        ) : null}

        {LEVELS.map((lvl) => (
          <line
            key={lvl.label}
            stroke={lvl.accent ? "var(--brand)" : "var(--fg-subtle)"}
            strokeDasharray={lvl.label === "Entry" ? undefined : "3 4"}
            strokeOpacity={lvl.accent ? 0.5 : 0.3}
            x1={PLOT_L}
            x2={PLOT_R}
            y1={y(lvl.price)}
            y2={y(lvl.price)}
          />
        ))}

        {/* what already happened */}
        <Candles
          bars={HISTORY}
          body={hbody}
          opacity="0.55"
          x={spacing(PLOT_L, hstep)}
          y={y}
        />

        {/* the line you drew */}
        <path
          d={DRAWN_D}
          fill="none"
          stroke="var(--brand)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.6"
        />

        {/* what is happening, one candle at a time */}
        <Candles
          bars={bars}
          body={fbody}
          minBody={1.2}
          wick={1}
          x={spacing(SPLIT, fstep)}
          y={y}
        />

        {step > 0 ? (
          <>
            <circle
              cx={headX}
              cy={headY}
              fill={headTone}
              filter={`url(#head-${uid})`}
              r="7"
            />
            <circle cx={headX} cy={headY} fill="#fff" r="3.2" />
          </>
        ) : null}
      </svg>

      {/* Labels are HTML over the viewBox: SVG text scales with the chart, so
          a 12px label lands at about 6px once the page is 390 wide. */}
      {LEVELS.map((lvl) => (
        <div key={lvl.label}>
          <span
            className="-translate-y-full pointer-events-none absolute pb-1 pl-0.5 text-fg-subtle text-xs"
            style={at(PLOT_L, y(lvl.price))}
          >
            {lvl.label}
          </span>
          <span
            className={`-translate-y-1/2 pointer-events-none absolute figures pl-3 text-xs ${
              lvl.accent ? "text-brand" : "text-fg-subtle"
            }`}
            style={at(PLOT_R, y(lvl.price))}
          >
            {fmtUsd(lvl.price)}
          </span>
        </div>
      ))}
    </div>
  );
});
