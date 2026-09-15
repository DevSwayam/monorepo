import { type Candle, CANDLES, ORDER } from "./market-data";

/**
 * Real BTC candles for the drawable chart.
 *
 * The landing page asks someone to draw where they think the price is going.
 * Asking that over a seeded random walk is asking them to have an opinion
 * about nothing, and the first thing anyone who knows the market will do is
 * check whether the number is right. So the chart runs on the real thing.
 *
 * Coinbase's public candles endpoint: no key, no rate limit worth worrying
 * about at one call a minute, and reachable from a US server, which Binance is
 * not. Rows come back newest-first as [time, low, high, open, close, volume].
 *
 * Fetched on the server and cached for a minute, so a burst of visitors is one
 * upstream call rather than one each, and no key or origin is ever exposed to
 * the browser. If it fails for any reason the page falls back to the seeded
 * series it used to ship — a landing page must not go blank because an
 * exchange had a bad minute.
 */

const ENDPOINT =
  "https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=3600";

type Market = {
  candles: Candle[];
  /** Last close, which is where a trade drawn right now would start. */
  price: number;
  /** False when we are showing the seeded fallback. */
  live: boolean;
};

const FALLBACK: Market = {
  candles: CANDLES,
  price: ORDER.entry,
  live: false,
};

export async function getBtcMarket(bars = 56): Promise<Market> {
  try {
    const res = await fetch(ENDPOINT, {
      headers: { Accept: "application/json", "User-Agent": "skech.trade" },
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      return FALLBACK;
    }

    const raw: unknown = await res.json();
    if (!Array.isArray(raw)) {
      return FALLBACK;
    }

    const candles: Candle[] = raw
      .slice(0, bars)
      .reverse()
      .flatMap((row) => {
        if (!Array.isArray(row) || row.length < 5) {
          return [];
        }
        const [, l, h, o, c] = row as unknown[];
        const bar = { o: Number(o), h: Number(h), l: Number(l), c: Number(c) };
        // A single malformed row would flatten the price scale for the whole
        // chart, so anything that is not four real numbers is dropped.
        return Object.values(bar).every((n) => Number.isFinite(n) && n > 0)
          ? [bar]
          : [];
      });

    if (candles.length < 20) {
      return FALLBACK;
    }
    return { candles, price: candles[candles.length - 1].c, live: true };
  } catch {
    return FALLBACK;
  }
}
