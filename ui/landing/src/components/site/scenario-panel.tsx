"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  FORECAST_BARS,
  fmtUsd,
  MARKET,
  ORDER,
  pnlAt,
  SCENARIOS,
  type Scenario,
} from "./market-data";
import { markAt, ScenarioChart } from "./scenario-chart";

/** One scenario plays over this long, then holds so the ending can be read. */
const RUN_MS = 4400;
const HOLD_MS = 2400;

function Row({
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

function signed(n: number) {
  if (Math.round(n) === 0) return "$0";
  return `${n > 0 ? "+" : "−"}$${fmtUsd(Math.abs(n))}`;
}

function Slide({ scenario, step }: { scenario: Scenario; step: number }) {
  const mark = markAt(scenario, step);
  const pnl = pnlAt(mark);
  const done = step >= FORECAST_BARS;
  const tone =
    Math.round(pnl) === 0 ? "text-fg-muted" : pnl > 0 ? "text-up" : "text-down";

  return (
    <div className="grid w-full shrink-0 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="px-4 py-6 md:px-6 md:py-8">
        <ScenarioChart scenario={scenario} step={step} />
      </div>

      <aside className="flex flex-col gap-7 border-border p-6 lg:border-l max-lg:border-t">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-fg-subtle text-kicker">
            {MARKET.symbol}
          </span>
          <span className="font-mono text-brand text-xs">
            {ORDER.side} {ORDER.leverage}×
          </span>
        </div>

        <div className="space-y-3.5">
          <Row label="Entry" value={fmtUsd(ORDER.entry, 2)} />
          <Row label="Size" value={`${ORDER.size} BTC`} />
        </div>

        <div className="space-y-3.5">
          <Row label="Mark" value={fmtUsd(mark, 2)} />
          <Row
            label={done ? "Realised" : "Unrealised"}
            tone={tone}
            value={signed(pnl)}
          />
        </div>

        <div className="mt-auto">
          <p className="text-fg-muted text-sm leading-[1.7]">
            {scenario.caption}
          </p>
          <p
            className={cn(
              "mt-4 font-mono text-xs transition-opacity duration-300",
              done ? "opacity-100" : "opacity-0",
            )}
          >
            <span className="text-fg-subtle">{scenario.exitLabel}</span>{" "}
            <span className={tone}>{signed(pnlAt(scenario.exit))}</span>
          </p>
        </div>
      </aside>
    </div>
  );
}

/**
 * §6, the hero's panel with the clock started.
 *
 * Deliberately the same object as the frame at the top of the page: ruled
 * header, chart, rail of figures. The page has one way of showing the product
 * and this is it, so the three endings slide through that frame rather than
 * arriving as a stack of cards laid over it.
 *
 * Only the scenario on screen runs. The other two sit at their ending, which
 * is also what you want to land on when one slides into view behind a click.
 */
export function ScenarioPanel() {
  const [active, setActive] = useState(0);
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(false);
  const [reduced, setReduced] = useState(false);

  const elapsed = useRef(0);
  const ref = useRef<HTMLDivElement>(null);

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
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

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

  return (
    <div className="border-border border-t bg-surface" ref={ref}>
      {/*
        A selector that is also the summary. Three labels on their own were a
        nav bar taking up a full rule of the page and telling you nothing you
        could not already see; with the ending on each one the strip answers
        "what are the three outcomes" before the first candle arrives, and the
        chart below is then the working rather than the reveal.

        The selected tab drops its bottom rule and takes the panel's own
        ground, so it opens into the chart instead of being underlined. Depth
        from rules and ground shifts, which is the rest of the page's rule too.
      */}
      <div className="flex items-stretch">
        {SCENARIOS.map((s, i) => {
          const on = i === active;
          const out = pnlAt(s.exit);
          return (
            <button
              aria-current={on}
              className={cn(
                "flex-1 cursor-pointer border-border px-4 py-3 text-left transition-colors not-last:border-r md:px-6 md:py-3.5",
                on ? "bg-surface" : "border-b bg-background hover:bg-surface",
              )}
              key={s.key}
              onClick={() => pick(i)}
              type="button"
            >
              <span className="flex items-baseline gap-2.5">
                <span
                  className={cn(
                    "font-mono text-xs tabular-nums",
                    on ? "text-brand" : "text-fg-subtle",
                  )}
                >
                  {s.n}
                </span>
                <span
                  className={cn(
                    "text-sm",
                    on ? "text-foreground" : "text-fg-subtle",
                  )}
                >
                  {s.title}
                </span>
              </span>
              <span
                className={cn(
                  "mt-1.5 block font-mono text-sm tabular-nums transition-opacity",
                  Math.round(out) === 0
                    ? "text-fg-muted"
                    : out > 0
                      ? "text-up"
                      : "text-down",
                  on ? "opacity-100" : "opacity-55",
                )}
              >
                {signed(out)}
              </span>
            </button>
          );
        })}
        {reduced ? null : (
          <button
            aria-label={paused ? "Play the walkthrough" : "Pause the walkthrough"}
            className="flex w-16 shrink-0 cursor-pointer items-center justify-center border-border border-b border-l bg-background text-fg-subtle transition-colors hover:text-foreground md:w-20"
            onClick={() => setPaused((v) => !v)}
            type="button"
          >
            <svg
              aria-hidden="true"
              className="size-3"
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
        )}
      </div>

      <div className="overflow-hidden">
        <div
          className="flex"
          style={{
            transform: `translateX(-${active * 100}%)`,
            transition: "transform 560ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          {SCENARIOS.map((s, i) => (
            <div className="w-full shrink-0" inert={i !== active} key={s.key}>
              <Slide
                scenario={s}
                step={i === active ? shown : FORECAST_BARS}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
