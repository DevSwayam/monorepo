import {
  BREAK_PATH,
  CANDLES,
  DERIVED,
  DRAWN_PATH,
  fmtUsd,
  ORDER,
  smoothPath,
} from "./market-data";
import { Band, Kicker, SectionHead } from "./ui";

const W = 760;
const H = 348;
const PLOT_L = 16;
const PLOT_R = 626; // the gutter to its right holds the price tags
const PLOT_T = 48;
const PLOT_B = 330;
const SPLIT = 312; // last candle, and where both endings start

const HISTORY = CANDLES.slice(-30);

const prices = [
  ...HISTORY.flatMap((c) => [c.h, c.l]),
  ...DRAWN_PATH.map((p) => p.price),
  ...BREAK_PATH.map((p) => p.price),
];
const lo = Math.min(...prices);
const hi = Math.max(...prices);
const pad = (hi - lo) * 0.035;
const y = (p: number) =>
  PLOT_T + ((hi + pad - p) / (hi - lo + pad * 2)) * (PLOT_B - PLOT_T);

const step = (SPLIT - PLOT_L) / HISTORY.length;
const body = Math.max(2.6, step * 0.6);

const project = (path: { t: number; price: number }[]) =>
  path.map((p) => ({ x: SPLIT + p.t * (PLOT_R - SPLIT), y: y(p.price) }));
const runPts = project(DRAWN_PATH);
const breakPts = project(BREAK_PATH);
const runEnd = runPts[runPts.length - 1];
const breakEnd = breakPts[breakPts.length - 1];

/** Percentages, because the labels are HTML sitting on top of the viewBox. */
const at = (x: number, yy: number) => ({
  left: `${(x / W) * 100}%`,
  top: `${(yy / H) * 100}%`,
});

const LEVELS = [
  { price: ORDER.target, label: "Target", accent: true },
  { price: ORDER.entry, label: "Entry", accent: false },
  { price: ORDER.invalidation, label: "Invalidation", accent: false },
];

/**
 * §6, the same skech played out twice.
 *
 * Both endings are drawn in the pen's blue, because both of them are still
 * only marks on a chart: nothing has happened past the last candle. The solid
 * one is the line the trader drew, the dashed one is the market ignoring it.
 * Only the two money figures are green and red, which is the one place the
 * reader needs to know instantly which side they are looking at.
 *
 * Every label is HTML positioned in percentages over the viewBox rather than
 * an SVG <text>. SVG text scales with the chart, so a 12px label lands at
 * about 6px once the page is 390 wide, which is the width most people will
 * read this at. The overlay sits in its own unpadded wrapper, otherwise the
 * percentages are measured against the band's side padding and every label
 * drifts right of the thing it names.
 */
