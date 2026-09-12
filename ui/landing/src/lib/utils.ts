import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge has to be told about our custom type scale.
 *
 * Out of the box it classifies an unknown `text-*` as a colour, so `text-heading`
 * and `text-foreground` in the same call look like a conflict and the size gets
 * dropped, section headlines silently render at body size. Registering the
 * scale as font sizes keeps both.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["display", "heading", "title", "body", "kicker"] },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
