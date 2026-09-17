import type { ReactNode } from "react";
import { StorySection } from "./story-section";
import styles from "./story.module.css";
import { smoothPath } from "./market-data";
import { Body } from "./type";

/** The three decisions, visible together in their actual order. */
const STEPS: {
  title: string;
  caption: string;
  visual: ReactNode;
}[] = [
  {
    title: "Pick your size",
    caption: "Choose how much you put in.",
    visual: <Amount />,
  },
  {
    title: "Set leverage",
    caption: "Put in $100, trade like $1,000.",
    visual: <Leverage />,
  },
  {
    title: "Draw it",
    caption: "Draw where you think the price goes.",
    visual: <DrawnLine />,
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
    <div className="flex items-center justify-center">
      <span className="rounded-full bg-brand/15 figures px-5 py-3 text-3xl text-brand">$100</span>
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
      {/*
        Fifteen notches with ten lit. The meter used to be ten with five lit,
        which reads as halfway up a scale that stops at ten — so the card was
        quietly saying the most you can do is double, while the figure beside it
        said five times. Fifteen is the top of the range and ten is a setting
        inside it, which is what a meter is for.
      */}
      <div className="grid h-4 auto-cols-fr grid-flow-col gap-1">
        {Array.from({ length: 15 }, (_, i) => (
          <span
            className={
              i < 10
                ? "rounded-full bg-brand"
                : "rounded-full bg-surface-3 transition-colors duration-slow ease-smooth-out group-hover:bg-brand/25"
            }
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length meter
            key={i}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <Body as="span" tone="subtle">trading with</Body>
        <span className="figures text-3xl text-brand">$1,000</span>
      </div>
    </div>
  );
}

export function HowItWorks() {
  return (
    <StorySection
      id="how-it-works"
      titleId="how-title"
      title="Nothing to learn."
      lead="Size, leverage, one line. That's it."
      scene="steps"
      overview
    >
      <div className={styles.stepGrid}>
        {STEPS.map((step) => (
          <article className={styles.step} key={step.title}>
            <h3 className={styles.stepTitle}>
              {step.title}
            </h3>
            <div className={styles.stepVisual}>{step.visual}</div>
            <p className={styles.stepCaption}>{step.caption}</p>
          </article>
        ))}
      </div>
    </StorySection>
  );
}