export function BothEndings() {
  return (
    <Band id="both-endings">
      <SectionHead
        id="both-endings-title"
        kicker="A worked example"
        lead="2.5 BTC at 5×, in at 64,180. The blue is the skech: the solid line is the one you drew, the dashed one is the market not caring. Past the last candle neither has happened yet, so both are still live."
      >
        Say you draw this one on BTC.
      </SectionHead>

      <div className="px-5 pt-10 pb-6 md:px-10 md:pt-14 md:pb-8">
        <div className="relative">
          <svg
            aria-label="A BTC price chart. From the last candle at 64,180 one blue line runs up to the target at 67,400 for a profit of 8,050 dollars, and a dashed blue line falls to the invalidation at 62,900 for a loss of 3,200 dollars."
            className="h-auto w-full"
            role="img"
            viewBox={`0 0 ${W} ${H}`}
          >
            <defs>
              <pattern
                height="14"
                id="be-grid"
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
              {/* The reward run is tinted, the risk run is not, the same way the
                  price ladder further up the page treats them. */}
              <linearGradient id="be-reward" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0" stopColor="var(--brand)" stopOpacity="0" />
                <stop offset="0.22" stopColor="var(--brand)" stopOpacity="0.07" />
                <stop offset="1" stopColor="var(--brand)" stopOpacity="0" />
              </linearGradient>
              {/* The grid stops at the last candle, but not on a hard edge:
                  that reads as a panel sitting on the chart. */}
              <linearGradient id="be-gridfade" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0" stopColor="#000" />
                <stop offset="0.16" stopColor="#fff" />
              </linearGradient>
              <mask id="be-gridmask">
                <rect
                  fill="url(#be-gridfade)"
                  height={PLOT_B - PLOT_T}
                  width={PLOT_R - SPLIT}
                  x={SPLIT}
                  y={PLOT_T}
                />
              </mask>
              <filter height="500%" id="be-head" width="500%" x="-200%" y="-200%">
                <feGaussianBlur stdDeviation="6" />
              </filter>
            </defs>

            {/* everything right of the last candle is unwritten */}
            <rect
              fill="url(#be-grid)"
              height={PLOT_B - PLOT_T}
              mask="url(#be-gridmask)"
              width={PLOT_R - SPLIT}
              x={SPLIT}
              y={PLOT_T}
            />
            <rect
              fill="url(#be-reward)"
              height={y(ORDER.entry) - y(ORDER.target)}
              width={PLOT_R - SPLIT}
              x={SPLIT}
              y={y(ORDER.target)}
            />

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

            {/* what actually happened, up to now */}
            {HISTORY.map((c, i) => {
              const cx = PLOT_L + i * step + step / 2;
              const up = c.c >= c.o;
              const top = y(Math.max(c.o, c.c));
              const bottom = y(Math.min(c.o, c.c));
              return (
                <g
                  fill={up ? "var(--up)" : "var(--down)"}
                  key={i}
                  opacity="0.75"
                  stroke={up ? "var(--up)" : "var(--down)"}
                >
                  <line
                    strokeWidth="0.9"
                    x1={cx}
                    x2={cx}
                    y1={y(c.h)}
                    y2={y(c.l)}
                  />
                  <rect
                    height={Math.max(1, bottom - top)}
                    width={body}
                    x={cx - body / 2}
                    y={top}
                  />
                </g>
              );
            })}

            {/* the ending you drew */}
            <path
              d={smoothPath(runPts)}
              fill="none"
              stroke="var(--brand)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.6"
            />
            <circle
              cx={runEnd.x}
              cy={runEnd.y}
              fill="var(--brand)"
              filter="url(#be-head)"
              r="7"
            />
            <circle cx={runEnd.x} cy={runEnd.y} fill="#fff" r="3.4" />

            {/* the other one */}
            <path
              d={smoothPath(breakPts)}
              fill="none"
              stroke="var(--brand)"
              strokeDasharray="6 7"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity="0.58"
              strokeWidth="2"
            />
            <circle
              cx={breakEnd.x}
              cy={breakEnd.y}
              fill="var(--bg)"
              r="3.6"
              stroke="var(--brand)"
              strokeOpacity="0.7"
              strokeWidth="1.6"
            />
          </svg>

          {/* Name at the left end of each level, price at the right. */}
          {LEVELS.map((lvl) => (
            <div key={lvl.label}>
              <span
                className="-translate-y-full pointer-events-none absolute pb-1 pl-0.5 text-fg-subtle text-xs"
                style={at(PLOT_L, y(lvl.price))}
              >
                {lvl.label}
              </span>
              <span
                className={`-translate-y-1/2 pointer-events-none absolute pl-3 font-mono text-xs tabular-nums ${
                  lvl.accent ? "text-brand" : "text-fg-subtle"
                }`}
                style={at(PLOT_R, y(lvl.price))}
              >
                {fmtUsd(lvl.price)}
              </span>
            </div>
          ))}

          {/* The two numbers the section exists for. Right-aligned to the end of
              each line, one line tall so they clear the plot edges at any width. */}
          <div
            className="-translate-x-full -translate-y-[150%] pointer-events-none absolute flex items-baseline gap-2 whitespace-nowrap pr-2"
            style={at(runEnd.x, runEnd.y)}
          >
            <span className="font-mono text-sm text-up tabular-nums">
              +${fmtUsd(DERIVED.reward)}
            </span>
            <span className="text-fg-subtle text-xs">if it runs</span>
          </div>
          <div
            className="-translate-x-full pointer-events-none absolute flex translate-y-[60%] items-baseline gap-2 whitespace-nowrap pr-2"
            style={at(breakEnd.x, breakEnd.y)}
          >
            <span className="font-mono text-down text-sm tabular-nums">
              −${fmtUsd(DERIVED.risk)}
            </span>
            <span className="text-fg-subtle text-xs">if it breaks</span>
          </div>
        </div>
      </div>

      <div className="grid border-border border-t md:grid-cols-2">
        <div className="border-border px-5 py-8 md:border-r md:px-10 md:py-10 max-md:border-b">
          <div className="flex items-center gap-3">
            <svg
              aria-hidden="true"
              className="shrink-0"
              fill="none"
              height="8"
              viewBox="0 0 28 8"
              width="28"
            >
              <path
                d="M1 7 L 27 1"
                stroke="var(--brand)"
                strokeLinecap="round"
                strokeWidth="2.6"
              />
            </svg>
            <h3 className="text-foreground text-title">It runs</h3>
          </div>
          <p className="mt-4 max-w-[46ch] text-fg-muted text-sm leading-[1.7]">
            Price gets to 67,400 and the position closes at the top of your
            line. That is ${fmtUsd(DERIVED.reward)} on $
            {fmtUsd(DERIVED.margin)} of margin, and it&rsquo;s{" "}
            {DERIVED.rr.toFixed(1)} times what being wrong costs you.
          </p>
          <div className="mt-7">
            <Kicker className="text-brand">Closed at target</Kicker>
            <p className="mt-2 font-mono text-up text-xl tabular-nums">
              +${fmtUsd(DERIVED.reward)}
            </p>
          </div>
        </div>

        <div className="px-5 py-8 md:px-10 md:py-10">
          <div className="flex items-center gap-3">
            <svg
              aria-hidden="true"
              className="shrink-0"
              fill="none"
              height="8"
              viewBox="0 0 28 8"
              width="28"
            >
              <path
                d="M1 1 L 27 7"
                stroke="var(--brand)"
                strokeDasharray="5 5"
                strokeLinecap="round"
                strokeOpacity="0.5"
                strokeWidth="2"
              />
            </svg>
            <h3 className="text-foreground text-title">It breaks</h3>
          </div>
          <p className="mt-4 max-w-[46ch] text-fg-muted text-sm leading-[1.7]">
            It goes the other way instead, trades through 62,900, and you&rsquo;re
            out for ${fmtUsd(DERIVED.risk)}. You agreed to that number when you
            drew the line, which is the point. Nobody has to call you.
          </p>
          <div className="mt-7">
            <Kicker>Closed at invalidation</Kicker>
            <p className="mt-2 font-mono text-down text-xl tabular-nums">
              −${fmtUsd(DERIVED.risk)}
            </p>
          </div>
        </div>
      </div>
    </Band>
  );
}
