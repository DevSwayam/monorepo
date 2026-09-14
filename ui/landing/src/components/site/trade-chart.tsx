import {
  CANDLES,
  DRAWN_PATH,
  fmtUsd,
  ORDER,
  smoothPath,
} from "./market-data";

const W = 760;
const H = 330;
const PLOT_L = 14;
const PLOT_R = 676;
const PLOT_T = 18;
const PLOT_B = 292;
const SPLIT = 424; // where history ends and the drawing begins

const prices = [
  ...CANDLES.flatMap((c) => [c.h, c.l]),
  ...DRAWN_PATH.map((p) => p.price),
  ORDER.invalidation,
  ORDER.target,
];
const lo = Math.min(...prices);
const hi = Math.max(...prices);
const pad = (hi - lo) * 0.08;
const y = (p: number) =>
  PLOT_T + ((hi + pad - p) / (hi - lo + pad * 2)) * (PLOT_B - PLOT_T);

const step = (SPLIT - PLOT_L) / CANDLES.length;
const body = Math.max(2.6, step * 0.6);

const pts = DRAWN_PATH.map((p) => ({
  x: SPLIT + p.t * (PLOT_R - SPLIT),
  y: y(p.price),
}));
const drawn = smoothPath(pts);

const LEVELS = [
  { price: ORDER.target, label: "Target", accent: true },
  { price: ORDER.entry, label: "Entry", accent: false },
  { price: ORDER.invalidation, label: "Invalidation", accent: false },
];

/**
 * The chart, drawn as real geometry rather than shipped as a picture.
 *
 * Candles come from a seeded series (market-data.ts) so it is stable between
 * server and client, and the drawn path animates with stroke-dashoffset, the
 * whole pitch in one object: history on the left, a hand-drawn intention on the
 * right, and the price levels that intention implies read off the axis.
 */
export function TradeChart({ className }: { className?: string }) {
  return (
    <svg
      aria-label="A price chart with a path drawn forward from the last candle, marking entry, target and invalidation"
      className={className}
      role="img"
      viewBox={`0 0 ${W} ${H}`}
    >
      <defs>
        <pattern height="14" id="tc-dots" patternUnits="userSpaceOnUse" width="14">
          <path
            d="M14 0 H0 V14"
            fill="none"
            stroke="var(--grid-line)"
            strokeWidth="1"
          />
        </pattern>
        <linearGradient id="tc-dotfade" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0.45" stopColor="#000" />
          <stop offset="0.62" stopColor="#fff" />
        </linearGradient>
        <mask id="tc-dotmask">
          <rect fill="url(#tc-dotfade)" height={H} width={W} />
        </mask>
        <filter height="500%" id="tc-head" width="500%" x="-200%" y="-200%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>

      {/* forecast side reads as unwritten space */}
      <rect fill="url(#tc-dots)" height={H} mask="url(#tc-dotmask)" width={W} />

      {/* price levels */}
      {LEVELS.map((lvl) => (
        <g key={lvl.label}>
          <line
            stroke={lvl.accent ? "var(--brand)" : "var(--fg-subtle)"}
            strokeDasharray={lvl.label === "Entry" ? undefined : "3 4"}
            strokeOpacity={lvl.accent ? 0.5 : 0.3}
            x1={PLOT_L}
            x2={PLOT_R}
            y1={y(lvl.price)}
            y2={y(lvl.price)}
          />
          <text
            fill={lvl.accent ? "var(--brand)" : "var(--fg-subtle)"}
            fontSize="10"
            style={{ fontFamily: "var(--font-mono)" }}
            x={PLOT_R + 8}
            y={y(lvl.price) + 3.5}
          >
            {fmtUsd(lvl.price)}
          </text>
          <text
            fill="var(--fg-subtle)"
            fontSize="8.5"
            style={{ fontFamily: "var(--font-sans)" }}
            x={PLOT_L + 2}
            y={y(lvl.price) - 5}
          >
            {lvl.label}
          </text>
        </g>
      ))}

      {/* candles */}
      {CANDLES.map((c, i) => {
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

      {/* the drawing */}
      <path
        className="hero-stroke"
        d={drawn}
        fill="none"
        pathLength={1}
        stroke="var(--brand)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
      <g className="hero-stroke-head">
        <circle
          cx={pts[pts.length - 1].x}
          cy={pts[pts.length - 1].y}
          fill="var(--brand)"
          filter="url(#tc-head)"
          r="7"
        />
        <circle
          cx={pts[pts.length - 1].x}
          cy={pts[pts.length - 1].y}
          fill="#fff"
          r="3.4"
        />
      </g>
    </svg>
  );
}
