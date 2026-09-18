# @skech/app

The trading screen.

```
/                    → /app
/app                 → /app/<the one listed market>
/app/[token]         the screen. Any other address is a 404.
```

`bun run dev` from here, or `bun run dev:app` from the repo root.

## What this is

An **interface**, and only that. Nothing is wired: no wallet, no contracts, no
feed. Every number comes from `src/components/trade/market.ts`, which generates
a market, a candle series, a book, a tape, positions, resting orders and fills
from a seed derived from the token address — so the same URL always draws the
same chart.

The layout follows [xStream](https://github.com/LeoFranklin015/xStream)'s
`app/markets/[ticker]`: identity across the top, chart and open positions down
the left, order ticket down the right. The material is ours.

Bitcoin is the only listed market. Adding a second one is a row in `KNOWN` plus
its address in `LISTED`; nothing below that line knows there is only one.

## Draw and Desk

One screen at two densities, switched from the app bar. `src/components/
trade/mode.ts` is the only place the difference is written down — every
component takes `mode` and reads `shows(...)`, so a fix lands in both.

The words are deliberate. "Lite" and "Pro" rank the reader, and the product is
aimed at people who have never traded, so the default cannot be the one that
reads as training wheels. **Draw** is what you do there: the chart is the whole
screen and the line you draw on it is the trade. **Desk** is a trading desk — a
place, not a skill level.

| | Draw | Desk |
| --- | --- | --- |
| Chart | candles, fastest bar, full height | + timeframes, type, EMA, bands, volume, RSI, MACD, log scale |
| Identity | inside the chart, price and today's move only | its own folding panel, with the 24h figures |
| Ticket | size wheel, leverage meter, long/short | the full eleven-field ticket |
| Order book and tape | — | ✓ (click a row to set your price) |
| Equity / margin / health | — | ✓ |
| Order types | — | market, limit, + trigger behind **Advanced** |
| Margin mode, reduce-only, post-only | — | ✓, behind **Advanced** |
| Below the chart | — | positions, resting orders, fills |

Draw has no timeframe row. Picking a bar length is a question about how you
intend to trade, asked before you have done anything, and the honest answer for
the reader Draw is for is "I do not know what a 4-hour candle is". It runs on
the fastest bar, which is also the one that makes a drawn line resolve in
minutes. The desk trader's own choice is kept rather than overwritten, so
flipping to Draw and back does not quietly edit a setting.

Draw's two controls are the landing page's two cards made real — the scroll
wheel from `ui/landing/src/components/site/amount-wheel.tsx` and the notched
leverage meter from `how-it-works.tsx`, both now interactive and wired to the
order. A marketing page that shows a control the product does not have is a lie
told in a nice font.

## Folding panels

Nobody uses the whole screen, so the market header, the account block, the
book, the ticket and the positions list all fold.

**Every fold collapses to the figure you would have opened it for.** The market
header keeps the price and today's move and drops the 24h set; the account keeps
equity and health and drops the four that explain them; the positions row keeps
its tab strip. A panel that collapses to nothing is a panel you turned off. A column folds sideways into a 44px rail with its name set
vertically; the positions row folds up into its own tab strip, which stays
live. `CollapsiblePanel` is the chrome — fill, radius, header row, chevron —
and each panel hands it the control it already had at the top, so the header is
"Book | Trades ›" rather than a title row plus a tab strip.

The desk is one grid, three rows deep: header and account on the first, chart
and book on the second, positions on the third, ticket spanning all three on the
right. The ticket running full height is what puts the buy/sell button on screen
without a scroll — it was below the fold while the account block sat above it —
and the ticket body scrolls under a footer that stays put, so the side is at the
top of the panel and the button at the bottom whatever is happening between them.

The chart row is the flexible one, so the height the ticket asks for lands in
the chart instead of as an empty half-panel under the volume histogram.

The grid template is rebuilt from what is open, so a folded column gives its
width back to the chart. The chart's time scale is pinned with
`lockVisibleTimeRangeOnResize` and `fixLeftEdge`, or that reclaimed width
arrives as an empty strip beside the candles instead of as more chart.

## The app bar

Wordmark, a search field, cash, the mode switch and the account menu. Search is
inert — there is one market — and says so in its own placeholder rather than
being greyed out, because it is a promise about the shape of the product, not a
control that is broken. Below `md` it drops to its own full-width line and the
cash chip hides into the menu.

The market header is the trigger for the market picker: the thing you press to
change what you are looking at is the thing showing what you are looking at.

**What is behind "Advanced", and why.** A trader sets a direction, an amount, a
leverage and usually an exit on every order — those stay out. Margin mode is
answered once and never again; reduce-only and post-only manage an existing
book rather than open a position; a trigger turns the order into a different
kind of order. Those four fold away.

Stop loss and take profit are deliberately *not* behind it. Most people use
them, and on this product "where do I get out" is the question the landing page
is built around — hiding it would be hiding the point.

## The chart

`lightweight-charts` 5.x (TradingView, Apache-2.0, one dependency). It replaced
~470 lines of hand-drawn SVG when pro mode asked for pan, zoom, scrollback, a
log scale, four series types and panes of indicators.

Two things it does not do, both handled in `chart.tsx`:

- **Colour.** It draws to a canvas and takes colour as strings, so it cannot
  follow a CSS variable. `theme.ts` reads the palette out of computed styles and
  flattens it to sRGB by painting each value on a 1×1 canvas. That flattening is
  not optional: `--up` in light is a `color(display-p3 …)`, which the browser
  paints correctly and the library's own parser rejects outright —
  `Failed to parse color`, and the chart renders nothing.
- **Draggable levels.** `IPriceLine` is display-only. The line is theirs; the
  grip is an absolutely positioned strip whose `y` comes from
  `priceToCoordinate` on a rAF loop, written straight to the DOM. Draggable
  levels also extend the price scale through `autoscaleInfoProvider`, capped at
  half the candle range — without that a stop dragged past the low leaves the
  chart and the next drag starts from the wrong price.

Pane heights use `setStretchFactor`, not `setHeight`: setting absolute heights
on three of four panes in one tick collapses every pane to zero.

## The design system

Tokens, type scale and materials are the landing's, in `src/app/globals.css`.
Four files are deliberate copies of `ui/landing` and should be edited together
with their originals:

| here | there |
| --- | --- |
| `src/lib/utils.ts` | same, plus the `price` type step |
| `src/components/ui/button.tsx` | identical but for import order |
| `src/components/ui/spinner.tsx` | identical |
| `src/components/site/type.tsx` | identical |

They are copies because there is no shared package yet. If a third consumer
appears, that is the moment to make one rather than copy again.

What this file adds on top of the landing's system — three things, all
structural. **No colour is added.** `--up`, `--down`, `--warning` and `--brand`
are the whole palette, and a tint is one of those at an alpha (`bg-up/10`), not
a token of its own. On a coloured fill the foreground is always `var(--bg)`,
which is white on `#15803d` in light (4.93:1) and `#121110` on `#4ade80` in dark
(13.6:1) — one expression, correct in both.

- `--app-bg`, a ground a shade below the panel fill, so touching panels read as
  separate objects without borders.
- `--thumb`, the raised segment in a segmented control.
- `--text-price`, one step between title and heading, for the one big number.

Panels are flat fills with a large radius and no border. Wells are cut into
them. That is the whole material vocabulary — if two things need to read as
separate, they get separate surfaces, never a hairline.

Every pressable thing is `<Button>` or a `<Segmented>` segment. The rule between
them: a `Segmented` is a selection that stays true (leverage preset, order
type), a `Button` is a one-shot that stops being true the moment you type
(the 25% / 50% / Max shortcuts).

Menus and dialogs are Base UI (already a dependency — `Button` is built on it)
in a `floating` surface: a fill, a hairline ring and the one shadow on this
screen that is earned. That shadow is a `@utility` and not an arbitrary
`shadow-[...]`, because Tailwind cannot parse a `var()` that itself holds a
comma-separated shadow — it compiled to `rgba(0,0,0,0) 0 0 0 0` and the menu
came out with no edge at all.

Blurring balances is one CSS rule on `[data-blurred] .figures`, not a prop
threaded through thirty components: the class that makes a figure a figure is
also the class that marks what someone could read over your shoulder.

Light only, like the landing. The dark tokens are defined and switched off in
one place (`src/app/layout.tsx`).

## Known gaps

- The ticket does not print "the most you can lose", which is the landing's
  replacement for the word *liquidation*. That line is still blocked on whether
  a loss here can exceed the deposit — see `ui/landing/CONTENT.md`. It says
  "wiped out at $X" instead, which is a price rather than a promise.
