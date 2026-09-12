import { cn } from "@/lib/utils";
import { fmtSigned, type MiniCandle, miniCandles, TICKER } from "./market-data";
import { GlowDot } from "./glow-dot";
import { Band, SectionHead } from "./ui";

function Candles({
  data,
  lit,
}: {
  data: MiniCandle[];
  /** Only the hottest market gets the lit head. Two would make it a pattern. */
  lit?: boolean;
}) {
  // The viewBox aspect has to be close to the rendered box or non-uniform
  // scaling squashes every candle. This was 100x44 stretching into roughly
  // 380x56, i.e. 3.5x horizontally, which is why the bodies read as smears.
  const W = 300;
  const H = 56;
  const lo = Math.min(...data.map((k) => k.l));
  const hi = Math.max(...data.map((k) => k.h));
  const span = hi - lo || 1;
  const y = (v: number) => H - ((v - lo) / span) * (H - 8) - 4;
  const step = W / data.length;
  const body = Math.min(step * 0.6, 11);
  const last = data[data.length - 1];

  return (
    <div className="relative">
      <svg
        aria-hidden="true"
        className="h-14 w-full"
        preserveAspectRatio="none"
        viewBox={`0 0 ${W} ${H}`}
      >
        {data.map((k, i) => {
          const cx = i * step + step / 2;
          const up = k.c >= k.o;
          const top = y(Math.max(k.o, k.c));
          const bottom = y(Math.min(k.o, k.c));
          const colour = up ? "var(--brand)" : "var(--fg-subtle)";
          return (
            <g key={i} opacity={up ? 1 : 0.55}>
              <line
                stroke={colour}
                strokeWidth="1.4"
                x1={cx}
                x2={cx}
                y1={y(k.h)}
                y2={y(k.l)}
              />
              <rect
                fill={colour}
                height={Math.max(1.6, bottom - top)}
                width={body}
                x={cx - body / 2}
                y={top}
              />
            </g>
          );
        })}
      </svg>
      {lit ? (
        <GlowDot
          halo={18}
          left={100 - (step / 2 / W) * 100}
          size={4}
          top={(y(last.c) / H) * 100}
        />
      ) : null}
    </div>
  );
}

/** The biggest mover on the board, and the only tile that glows. */
const HOTTEST = TICKER.reduce((a, b) => (b.change > a.change ? b : a)).symbol;

/**
 * §5, markets as tiles, not a spreadsheet.
 *
 * The table was accurate and cold. A grid of tiles with a trace on each reads
 * at a glance, which is how someone actually picks a market. Prices are
 * illustrative, see market-data.ts, and there are no invented volume, TVL or
 * user numbers anywhere on this page.
 */
export function Markets() {
  return (
    <Band id="markets">
      <SectionHead
        id="markets-title"
        kicker="Markets"
        lead="Majors at launch, and more as liquidity turns up. Connect a wallet and draw. There's nothing to install and nobody to ask."
      >
        No bell. No weekend.
      </SectionHead>

      <ul className="grid sm:grid-cols-2 lg:grid-cols-3">
        {TICKER.map((t, i) => {
          const up = t.change >= 0;
          return (
            <li
              className={cn(
                "group border-border px-5 py-7 transition-colors hover:bg-surface md:px-8",
                "border-b",
                i % 2 === 0 && "sm:border-r lg:border-r",
                i % 3 !== 2 && "lg:border-r",
                i % 3 === 2 && "lg:border-r-0",
              )}
              key={t.symbol}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium text-foreground">
                  {t.symbol.replace("-PERP", "")}
                  <span className="ml-1.5 text-fg-subtle text-xs">PERP</span>
                </span>
                <span
                  className={cn(
                    "font-mono text-sm tabular-nums",
                    up ? "text-brand" : "text-fg-subtle",
                  )}
                >
                  {fmtSigned(t.change)}%
                </span>
              </div>
              <div className="mt-4 font-mono text-foreground text-xl tabular-nums tracking-[-0.02em]">
                {t.price.toLocaleString("en-US", {
                  minimumFractionDigits: t.price < 10 ? 4 : 2,
                  maximumFractionDigits: t.price < 10 ? 4 : 2,
                })}
              </div>
              <div className="mt-5">
                <Candles
                  data={miniCandles(t.symbol, t.change)}
                  lit={t.symbol === HOTTEST}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </Band>
  );
}
