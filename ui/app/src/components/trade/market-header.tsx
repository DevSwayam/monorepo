"use client";

import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { FoldButton } from "./collapsible";
import { Pill } from "./controls";
import {
  compactUsd,
  price as fmtPrice,
  type Market,
  signedPct,
} from "./market";
import { TokenPicker } from "./token-picker";

/**
 * The token's mark.
 *
 * One hue, not a generated colour per token. A palette keyed on the address
 * would give every market its own accent, and then the two colours on this
 * screen that carry meaning — up and down — would be competing with a random
 * third. The letters are the identity; the fill is just a plate to set them on.
 *
 * A monogram rather than coin art, because we do not have the art. A borrowed
 * logo at 44px is the one element on the screen that would not be ours.
 */
export function TokenAvatar({
  symbol,
  className,
}: {
  symbol: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-dim font-semibold text-brand text-kicker uppercase",
        className,
      )}
    >
      {symbol.slice(0, 3)}
    </span>
  );
}

/** A figure with its label under it. The header's unit, repeated three times. */
function HeaderStat({ label, value }: { label: string; value: string }) {
  return (
    // The figure reads first and the label explains it, so they are ordered
    // that way visually and left in term-then-description order in the markup.
    <div className="flex flex-col gap-0.5 text-right">
      <dt className="order-2 text-kicker text-fg-subtle">{label}</dt>
      <dd className="figures order-1 text-caption">{value}</dd>
    </div>
  );
}

/**
 * The identity strip: which market, what it costs, what it has done.
 *
 * Two shapes, because the two modes want different things from it.
 *
 * `panel` is the desk's: its own surface above the chart, carrying the three
 * 24h figures on the right. A trader reads high, low and volume before
 * deciding anything, so they are worth a row.
 *
 * `inline` is Draw's: no panel, no stats, folded into the top of the chart it
 * describes. Someone who has never traded does not care what the 24h high was
 * — it is a number with no decision attached to it — and the room it was taking
 * is better spent on candles. The name, the price and today's move are the
 * whole of what that reader is asking.
 *
 * Either way the left half is a button that opens the market picker. The thing
 * you press to change what you are looking at should be the thing showing what
 * you are looking at; that is how every trading screen a reader has used works,
 * and it is what the chevron is promising.
 */
export function MarketHeader({
  market,
  variant = "panel",
  collapsed = false,
  onCollapsed,
  className,
}: {
  market: Market;
  variant?: "panel" | "inline";
  collapsed?: boolean;
  onCollapsed?: (collapsed: boolean) => void;
  className?: string;
}) {
  const [picking, setPicking] = useState(false);
  const up = market.change >= 0;
  const panel = variant === "panel";

  return (
    <header
      className={cn(
        // `items-center`, not `items-end`. Baseline-aligning a 44px plate, a
        // two-line name block and a pair of stacked stats put the three at
        // three different heights and left the row looking like it had slipped.
        // Nowrap once there is room for one line, so the chevron sits on the
        // row rather than above it. Pinned to the corner it had nothing to
        // align to and read as a stray mark between the last figure and the
        // panel edge; here it is the last item on a line of items. Below `xl`
        // the panels are full width and wrapping is what should happen.
        // Packed, not spread. The panel is sized to its content now, so there
        // is no slack for `justify-between` to push into the middle — which is
        // what the gap between the price and the 24h figures was.
        "flex items-center gap-x-8 gap-y-5 max-xl:flex-wrap",
        // The right gutter is the chevron's. It is pinned to the corner rather
        // than laid out at the end of the row, so it lands in the same place as
        // the account panel's beside it — two panels in a row with their folds
        // at different heights read as two unrelated controls.
        panel
          ? "panel relative rounded-4xl p-3 pr-12 sm:p-4 sm:pr-14"
          : "px-1 pb-3",
        className,
      )}
    >
      {/*
        Two shapes, one button.
        
        Open, the name sits over the price: set on one line the identity came to
        ~460px before the 24h figures started, which left the last of them butted
        against the fold chevron and, on a phone, either truncated the market's
        own name to nothing or pushed the change pill off the side.
        
        Folded, there are no 24h figures to make room for, so the same content
        goes on one line and the panel becomes the thin bar it should be. A fold
        that keeps the panel the same height is not a fold.
      */}
      <button
        aria-haspopup="dialog"
        className={cn(
          "rowable -m-1 flex min-w-0 rounded-3xl p-1 pr-3 text-left",
          collapsed
            ? "flex-wrap items-center gap-x-3 gap-y-1"
            : "items-center gap-4",
        )}
        onClick={() => setPicking(true)}
        type="button"
      >
        <TokenAvatar
          className={collapsed ? "size-9" : undefined}
          symbol={market.symbol}
        />

        {collapsed ? (
          <>
            <span className="min-w-0 truncate text-title">{market.name}</span>
            <ChevronDownIcon className="size-4 shrink-0 text-fg-subtle" />
            <span className="figures text-price">${fmtPrice(market.price)}</span>
            <Pill tone={up ? "up" : "down"}>
              <span className="figures">{signedPct(market.changePct)}</span>
              <span className="ml-1 opacity-70">today</span>
            </Pill>
          </>
        ) : (
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-title">{market.name}</span>
              <ChevronDownIcon className="size-4 shrink-0 text-fg-subtle" />
            </span>

            <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="figures text-price">
                ${fmtPrice(market.price)}
              </span>
              <Pill tone={up ? "up" : "down"}>
                <span className="figures">{signedPct(market.changePct)}</span>
                <span className="ml-1 opacity-70">today</span>
              </Pill>
            </span>
          </span>
        )}
      </button>

      {/*
        The fold takes the 24h figures out of the row rather than out of a
        drawer under it, so folding costs the panel no height and gains it none
        — it is decluttering, not collapsing. What survives is the price and
        today's move, which is the pair a reader opened it for.

        Wraps rather than overflows: three stats at a 24px gap need ~290px, and
        a phone has about that once the page and panel padding are off.
      */}
      {panel && !collapsed ? (
        <dl className="ml-auto flex shrink-0 flex-wrap justify-end gap-x-6 gap-y-3 sm:gap-x-10">
          <HeaderStat label="24h high" value={`$${fmtPrice(market.high24h)}`} />
          <HeaderStat label="24h low" value={`$${fmtPrice(market.low24h)}`} />
          <HeaderStat label="24h traded" value={compactUsd(market.volume24h)} />
        </dl>
      ) : null}

      {panel && onCollapsed ? (
        <FoldButton
          className="absolute top-3 right-3 sm:top-4 sm:right-4"
          collapsed={collapsed}
          onCollapsed={onCollapsed}
          title="the 24 hour figures"
        />
      ) : null}

      <TokenPicker current={market} onOpenChange={setPicking} open={picking} />
    </header>
  );
}
