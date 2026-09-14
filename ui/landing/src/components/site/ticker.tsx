import { cn } from "@/lib/utils";
import { fmtSigned, TICKER } from "./market-data";

/**
 * Market strip, closing out the hero card.
 *
 * Each cell is a three-column grid rather than a flex row, so the symbol, price
 * and change line up vertically across every cell. With flex, each column sat
 * wherever the text before it happened to end and the strip read as ragged.
 *
 * Cells are separated by a sliver of the ground showing through rather than by
 * rules: the strip is a row of tiles on the card, and on a page with no borders
 * anywhere else, one row of them here would look like a leftover.
 */
export function Ticker({ className }: { className?: string }) {
  return (
    <div
      aria-label="Market prices"
      className={cn("overflow-x-auto px-3 pb-3 md:px-4 md:pb-4", className)}
      role="region"
      tabIndex={0}
    >
      <ul className="flex min-w-max gap-1 md:min-w-0">
        {TICKER.map((t) => (
          <li
            className="grid flex-1 grid-cols-[2.5rem_minmax(0,1fr)_4rem] items-baseline gap-3 rounded-lg bg-surface-2/70 px-3.5 py-2.5 transition-colors duration-fast ease-smooth-out hover:bg-surface-3"
            key={t.symbol}
          >
            <span className="font-mono text-fg-subtle text-xs">
              {t.symbol.replace("-PERP", "")}
            </span>
            <span className="text-right font-mono text-foreground text-xs tabular-nums">
              {t.price.toLocaleString("en-US", {
                minimumFractionDigits: t.price < 10 ? 4 : 2,
                maximumFractionDigits: t.price < 10 ? 4 : 2,
              })}
            </span>
            <span
              className={cn(
                "text-right font-mono text-xs tabular-nums",
                t.change >= 0 ? "text-up" : "text-down",
              )}
            >
              {fmtSigned(t.change)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
