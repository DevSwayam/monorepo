import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { GradientCard } from "./gradient-card";

export type StepDot = {
  key: string;
  /** Names the slide for screen readers and for the dot's title. */
  label: string;
};

/**
 * The dark stepped card, after cult-ui's feature carousel.
 *
 * One near-black panel: the active item's title at the top left, its caption
 * under that, the visual filling the middle, and slider dots centred along the
 * bottom. The whole thing sits in a GradientCard, so the edge lights up under
 * the pointer.
 *
 * Advancing is the caller's business. One of them runs a plain interval, the
 * other a frame clock tied to a chart, and pushing either into here would mean
 * a timer that has to know about both.
 */
export function StepCard({
  title,
  caption,
  steps,
  active,
  onSelect,
  label,
  slideKey,
  bodyClass,
  action,
  aside,
  children,
}: {
  title: string;
  caption: ReactNode;
  steps: readonly StepDot[];
  active: number;
  onSelect: (index: number) => void;
  /** Names the set of dots, e.g. "Steps" or "Scenarios". */
  label: string;
  /** Changes with the slide, so the visual replays its entrance. */
  slideKey?: string;
  /** Height of the visual area. Fixed, so slides cannot resize the card. */
  bodyClass?: string;
  /** Sits beside the dots. Both walkthroughs put their pause control here. */
  action?: ReactNode;
  /** A rail of figures to the right of the visual. */
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <GradientCard>
      <div className="cult-card relative flex flex-col overflow-hidden rounded-3xl p-7 md:p-10">
        {/*
          Both boxes below are fixed, not minimums. With a min-height the card
          grew by 89px between the shortest and tallest slide and the whole page
          below it jumped on every tick, which is worse than any amount of dead
          space. The caption reserves two lines because some are one line long
          and some are two.
        */}
        <div className="flex flex-col gap-2.5 md:w-4/6">
          <h3 className="font-semibold text-[1.375rem] text-foreground tracking-[-0.02em] md:text-2xl">
            {title}
          </h3>
          <p className="min-h-[3.25rem] max-w-[46ch] text-body text-fg-muted">
            {caption}
          </p>
        </div>

        <div
          className={cn(
            // `overflow-hidden` is not cosmetic. A visual taller than this box
            // used to spill over the dots below and swallow their clicks, so
            // selecting steps 3 or 4 left the other dots dead.
            "flex gap-6 overflow-hidden py-8 md:py-10",
            aside
              ? "flex-col lg:flex-row lg:items-center"
              : "items-center justify-center",
            bodyClass ?? "h-60 md:h-64",
          )}
        >
          {/*
            StepCard owns the visual's box rather than trusting the caller to
            wrap it. `max-h-full` on the drawing is a percentage, so it only
            clamps if every ancestor up to the fixed-height row has a definite
            height; when the caller supplied its own auto-height wrapper the
            clamp silently did nothing and the drawing overflowed.
          */}
          <div
            className={cn(
              "flex h-full min-w-0 items-center justify-center",
              aside ? "flex-1" : "w-full max-w-2xl",
            )}
          >
            <div
              className="step-in flex h-full w-full items-center justify-center [&>*]:w-full [&_svg]:max-h-full"
              key={slideKey}
            >
              {children}
            </div>
          </div>
          {aside ? <div className="lg:w-64 lg:shrink-0">{aside}</div> : null}
        </div>

        {/*
          Slider dots. The active one stretches into a bar rather than just
          changing colour, so which slide you are on survives being glanced at,
          and so the control still reads without relying on hue.

          Each is a real button carrying the slide's name, because three
          identical circles are unusable with a screen reader otherwise.
        */}
        <div className="flex items-center gap-3">
          <div
            aria-label={label}
            className="flex flex-1 items-center justify-center gap-2"
            role="tablist"
          >
            {steps.map((s, i) => {
              const current = i === active;
              return (
                <button
                  aria-label={s.label}
                  aria-selected={current}
                  className="group cursor-pointer p-2"
                  key={s.key}
                  onClick={() => onSelect(i)}
                  role="tab"
                  type="button"
                >
                  <span
                    className={cn(
                      "block h-1.5 rounded-full transition-all duration-medium ease-out-expo",
                      current
                        ? "w-7 bg-brand"
                        : "w-1.5 bg-white/28 group-hover:bg-white/50",
                    )}
                  />
                </button>
              );
            })}
          </div>
          {action}
        </div>
      </div>
    </GradientCard>
  );
}

/**
 * Pause and resume, for the cards that advance on their own.
 *
 * Shared rather than written twice because both walkthroughs want the same
 * control in the same corner, and anything that moves by itself owes the
 * reader a way to stop it.
 *
 * `subject` completes the label, so a screen reader hears "Pause the steps"
 * rather than three identical unlabelled circles and a pause button.
 */
export function PauseButton({
  paused,
  onToggle,
  subject,
}: {
  paused: boolean;
  onToggle: () => void;
  /** What stops, e.g. "the steps" or "the walkthrough". */
  subject: string;
}) {
  return (
    <button
      aria-label={paused ? `Play ${subject}` : `Pause ${subject}`}
      className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/8 text-fg-subtle transition-colors duration-fast ease-smooth-out hover:bg-white/14 hover:text-foreground"
      onClick={onToggle}
      type="button"
    >
      <svg
        aria-hidden="true"
        className="size-2.5"
        fill="currentColor"
        viewBox="0 0 12 12"
      >
        {paused ? (
          <path d="M2 0 L12 6 L2 12 Z" />
        ) : (
          <>
            <rect height="12" width="3.5" x="1" y="0" />
            <rect height="12" width="3.5" x="7.5" y="0" />
          </>
        )}
      </svg>
    </button>
  );
}
