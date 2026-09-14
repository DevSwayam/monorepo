"use client";

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
  RISING_BARS,
  smoothPath,
} from "./market-data";

const W = 760;
const H = 350;
const PLOT_L = 16;
const PLOT_R = 626; // the gutter to its right holds the price tags
const PLOT_T = 40;
const PLOT_B = 320;
const SPLIT = 300;

const HISTORY = CANDLES.slice(-24);

const prices = [
  ...HISTORY.flatMap((c) => [c.h, c.l]),
  ...RISING_BARS.flatMap((c) => [c.h, c.l]),
  DRAG_MIN,
  DRAG_MAX,
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
const T_BARS_1 = 5400;
const T_PULL = 1300;
const T_LANDED = 5800;
const T_LET_GO = 6200;
const DEMO_MS = 7400;
const KEY_STEP = 100;
/** Drawn levels land on a round number, the way a chart tool snaps. */
const TICK = 10;
const snap = (v: number) => Math.round(v / TICK) * TICK;

function Line({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-fg-subtle text-sm">{label}</span>
      <span
        className={cn(
          "font-mono text-sm tabular-nums",
          tone ?? "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}

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
  const [inView, setInView] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [replay, setReplay] = useState(0);

  const ref = useRef<HTMLDivElement>(null);
  const plot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || reduced || taken) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const e = now - t0;
      setT(Math.min(e, DEMO_MS));
      if (e < DEMO_MS) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduced, taken, replay]);

  // --- where the line ends right now ---------------------------------------
  const demoEnd =
    DRAWN_DOWN[DRAWN_DOWN.length - 1] +
    (DRAG_TO - DRAWN_DOWN[DRAWN_DOWN.length - 1]) *
      ease(clamp01((t - T_PULL) / (T_LANDED - T_PULL)));
  const end = held ?? (reduced ? DRAG_TO : demoEnd);

  const shape = lineTo(end);
  const level = levelsFor(shape);
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
    ? "Same entry, same size, same position. All that moved is the pair of prices the shape sets."
    : t < T_PULL
      ? "This is the line you drew. Down, from where you got in."
      : t < T_LET_GO
        ? "Price is going the other way, so you chase it. Both numbers move as you pull."
        : "Your turn. Drag the handle, or put focus on it and use the arrow keys.";

  return (
    <div className="border-border border-t bg-surface" ref={ref}>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="px-4 py-6 md:px-6 md:py-8">
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
              <line
                stroke="var(--fg-subtle)"
                strokeDasharray="3 4"
                strokeOpacity="0.35"
                x1={PLOT_L}
                x2={PLOT_R}
                y1={y(level.invalidation)}
                y2={y(level.invalidation)}
              />

              {HISTORY.map((c, i) => {
                const cx = PLOT_L + i * hstep + hstep / 2;
                const rising = c.c >= c.o;
                const top = y(Math.max(c.o, c.c));
                const bottom = y(Math.min(c.o, c.c));
                return (
                  <g
                    fill={rising ? "var(--up)" : "var(--down)"}
                    key={i}
                    opacity="0.5"
                    stroke={rising ? "var(--up)" : "var(--down)"}
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
                      width={hbody}
                      x={cx - hbody / 2}
                      y={top}
                    />
                  </g>
                );
              })}

              {/* price, going the other way to the line */}
              {bars.map((c, i) => {
                const cx = SPLIT + i * fstep + fstep / 2;
                const rising = c.c >= c.o;
                const top = y(Math.max(c.o, c.c));
                const bottom = y(Math.min(c.o, c.c));
                return (
                  <g
                    fill={rising ? "var(--up)" : "var(--down)"}
                    key={i}
                    opacity="0.85"
                    stroke={rising ? "var(--up)" : "var(--down)"}
                  >
                    <line
                      strokeWidth="1"
                      x1={cx}
                      x2={cx}
                      y1={y(c.h)}
                      y2={y(c.l)}
                    />
                    <rect
                      height={Math.max(1.2, bottom - top)}
                      width={fbody}
                      x={cx - fbody / 2}
                      y={top}
                    />
                  </g>
                );
              })}

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
              aria-valuetext={`Target ${fmtUsd(snap(end))}`}
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
              Target
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
              Entry
            </span>
            <span
              className="-translate-y-1/2 pointer-events-none absolute pl-3 font-mono text-fg-subtle text-xs tabular-nums"
              style={at(PLOT_R, ENTRY_Y)}
            >
              {fmtUsd(ORDER.entry)}
            </span>
            <span
              className="-translate-y-full pointer-events-none absolute pb-1 pl-0.5 text-fg-subtle text-xs"
              style={at(PLOT_L, y(level.invalidation))}
            >
              Invalidation
            </span>
            <span
              className="-translate-y-1/2 pointer-events-none absolute pl-3 font-mono text-fg-subtle text-xs tabular-nums"
              style={at(PLOT_R, y(level.invalidation))}
            >
              {fmtUsd(snap(level.invalidation))}
            </span>
          </div>
        </div>

        <aside className="flex flex-col gap-7 border-border p-6 lg:border-l max-lg:border-t">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-fg-subtle text-kicker">
              BTC-PERP
            </span>
            <span className="font-mono text-brand text-xs">
              {level.long ? "long" : "short"} {ORDER.leverage}×
            </span>
          </div>

          <div className="space-y-3.5">
            <Line label="Entry" value={fmtUsd(ORDER.entry, 2)} />
            <Line label="Size" value={`${ORDER.size} BTC`} />
          </div>

          <div className="space-y-3.5">
            <Line
              label="Target"
              tone="text-brand"
              value={fmtUsd(snap(level.target))}
            />
            <Line label="Invalidation" value={fmtUsd(snap(level.invalidation))} />
          </div>

          <div className="space-y-3.5">
            <Line
              label="If it runs"
              tone="text-up"
              value={`+$${fmtUsd(snap(level.reward))}`}
            />
            <Line
              label="If it breaks"
              tone={level.risk < 1 ? "text-fg-muted" : "text-down"}
              value={level.risk < 1 ? "$0" : `−$${fmtUsd(snap(level.risk))}`}
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

      <div className="flex items-center justify-between gap-4 border-border border-t px-5 py-4 md:px-6">
        <span className="font-mono text-fg-subtle text-xs">
          drag the square on the end of the line
        </span>
        <button
          className="cursor-pointer font-mono text-fg-subtle text-xs transition-colors hover:text-foreground"
          onClick={() => {
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
