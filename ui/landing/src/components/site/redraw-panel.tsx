"use client";

import { useInView, useReducedMotion } from "./motion";
import { Candles, RailRow, spacing } from "./chart";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  CANDLES,
  DRAG_MAX,
  DRAG_MIN,
  DRAG_TO,
  DRAWN_DOWN,
  fmtUsd,
  levelsFor,
  lineTo,
  ORDER,
  pnlAt,
  RISING_BARS,
  smoothPath,
  STAKE,
} from "./market-data";

const W = 760;
const H = 350;
const PLOT_L = 16;
const PLOT_R = 626; // the gutter to its right holds the price tags
const PLOT_T = 40;
const PLOT_B = 320;
const SPLIT = 300;

const HISTORY = CANDLES.slice(-24);

/**
 * Everything the plot has to be tall enough to hold.
 *
 * The drag bounds alone were not enough. They are where the tail can go, but
 * the deepest point of the line is its trough in the middle, and a shape whose
 * low sat under the lowest candle drew itself straight through the floor of
 * the plot. Taking both extreme shapes point by point covers every position
 * the handle can reach, since the line moves monotonically with its tail.
 */
const prices = [
  ...HISTORY.flatMap((c) => [c.h, c.l]),
  ...RISING_BARS.flatMap((c) => [c.h, c.l]),
  ...lineTo(DRAG_MIN),
  ...lineTo(DRAG_MAX),
];
const lo = Math.min(...prices);
const hi = Math.max(...prices);
const pad = (hi - lo) * 0.03;
const span = hi - lo + pad * 2;
const y = (p: number) => PLOT_T + ((hi + pad - p) / span) * (PLOT_B - PLOT_T);
/** y back to a price, for turning a pointer into a target. */
const priceAtY = (yy: number) =>
  hi + pad - ((yy - PLOT_T) / (PLOT_B - PLOT_T)) * span;

const hstep = (SPLIT - PLOT_L) / HISTORY.length;
const hbody = Math.max(2.6, hstep * 0.6);
const fstep = (PLOT_R - SPLIT) / RISING_BARS.length;
const fbody = Math.max(3, fstep * 0.6);

const xOf = (i: number) => SPLIT + (i / (DRAWN_DOWN.length - 1)) * (PLOT_R - SPLIT);
const ENTRY_Y = y(ORDER.entry);

const at = (x: number, yy: number) => ({
  left: `${(x / W) * 100}%`,
  top: `${(yy / H) * 100}%`,
});
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/**
 * The walkthrough, in milliseconds. It runs once when the section arrives.
 *
 * Candles and drag overlap, with the candles a beat ahead, because the thing
 * being shown is a hand chasing a market rather than two events in a row. Play
 * them one after the other and it reads as a slideshow.
 */
const T_REACH = 300;
const T_GRAB = 1000;
const T_BARS_0 = 1100;
const T_BARS_1 = 5800;
const T_PULL = 1300;
const T_LANDED = 6400;
const T_LET_GO = 6800;
const DEMO_MS = 8200;
const KEY_STEP = 100;

/**
 * The chase, as fractions of the distance from the drawn end up to DRAG_TO.
 *
 * A hand chasing a market does not travel in one smooth arc. It holds the old
 * view a beat too long, yanks up past the candles, loses its nerve and drops
 * most of the way back, then goes again, the swings shrinking each time until
 * it settles. Every waypoint is one of those decisions, and easing between
 * them puts a full stop and a reversal where a real hand has one.
 *
 * Values above 1 are overshoot and values below 0 stretch the line further
 * down than it was drawn. It opens with one of those: the first move of a hand
 * that still believes the line is right is to push it lower, and showing that
 * travel is worth the beat it costs, because stretching a drawdown deeper is
 * the thing a reader reaches for once the handle is theirs. The track ends on
 * exactly 1 so the walkthrough always lands on the price the rail is written
 * for.
 */
