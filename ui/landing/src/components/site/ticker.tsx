import { cn } from "@/lib/utils";
import { fmtSigned, TICKER } from "./market-data";

/**
 * Market strip, edge to edge.
 *
 * Each cell is a three-column grid rather than a flex row, so the symbol, price
 * and change line up vertically across every cell. With flex, each column sat
 * wherever the text before it happened to end and the strip read as ragged.
 */
export function Ticker({ className }: { className?: string }) {
  return (
    <div
      aria-label="Market prices"
      className={cn("overflow-x-auto", className)}
      role="region"
      tabIndex={0}
    >
      <ul className="flex min-w-max md:min-w-0">
        {TICKER.map((t) => (
          <li
            className="grid flex-1 grid-cols-[2.5rem_minmax(0,1fr)_4rem] items-baseline gap-3 border-border border-r px-5 py-3 last:border-r-0"
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
                t.change >= 0 ? "text-brand" : "text-fg-subtle",
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
