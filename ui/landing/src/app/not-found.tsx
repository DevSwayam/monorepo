import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * 404, full bleed.
 *
 * No nav, no footer, nothing to scroll: a dead end should look like one. The
 * number is set in the pixel face, the same one the price figures use, at a
 * size that fills the screen on its own.
 */
export default function NotFound() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-5 py-20 text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-grid"
        style={{
          maskImage:
            "radial-gradient(ellipse 70% 62% at 50% 48%, #000 20%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 62% at 50% 48%, #000 20%, transparent 100%)",
        }}
      />

      <div className="relative flex flex-col items-center">
        <p className="font-mono text-fg-subtle text-kicker">
          You drew outside the chart
        </p>

        <h1 className="mt-8 font-pixel text-[clamp(5rem,26vw,17rem)] text-foreground leading-[0.8]">
          404
        </h1>

        {/* The line runs off both edges, the way it does everywhere else. */}
        <div className="mt-10 flex w-[min(34rem,86vw)] items-center gap-4">
          <span className="h-px flex-1 bg-border" />
          <span className="size-1.5 shrink-0 bg-brand" />
          <span className="h-px flex-1 bg-border" />
        </div>

        <p className="mt-10 max-w-[38ch] text-body text-fg-muted">
          There is nothing at this address. The page either moved or never
          existed.
        </p>

        <div className="mt-9">
          <Button className="h-11 px-5" render={<Link href="/" />} size="lg">
            Back to skech
          </Button>
        </div>
      </div>
    </main>
  );
}
