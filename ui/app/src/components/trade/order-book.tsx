"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CollapsiblePanel } from "./collapsible";
import { Segmented } from "./controls";
import {
  type BookLevel,
  bookFor,
  price as fmtPrice,
  type Market,
  type Trade,
  tradesFor,
  usd,
} from "./market";

/**
 * The book and the tape.
 *
 * The one place on this screen where density is the point. A book is read as a
 * shape — where the size is, where the gaps are — before it is read as
 * numbers, so the depth bars matter more than the figures and the rows are
 * tight on purpose.
 *
 * It still refuses the two things that make most books unreadable: there are
 * no gridlines (the depth bar already separates the rows) and nothing is below
 * the type scale's smallest step. Density comes from the row height.
 *
 * Clicking a row sends its price to the ticket, which is the one interaction
 * every trader expects from a book and the reason it is beside the ticket
 * rather than under the chart.
 */

function Rows({
  levels,
  side,
  max,
  onPick,
}: {
  levels: BookLevel[];
  side: "bid" | "ask";
  /** The deepest cumulative total across both sides, so the bars share a scale. */
  max: number;
  onPick: (price: number) => void;
}) {
  return (
    <ul className="flex flex-col">
      {levels.map((level) => (
        <li key={level.price}>
          <button
            className="relative flex w-full items-baseline justify-between gap-2 px-2 py-[3px] text-kicker transition-colors duration-micro hover:bg-surface-2"
            onClick={() => onPick(level.price)}
            type="button"
          >
            {/* The depth bar is behind the figures, anchored to the outside
                edge, so the two columns read as one shape mirrored. */}
            <span
              aria-hidden="true"
              className={cn(
                "absolute inset-y-0 right-0",
                side === "bid" ? "bg-up/8" : "bg-down/8",
              )}
              style={{ width: `${(level.total / max) * 100}%` }}
            />
            <span
              className={cn(
                "figures relative",
                side === "bid" ? "text-up" : "text-down",
              )}
            >
              {fmtPrice(level.price)}
            </span>
            <span className="figures relative text-fg-muted">
              {usd(level.size, 3)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Tape({ trades }: { trades: Trade[] }) {
  return (
    <ul className="flex flex-col">
      {trades.map((trade) => (
        <li
          className="flex items-baseline justify-between gap-2 px-2 py-[3px] text-kicker"
          key={trade.id}
        >
          <span
            className={cn(
              "figures",
              trade.side === "buy" ? "text-up" : "text-down",
            )}
          >
            {fmtPrice(trade.price)}
          </span>
          <span className="figures text-fg-muted">{usd(trade.size, 3)}</span>
          <span className="figures text-fg-subtle">
            {new Date(trade.t).toLocaleTimeString(undefined, {
              hour: "2-digit",
              hour12: false,
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function OrderBook({
  market,
  onPickPrice,
  collapsed,
  onCollapsed,
  className,
}: {
  market: Market;
  /** A click on a row fills the ticket's limit price. */
  onPickPrice: (price: number) => void;
  collapsed: boolean;
  onCollapsed: (collapsed: boolean) => void;
  className?: string;
}) {
  const [tab, setTab] = useState<"book" | "tape">("book");
  const { asks, bids, spread } = bookFor(market, 18);
  const trades = tradesFor(market);
  const max = Math.max(
    asks.at(-1)?.total ?? 0,
    bids.at(-1)?.total ?? 0,
  );

  return (
    <CollapsiblePanel
      className={cn("min-h-0", className)}
      collapsed={collapsed}
      direction="column"
      header={
        <Segmented
          className="min-w-0 flex-1"
          grow
          label="Book or tape"
          onChange={setTab}
          options={[
            { value: "book", label: "Book" },
            { value: "tape", label: "Trades" },
          ]}
          value={tab}
        />
      }
      label="Order book and recent trades"
      onCollapsed={onCollapsed}
      title="Book · Trades"
    >
      <div className="flex shrink-0 items-baseline justify-between px-2 pt-2 pb-1 text-kicker text-fg-subtle">
        <span>Price</span>
        <span>Size</span>
      </div>

      {tab === "book" ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* Asks run downward toward the spread, which is why they are
              reversed: the level nearest the price is nearest the middle. */}
          <Rows
            levels={[...asks].reverse()}
            max={max}
            onPick={onPickPrice}
            side="ask"
          />

          <div className="my-1 flex items-baseline justify-between gap-2 px-2 py-1.5">
            <span className="figures text-caption">
              ${fmtPrice(market.price)}
            </span>
            <span className="figures text-kicker text-fg-subtle">
              {fmtPrice(spread)} spread
            </span>
          </div>

          <Rows levels={bids} max={max} onPick={onPickPrice} side="bid" />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Tape trades={trades} />
        </div>
      )}
    </CollapsiblePanel>
  );
}
