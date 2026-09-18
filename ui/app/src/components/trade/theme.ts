/**
 * The design tokens, as values a canvas can paint with.
 *
 * lightweight-charts draws to a canvas, so it takes colours as strings at
 * configure time and cannot follow a CSS variable the way our SVG did. This is
 * the bridge, and it is the whole cost of the library: one place where the
 * palette is read out of CSS instead of referenced.
 *
 * It is a read, not a second copy. `globals.css` stays the only place a colour
 * is *decided* — if a token changes there, the chart changes with it, and a
 * token that is deleted shows up here as a missing key rather than as a stale
 * hex quietly diverging from the rest of the page.
 *
 * Every value is converted to sRGB on the way through, and that conversion is
 * not optional. `--up` in light resolves to `color(display-p3 …)` inside an
 * `@supports` block — correct CSS, painted correctly by the browser, and
 * rejected outright by lightweight-charts, which parses colour strings itself
 * rather than asking the platform:
 *
 *     Error: Failed to parse color: color(display-p3 0.168627 0.384314 0.87)
 *
 * and the chart renders nothing at all. So the value is painted onto a 1×1
 * canvas and read back as bytes. The canvas is an sRGB surface, so the read is
 * the conversion; it also validates, since a string the canvas rejects leaves
 * the sentinel behind.
 *
 * The P3 values stay in `globals.css`. They are right there — a wide-gamut
 * screen shows a better green for the page — and this is the one consumer that
 * needs them flattened.
 */

/** Every token the chart paints with. Keys are CSS custom property names. */
const TOKENS = {
  up: "--up",
  upMark: "--up-mark",
  down: "--down",
  downMark: "--down-mark",
  brand: "--brand",
  warning: "--warning",
  fg: "--fg",
  fgMuted: "--fg-muted",
  fgSubtle: "--fg-subtle",
  bg: "--bg",
  surface: "--surface",
  surface2: "--surface-2",
  surface3: "--surface-3",
  grid: "--grid-line",
  hairline: "--hairline",
} as const;

export type Palette = Record<keyof typeof TOKENS, string> & {
  /** `up` and `down` at an alpha, for the volume histogram under the candles. */
  upSoft: string;
  downSoft: string;
};

/**
 * Last resort, if a token is missing or the browser will not parse its value.
 *
 * These are the light theme's sRGB values. They exist so a chart still paints
 * something readable rather than defaulting to black on black; they are not a
 * second palette and nothing should read them directly.
 */
const FALLBACK: Record<keyof typeof TOKENS, string> = {
  up: "#15803d",
  upMark: "#16a34a",
  down: "#c4291d",
  downMark: "#e5352b",
  brand: "#2b62de",
  warning: "#b45309",
  fg: "#343433",
  fgMuted: "#5f5c59",
  fgSubtle: "#736f6b",
  bg: "#ffffff",
  surface: "#fbfaf9",
  surface2: "#f6f4ef",
  surface3: "#efece6",
  grid: "#f2f0ed",
  hairline: "#e9e6e1",
};

/** A sentinel no token resolves to, so a rejected value is detectable. */
const SENTINEL = "#010203";

const hex2 = (n: number) => n.toString(16).padStart(2, "0");

function resolver(): (value: string, fallback: string) => string {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return (_value, fallback) => fallback;

  return (value, fallback) => {
    const trimmed = value.trim();
    if (!trimmed) return fallback;

    ctx.fillStyle = SENTINEL;
    try {
      ctx.fillStyle = trimmed;
    } catch {
      return fallback;
    }
    // A string the canvas rejected leaves fillStyle on the sentinel. The one
    // false positive would be a token whose value *is* the sentinel, which is
    // why the sentinel is a colour no design system would choose.
    if (ctx.fillStyle === SENTINEL) return fallback;

    ctx.clearRect(0, 0, 1, 1);
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;

    return a === 255
      ? `#${hex2(r)}${hex2(g)}${hex2(b)}`
      : `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
  };
}

/** The same colour, given an alpha. Reads the `#rrggbb` produced above. */
function alpha(color: string, a: number): string {
  const parsed = /^#([0-9a-f]{6})$/i.exec(color);
  if (!parsed) return color;
  const n = Number.parseInt(parsed[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

export function readPalette(): Palette {
  const resolve = resolver();
  const style = getComputedStyle(document.documentElement);

  const out = {} as Record<keyof typeof TOKENS, string>;
  for (const key of Object.keys(TOKENS) as (keyof typeof TOKENS)[]) {
    out[key] = resolve(
      style.getPropertyValue(TOKENS[key]),
      FALLBACK[key],
    );
  }

  return {
    ...out,
    upSoft: alpha(out.up, 0.32),
    downSoft: alpha(out.down, 0.32),
  };
}

/**
 * The palette as an external store, for `useSyncExternalStore`.
 *
 * Reading it is a DOM read, so it cannot happen during a server render, and
 * doing it in an effect that calls `setState` is the cascading-render pattern
 * React now warns about. A store is the honest description anyway: the palette
 * lives in the document's computed styles, React is subscribing to it, and the
 * cache is what keeps `getSnapshot` returning the same object identity between
 * changes — without it, `useSyncExternalStore` re-renders forever.
 *
 * The subscription watches the `class` on `<html>` (how the theme is switched)
 * and the OS setting (what that switch defaults to). Dark mode is held back
 * today, so neither fires; the store exists so that turning it on is a class on
 * `<html>` and nothing else, which is the promise made in `layout.tsx`.
 */
let cached: Palette | null = null;

export function paletteSnapshot(): Palette {
  if (cached === null) cached = readPalette();
  return cached;
}

/** Null through the server render and through hydration, so the two agree. */
export function paletteServerSnapshot(): Palette | null {
  return null;
}

export function subscribePalette(onChange: () => void): () => void {
  const invalidate = () => {
    cached = null;
    onChange();
  };

  const observer = new MutationObserver(invalidate);
  observer.observe(document.documentElement, {
    attributeFilter: ["class"],
    attributes: true,
  });

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", invalidate);

  return () => {
    observer.disconnect();
    media.removeEventListener("change", invalidate);
  };
}
