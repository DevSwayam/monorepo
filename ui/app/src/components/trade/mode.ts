/**
 * Draw and Desk.
 *
 * One screen at two densities, rather than two screens. xStream ships this idea
 * as two separate components ("expert" and "grandma") which then drift: a fix
 * to the ticket lands in one of them and the other keeps the bug.
 *
 * The words matter. "Lite" and "Pro" rank the reader — one of them is the
 * beginner's version and everyone knows which — and the product is being aimed
 * at people who have never traded, so the default cannot be the one that reads
 * as the training wheels. **Draw** is what you do there: the chart is the whole
 * screen and the line you draw on it is the trade. **Desk** is a trading desk,
 * which is a place rather than a skill level. Neither word says the other is
 * for someone less capable.
 *
 * Here the mode is a prop, every component reads it, and the extra parts are
 * additions to a shared layout rather than a second copy of it.
 */
export type Mode = "draw" | "desk";

export const MODES: { value: Mode; label: string }[] = [
  { value: "draw", label: "Draw" },
  { value: "desk", label: "Desk" },
];

/** What each mode shows. The one place the difference is written down. */
export const SHOWS = {
  /** Order book and tape. */
  book: { draw: false, desk: true },
  /** Equity, margin and health. */
  account: { draw: false, desk: true },
  /** Chart type, overlays, studies, log scale. */
  studies: { draw: false, desk: true },
  /**
   * The timeframe row.
   *
   * Draw does not get one. Picking a bar length is a question about how you
   * intend to trade, asked before you have done anything — and the honest
   * answer for the reader Draw is for is "I do not know what a 4-hour candle
   * is". It runs on the fastest bar we have, which is also the one that makes
   * a drawn line resolve in minutes rather than days.
   */
  timeframes: { draw: false, desk: true },
  /** The order ticket down the right. */
  ticket: { draw: false, desk: true },
  /** Open positions, resting orders, fills. */
  positions: { draw: false, desk: true },
  /** Trigger orders, margin mode, reduce-only, post-only. */
  advancedOrders: { draw: false, desk: true },
  /** Resting orders and fill history, beside open positions. */
  orderHistory: { draw: false, desk: true },
} as const;

export const shows = (what: keyof typeof SHOWS, mode: Mode): boolean =>
  SHOWS[what][mode];
