"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import styles from "./amount-wheel.module.css";
import { usd } from "./market";
import type { Order } from "./order-ticket";

/**
 * Draw's two controls: how much, and how hard.
 *
 * Not three. There is no long/short button here, because the direction is the
 * line you draw on the chart — that is the entire product. A pair of buttons
 * offering to decide it for you would be a second way to do the one thing the
 * screen already does, sitting on top of it.
 *
 * So what is left is the landing page's two cards, made real. On the landing
 * they are illustrations of the idea — a wheel that turns and a meter that does
 * not — and a reader who arrives here after seeing them should find the same
 * two objects doing the same two jobs, because a marketing page that shows a
 * control the product does not have is a lie told in a nice font.
 *
 * They live in popovers on the chart rather than in cards under it. Under the
 * chart they were a form to fill in before the interesting part; up here they
 * are two settings showing their current value, and the chart gets the page.
 */

const STEP = 5;
const MIN = 20;
const MAX = 500;

const AMOUNTS = Array.from(
  { length: (MAX - MIN) / STEP + 1 },
  (_, i) => MIN + i * STEP,
);

/** Fifteen notches. Ten lit is 10×, which is where the meter opens. */
const NOTCHES = 15;
const MAX_LEVERAGE = 15;

/**
 * The stake, picked on a wheel.
 *
 * The scroll container *is* the control: momentum, the rubber band at the ends
 * and the settle onto a snap point are all the platform's, and the same gesture
 * works from a finger, a trackpad, a mouse wheel and the arrow keys without
 * four code paths. Reading the value back out is one division.
 *
 * Controlled here, where the landing's copy owns its own state — the value has
 * to reach the chart and the button, so it lives in the order.
 *
 * The middle row is also a field. Scrolling is the right gesture for nudging a
 * number and the wrong one for crossing a range: the wheel runs $20 to $500 in
 * $5 steps, so reaching the far end from the middle is forty rows of flicking.
 * Clicking the selected value turns it into an input and typing jumps straight
 * there. What you type is rounded to the wheel's own $5 step rather than kept
 * exactly — the control's granularity is $5, and a wheel reading $185 beside a
 * stake of $187 is the two disagreeing about what was chosen.
 */