const CHASE = [
  { at: 0, to: 0 },
  { at: 0.08, to: -0.14 },
  { at: 0.16, to: 0.42 },
  { at: 0.25, to: 0.08 },
  { at: 0.35, to: 0.72 },
  { at: 0.44, to: 0.3 },
  { at: 0.54, to: 1.05 },
  { at: 0.63, to: 0.58 },
  { at: 0.72, to: 1.14 },
  { at: 0.8, to: 0.8 },
  { at: 0.88, to: 1.08 },
  { at: 0.94, to: 0.94 },
  { at: 1, to: 1 },
];

/** Where along the chase the hand is at progress `p`, 0 to 1. */
function chaseAt(p: number) {
  if (p <= 0) return CHASE[0].to;
  if (p >= 1) return CHASE[CHASE.length - 1].to;
  let i = 0;
  while (i < CHASE.length - 2 && p > CHASE[i + 1].at) {
    i++;
  }
  const from = CHASE[i];
  const to = CHASE[i + 1];
  return (
    from.to + (to.to - from.to) * ease((p - from.at) / (to.at - from.at))
  );
}
/** Drawn levels land on a round number, the way a chart tool snaps. */
const TICK = 10;
const snap = (v: number) => Math.round(v / TICK) * TICK;

/**
 * §7, the line is not a commitment, shown by moving it.
 *
 * The section used to be three finished versions on tabs, which explained the
 * idea and demonstrated nothing: a reader still had to be told that a line is
 * a thing you can grab. So there is one line here and a handle on the end of
 * it. The walkthrough drags it once, from a short that price is busy proving
 * wrong up to where price is actually going, and then stops and leaves the
 * handle live. Everything in the rail is read off the shape rather than
 * stored: drag the tail through the entry and the position turns around,
 * because that is what the start and end of a curve mean.
 */
