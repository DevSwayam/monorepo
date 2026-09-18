import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge has to be told about our custom type scale.
 *
 * Out of the box it classifies an unknown `text-*` as a colour, so `text-kicker`
 * and `text-fg-subtle` in the same call look like a conflict and the size gets
 * dropped — labels silently render at body size. Registering the scale as font
 * sizes keeps both.
 *
 * Every step in the scale belongs in this list. A step defined in globals.css
 * but missing here is worse than one that does not exist, because it works
 * until someone passes a colour alongside it and then silently loses its size.
 *
 * Kept in step with `ui/landing/src/lib/utils.ts`. The one difference is
 * `price`, a step this screen needs and a marketing page does not; see the
 * note on it in globals.css.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "display",
            "heading",
            "price",
            "title",
            "body",
            "caption",
            "kicker",
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
