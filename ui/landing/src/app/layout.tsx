import { GeistPixelSquare } from "geist/font/pixel";
import type { Metadata, Viewport } from "next";
import { Figtree, Geist_Mono, Inter } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

/*
 * Two faces, the way family.co sets its pages.
 *
 * Family runs a warm geometric grotesque on headings and Inter underneath it
 * at 17px with tracking paired to each size. Their display face is proprietary,
 * so Figtree stands in: same geometric skeleton, same slightly squared bowls,
 * and it holds up at the 500 weight the whole scale is set in. The pairing
 * matters more than the exact face, because it is what stops the headings from
 * reading as big body copy.
 *
 * Geist is gone from the text faces. It is a fine neutral grotesque and that
 * is the problem: on a warm ground it reads cold, and the warmth is the thing
 * being ported.
 */
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const figtree = Figtree({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

const SITE = "https://skech.trade";

const TITLE = "skech | Draw The Chart, Trade The Line";
const DESCRIPTION =
  "Draw where you think the price is going, and that drawing is the trade. No order types to learn.";
const SHORT =
  "Draw where you think the price is going. That drawing is the trade.";

// Placeholder until the real account exists. Update both fields together.
const X_HANDLE = "@skechtrade";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "skech",
  keywords: [
    "perpetuals",
    "perps",
    "perp dex",
    "trading",
    "charting",
    "draw to trade",
    "skech",
  ],
  openGraph: {
    title: TITLE,
    description: SHORT,
    type: "website",
    url: "/",
    siteName: "skech",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: SHORT,
    site: X_HANDLE,
    creator: X_HANDLE,
  },
  // og:image, its dimensions and alt text are filled in by Next from
  // src/app/opengraph-image.tsx, which renders the card rather than serving a
  // static file, so it never drifts from the brand. The icon comes from
  // src/app/icon.png the same way.
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#121110" },
  ],
  colorScheme: "light dark",
};

/*
 * Applies the stored theme while the browser is still parsing the document, so
 * the right one is painted first. A `useEffect` would run after paint and the
 * reader would watch the page change colour under them.
 *
 * Falls back to the system setting when nothing has been chosen, which is why
 * it cannot simply be rendered server-side: neither value exists there.
 */
const THEME_BOOT = `(function(){try{var t=localStorage.getItem("theme");var d=t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`h-full ${inter.variable} ${figtree.variable} ${geistMono.variable} ${GeistPixelSquare.variable} antialiased`}
      // GeistPixelSquare publishes --font-geist-pixel-square; alias it to the
      // name the font-pixel utility reads.
      style={{ ["--font-pixel" as string]: "var(--font-geist-pixel-square)" }}
      // The boot script sets a class React did not render.
      suppressHydrationWarning
    >
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: must run before paint */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <ToastProvider position="bottom-right">{children}</ToastProvider>
      </body>
    </html>
  );
}
