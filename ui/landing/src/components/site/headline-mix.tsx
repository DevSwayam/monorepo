import { cn } from "@/lib/utils";

const LINES = [
  ["Draw", "the", "chart."],
  ["Trade", "the", "line."],
] as const;

/**
 * The headline, set in two faces at once.
 *
 * One word per line is swapped to the pixel face, chosen fresh on every
 * request, so the page is never quite the same twice. Picking one word from
 * each line rather than two at random keeps it balanced no matter what comes
 * up, and never leaves a line untouched.
 *
 * This runs on the server and is serialised into the HTML, so there is no
 * hydration mismatch to suppress and no flash of the wrong arrangement. The
 * page opts out of static rendering for it, see `dynamic` in page.tsx.
 *
 * The pixel face runs large for its point size, so the swapped words are set
 * slightly smaller to keep the cap heights on one line.
 */
export function HeadlineMix({ className }: { className?: string }) {
  return (
    <h1 className={cn("text-display", className)} id="hero-title">
      {LINES.map((words) => {
        // react-hooks/purity flags Math.random in render, and is right to for a
        // client component: an unlucky re-render would reshuffle the headline
        // under the reader. This is a server component on a force-dynamic
        // route, so it runs exactly once per request and the result is baked
        // into the HTML before it is sent. Per-request variation is the point.
        // eslint-disable-next-line react-hooks/purity
        const pixelAt = Math.floor(Math.random() * words.length);
        return (
          <span className="block" key={words.join(" ")}>
            {words.map((word, i) => (
              <span
                className={
                  i === pixelAt
                    ? "font-pixel text-[0.86em] tracking-normal"
                    : undefined
                }
                key={word}
              >
                {word}
                {i < words.length - 1 ? " " : null}
              </span>
            ))}
          </span>
        );
      })}
    </h1>
  );
}