function AmountWheel({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const wheel = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  /**
   * True while *we* are moving the scroller rather than the reader.
   *
   * Every programmatic `scrollTop` fires a scroll event, and the handler turns
   * a scroll position back into a value — so restoring the wheel to $340 when
   * the popover reopens read that position back and wrote a value from it. If
   * the row height is not measurable yet (the popup is still being positioned,
   * so `offsetHeight` is 0 and the fallback is used) that round trip lands on
   * the wrong row and the amount resets to something near the top of the range.
   * Closing and reopening the popover lost the size every time.
   */
  const programmatic = useRef(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const index = Math.max(
    0,
    AMOUNTS.findIndex((amount) => amount >= value),
  );

  /** Height of one row, read from the DOM so CSS stays the single source. */
  const itemHeight = useCallback(() => {
    const el = wheel.current?.querySelector<HTMLElement>(`.${styles.value}`);
    return el?.offsetHeight ?? 0;
  }, []);

  /** Move the scroller without the move being read back as a new value. */
  const scrollToIndex = useCallback(
    (i: number, smooth = false) => {
      const el = wheel.current;
      const height = itemHeight();
      if (!el || height === 0) return;
      programmatic.current = true;
      el.scrollTo({
        behavior: smooth ? "smooth" : "instant",
        top: i * height,
      });
      window.setTimeout(
        () => {
          programmatic.current = false;
        },
        smooth ? 420 : 80,
      );
    },
    [itemHeight],
  );

  // Opening position, set without animation: the wheel should already be on
  // the current amount rather than scrolling there in front of the reader.
  // Deferred a frame so the popup has been laid out and a row has a height —
  // measuring during the same tick it mounts in returns zero.
  useEffect(() => {
    const id = requestAnimationFrame(() => scrollToIndex(index));
    return () => cancelAnimationFrame(id);
    // Mount only. Afterwards the scroller is the source of truth and writing to
    // it from here would fight the reader's own flick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollToIndex]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const onScroll = () => {
    const el = wheel.current;
    if (!el || programmatic.current) return;
    // Coalesced to one read per frame. Scroll fires far faster than paint
    // during a flick, and each handler here measures layout.
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const next = Math.round(el.scrollTop / itemHeight());
      onChange(AMOUNTS[Math.min(AMOUNTS.length - 1, Math.max(0, next))]);
    });
  };

  const startEditing = () => {
    setDraft(String(value));
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    const typed = Number.parseFloat(draft);
    if (!Number.isFinite(typed)) return;
    const stepped = Math.round(typed / STEP) * STEP;
    const clamped = Math.min(MAX, Math.max(MIN, stepped));
    onChange(clamped);
    scrollToIndex(AMOUNTS.indexOf(clamped));
  };

  const goTo = (next: number) => {
    const clamped = Math.min(AMOUNTS.length - 1, Math.max(0, next));
    onChange(AMOUNTS[clamped]);
    scrollToIndex(
      clamped,
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  };

  return (
    <div className={styles.wrap}>
      <span aria-hidden="true" className={styles.band} />
      {/*
        A slider rather than a listbox. There are 97 values in a fixed
        arithmetic range, which is a quantity being chosen and not a set of
        options — and it means the arrow keys mean what a screen reader will
        already have said they mean. Up increases, so the key and the gesture
        agree.
      */}
      <div
        aria-label="How much you put in"
        aria-valuemax={MAX}
        aria-valuemin={MIN}
        aria-valuenow={value}
        aria-valuetext={`$${value}`}
        className={styles.wheel}
        onKeyDown={(event) => {
          const by =
            event.key === "ArrowUp" || event.key === "ArrowRight"
              ? 1
              : event.key === "ArrowDown" || event.key === "ArrowLeft"
                ? -1
                : event.key === "PageUp"
                  ? 5
                  : event.key === "PageDown"
                    ? -5
                    : 0;
          if (by !== 0) {
            event.preventDefault();
            goTo(index + by);
            return;
          }
          if (event.key === "Home") {
            event.preventDefault();
            goTo(0);
          } else if (event.key === "End") {
            event.preventDefault();
            goTo(AMOUNTS.length - 1);
          }
        }}
        onScroll={onScroll}
        ref={wheel}
        role="slider"
        tabIndex={0}
      >
        <div className={styles.track}>
          {AMOUNTS.map((amount, i) => (
            <div
              className={styles.value}
              data-near={Math.abs(i - index) === 1 ? "" : undefined}
              data-selected={i === index ? "" : undefined}
              key={amount}
              // The selected row is the field. A click with no drag behind it
              // still fires here, so this costs the scroll gesture nothing.
              onClick={i === index ? startEditing : undefined}
              onKeyDown={
                i === index
                  ? (event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        startEditing();
                      }
                    }
                  : undefined
              }
            >
              ${amount}
            </div>
          ))}
        </div>
      </div>

      {/*
        The input sits over the wheel, not instead of it.
        
        Swapping them out unmounted the scroller, and its mount effect then
        scrolled a freshly mounted wheel back to whatever `value` was when it
        remounted — which is the old value, because the parent had not
        re-rendered yet. The typed amount committed and then reverted a frame
        later. Keeping the scroller mounted means `commit` can scroll a live
        element and nothing races.
      */}
      {editing ? (
        <div className="absolute inset-0 flex items-center justify-center bg-popover">
          <span aria-hidden="true" className={styles.band} />
          <span className="figures relative font-medium text-2xl text-brand">
            $
          </span>
          {/* biome-ignore lint/a11y/noAutofocus: the field exists because it was
              just asked for, and focusing it is the whole of that request */}
          <input
            aria-label="How much you put in"
            autoFocus
            className="figures relative w-20 bg-transparent text-center font-medium text-2xl text-brand outline-none"
            inputMode="decimal"
            onBlur={commit}
            onChange={(event) =>
              setDraft(event.target.value.replace(/[^0-9.]/g, ""))
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") commit();
              if (event.key === "Escape") setEditing(false);
            }}
            value={draft}
          />
        </div>
      ) : null}
    </div>
  );
}

