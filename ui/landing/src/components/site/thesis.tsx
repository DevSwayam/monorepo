import { GlowDot } from "./glow-dot";
import { Band, Kicker } from "./ui";

/**
 * §3, the argument, carried by two shapes and second person.
 *
 * The reader is one of these two people and it isn't the one on the left, so
 * the right-hand column says "you". That is most of the work; the shapes do
 * the rest.
 */
export function Thesis() {
  return (
    <Band id="thesis">
      <div className="grid md:grid-cols-2">
        <div className="border-border px-5 py-10 md:px-10 md:py-14 max-md:border-b md:border-r">
          <Kicker>The holder</Kicker>
          <svg
            aria-hidden="true"
            className="mt-8 h-20 w-full text-fg-subtle"
            fill="none"
            preserveAspectRatio="none"
            viewBox="0 0 320 80"
          >
            <path
              d="M4 70 C 70 64, 140 46, 200 32 S 290 12, 316 8"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="2"
            />
          </svg>
          <p className="measure mt-8 text-fg-muted text-body">
            Bought once, on a view about the next few years. They&rsquo;ll open
            the chart again when something happens.
          </p>
        </div>

        <div className="px-5 py-10 md:px-10 md:py-14">
          <Kicker className="text-brand">You</Kicker>
          {/* The trace ends lit, the way the hero's does. Nothing announces
              it; it is just still running. */}
          <div className="relative mt-8">
            <svg
              aria-hidden="true"
              className="h-20 w-full text-brand"
              fill="none"
              preserveAspectRatio="none"
              viewBox="0 0 320 80"
            >
              <path
                d="M4 52 L 44 24 L 78 62 L 112 18 L 148 58 L 184 30 L 220 68 L 256 26 L 290 54 L 316 14"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
            <GlowDot left={(316 / 320) * 100} top={(14 / 80) * 100} />
          </div>
          <p className="measure mt-8 text-body text-foreground">
            You have it open right now, and you already know roughly what the
            next few hours look like.
          </p>
        </div>
      </div>

      <div className="border-border border-t px-5 py-16 md:px-10 md:py-24">
        <h2
          className="mx-auto max-w-[24ch] text-balance text-center text-heading"
          id="thesis-title"
        >
          The screen was built for the first one.
        </h2>
      </div>
    </Band>
  );
}
