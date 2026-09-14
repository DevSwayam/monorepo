import Link from "next/link";
import { LogoMark } from "./logo";
import { SoonButton } from "./soon";

/**
 * A floating glass bar, not a fixed strip.
 *
 * The page scrolls underneath it rather than being pushed out of the way by an
 * opaque band, which is what the translucency is for. It is inset from all
 * three edges so it reads as an object on the page rather than as browser
 * chrome.
 *
 * Two elements, and that is the whole bar: the mark, and the one action. There
 * are no section links, so there is no menu to collapse into on small screens
 * either — the page is short enough to scroll, and the hero's own "See it
 * work" button covers the one jump worth offering.
 *
 * `pointer-events-none` on the wrapper, with the bar opting back in, keeps the
 * empty gutters either side from swallowing clicks meant for the hero behind
 * them.
 */
export function SiteNav() {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-4 pt-3 sm:px-6 sm:pt-4">
      <div className="container-x pointer-events-auto">
        <div className="glass flex h-14 items-center justify-between gap-4 rounded-full py-2 pr-2 pl-5">
          <Link
            aria-label="skech home"
            className="pressable flex items-center gap-2.5 text-foreground"
            href="/"
          >
            <LogoMark className="h-5 w-6" />
            {/* It is "skech", one t. Never "sketch". */}
            <span className="font-semibold text-[0.9375rem] tracking-[-0.025em]">
              skech
            </span>
          </Link>

          <SoonButton
            className="pressable h-10 rounded-full bg-linear-to-b from-brand-soft to-brand px-5 shadow-brand sm:h-10"
            detail="Opens with early access."
            size="sm"
          >
            Start drawing
          </SoonButton>
        </div>
      </div>
    </header>
  );
}
