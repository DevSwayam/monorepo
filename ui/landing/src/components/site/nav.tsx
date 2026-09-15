import { LogoLink } from "./logo";
import { ThemeToggle } from "./theme-toggle";

/**
 * A plain topbar that scrolls away, like family.co's.
 *
 * It used to be a fixed glass pill. Over a white page the translucency has
 * nothing to tint, so the pill read as an empty outlined box floating over the
 * content, and it sat on top of the canvas you are meant to draw on.
 */
export function SiteNav() {
  return (
    <header>
      <div className="container-x flex items-center justify-between gap-6 px-4 py-4 sm:px-6 md:py-6 lg:px-8">
        <LogoLink />

        <div className="flex items-center gap-1.5">
          <ThemeToggle />

          {/* An anchor, not a button with a toast behind it: the thing it
              promises is on this page. */}
          <a
            className="pressable flex h-9 shrink-0 items-center rounded-full bg-primary px-4 font-medium text-[0.9375rem] text-primary-foreground transition-colors duration-micro ease-smooth-out hover:bg-primary/90"
            href="#start"
          >
            Join waitlist
          </a>
        </div>
      </div>
    </header>
  );
}