export function RedrawPanel() {
  const [t, setT] = useState(0);
  const [held, setHeld] = useState<number | null>(null);
  const [taken, setTaken] = useState(false);
  const [grabbing, setGrabbing] = useState(false);
  const [replay, setReplay] = useState(0);
  // The walkthrough is a demonstration, not an idle animation. It used to be
  // tied to `inView` alone, so the cursor swept in and hauled the line up again
  // every single time the panel scrolled back onto the screen. Once is the
  // point; the Replay button is there for anyone who wants it twice.
  const played = useRef(false);

  const reduced = useReducedMotion();
  const [ref, inView] = useInView<HTMLDivElement>(0.3);
  const plot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!inView || reduced || taken || played.current) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const e = now - t0;
      setT(Math.min(e, DEMO_MS));
      if (e < DEMO_MS) {
        raf = requestAnimationFrame(tick);
      } else {
        // Only once it has actually finished. Marking it on the way in would
        // strand the line mid-pull for anyone who scrolled past halfway.
        played.current = true;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduced, taken, replay]);

  // --- where the line ends right now ---------------------------------------
  const from = DRAWN_DOWN[DRAWN_DOWN.length - 1];
  const travel = DRAG_TO - from;
  const pull = clamp01((t - T_PULL) / (T_LANDED - T_PULL));
  // A hand on a handle is never perfectly still. Two frequencies so it reads
  // as a tremor rather than a wave, and it decays to nothing by the landing so
  // the walkthrough still finishes exactly on DRAG_TO.
  const gripped = t >= T_GRAB && t < T_LET_GO;
  const tremor = gripped
    ? travel *
      0.005 *
      (1 - pull) *
      (Math.sin(t / 70) + 0.5 * Math.sin(t / 31))
    : 0;
  const demoEnd = Math.min(
    DRAG_MAX,
    Math.max(DRAG_MIN, from + travel * chaseAt(pull) + tremor),
  );
  const end = held ?? (reduced ? DRAG_TO : demoEnd);

  const shape = lineTo(end);
  const level = levelsFor(shape);
  // Quoted the way the canvas quotes it: a $100 stake trading like $500. A
  // line that never dips sets no floor, so the whole stake is at risk, the
  // same reason the canvas refuses to print "$0" there.
  const win = Math.abs(pnlAt(level.target));
  // A line that only ever goes one way from the entry sets no floor of its
  // own, so the entry is the floor. Worth naming: the plot has to stop drawing
  // a second level on top of the first one when that happens, and every line
  // drawn straight down, which is how this section opens and where the handle
  // goes if you stretch it, is one of them.
  const floorOnEntry =
    Math.abs(level.invalidation - ORDER.entry) / ORDER.entry < 0.002;
  const lose = floorOnEntry
    ? STAKE
    : Math.min(STAKE, Math.abs(pnlAt(level.invalidation)));
  const pts = shape.map((price, i) => ({ x: xOf(i), y: y(price) }));
  const handle = pts[pts.length - 1];

  const bars =
    reduced || taken
      ? RISING_BARS
      : RISING_BARS.slice(
          0,
          Math.round(
            clamp01((t - T_BARS_0) / (T_BARS_1 - T_BARS_0)) *
              RISING_BARS.length,
          ),
        );

  const demoGrab = !taken && !reduced && t >= T_GRAB && t < T_LET_GO;
  const showCursor = !taken && !reduced && t >= T_REACH && t < DEMO_MS;
  const reach = clamp01((t - T_REACH) / (T_GRAB - T_REACH));
  // Comes in from above and to the right. Approaching from below put the
  // arrow outside the viewBox whenever the line ended near the floor.
  const cursor = {
    x: handle.x + (1 - ease(reach)) * 74,
    y: handle.y - (1 - ease(reach)) * 96,
  };

  const setFromClientY = (clientY: number) => {
    const box = plot.current?.getBoundingClientRect();
    if (!box) return;
    const raw = priceAtY(((clientY - box.top) / box.height) * H);
    setHeld(snap(Math.min(DRAG_MAX, Math.max(DRAG_MIN, raw))));
  };

  const take = () => {
    if (!taken) {
      setTaken(true);
      setHeld(end);
    }
  };

  const nudge = (by: number) => {
    take();
    setHeld((v) =>
      Math.min(DRAG_MAX, Math.max(DRAG_MIN, (v ?? end) + by)),
    );
  };

  const caption = taken
    ? "Same money in, same trade. Only the two prices that end it moved."
    : t < T_PULL
      ? "This is the line you drew: down, from where you got in."
      : t < T_LET_GO
        ? "Price went the other way. Pull the line up and both numbers follow."
        : "Your turn. Drag the handle, or use the arrow keys.";

  return (
    <div ref={ref}>
      <div className="grid gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_18rem] md:p-4">
        <div className="overflow-hidden rounded-xl bg-background/60 px-3 py-5 shadow-[inset_0_0_0_1px_var(--edge)] md:px-5 md:py-7">
          <div className="relative" ref={plot}>
            <svg
              aria-hidden="true"
              className="h-auto w-full"
              viewBox={`0 0 ${W} ${H}`}
            >
              <defs>
                <pattern
                  height="14"
                  id="rd-grid"
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
                <linearGradient id="rd-fade" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0" stopColor="#000" />
                  <stop offset="0.16" stopColor="#fff" />
                </linearGradient>
                <mask id="rd-mask">
                  <rect
                    fill="url(#rd-fade)"
                    height={PLOT_B - PLOT_T}
                    width={PLOT_R - SPLIT}
                    x={SPLIT}
                    y={PLOT_T}
                  />
                </mask>
              </defs>

              <rect
                fill="url(#rd-grid)"
                height={PLOT_B - PLOT_T}
                mask="url(#rd-mask)"
                width={PLOT_R - SPLIT}
                x={SPLIT}
                y={PLOT_T}
              />

              <line
                stroke="var(--fg-subtle)"
                strokeOpacity="0.3"
                x1={PLOT_L}
                x2={PLOT_R}
                y1={ENTRY_Y}
                y2={ENTRY_Y}
              />
              <line
                stroke="var(--brand)"
                strokeDasharray="3 4"
                strokeOpacity="0.5"
                x1={PLOT_L}
                x2={PLOT_R}
                y1={y(level.target)}
                y2={y(level.target)}
              />
              {/* Skipped when it would land on the entry line, rather than
                  laying an identical dash over it. */}
              {floorOnEntry ? null : (
                <line
                  stroke="var(--fg-subtle)"
                  strokeDasharray="3 4"
                  strokeOpacity="0.35"
                  x1={PLOT_L}
                  x2={PLOT_R}
                  y1={y(level.invalidation)}
                  y2={y(level.invalidation)}
                />
              )}

              <Candles
                bars={HISTORY}
                body={hbody}
                opacity="0.5"
                x={spacing(PLOT_L, hstep)}
                y={y}
              />

              {/* price, going the other way to the line */}
              <Candles
                bars={bars}
                body={fbody}
                minBody={1.2}
                opacity="0.85"
                wick={1}
                x={spacing(SPLIT, fstep)}
                y={y}
              />

              {/* where the line started, so you can see what you changed */}
              <path
                d={smoothPath(DRAWN_DOWN.map((p, i) => ({ x: xOf(i), y: y(p) })))}
                fill="none"
                opacity={Math.min(0.26, Math.abs(end - DRAWN_DOWN[8]) / 1200)}
                stroke="var(--brand)"
                strokeDasharray="5 6"
                strokeLinecap="round"
                strokeWidth="2"
              />

              <path
                d={smoothPath(pts)}
                fill="none"
                stroke="var(--brand)"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.6"
              />

              {/* the rest of the points, so the line reads as something built
                  out of handles rather than as a picture of a curve */}
              {pts.slice(1, -1).map((p) => (
                <rect
                  fill="var(--brand)"
                  height="3"
                  key={p.x}
                  opacity="0.45"
                  width="3"
                  x={p.x - 1.5}
                  y={p.y - 1.5}
                />
              ))}
            </svg>

            {/* The handle. A real control: pointer, focus and arrow keys all
                move it, and everything else on the panel follows. */}
            <button
              aria-label="End of the drawn line"
              aria-valuemax={DRAG_MAX}
              aria-valuemin={DRAG_MIN}
              aria-valuenow={Math.round(end)}
              aria-valuetext={`Aiming for ${fmtUsd(snap(end))}`}
              className={cn(
                "-translate-x-1/2 -translate-y-1/2 absolute size-3 touch-none bg-brand outline-offset-4 transition-[box-shadow,transform] md:size-3.5",
                grabbing || demoGrab
                  ? "scale-125 shadow-[0_0_0_5px_var(--brand-dim)] cursor-grabbing"
                  : "cursor-grab hover:shadow-[0_0_0_5px_var(--brand-dim)]",
              )}
              onKeyDown={(e) => {
                const by =
                  e.key === "ArrowUp"
                    ? KEY_STEP
                    : e.key === "ArrowDown"
                      ? -KEY_STEP
                      : e.key === "PageUp"
                        ? KEY_STEP * 5
                        : e.key === "PageDown"
                          ? -KEY_STEP * 5
                          : 0;
                if (by === 0) return;
                e.preventDefault();
                nudge(by);
              }}
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                take();
                setGrabbing(true);
                setFromClientY(e.clientY);
              }}
              onPointerMove={(e) => {
                if (grabbing) setFromClientY(e.clientY);
              }}
              onPointerUp={() => setGrabbing(false)}
              role="slider"
              style={at(handle.x, handle.y)}
              type="button"
            />

            {showCursor ? (
              <svg
                aria-hidden="true"
                className="pointer-events-none absolute"
                height="22"
                style={at(cursor.x, cursor.y)}
                viewBox="0 0 16 22"
                width="16"
              >
                <path
                  d="M1 1 L1 17 L5 13.4 L7.7 20 L10.4 18.9 L7.8 12.6 L13 12.6 Z"
                  fill="var(--fg)"
                  stroke="var(--bg)"
                  strokeWidth="1.4"
                />
              </svg>
            ) : null}

            <span
              className="-translate-y-full pointer-events-none absolute pb-1 pl-0.5 text-fg-subtle text-xs"
              style={at(PLOT_L, y(level.target))}
            >
              Aiming for
            </span>
            <span
              className="-translate-y-1/2 pointer-events-none absolute pl-3 font-mono text-brand text-xs tabular-nums"
              style={at(PLOT_R, y(level.target))}
            >
              {fmtUsd(snap(level.target))}
            </span>
            <span
              className="-translate-y-full pointer-events-none absolute pb-1 pl-0.5 text-fg-subtle text-xs"
              style={at(PLOT_L, ENTRY_Y)}
            >
              You&rsquo;re in at
            </span>
            <span
              className="-translate-y-1/2 pointer-events-none absolute pl-3 font-mono text-fg-subtle text-xs tabular-nums"
              style={at(PLOT_R, ENTRY_Y)}
            >
              {fmtUsd(ORDER.entry)}
            </span>
            {floorOnEntry ? null : (
              <>
                <span
                  className="-translate-y-full pointer-events-none absolute pb-1 pl-0.5 text-fg-subtle text-xs"
                  style={at(PLOT_L, y(level.invalidation))}
                >
                  You&rsquo;re out at
                </span>
                <span
                  className="-translate-y-1/2 pointer-events-none absolute pl-3 font-mono text-fg-subtle text-xs tabular-nums"
                  style={at(PLOT_R, y(level.invalidation))}
                >
                  {fmtUsd(snap(level.invalidation))}
                </span>
              </>
            )}
          </div>
        </div>

        <aside className="flex flex-col gap-7 rounded-xl bg-surface-2 p-5 shadow-[inset_0_0_0_1px_var(--edge)]">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-fg-subtle text-kicker">
              Bitcoin
            </span>
            <span className="rounded-full bg-brand/14 px-2.5 py-1 font-mono text-brand text-xs">
              {level.long ? "up" : "down"} {ORDER.leverage}×
            </span>
          </div>

          <div className="space-y-3.5">
            <RailRow label="You're in at" value={fmtUsd(ORDER.entry, 2)} />
            <RailRow label="You put in" value={`$${STAKE}`} />
          </div>

          <div className="space-y-3.5">
            <RailRow
              label="Aiming for"
              tone="text-brand"
              value={fmtUsd(snap(level.target))}
            />
            <RailRow label="You're out at" value={fmtUsd(snap(level.invalidation))} />
          </div>

          <div className="space-y-3.5">
            <RailRow
              label="If it works"
              tone="text-up"
              value={`+$${fmtUsd(win)}`}
            />
            <RailRow
              label="Most you lose"
              tone="text-down"
              value={`−$${fmtUsd(lose)}`}
            />
          </div>

          <p
            aria-live="polite"
            className="mt-auto text-fg-muted text-sm leading-[1.7]"
          >
            {caption}
          </p>
        </aside>
      </div>

      <div className="flex items-center justify-between gap-4 px-5 pb-4 md:px-6">
        <span className="font-mono text-fg-subtle text-xs">
          drag the square on the end of the line
        </span>
        <button
          className="pressable cursor-pointer rounded-full bg-surface-2 px-3.5 py-1.5 font-mono text-fg-subtle text-xs shadow-[inset_0_0_0_1px_var(--edge)] transition-colors duration-fast ease-smooth-out hover:text-foreground"
          onClick={() => {
            played.current = false;
            setTaken(false);
            setHeld(null);
            setT(0);
            setReplay((n) => n + 1);
          }}
          type="button"
        >
          replay
        </button>
      </div>
    </div>
  );
}
