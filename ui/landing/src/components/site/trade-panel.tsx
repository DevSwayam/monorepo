import { cn } from "@/lib/utils";
import { DERIVED, fmtSigned, fmtUsd, MARKET, ORDER } from "./market-data";
import { TradeChart } from "./trade-chart";

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-fg-subtle text-sm">{label}</span>
      <span
        className={cn(
          "font-mono text-sm tabular-nums",
          accent ? "text-brand" : "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}

const SPAN = ORDER.target - ORDER.invalidation;
const ENTRY_PCT = ((ORDER.entry - ORDER.invalidation) / SPAN) * 100;

/**
 * The product, not a picture of the product.
 *
 * Everything here is markup: the chrome, the chart geometry, the order the
 * drawing produced. A page selling an interface cannot ask a trader to trust a
 * render of one.
 *
 * The rail has no rules inside it. Grouping is spacing, which is what separates
 * a panel that looks designed from one that looks like a table with borders
 * switched on. The space under the figures carries the position on its own
 * scale, so the rail ends on something worth reading rather than on air.
 */
export function TradePanel({ className }: { className?: string }) {
  return (
    <div className={cn("border-border border-t bg-surface", className)}>
      <div className="flex items-center gap-4 border-border border-b px-5 py-3.5">
        <span className="font-medium text-foreground text-sm">
          {MARKET.symbol}
        </span>
        <span className="font-mono text-foreground text-sm tabular-nums">
          {fmtUsd(MARKET.last, 2)}
        </span>
        <span className="font-mono text-up text-xs tabular-nums">
          {fmtSigned(MARKET.change24h)}%
        </span>
        <span className="ml-auto hidden items-center gap-1.5 text-fg-subtle text-xs sm:flex">
          funding
          <span className="font-mono text-fg-muted tabular-nums">
            {fmtSigned(MARKET.funding, 4)}%
          </span>
        </span>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="relative">
          <TradeChart className="h-full w-full" />
        </div>

        <aside className="ticket-in flex flex-col gap-7 border-border p-6 lg:border-l max-lg:border-t">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-fg-subtle text-kicker">
              Your skech
            </span>
            <span className="font-mono text-brand text-xs">
              {ORDER.side} {ORDER.leverage}×
            </span>
          </div>

          <div className="space-y-3.5">
            <Row label="Entry" value={fmtUsd(ORDER.entry, 2)} />
            <Row accent label="Target" value={fmtUsd(ORDER.target, 2)} />
            <Row label="Invalidation" value={fmtUsd(ORDER.invalidation, 2)} />
          </div>

          <div className="space-y-3.5">
            <Row label="Size" value={`${ORDER.size} BTC`} />
            <Row label="Margin" value={`$${fmtUsd(DERIVED.margin)}`} />
            <Row
              label="Est. liquidation"
              value={fmtUsd(ORDER.liquidation, 2)}
            />
          </div>

          {/* Fills the tail of the rail: where the position sits between the
              two prices that end it. */}
          <div className="mt-auto">
            <div className="relative h-2">
              <div
                className="absolute inset-y-0 left-0 bg-fg-subtle/50"
                style={{ width: `${ENTRY_PCT}%` }}
              />
              <div
                className="absolute inset-y-0 right-0 bg-brand"
                style={{ width: `${100 - ENTRY_PCT}%` }}
              />
              <span
                className="-translate-x-1/2 -top-1.5 absolute h-5 w-0.5 bg-foreground"
                style={{ left: `${ENTRY_PCT}%` }}
              />
            </div>
            <div className="mt-3.5 flex items-baseline justify-between font-mono text-xs tabular-nums">
              <span className="text-fg-subtle">
                −${fmtUsd(DERIVED.risk)}
              </span>
              <span className="text-fg-subtle">
                {DERIVED.rr.toFixed(1)}R
              </span>
              <span className="text-brand">+${fmtUsd(DERIVED.reward)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
