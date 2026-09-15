import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "skech, draw the chart and trade the line";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/*
 * The card, on the same paper as the page.
 *
 * It mirrors the hero rather than inventing a layout: warm white ground, the
 * headline in heading ink, and the product as a dark panel underneath, because
 * that is the one arrangement a reader who lands on the site will recognise.
 *
 * The chart is bars rather than a curve, which Satori cannot draw. The split
 * between history and the drawn half is the whole idea of the product, so the
 * bars change colour at it.
 */
const BARS = 46;
const SPLIT = 30;

// Deterministic, so the card is byte-identical on every build.
const HISTORY = Array.from({ length: SPLIT }, (_, i) => {
  const t = i / (SPLIT - 1);
  return 22 + t * 34 + (((i * 29) % 11) - 5) * 2.6;
});
// The drawn half rises, which is what somebody would actually draw.
const DRAWN = Array.from({ length: BARS - SPLIT }, (_, i) => {
  const t = i / (BARS - SPLIT - 1);
  return 58 + t * 46 + (((i * 17) % 7) - 3) * 2.2;
});

export default async function OpengraphImage() {
  // The ink copy, not the white mask: this ground is paper. See
  // scripts/prepare-assets.mjs.
  const mark = await readFile(
    join(process.cwd(), "public/assets/logo-mark-ink.png"),
  );

  // Satori cannot read woff2, so next/font is unavailable here. Figtree ships
  // a TTF, which is the same display face the page is set in.
  const [regular, semibold] = await Promise.all([
    readFile(join(process.cwd(), "src/app/_fonts/Figtree-400.ttf")),
    readFile(join(process.cwd(), "src/app/_fonts/Figtree-600.ttf")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: 64,
          backgroundColor: "#ffffff",
          fontFamily: "Figtree",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
          <img
            alt=""
            height={30}
            src={`data:image/png;base64,${mark.toString("base64")}`}
            width={38}
          />
          <span style={{ color: "#343433", fontSize: 29, fontWeight: 600 }}>
            skech
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              color: "#343433",
              fontSize: 78,
              fontWeight: 600,
              letterSpacing: "-0.032em",
              lineHeight: 1.04,
            }}
          >
            Draw the chart.
          </span>
          <span
            style={{
              color: "#343433",
              fontSize: 78,
              fontWeight: 600,
              letterSpacing: "-0.032em",
              lineHeight: 1.04,
            }}
          >
            Trade the line.
          </span>
          <span
            style={{
              marginTop: 22,
              color: "#5f5c59",
              fontSize: 26,
              lineHeight: 1.45,
            }}
          >
            Draw where you think the price is going. That&rsquo;s the trade.
          </span>
        </div>

        {/* The product, as a dark panel. Every chart on the site is one. */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 32,
            height: 150,
            padding: "0 28px 24px",
            borderRadius: 14,
            backgroundColor: "#1b1a18",
          }}
        >
          {/* 46 bars at 13+6 fill the panel up to the URL; at the old 7+4
              they sat in the left half with a hole beside them. */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
            {HISTORY.map((h, i) => (
              <div
                key={`h${i}`}
                style={{
                  width: 13,
                  height: h,
                  borderRadius: 3,
                  backgroundColor: "#3a3733",
                }}
              />
            ))}
            {DRAWN.map((h, i) => (
              <div
                key={`d${i}`}
                style={{
                  width: 13,
                  height: h,
                  borderRadius: 3,
                  backgroundColor: "#8fb0ff",
                }}
              />
            ))}
          </div>
          <span style={{ color: "#a8a19a", fontSize: 21, paddingBottom: 2 }}>
            skech.trade
          </span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Figtree", data: regular, weight: 400, style: "normal" },
        { name: "Figtree", data: semibold, weight: 600, style: "normal" },
      ],
    },
  );
}
