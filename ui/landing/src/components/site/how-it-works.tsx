"use client";

import { type FocusEvent, type ReactNode, useEffect, useState } from "react";
import { smoothPath } from "./market-data";
import { Reveal, useInView, useReducedMotion } from "./motion";
import { PauseButton, StepCard } from "./step-card";
import { Body } from "./type";
import { Section, SectionHead } from "./ui";

/**
 * §5, what you actually do. Four equal cards, in the order you do them.
 *
 * This was a four-cell bento headed "Four steps, and you only do the first
 * one": a mechanism brag that told a newcomer there were four steps and then
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
 * Order is the real product flow (size, leverage, line) rather than the order that
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
  title: string;
  caption: string;
  visual: ReactNode;
}[] = [
  {
    title: "Pick your size",
    caption: "How much you put in. Twenty dollars or two thousand.",
    visual: <Amount />,
  },
  {
    title: "Set leverage",
    caption: "Put in $100, trade like $500. You choose how far it goes.",
    visual: <Leverage />,
  },
  {
    title: "Draw it",
    caption: "One line, roughly where you think it goes. No order types to learn.",
    visual: <DrawnLine />,
  },
  {
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
      className="w-full"
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
    <div className="flex w-full items-center justify-center gap-3">
      {[20, 100, 500].map((s) => (
        <span
          className={
            s === 100
              ? "rounded-full bg-brand/15 figures px-6 py-3 text-2xl text-brand"
              : "rounded-full bg-surface-2 figures px-6 py-3 text-2xl text-fg-muted"
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
 * itself stays out of the visual, "$500" is the fact a person can act on,
 * "5×" is the fact they have to convert first.
 */
function Leverage() {
  return (
    <div className="flex w-full flex-col justify-center gap-5">
      <div className="grid h-4 auto-cols-fr grid-flow-col gap-1.5">
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
        <Body as="span" tone="subtle">trading with</Body>
        <span className="figures text-3xl text-brand">$500</span>
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
const DRIFT = [
  3, -4, 2, 6, -3, 4, -2, 5, -5, 3, 7, -2, 4, -3, 6, -4, 2, 5, -2, 3,
];

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
      className="w-full"
      fill="none"
      viewBox="0 0 220 96"
    >
      {/*
        The drawn line is the reference, not the subject. At strokeWidth 2 with
        a 3/5 dash it scaled up into a thick dotted snake with a dozen candles
        scattered along it; thinner and finer, it reads as the line the price is
        being measured against.
      */}
      <path
        d={smoothPath(pts)}
        stroke="var(--brand)"
        strokeDasharray="2 4"
        strokeLinecap="round"
        strokeOpacity="0.55"
        strokeWidth="1.3"
      />
      {DRIFT.map((d, i) => {
        const x = 9 + i * 10.6;
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
              strokeWidth="0.9"
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

/**
 * The four steps, as one dark stepped card.
 *
 * Four separate cards gave each step equal weight and equal silence; a reader
 * saw four boxes and read none of them. One card that moves has somewhere for
 * the eye to land, and it makes the order, which is the actual point of the
 * section, impossible to miss.
 */
/**
 * The four steps as carousel panels.
 *
 * Built once out here rather than per render: these visuals are fixed drawings
 * with no state in them, so there is nothing for a rebuild to pick up, and the
 * carousel mounts all four at once now.
 */
const SLIDES = STEPS.map((s) => ({
  key: s.title,
  label: s.title,
  title: s.title,
  caption: s.caption,
  visual: s.visual,
}));

/*
 * Per step. Was 4200, which is a long time to sit in front of a title and one
 * line of caption you have already read; the last two steps arrived after the
 * reader had given up on the card. Four steps now run in twelve seconds rather
 * than seventeen.
 *
 * Not lower than this. The visual replays its entrance on every change, and
 * under about 2.5s the card reads as flicking rather than stepping.
 */
const CYCLE_MS = 3000;

export function HowItWorks() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [held, setHeld] = useState(false);
  const reduced = useReducedMotion();
  const [ref, inView] = useInView<HTMLDivElement>(0.4);

  // Stopped off screen, so it is not cycling to an empty room, and `active` is
  // a dependency so picking a step by hand gives that step a full turn rather
  // than whatever was left of the one before it.
  //
  // Hovering deliberately does not stop it. It used to: the card is the full
  // width of the page and most of its height, so a cursor left anywhere over
  // it — or parked there by someone reaching for the dots — froze the section
  // for good, with nothing on screen to say why or how to start it again. The
  // button below is the way to stop it now.
  useEffect(() => {
    if (reduced || paused || held || !inView) {
      return;
    }
    const id = setInterval(
      () => setActive((i) => (i + 1) % STEPS.length),
      CYCLE_MS,
    );
    return () => clearInterval(id);
  }, [reduced, paused, held, inView, active]);

  // Keyboard focus still holds, so the dots don't renumber under someone
  // tabbing along them. Only keyboard focus: a mouse click lands focus on the
  // dot it hit, which would otherwise reintroduce the freeze above at the
  // first click. `:focus-visible` is the browser's own answer to which kind of
  // focus this was.
  const onFocus = (e: FocusEvent) => {
    setHeld(e.target instanceof Element && e.target.matches(":focus-visible"));
  };

  return (
    <Section id="how-it-works">
      <SectionHead id="how-title" lead="Size, leverage, one line. That's it.">
        Nothing to learn.
      </SectionHead>

      <Reveal>
        <div onBlur={() => setHeld(false)} onFocus={onFocus} ref={ref}>
          <StepCard
            action={
              reduced ? null : (
                <PauseButton
                  onToggle={() => setPaused((v) => !v)}
                  paused={paused}
                  subject="the steps"
                />
              )
            }
            active={active}
            label="Steps"
            onSelect={setActive}
            slides={SLIDES}
          />
        </div>
      </Reveal>
    </Section>
  );
}
