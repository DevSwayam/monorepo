"use client";

import { RailRow, signed } from "./chart";
import { useInView, useReducedMotion } from "./motion";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  FORECAST_BARS,
  fmtUsd,
  ORDER,
  pnlAt,
  STAKE,
  SCENARIOS,
  type Scenario,
} from "./market-data";
import { markAt, ScenarioChart } from "./scenario-chart";
import { PauseButton, StepCard } from "./step-card";
import { Kicker } from "./type";

/** One scenario plays over this long, then holds so the ending can be read. */
const RUN_MS = 4400;
const HOLD_MS = 2400;

/**
 * The figures beside the chart. Same rows as before, no card around them.
 *
 * Memoised alongside the chart: all three rails are mounted so the neighbouring
 * panels can be seen, and only one of them is moving.
 */
const Rail = memo(function Rail({
  scenario,
  step,
}: {
  scenario: Scenario;
  step: number;
}) {
  const mark = markAt(scenario, step);
  const pnl = pnlAt(mark);
  const done = step >= FORECAST_BARS;
  const tone =
    Math.round(pnl) === 0 ? "text-fg-muted" : pnl > 0 ? "text-up" : "text-down";

  return (
    <div className="flex flex-col gap-6 rounded-2xl bg-white/4 p-5">
      <div className="flex items-baseline justify-between">
        <Kicker as="span">Bitcoin</Kicker>
        <span className="rounded-full bg-brand/14 figures px-2.5 py-1 text-brand text-xs">
          {ORDER.side === "long" ? "up" : "down"} {ORDER.leverage}x
        </span>
      </div>

      <div className="space-y-3.5">
        <RailRow label="You're in at" value={fmtUsd(ORDER.entry, 2)} />
        <RailRow label="You put in" value={`$${STAKE}`} />
      </div>

      <div className="space-y-3.5">
        <RailRow label="Right now" value={fmtUsd(mark, 2)} />
        <RailRow
          label={done ? "Ended" : "So far"}
          tone={tone}
          value={signed(pnl)}
        />
      </div>

      <p
        className={cn(
          "figures text-xs transition-opacity duration-300",
          done ? "opacity-100" : "opacity-0",
        )}
      >
        <span className="text-fg-subtle">{scenario.exitLabel}</span>{" "}
        <span className={tone}>{signed(pnlAt(scenario.exit))}</span>
      </p>
    </div>
  );
});

/**
 * The three endings, played inside the dark stepped card.
 *
 * It used to be a segmented control over a sliding track of three full slides,
 * each carrying its own chart well and its own bordered rail. Three copies of
 * the frame sliding past each other is a lot of furniture for one idea, and on
 * paper the nested wells turned into boxes inside boxes inside boxes.
 *
 * Now there is one frame. The scenario's name and caption sit at the top, the
 * chart runs in the middle, the figures sit beside it, and the three pills at
 * the bottom carry what each ending is worth so the comparison is readable
 * without clicking anything.
 *
 * Only the scenario on screen runs, and it holds at its ending long enough to
 * be read before the next one takes over.
 */
export function ScenarioPanel() {
  const [active, setActive] = useState(0);
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);

  const elapsed = useRef(0);
  const reduced = useReducedMotion();
  const [ref, inView] = useInView<HTMLDivElement>(0.2);

  useEffect(() => {
    if (reduced || paused || !inView) return;
    let raf = 0;
    const base = elapsed.current;
    const t0 = performance.now();
    const tick = (now: number) => {
      const e = base + (now - t0);
      elapsed.current = e;
      if (e >= RUN_MS + HOLD_MS) {
        elapsed.current = 0;
        setStep(0);
        setActive((a) => (a + 1) % SCENARIOS.length);
        return;
      }
      setStep(Math.min(FORECAST_BARS, Math.round((e / RUN_MS) * FORECAST_BARS)));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, paused, inView, reduced]);

  const pick = (i: number) => {
    elapsed.current = 0;
    setStep(0);
    setActive(i);
  };

  const shown = reduced ? FORECAST_BARS : step;

  /*
   * The panels either side are held at their ending rather than at their
   * start. A peek should show what that scenario amounts to, and a scenario
   * frozen before its first candle is a chart of nothing; the memo above means
   * holding them there costs one render each.
   */
  const slides = useMemo(
    () =>
      SCENARIOS.map((s, i) => {
        const at = i === active ? shown : FORECAST_BARS;
        return {
          key: s.key,
          label: s.title,
          title: s.title,
          caption: s.caption,
          visual: <ScenarioChart scenario={s} step={at} />,
          aside: <Rail scenario={s} step={at} />,
        };
      }),
    [active, shown],
  );

  return (
    <div ref={ref}>
      <StepCard
        action={
          reduced ? null : (
            <PauseButton
              onToggle={() => setPaused((v) => !v)}
              paused={paused}
              subject="the walkthrough"
            />
          )
        }
        active={active}
        bodyClass="lg:h-[22rem]"
        label="Scenarios"
        onSelect={pick}
        slides={slides}
      />
    </div>
  );
}