/**
 * How hard, as a meter you can set.
 *
 * The landing page's meter, given a pointer, and drawn the way the landing
 * draws it: notches above, and under them what the multiple does to the money —
 * because "$1,000" is the fact a person can act on and "10×" is the fact they
 * have to convert first. The multiple sits *in* the arrow rather than over it;
 * breaking the line around it reads as the multiple being applied along the
 * way, and gives it air on both sides without needing any.
 *
 * The arrow is a stretching rule with a solid head butted onto it, not one
 * scaled `<svg>` — stretching a drawn arrow squashes its head with the shaft.
 * The head is the only fixed part.
 *
 * The result figure sits under the last lit notch, as on the landing page — and
 * the notches are not all the same width, which is what makes that possible.
 *
 * The landing's meter is a fixed illustration at 10 of 15, so its lit run is
 * two thirds of the track and there is plenty of room beneath it for
 * "$100 → 10× → $1,000". Make it follow the value and the bottom falls out at
 * the low end: at 2× the lit run is a seventh of the track, and the figures
 * underneath either overlap each other or give up on the notch entirely and
 * float a full arrow's width away from the two dots they describe.
 *
 * So the lit notches expand. The lit run never takes less than half the track,
 * the unlit ones share what is left, and the row beneath always has room. Above
 * about 8× the arithmetic gives them all the same width again and the meter is
 * the landing's exactly.
 *
 * The cost is that the bar is no longer a linear scale at the low end — two
 * notches out of fifteen draw as half the width. Counting still works, because
 * the lit ones are the wide ones and there are still fifteen. A meter that is
 * strictly proportional and unreadable underneath is the worse trade.
 */
/** The lit run never falls below this share of the track. */
const MIN_LIT = 0.5;

