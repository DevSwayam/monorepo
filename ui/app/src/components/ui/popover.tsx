"use client";

import { Popover as Base } from "@base-ui/react/popover";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A small panel anchored to the control that opened it.
 *
 * The same `floating` surface as the menu — this is the other thing that is
 * genuinely above the page. Base UI handles the anchoring, the collision
 * flipping, escape, click-outside and the `aria-expanded` on the trigger; the
 * fill, the radius and the motion are ours.
 *
 * Unlike a menu it holds a control rather than a list of commands, so it does
 * not close when something inside it is pressed. Turning the wheel should leave
 * the wheel open.
 *
 * `z-50` on the positioner is not decoration. These anchor to controls sitting
 * on the chart, and the chart is a canvas: without it the popup portals to the
 * end of the body, paints under the canvas anyway, and arrives as a white top
 * edge with the candles showing through the rest of it.
 */

export function Popover({ children }: { children: ReactNode }) {
  return <Base.Root>{children}</Base.Root>;
}

export function PopoverTrigger({
  children,
  render,
}: {
  children?: ReactNode;
  render?: React.ReactElement;
}) {
  return <Base.Trigger render={render}>{children}</Base.Trigger>;
}

export function PopoverContent({
  children,
  className,
  align = "end",
}: {
  children: ReactNode;
  className?: string;
  align?: "start" | "center" | "end";
}) {
  return (
    <Base.Portal>
      <Base.Positioner align={align} sideOffset={10} className="z-50">
        <Base.Popup
          className={cn(
            "floating origin-[var(--transform-origin)] rounded-3xl bg-popover p-5 outline-none",
            // No enter transition. Base UI marks a click-opened popover
            // `data-instant`, and with an opacity transition declared anyway
            // the browser starts one, has the starting style removed out from
            // under it in the same frame, and leaves the popup stuck at
            // whatever it had reached — 0.45 here, which is a panel you can see
            // the candles through. Measured, not guessed.
            "data-[instant]:transition-none",
            className,
          )}
        >
          {children}
        </Base.Popup>
      </Base.Positioner>
    </Base.Portal>
  );
}

export const PopoverTitle = Base.Title;
