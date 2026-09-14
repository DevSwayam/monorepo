import { cn } from "@/lib/utils";

/**
 * The lit point from the end of the hero's drawn line.
 *
 * Positioned in percentages rather than drawn inside the SVG on purpose: the
 * traces it sits on use preserveAspectRatio="none" and stretch non-uniformly,
 * which would squash a circle into an ellipse. Percentages map exactly onto a
 * stretched viewBox, so the dot lands on the path end at any width and stays
 * round.
 *
 * The halo is a radial gradient rather than a box-shadow, so it stays clear of
 * the page's no-elevation rule. This is a light source, not a raised surface.
 *
 * Used sparingly and never twice in a viewport: the end of the live trace in
 * the thesis, and the head of the drawn line in the first bento cell. It
 * should read as something you notice on a second pass.
 */
export function GlowDot({
  left,
  top,
  className,
  size = 6,
  halo = 26,
}: {
  /** Percentage across the parent, matching the trace's own coordinates. */
  left: number;
  top: number;
  className?: string;
  size?: number;
  halo?: number;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "-translate-x-1/2 -translate-y-1/2 pointer-events-none absolute block",
        className,
      )}
      style={{ left: `${left}%`, top: `${top}%` }}
    >
      <span
        className="block rounded-full"
        style={{
          width: halo,
          height: halo,
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--brand) 55%, transparent) 0%, transparent 68%)",
        }}
      />
      <span
        className="absolute inset-0 m-auto block rounded-full bg-white"
        style={{ width: size, height: size }}
      />
    </span>
  );
}
