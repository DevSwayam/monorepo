import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { GlowDot } from "./glow-dot";
import { CANDLES, DERIVED, fmtUsd, ORDER } from "./market-data";
import { Band, Kicker, SectionHead } from "./ui";

/**
 * §5, four steps as a bento with an actual hierarchy.
 *
 * The earlier version was four cells of near-equal weight in a 2+1 / 1+2 grid,
 * which is a row of panels wearing a bento's clothes. This one has a dominant
 * cell: Draw takes two columns and both rows, because drawing is the product
 * and the other three are what the exchange does afterwards.
 *
 * Shape is matched to content rather than assigned: the big square holds a
 * canvas, the small square holds a control, the tall-ish square holds a short
 * stack of figures, the wide one holds a scale that needs horizontal room.
 */
function Cell({
  n,
  title,
  caption,
  note,
  children,
  className,
  ruled = false,
}: {
  n: string;
  title: string;
  caption: string;
  note: string;
  children: ReactNode;
  className?: string;
  /** Lay chart ruling behind the cell. Only the canvas cell wants it. */
  ruled?: boolean;
}) {
  return (
    <div
      className={cn(
        "group relative flex flex-col border-border px-5 py-8 transition-colors duration-500 ease-out hover:bg-surface md:px-8",
        className,
      )}
    >
      {ruled ? (
        // Square ruling, matching the grid inside the hero's chart, masked so
        // it dissolves rather than ending on a hard line at the cell edges.
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-grid"
          style={{
            maskImage:
              "radial-gradient(ellipse 78% 72% at 50% 58%, #000 35%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 78% 72% at 50% 58%, #000 35%, transparent 100%)",
          }}
        />
      ) : null}
      <div className="relative flex items-baseline gap-3">
        <span className="font-mono text-fg-subtle text-xs tabular-nums">
          {n}
        </span>
        <h3 className="text-foreground text-title">{title}</h3>
      </div>
      <p className="relative mt-3 max-w-[46ch] text-fg-muted text-sm leading-[1.7]">
        {caption}
      </p>

      <div className="relative mt-8 flex min-h-0 flex-1 flex-col justify-center">
        {children}
      </div>

      <p className="relative mt-7 font-mono text-fg-subtle text-xs transition-colors duration-500 ease-out group-hover:text-brand">
        {note}
      </p>
    </div>
  );
}

const SPAN = ORDER.target - ORDER.invalidation;
const ENTRY_PCT = ((ORDER.entry - ORDER.invalidation) / SPAN) * 100;

// The canvas in the hero cell, in its own coordinate space.
const CW = 720;
const CH = 360;
const HISTORY = CANDLES.slice(-34);
const lo = Math.min(...HISTORY.map((c) => c.l)) - 400;
const hi = ORDER.target + 600;
const cy = (p: number) => ((hi - p) / (hi - lo)) * (CH - 40) + 20;
const cstep = (CW * 0.44) / HISTORY.length;

