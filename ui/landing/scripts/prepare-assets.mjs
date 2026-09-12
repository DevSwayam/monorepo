/**
 * Asset pipeline. Run: bun run assets
 *
 * The site draws its own chart, candles, meters and strokes, so there is very
 * little left to prepare. Two things come out of here:
 *
 *   1. logo-mark-alpha, the mark rebuilt as white-on-transparent so it can be
 *      used as a CSS mask and tinted with currentColor.
 *   2. src/app/icon.png, drawn rather than downscaled.
 *
 * public/assets/logo-mark.png is the only source input. Everything else that
 * used to live there was illustration the page no longer uses.
 */
import sharp from "sharp";

const DIR = "public/assets";

/**
 * The source mark is opaque ink on opaque black, so using it directly as a CSS
 * mask paints a solid rectangle: a mask reads the *alpha* channel and every
 * pixel is alpha 255. This rebuilds it as white-on-transparent with alpha taken
 * from luminance, which makes it tintable and freely dimmable.
 */
async function toAlphaMask(input, out, gain = 1.35) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const px = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0; i < info.width * info.height; i++) {
    const s = i * info.channels;
    const lum = 0.2126 * data[s] + 0.7152 * data[s + 1] + 0.0722 * data[s + 2];
    const d = i * 4;
    px[d] = 255;
    px[d + 1] = 255;
    px[d + 2] = 255;
    px[d + 3] = Math.min(255, Math.round(lum * gain));
  }
  await sharp(px, {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).toFile(out);
}

// The mark floats in a lot of dead space; at 24px in the nav that would render
// as a speck, so trim to the ink first.
const trimmed = await sharp(`${DIR}/logo-mark.png`)
  .trim({ threshold: 12 })
  .toBuffer();
const { width, height } = await sharp(trimmed).metadata();
console.log(`trimmed logo-mark -> ${width}x${height}`);

await toAlphaMask(trimmed, `${DIR}/logo-mark-alpha.png`);
const webp = await sharp(`${DIR}/logo-mark-alpha.png`)
  .webp({ quality: 82, effort: 5 })
  .toFile(`${DIR}/logo-mark-alpha.webp`);
console.log(`wrote logo-mark-alpha.png and .webp (${Math.round(webp.size / 1024)}kb)`);

// App icon, drawn rather than downscaled.
//
// The source mark is a rendered squiggle with fine tapering ends; shrunk to
// 16px it turns to mush. This is the same gesture rebuilt as geometry with one
// bend and one lit head, at a stroke weight that still lands on a whole pixel
// at 16px (64/512 of the canvas is ~2px there).
const ICON = 512;
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ICON}" height="${ICON}" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#09090b"/>
  <path d="M104 376 C 176 352, 220 314, 266 266 S 342 186, 376 152"
        fill="none" stroke="#ff6b35" stroke-width="64" stroke-linecap="round"/>
  <circle cx="392" cy="140" r="46" fill="#fafafa"/>
</svg>`;
await sharp(Buffer.from(iconSvg)).png().toFile("src/app/icon.png");
console.log(`wrote src/app/icon.png (${ICON}x${ICON}, drawn)`);