function LeverageMeter({
  value,
  stake,
  onChange,
}: {
  value: number;
  stake: number;
  onChange: (value: number) => void;
}) {
  const unlit = NOTCHES - value;
  const litRun = Math.max(value / NOTCHES, MIN_LIT);
  /** Columns: the lit ones share `litRun`, the rest share what is left. */
  const columns =
    unlit === 0
      ? `repeat(${NOTCHES}, 1fr)`
      : `repeat(${value}, ${litRun / value}fr) repeat(${unlit}, ${
          (1 - litRun) / unlit
        }fr)`;

  return (
    <div className="flex w-full flex-col">
      <div
        aria-label="How hard"
        aria-valuemax={MAX_LEVERAGE}
        aria-valuemin={1}
        aria-valuenow={value}
        aria-valuetext={`${value} times`}
        className="grid h-4 gap-1 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
        onKeyDown={(event) => {
          const by =
            event.key === "ArrowUp" || event.key === "ArrowRight"
              ? 1
              : event.key === "ArrowDown" || event.key === "ArrowLeft"
                ? -1
                : 0;
          if (by === 0) return;
          event.preventDefault();
          onChange(Math.min(MAX_LEVERAGE, Math.max(1, value + by)));
        }}
        role="slider"
        style={{ gridTemplateColumns: columns }}
        tabIndex={0}
      >
        {Array.from({ length: NOTCHES }, (_, i) => (
          <button
            aria-label={`${i + 1} times`}
            className={cn(
              "h-full cursor-pointer rounded-full transition-colors duration-micro ease-smooth-out",
              i < value ? "bg-brand" : "bg-surface-3 hover:bg-brand/25",
            )}
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length meter
            key={i}
            onClick={() => onChange(i + 1)}
            tabIndex={-1}
            type="button"
          />
        ))}
      </div>

      <div className="mt-3 flex items-baseline gap-3">
        {/* Runs to the last lit notch's centre, then half the figure that sits
            at its end — which is what centres that figure on the notch rather
            than ending it there. Half a figure is the one measurement that
            cannot come from the layout, so it is written here. */}
        <div
          className="flex min-w-0 items-baseline gap-2"
          style={{
            width: `calc(${(litRun - 0.5 / NOTCHES) * 100}% + 1.9rem)`,
          }}
        >
          <span className="figures shrink-0 text-fg-muted text-xs">
            ${usd(stake, 0)}
          </span>

          <span
            aria-hidden="true"
            className="flex min-w-0 flex-1 items-center gap-1 self-center text-brand/50"
          >
            <span className="h-[1.5px] min-w-0 flex-1 rounded-full bg-current" />
            <span className="figures shrink-0 font-medium text-[0.6875rem] text-brand leading-none">
              {value}×
            </span>
            <span className="h-[1.5px] min-w-0 flex-1 rounded-full bg-current" />
            <svg
              className="-ml-1.5 shrink-0"
              fill="currentColor"
              height="8"
              viewBox="0 0 7 8"
              width="7"
            >
              <title>becomes</title>
              <path d="M0 0.4 6.6 4 0 7.6z" />
            </svg>
          </span>

          <span className="figures shrink-0 font-medium text-base text-brand">
            ${usd(stake * value, 0)}
          </span>
        </div>

        {/* The ceiling, and not at the ceiling. At 15× it is the same number as
            the result sitting next to it, and printing "$1,500 $1,500" says
            nothing twice — the full meter already says you are at the top. */}
        {value < MAX_LEVERAGE ? (
          <span className="figures ml-auto shrink-0 text-fg-subtle text-xs">
            ${usd(stake * MAX_LEVERAGE, 0)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** What a popover holds: a title, the control, and a line of plain English
    underneath saying what it just did. */
function Panel({
  title,
  caption,
  children,
  className,
}: {
  title: string;
  caption: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <PopoverTitle className="text-title">{title}</PopoverTitle>
      <div className="flex items-center justify-center">{children}</div>
      <p className="text-caption text-fg-muted">{caption}</p>
    </div>
  );
}

/** The value a control is currently set to, as the face of its button. */
function ControlButton({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <span className="flex items-baseline gap-2">
      <span className="text-kicker text-fg-subtle">{label}</span>
      <span className="figures">{value}</span>
    </span>
  );
}

/**
 * Size and leverage, at the top right of the chart.
 *
 * Each button wears its own value, so the two numbers that decide what a drawn
 * line is worth are readable without opening anything — which is the point of
 * putting them here rather than in a panel below the fold.
 */
export function DrawControls({
  order,
  patch,
  className,
}: {
  order: Order;
  patch: (next: Partial<Order>) => void;
  className?: string;
}) {
  const stake = Number.parseFloat(order.pay) || 100;

  return (
    <div className={cn("flex shrink-0 items-center gap-2", className)}>
      <Popover>
        <PopoverTrigger
          render={<Button className="rounded-full" size="lg" variant="outline" />}
        >
          <ControlButton label="Size" value={`$${usd(stake, 0)}`} />
        </PopoverTrigger>
        <PopoverContent>
          <Panel
            caption="Choose how much you put in."
            className="w-56"
            title="Pick your size"
          >
            <AmountWheel
              onChange={(value) => patch({ pay: String(value) })}
              value={stake}
            />
          </Panel>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger
          render={<Button className="rounded-full" size="lg" variant="outline" />}
        >
          <ControlButton label="Leverage" value={`${order.leverage}×`} />
        </PopoverTrigger>
        <PopoverContent>
          <Panel
            caption={`Put in $${usd(stake, 0)}, trade like $${usd(
              stake * order.leverage,
              0,
            )}.`}
            className="w-[21rem]"
            title="Set leverage"
          >
            <LeverageMeter
              onChange={(leverage) => patch({ leverage })}
              stake={stake}
              value={order.leverage}
            />
          </Panel>
        </PopoverContent>
      </Popover>
    </div>
  );
}
