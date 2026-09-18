"use client";

import { Menu as Base } from "@base-ui/react/menu";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A dropdown, in our material.
 *
 * Base UI does the parts that are tedious and easy to get wrong — focus
 * trapping, escape, click-outside, arrow-key roving, collision flipping,
 * `aria-expanded` on the trigger — and none of the parts that are ours. It is
 * already a dependency because `Button` is built on it.
 *
 * The popup is a `--popover` fill with a hairline and the float shadow, which
 * is the one place on this screen a shadow is right: it is genuinely above the
 * page rather than part of it.
 */

export function Menu({ children }: { children: ReactNode }) {
  return <Base.Root>{children}</Base.Root>;
}

export function MenuTrigger({
  children,
  render,
}: {
  children?: ReactNode;
  render?: React.ReactElement;
}) {
  return <Base.Trigger render={render}>{children}</Base.Trigger>;
}

export function MenuContent({
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
      <Base.Positioner align={align} sideOffset={8} className="z-50">
        <Base.Popup
          className={cn(
            "floating min-w-56 origin-[var(--transform-origin)] rounded-2xl bg-popover p-1.5 outline-none",
            "transition-[transform,opacity] duration-micro ease-smooth-out data-[instant]:transition-none",
            "data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0",
            "data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0",
            className,
          )}
        >
          {children}
        </Base.Popup>
      </Base.Positioner>
    </Base.Portal>
  );
}

export function MenuItem({
  children,
  onClick,
  tone = "default",
  icon,
  aside,
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: "default" | "down";
  icon?: ReactNode;
  /** A switch or a figure on the right of the row. */
  aside?: ReactNode;
}) {
  return (
    <Base.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2.5 rounded-xl px-3 py-2 text-caption outline-none",
        "transition-colors duration-micro ease-smooth-out",
        "data-highlighted:bg-surface-2",
        tone === "down" ? "text-down" : "text-foreground",
        "[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:opacity-70",
      )}
      onClick={onClick}
    >
      {icon}
      <span className="flex-1 text-left">{children}</span>
      {aside}
    </Base.Item>
  );
}

export function MenuSeparator() {
  return <div className="my-1.5 h-px bg-hairline" role="separator" />;
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <Base.GroupLabel className="px-3 pt-2 pb-1 text-kicker text-fg-subtle">
      {children}
    </Base.GroupLabel>
  );
}
