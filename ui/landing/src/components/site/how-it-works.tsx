import type { ReactNode } from "react";
import { smoothPath } from "./market-data";
import { Reveal, Spotlight } from "./motion";
import { Section, SectionHead } from "./ui";

/**
 * §5, what you actually do. Four equal cards, in the order you do them.
 *
 * This was a four-cell bento headed "Four steps, and you only do the first
 * one" — a mechanism brag that told a newcomer there were four steps and then
 * left them wondering what the hidden three were. Its cells were dashboards:
 * a leverage meter with a liquidation price, a receipt proving no slippage, a
 * risk-reward scale in R multiples over 2.5 BTC. Every one answered a question
 * a trader asks and a normal person has never heard.
 *
 * Equal cards rather than a bento, because no step here outranks the others
 * and a bento with inert readouts in it is a bento pretending to be rich. Each
 * caption is a benefit rather than a mechanism, and no dollar figure competes
 * with the canvas above, which owns the numbers.
 *
 * Order is the real product flow — size, leverage, line — not the order that
 * makes the best headline. Drawing is the identity of the product, so putting
 * it first was tempting; it is third because that is when you do it.
 *
 * Two traps already fallen into here, both worth not repeating. The size card
 * once claimed its number was "the only number you type", which is false while
 * leverage is also yours to set: a simplification that is a lie is not worth
 * having. And the last card was once titled "Close the app", which reads as
 * walk away and watch it earn. Its caption still names both endings, whatever
 * the title says.
 */
const STEPS: {
  n: string;
  title: string;
  caption: string;
  visual: ReactNode;
}[] = [
  {
    n: "01",
    title: "Pick your size",
    caption: "How much you put in. Twenty dollars or two thousand.",
    visual: <Amount />,
  },
  {
    n: "02",
    title: "Set leverage",
    caption: "Put in $100, trade like $500. You choose how far it goes.",
    visual: <Leverage />,
  },
  {
    n: "03",
    title: "Draw it",
    caption: "One line, roughly where you think it goes. No order types to learn.",
    visual: <DrawnLine />,
  },
  {
    n: "04",
    title: "Watch it make money",
    caption: "The closer the chart follows your line, the better you do.",
    visual: <Tracking />,
  },
];

/** The gesture, at a glance. A still is fine here; the live one is the hero. */
const LINE_PTS = [
  { x: 6, y: 62 },
  { x: 34, y: 50 },
  { x: 62, y: 68 },
  { x: 92, y: 78 },
  { x: 122, y: 58 },
  { x: 152, y: 40 },
  { x: 182, y: 46 },
  { x: 214, y: 18 },
];

function DrawnLine() {
  const pts = LINE_PTS;
  const head = pts[pts.length - 1];
  return (
    <svg
      aria-hidden="true"
      className="h-full w-full"
      fill="none"
      viewBox="0 0 220 96"
    >
      <line
        stroke="var(--fg-subtle)"
        strokeDasharray="3 4"
        strokeOpacity="0.35"
        x1="0"
        x2="220"
        y1="62"
        y2="62"
      />
      <path
        d={smoothPath(pts)}
        stroke="var(--brand)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
      <circle cx={head.x} cy={head.y} fill="var(--brand)" r="3.6" />
    </svg>
  );
}

/** What you put in. The same three chips the canvas offers, so the two agree. */
function Amount() {
  return (
    <div className="flex h-full items-center gap-2">
      {[20, 100, 500].map((s) => (
        <span
          className={
            s === 100
              ? "rounded-full bg-brand/15 px-3 py-1 font-mono text-brand text-sm tabular-nums"
              : "rounded-full bg-surface-2 px-3 py-1 font-mono text-fg-muted text-sm tabular-nums"
          }
          key={s}
        >
          ${s}
        </span>
      ))}
    </div>
  );
}

/**
 * How big you trade with it.
 *
 * The meter carries the idea and the caption carries the number, so the card
 * reads as something you set rather than something done to you. The multiple
 * itself stays out of the visual — "$500" is the fact a person can act on,
 * "5×" is the fact they have to convert first.
 */
function Leverage() {
  return (
    <div className="flex h-full flex-col justify-center gap-3">
      <div className="grid h-2 auto-cols-fr grid-flow-col gap-1">
        {Array.from({ length: 10 }, (_, i) => (
          <span
            className={
              i < 5
                ? "rounded-full bg-brand"
                : "rounded-full bg-surface-3 transition-colors duration-slow ease-smooth-out group-hover:bg-brand/25"
            }
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length meter
            key={i}
          />
        ))}
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-fg-subtle text-xs">trading with</span>
        <span className="font-mono text-brand text-sm tabular-nums">$500</span>
      </div>
    </div>
  );
}

/**
 * Price walking along the line you drew.
 *
 * Card 03 is the bare line; this is the same shape with the market moving over
 * it, which is the progression the section is claiming: you draw it, then the
 * chart either backs you up or it doesn't. The bars hug the path and drift off
 * it slightly, because a chart that traced the drawing exactly would promise
 * something the product cannot.
 *
 * The drift figures are a fixed list rather than random so the server and the
 * client render the same picture.
 */
const DRIFT = [3, -4, 2, 6, -3, 4, -2, 5, -5, 3, 7, -2];

function Tracking() {
  const pts = LINE_PTS;
  const at = (x: number) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      if (x <= b.x) {
        return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x || 1);
      }
    }
    return pts[pts.length - 1].y;
  };

  return (
    <svg
      aria-hidden="true"
      className="h-full w-full"
      fill="none"
      viewBox="0 0 220 96"
    >
      <path
        d={smoothPath(pts)}
        stroke="var(--brand)"
        strokeDasharray="3 5"
        strokeLinecap="round"
        strokeOpacity="0.45"
        strokeWidth="2"
      />
      {DRIFT.map((d, i) => {
        const x = 12 + i * 17;
        const mid = at(x) + d;
        const up = d <= 0;
        const colour = up ? "var(--up)" : "var(--down)";
        return (
          <g
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length series
            key={i}
            opacity="0.85"
          >
            <line
              stroke={colour}
              strokeWidth="1"
              x1={x}
              x2={x}
              y1={mid - 5}
              y2={mid + 5}
            />
            <rect
              fill={colour}
              height="6"
              rx="1"
              width="3.4"
              x={x - 1.7}
              y={mid - 3}
            />
          </g>
        );
      })}
    </svg>
  );
}

export function HowItWorks() {
  return (
    <Section id="how-it-works">
      <SectionHead id="how-title" lead="Size, leverage, one line. That's it.">
        Nothing to learn.
      </SectionHead>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, i) => (
          <Reveal className="group" index={i} key={step.n}>
            <Spotlight className="surface sheen-top liftable h-full overflow-hidden rounded-2xl">
              <div className="flex h-full flex-col p-6 md:p-7">
                <div className="h-24">{step.visual}</div>
                <div className="mt-7 flex items-center gap-2.5">
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[0.6875rem] text-fg-subtle tabular-nums">
                    {step.n}
                  </span>
                  <h3 className="text-foreground text-title">{step.title}</h3>
                </div>
                <p className="mt-2.5 text-body text-fg-muted">{step.caption}</p>
              </div>
            </Spotlight>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
