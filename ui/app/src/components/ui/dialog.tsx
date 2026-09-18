"use client";

import { Dialog as Base } from "@base-ui/react/dialog";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A modal sheet, in our material.
 *
 * Centred and capped on a wide screen; on a phone it sits against the bottom
 * and spans the width, because a centred card with 16px of margin on a 390px
 * screen is a card that has nowhere to be. Same component, one media query —
 * a second "mobile sheet" component would be two things to keep in agreement.
 */

export function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <Base.Root onOpenChange={onOpenChange} open={open}>
      {children}
    </Base.Root>
  );
}

export function DialogContent({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  /** Names the dialog for a screen reader. */
  label: string;
}) {
  return (
    <Base.Portal>
      <Base.Backdrop
        className={cn(
          "fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px]",
          "transition-opacity duration-quick ease-smooth-out",
          "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
        )}
      />
      <Base.Popup
        aria-label={label}
        className={cn(
          "floating fixed z-50 flex flex-col overflow-hidden bg-popover outline-none",
          // Phone: a sheet on the bottom edge. Desktop: a centred card.
          "inset-x-0 bottom-0 max-h-[85svh] rounded-t-4xl",
          "sm:inset-x-auto sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:max-h-[70svh] sm:w-[28rem] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-4xl",
          "transition-[transform,opacity] duration-quick ease-smooth-out",
          "data-[starting-style]:translate-y-4 data-[starting-style]:opacity-0",
          "data-[ending-style]:translate-y-4 data-[ending-style]:opacity-0",
          "sm:data-[starting-style]:translate-y-[calc(-50%+0.5rem)] sm:data-[ending-style]:translate-y-[calc(-50%+0.5rem)]",
          className,
        )}
      >
        {children}
      </Base.Popup>
    </Base.Portal>
  );
}

export const DialogTitle = Base.Title;
export const DialogClose = Base.Close;
