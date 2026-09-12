import { DERIVED, fmtUsd, ORDER } from "./market-data";
import { Band, Kicker, SectionHead } from "./ui";

const SPAN = ORDER.target - ORDER.invalidation;
const pct = (price: number) => ((ORDER.target - price) / SPAN) * 100;
const ENTRY_PCT = pct(ORDER.entry);
const fromEntry = (price: number) =>
  ((price - ORDER.entry) / ORDER.entry) * 100;

const LEVELS = [
  { label: "Target", price: ORDER.target, note: "where you take it off" },
  { label: "Entry", price: ORDER.entry, note: "where you get in" },
  {
    label: "Invalidation",
    price: ORDER.invalidation,
    note: "where you were wrong",
  },
] as const;

/**
 * §4, the three prices a drawn curve implies.
 *
 * A price ladder rather than three boxes in a row. These numbers have a
 * vertical relationship, target above entry above invalidation, and the gaps
 * between them are the whole trade; side by side throws that away. The spacing
 * is proportional to the real distances, so the ladder is the same shape as the
 * chart above it, and the long gap at the top is the point rather than a void:
 * the reward run is two and a half times the risk run, drawn to scale.
 *
 * The span readouts live in their own column to the left of the axis. Placed
 * beside the prices they collided with them, because the risk span is short.
 */
export function WhatItSets() {
  return (
    <Band id="what-it-sets">
      <SectionHead
        id="sets-title"
        kicker="The three numbers"
        lead="You picked all three before you opened the ticket. Drawing just puts them on the chart."
      >
        You&rsquo;ve already chosen these.
      </SectionHead>

      <div className="relative px-5 py-14 md:px-10 md:py-20">
        {/* Chart ruling behind the ladder. This is a price axis, so horizontal
            gridlines are the pattern that belongs here; they are set from
            --grid-line, which is dimmer than a border on purpose, and masked at
            both ends so the section does not start and stop on a hard line. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px)",
            backgroundSize: "100% 44px",
            maskImage:
              "linear-gradient(to bottom, transparent, #000 14%, #000 86%, transparent)",
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent, #000 14%, #000 86%, transparent)",
          }}
        />

        {/* The layout is a plain grid: only the prices are a description list.
            The span column holds no dt/dd, so nesting it inside the <dl> broke
            the list semantics. */}
        <div className="grid h-[23rem] grid-cols-[5.5rem_minmax(0,1fr)] sm:h-[26rem] sm:grid-cols-[9rem_minmax(0,1fr)]">
          {/* what each run is worth */}
          <div className="relative pr-5 sm:pr-8">
            <div
              className="-translate-y-1/2 absolute right-5 text-right sm:right-8"
              style={{ top: `${ENTRY_PCT / 2}%` }}
            >
              <span className="block font-mono text-brand text-sm tabular-nums">
                +${fmtUsd(DERIVED.reward)}
              </span>
              <span className="mt-1.5 block text-fg-subtle text-xs">
                if it runs
              </span>
            </div>
            <div
              className="-translate-y-1/2 absolute right-5 text-right sm:right-8"
              style={{ top: `${ENTRY_PCT + (100 - ENTRY_PCT) / 2}%` }}
            >
              <span className="block font-mono text-fg-muted text-sm tabular-nums">
                −${fmtUsd(DERIVED.risk)}
              </span>
              <span className="mt-1.5 block text-fg-subtle text-xs">
                if it breaks
              </span>
            </div>
          </div>

          {/* the axis, and the prices hanging off it */}
          <div className="relative">
            {/* The reward run is tinted, the risk run is not. It fades out to
                the right so it never sits behind the figures. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0"
              style={{
                height: `${ENTRY_PCT}%`,
                background:
                  "linear-gradient(to right, color-mix(in srgb, var(--brand) 9%, transparent), transparent 55%)",
              }}
            />
            {/* Outside the <dl>: the axis is decoration, and a bare span as a
                direct child of a description list is invalid. */}
            <span
              aria-hidden="true"
              className="absolute top-0 left-0 w-px bg-brand"
              style={{ height: `${ENTRY_PCT}%` }}
            />
            <span
              aria-hidden="true"
              className="absolute bottom-0 left-0 w-px bg-fg-subtle"
              style={{ height: `${100 - ENTRY_PCT}%` }}
            />

            {/* A list of price levels, not a description list. Each row needs
                a tick and a trailing readout beside the label/value pair, which
                puts the dt/dd two levels down and breaks <dl> grouping. */}
            <ul className="absolute inset-0">
            {LEVELS.map((level) => {
              const accent = level.label === "Target";
              const move = fromEntry(level.price);
              return (
                <li
                  className="-translate-y-1/2 absolute inset-x-0 flex items-center gap-4 sm:gap-6"
                  key={level.label}
                  style={{ top: `${pct(level.price)}%` }}
                >
                  <span
                    aria-hidden="true"
                    className={`h-px w-4 shrink-0 sm:w-7 ${
                      accent ? "bg-brand" : "bg-fg-subtle"
                    }`}
                  />
                  <div className="min-w-0">
                    <Kicker className={accent ? "text-brand" : undefined}>
                      {level.label}
                    </Kicker>
                    <span
                      className={`mt-2 block font-pixel text-[clamp(1.5rem,3.6vw,2.75rem)] leading-none ${
                        accent ? "text-brand" : "text-foreground"
                      }`}
                    >
                      {fmtUsd(level.price)}
                    </span>
                  </div>
                  <div className="ml-auto hidden shrink-0 text-right sm:block">
                    <span
                      className={`block font-mono text-sm tabular-nums ${
                        accent ? "text-brand" : "text-fg-subtle"
                      }`}
                    >
                      {move === 0
                        ? "reference"
                        : `${move > 0 ? "+" : "−"}${Math.abs(move).toFixed(2)}%`}
                    </span>
                    <span className="mt-1.5 block text-fg-subtle text-xs">
                      {level.note}
                    </span>
                  </div>
                </li>
              );
            })}
            </ul>
          </div>
        </div>
      </div>
    </Band>
  );
}
