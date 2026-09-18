"use client";

import { cn } from "@/lib/utils";
import { FoldButton } from "./collapsible";
import { type Account, signedUsd, usd } from "./market";

/**
 * Equity, margin, and how close the account is to the edge.
 *
 * The one thing a perp screen has that a spot screen does not, and the thing
 * xStream leaves out entirely: a reader with three positions open cannot answer
 * "how much room do I have left" from a list of positions, because the answer
 * is about the account, not about any one of them.
 *
 * Health is equity over margin used. A ratio rather than a percentage because
 * the interesting values sit just above 1, where a percentage reads as a
 * suspiciously precise 103% and a ratio reads as "1.03, that is close".
 *
 * A grid of stacked pairs, the same unit the market header sets its 24h figures
 * in, so the two panels beside each other are made of one kind of thing. They
 * were inline pairs for a while — "Equity $12,320.48" on a line — which packs
 * tighter and reads as a sentence rather than as a set of figures you scan
 * down.
 *
 * It folds with the market header beside it — one control, both panels, because
 * two panels sharing a row and folding independently leaves the row at two
 * heights and reads as a mistake. What survives here is equity: the one figure
 * that answers "what am I worth", set on a line so the panel becomes a thin bar
 * rather than staying the same height with less in it.
 */

/** A label and a figure on one line, for the folded bar. */
function Inline({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <span className="flex items-baseline gap-1.5 whitespace-nowrap">
      <dt className="text-kicker text-fg-subtle">{label}</dt>
      <dd className={cn("figures text-caption", tone)}>{value}</dd>
    </span>
  );
}

function Item({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    // The figure reads first and the label explains it, so they are ordered
    // that way visually and left in term-then-description order in the markup.
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="order-2 truncate text-kicker text-fg-subtle">{label}</dt>
      <dd className={cn("figures order-1 truncate text-caption", tone)}>
        {value}
      </dd>
    </div>
  );
}

/**
 * Four bands, at the thresholds a liquidation engine actually uses.
 *
 * One word each, and short ones: this shares a cell with a ratio, and
 * "comfortable" was long enough to truncate to "11.3× comforta…", which is
 * worse than no word at all.
 */
function healthTone(health: number): { tone: string; word: string } {
  if (health >= 2) return { tone: "text-up", word: "healthy" };
  if (health >= 1.25) return { tone: "text-foreground", word: "steady" };
  if (health >= 1.1) return { tone: "text-warning", word: "tight" };
  return { tone: "text-down", word: "at risk" };
}

export function AccountBar({
  account,
  collapsed,
  onCollapsed,
  className,
}: {
  account: Account;
  collapsed: boolean;
  onCollapsed: (collapsed: boolean) => void;
  className?: string;
}) {
  const open = Number.isFinite(account.health);
  const health = healthTone(account.health);

  return (
    <section
      aria-label="Your account"
      className={cn(
        // A flex column that centres, because this panel is stretched to the
        // height of the market header beside it. Folded to one line the content
        // sat at the top of a box twice its height, which reads as the panel
        // having lost something rather than as a line of figures.
        "panel relative flex flex-col justify-center rounded-4xl p-3 pr-12 sm:p-4 sm:pr-14",
        className,
      )}
    >
      {/* The chevron is pinned here rather than laid out, and that is right for
          this panel and wrong for the market header beside it: this is a block
          of rows, so the corner is a real position for it to hold. The header
          is one line, where a pinned chevron floats above the line it belongs
          to with nothing to align against. */}
      <FoldButton
        className={cn(
          "absolute right-3 sm:right-4",
          // Expanded it holds the corner of a block of rows; folded there is
          // only one row, and the corner is nowhere in particular.
          collapsed
            ? "-translate-y-1/2 top-1/2"
            : "top-3 sm:top-4",
        )}
        collapsed={collapsed}
        onCollapsed={onCollapsed}
        title="the top row"
      />

      {collapsed ? (
        /*
         * Small, and three of them.
         *
         * At the price step it was a second 32px figure sitting beside the
         * market's own, and two headline numbers on one row is two things
         * claiming to be the headline. This is the supporting panel, so it gets
         * the supporting size — and at that size three figures fit where one
         * used to: what you are worth, how today is going, how much room is
         * left.
         */
        <dl className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <Inline label="Equity" value={`$${usd(account.equity)}`} />
          <Inline
            label="Unrealised"
            tone={account.unrealised >= 0 ? "text-up" : "text-down"}
            value={signedUsd(account.unrealised)}
          />
          <Inline
            label="Health"
            tone={open ? health.tone : undefined}
            value={open ? `${usd(account.health, 1)}× ${health.word}` : "—"}
          />
        </dl>
      ) : (
        /* Columns sized to their content and spread across the panel, not three
           equal thirds. As thirds the figures all sat at the left of a wide
           column and the slack collected as a blank strip down the right. */
        <dl className="grid grid-cols-[repeat(2,max-content)] justify-between gap-x-8 gap-y-4 sm:grid-cols-[repeat(3,max-content)]">
          <Item label="Equity" value={`$${usd(account.equity)}`} />
          <Item
            label="Health"
            tone={open ? health.tone : undefined}
            value={open ? `${usd(account.health, 1)}× ${health.word}` : "—"}
          />
          <Item label="Balance" value={`$${usd(account.balance)}`} />
          <Item
            label="Unrealised"
            tone={account.unrealised >= 0 ? "text-up" : "text-down"}
            value={signedUsd(account.unrealised)}
          />
          <Item label="Margin used" value={`$${usd(account.used)}`} />
          <Item label="Free" value={`$${usd(account.free)}`} />
        </dl>
      )}
    </section>
  );
}
