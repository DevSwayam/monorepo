"use client";

import { MenuIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetPanel,
  SheetPopup,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { LogoMark } from "./logo";
import { SoonButton } from "./soon";

/* Section links are gone from the bar on purpose: the page is short enough to
   scroll, and a four-item menu on a two-action page is chrome. The sheet keeps
   them for small screens, where scrolling costs more. */
const LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#markets", label: "Markets" },
  { href: "#faq", label: "FAQ" },
] as const;

/**
 * Sticky, ruled, square. Sits on the same page column as every band below, so
 * its side rules line up with the grid rather than floating over it.
 */
export function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-border border-b bg-background/90 backdrop-blur-sm">
      <div className="container-x flex h-14 items-center justify-between gap-4 border-border border-x px-5 md:px-6">
        <Link
          aria-label="skech home"
          className="flex items-center gap-2.5 text-foreground"
          href="/"
        >
          <LogoMark className="h-5 w-6" />
          {/* It is "skech", one t. Never "sketch". */}
          <span className="font-semibold text-[0.9375rem] tracking-[-0.02em]">
            skech
          </span>
        </Link>


        <div className="flex items-center gap-2">
          <SoonButton
            className="hidden h-9 text-fg-muted hover:text-foreground sm:inline-flex"
            detail="Accounts open with the public testnet."
            size="sm"
            variant="ghost"
          >
            Log in
          </SoonButton>
          <SoonButton
            className="h-9"
            detail="Trading opens with the public testnet."
            size="sm"
          >
            Start sketching
          </SoonButton>

          <Sheet>
            <SheetTrigger
              render={
                <Button
                  aria-label="Open menu"
                  className="md:hidden"
                  size="icon"
                  variant="ghost"
                />
              }
            >
              <MenuIcon />
            </SheetTrigger>
            <SheetPopup className="w-[min(20rem,85vw)]" side="right">
              <SheetPanel className="flex flex-col gap-1 pt-2">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                {LINKS.map((link) => (
                  <SheetClose
                    key={link.href}
                    render={
                      <Link
                        className="px-2 py-2.5 text-body hover:bg-accent"
                        href={link.href}
                      />
                    }
                  >
                    {link.label}
                  </SheetClose>
                ))}
                <Separator className="my-3" />
                <SoonButton
                  className="w-full"
                  detail="Trading opens with the public testnet."
                  size="lg"
                >
                  Start sketching
                </SoonButton>
              </SheetPanel>
            </SheetPopup>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
