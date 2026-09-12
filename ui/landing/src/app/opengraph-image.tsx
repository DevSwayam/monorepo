import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "skech, draw the chart and trade the line";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// A small deterministic series, so the card always draws the same chart.
const BARS = Array.from({ length: 28 }, (_, i) => {
  const t = i / 27;
  return 18 + t * 58 + (((i * 29) % 11) - 5) * 3;
});

export default async function OpengraphImage() {
  const mark = await readFile(
    join(process.cwd(), "public/assets/logo-mark-alpha.png"),
  );

  // Satori has no access to next/font and cannot read woff2, so the pixel face
  // used on the site is unavailable here. Geist ships TTFs, which it can.
  const [regular, bold] = await Promise.all([
    readFile(join(process.cwd(), "src/app/_fonts/Geist-400.ttf")),
    readFile(join(process.cwd(), "src/app/_fonts/Geist-700.ttf")),
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
          padding: 72,
          backgroundColor: "#09090b",
          fontFamily: "Geist",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img
            alt=""
            height={34}
            src={`data:image/png;base64,${mark.toString("base64")}`}
            width={43}
          />
          <span style={{ color: "#fafafa", fontSize: 30, fontWeight: 700 }}>
            skech
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              color: "#a1a1aa",
              fontSize: 82,
              fontWeight: 400,
              letterSpacing: "-0.035em",
              lineHeight: 1.02,
            }}
          >
            Draw the chart.
          </span>
          <span
            style={{
              color: "#fafafa",
              fontSize: 82,
              fontWeight: 700,
              letterSpacing: "-0.035em",
              lineHeight: 1.02,
            }}
          >
            Trade the line.
          </span>
          <span
            style={{
              marginTop: 26,
              color: "#a1a1aa",
              fontSize: 27,
              lineHeight: 1.5,
            }}
          >
            Perpetuals you open by drawing the price path you expect.
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
          }}
        >
          {/* A chart, built from bars because Satori cannot draw a curve. */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 80 }}>
            {BARS.map((h, i) => (
              <div
                key={i}
                style={{
                  width: 7,
                  height: h,
                  backgroundColor: i > 20 ? "#ff6b35" : "#2a2a30",
                }}
              />
            ))}
          </div>
          <span style={{ color: "#82828d", fontSize: 22 }}>skech.trade</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Geist", data: regular, weight: 400, style: "normal" },
        { name: "Geist", data: bold, weight: 700, style: "normal" },
      ],
    },
  );
}
