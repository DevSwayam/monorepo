import { GeistPixelSquare } from "geist/font/pixel";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

// One family for the whole page, a geometric grotesque, per the type spec.
// coss reads --font-sans / --font-heading / --font-mono, so bind those names.
const geist = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistHeading = Geist({
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
  themeColor: "#0A0B0A",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // `dark` is fixed, not toggled: skech.trade has one surface.
      className={`dark h-full ${geist.variable} ${geistHeading.variable} ${geistMono.variable} ${GeistPixelSquare.variable} antialiased`}
      // GeistPixelSquare publishes --font-geist-pixel-square; alias it to the
      // name the font-pixel utility reads.
      style={{ ["--font-pixel" as string]: "var(--font-geist-pixel-square)" }}
    >
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <ToastProvider position="bottom-right">{children}</ToastProvider>
      </body>
    </html>
  );
}