export function HowItWorks() {
  return (
    <Band id="how-it-works">
      <SectionHead id="how-title" kicker="How it works">
        Four steps, and you only do the first one.
      </SectionHead>

      <div className="grid lg:grid-cols-4">
        {/* 01, the hero cell: two columns, both rows */}
        <Cell
          caption="Drag a line across the chart, roughly where you think price is going. That is the whole interaction."
          className="border-b md:col-span-2 lg:row-span-2 lg:border-r lg:border-b-0"
          n="01"
          note="one gesture, no ticket"
          ruled
          title="Draw"
        >
          <div className="relative">
            <svg
              aria-hidden="true"
              className="h-full w-full"
              fill="none"
              preserveAspectRatio="none"
              viewBox={`0 0 ${CW} ${CH}`}
            >
              <title>A line drawn forward from the last candle</title>
              {[ORDER.target, ORDER.entry, ORDER.invalidation].map((p, i) => (
                <line
                  key={p}
                  stroke={i === 0 ? "var(--brand)" : "var(--border)"}
                  strokeDasharray={i === 1 ? undefined : "4 6"}
                  strokeOpacity={i === 0 ? 0.4 : 1}
                  x1="0"
                  x2={CW}
                  y1={cy(p)}
                  y2={cy(p)}
                />
              ))}
              {HISTORY.map((c, i) => {
                const x = 16 + i * cstep;
                const top = cy(Math.max(c.o, c.c));
                const bottom = cy(Math.min(c.o, c.c));
                const colour = c.c >= c.o ? "var(--up)" : "var(--down)";
                return (
                  <g key={i} opacity="0.7">
                    <line
                      stroke={colour}
                      strokeWidth="1"
                      x1={x + cstep / 2}
                      x2={x + cstep / 2}
                      y1={cy(c.h)}
                      y2={cy(c.l)}
                    />
                    <rect
                      fill={colour}
                      height={Math.max(1.5, bottom - top)}
                      width={cstep * 0.58}
                      x={x + cstep * 0.21}
                      y={top}
                    />
                  </g>
                );
              })}
              <path
                className="hero-stroke"
                d={`M ${16 + HISTORY.length * cstep} ${cy(ORDER.entry)}
                    C ${CW * 0.56} ${cy(64_900)}, ${CW * 0.6} ${cy(63_400)}, ${CW * 0.68} ${cy(63_900)}
                    S ${CW * 0.82} ${cy(66_100)}, ${CW * 0.88} ${cy(65_700)}
                    S ${CW - 30} ${cy(67_100)}, ${CW - 14} ${cy(ORDER.target)}`}
                pathLength={1}
                stroke="var(--brand)"
                strokeLinecap="round"
                strokeWidth="3"
              />
            </svg>
            <GlowDot
              left={((CW - 14) / CW) * 100}
              top={(cy(ORDER.target) / CH) * 100}
            />
            {/* Labels the target level from the left. On the right it sat on
                top of the lit head, which is the one thing in the cell that
                should not be covered. */}
            <span
              className="-translate-y-1/2 absolute left-0 bg-brand px-1.5 py-0.5 font-mono text-[0.6875rem] text-[color:var(--brand-foreground)] tabular-nums"
              style={{ top: `${(cy(ORDER.target) / CH) * 100}%` }}
            >
              {fmtUsd(ORDER.target)}
            </span>
          </div>
        </Cell>

        {/* 02, a control */}
        <Cell
          caption="Say how much you want on."
          className="border-b md:border-r lg:col-start-3 lg:row-start-1"
          n="02"
          note="leverage 5×"
          title="Size"
        >
          <div className="space-y-5">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-fg-subtle text-sm">Size</span>
              <span className="font-mono text-foreground text-sm tabular-nums">
                {ORDER.size} BTC
              </span>
            </div>
            <div className="flex h-2 gap-px">
              {Array.from({ length: 20 }, (_, i) => (
                <span
                  className={cn(
                    "flex-1 transition-colors duration-500 ease-out",
                    i < 9 ? "bg-brand" : "bg-surface-2 group-hover:bg-brand/25",
                  )}
                  key={i}
                />
              ))}
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-fg-subtle text-sm">Liquidation</span>
              <span className="font-mono text-foreground text-sm tabular-nums">
                {fmtUsd(ORDER.liquidation, 2)}
              </span>
            </div>
          </div>
        </Cell>

        {/* 03, a receipt */}
        <Cell
          caption="Filled against your line inside one block."
          className="border-b lg:col-start-4 lg:row-start-1"
          n="03"
          note="the price you drew"
          title="Open"
        >
          <div>
            <Kicker>You drew</Kicker>
            <p className="mt-2 font-mono text-foreground text-xl tabular-nums">
              {fmtUsd(ORDER.entry, 2)}
            </p>
            <div className="mt-5">
              <Kicker>You got</Kicker>
              <p className="mt-2 font-mono text-brand text-xl tabular-nums">
                {fmtUsd(ORDER.entry, 2)}
              </p>
            </div>
          </div>
        </Cell>

        {/* 04, a scale that wants width */}
        <Cell
          caption="Out at your target, or your invalidation. Changed your mind halfway? Draw over it."
          className="md:col-span-2 lg:col-start-3 lg:row-start-2"
          n="04"
          note="risk 1, reward 2.5"
          title="Close"
        >
          <div>
            <div className="relative h-2">
              <div
                className="absolute inset-y-0 left-0 bg-fg-subtle/60"
                style={{ width: `${ENTRY_PCT}%` }}
              />
              <div
                className="absolute inset-y-0 right-0 bg-brand"
                style={{ width: `${100 - ENTRY_PCT}%` }}
              />
              <span
                className="-translate-x-1/2 -top-1.5 absolute h-5 w-0.5 bg-foreground"
                style={{ left: `${ENTRY_PCT}%` }}
              />
            </div>
            <div className="mt-4 grid grid-cols-3 font-mono text-xs tabular-nums">
              <span className="text-fg-subtle">
                {fmtUsd(ORDER.invalidation)}
              </span>
              <span className="text-center text-foreground">
                {fmtUsd(ORDER.entry)}
              </span>
              <span className="text-right text-brand">
                {fmtUsd(ORDER.target)}
              </span>
              <span className="mt-2 text-fg-subtle">
                −${fmtUsd(DERIVED.risk)}
              </span>
              <span className="mt-2 text-center text-fg-subtle">
                {DERIVED.rr.toFixed(1)}R
              </span>
              <span className="mt-2 text-right text-brand">
                +${fmtUsd(DERIVED.reward)}
              </span>
            </div>
          </div>
        </Cell>
      </div>
    </Band>
  );
}
