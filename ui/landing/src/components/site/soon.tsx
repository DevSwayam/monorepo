"use client";

import type { ReactNode } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { toastManager } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

/**
 * Nothing behind these yet.
 *
 * Everything that would go somewhere real points at a working in-page anchor.
 * Everything else is a button, not a link: a link to "#start" that lands on
 * nothing is worse than an honest button that says the thing is not built. The
 * toast carries a stable id so mashing several of them updates one notice
 * instead of stacking a pile.
 */
export function announceSoon(detail: string) {
  toastManager.add({
    id: "coming-soon",
    title: "Coming soon",
    description: detail,
  });
}

export function SoonButton({
  children,
  detail,
  ...props
}: ButtonProps & { children: ReactNode; detail: string }) {
  return (
    <Button {...props} onClick={() => announceSoon(detail)}>
      {children}
    </Button>
  );
}

/** A text link that is not a link yet. */
export function SoonLink({
  children,
  detail,
  className,
}: {
  children: ReactNode;
  detail: string;
  className?: string;
}) {
  return (
    <button
      className={cn(
        "cursor-pointer text-left transition-colors hover:text-foreground",
        className,
      )}
      onClick={() => announceSoon(detail)}
      type="button"
    >
      {children}
    </button>
  );
}
