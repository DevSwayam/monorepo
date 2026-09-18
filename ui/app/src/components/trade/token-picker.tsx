"use client";

import { CheckIcon, CopyIcon, SearchIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Pill } from "./controls";
import {
  price as fmtPrice,
  LISTED,
  type Market,
  marketFor,
  shortAddress,
  signedPct,
} from "./market";
import { TokenAvatar } from "./market-header";

/**
 * Pick a market.
 *
 * The header is the trigger, because the thing you press to change what you
 * are looking at should be the thing showing what you are looking at. That is
 * how every trading screen a reader has used works, and it is why the header
 * now has a chevron on it.
 *
 * The search field is inert and says so in its own placeholder. There is one
 * market, so a working search would be a filter over a list of one; the field
 * is here because the shape of this dialog is the shape it keeps when there
 * are two hundred, and building the frame now is cheaper than moving
 * everything later.
 */
/**
 * The address, and a way to take it with you.
 *
 * Shortened to read, whole to copy: a market row is somewhere you *recognise*
 * an address, and the sixteen characters in the middle do nothing for that. The
 * full value goes to the clipboard.
 *
 * `relative` so it sits above the link covering the row — without it the click
 * lands on the link and the dialog closes instead of copying.
 */
function CopyAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      aria-label={`Copy ${address}`}
      className="relative -ml-1 mt-0.5 flex items-center gap-1.5 rounded-lg px-1 py-0.5 text-kicker text-fg-subtle transition-colors duration-micro ease-smooth-out hover:bg-surface-3 hover:text-foreground"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(address);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        } catch {
          // A blocked clipboard is not worth an error state; the address is
          // still on screen and still selectable.
        }
      }}
      type="button"
    >
      <span className="figures">{shortAddress(address)}</span>
      {copied ? (
        <CheckIcon className="size-3.5 text-up" />
      ) : (
        <CopyIcon className="size-3.5" />
      )}
    </button>
  );
}

export function TokenPicker({
  open,
  onOpenChange,
  current,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  current: Market;
}) {
  const markets = LISTED.map(marketFor).filter(
    (market): market is Market => market !== null,
  );

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent label="Pick a market">
        <div className="flex flex-col gap-3 p-3 pb-2">
          <div className="flex items-center justify-between gap-3 px-2 pt-1">
            <DialogTitle className="text-kicker text-fg-subtle">
              Markets
            </DialogTitle>
            {/* Escape and a click outside both already close this. The button is
                for the reader who does not know that — which on a phone, where
                there is no outside to click and no Escape to press, is all of
                them. */}
            <DialogClose
              aria-label="Close"
              render={
                <Button
                  className="-mr-1 rounded-full"
                  size="icon-sm"
                  variant="ghost"
                />
              }
            >
              <XIcon />
            </DialogClose>
          </div>

          <div className="well flex h-11 items-center gap-2.5 rounded-2xl px-4">
            <SearchIcon className="size-4 shrink-0 text-fg-subtle" />
            <input
              aria-label="Search markets"
              className="min-w-0 flex-1 bg-transparent text-caption outline-none placeholder:text-fg-subtle disabled:cursor-not-allowed"
              disabled
              placeholder="Search — Bitcoin only, for now"
              type="search"
            />
          </div>
        </div>

        <ul className="flex min-h-0 flex-1 flex-col overflow-y-auto p-2 pt-0">
          {markets.map((market) => {
            const up = market.changePct >= 0;
            const here = market.address === current.address;
            return (
              <li
                className={cn(
                  "rowable relative flex items-center gap-3 rounded-2xl px-3 py-3",
                  here && "bg-surface-2",
                )}
                key={market.address}
              >
                {/*
                  The link covers the row rather than wrapping it. The address
                  below is its own button, and a button inside a link is invalid
                  markup where the click belongs to neither — an overlay keeps
                  the whole row clickable and leaves the copy control on top of
                  it as a sibling.
                */}
                <DialogClose
                  aria-label={`Open ${market.name}`}
                  className="absolute inset-0 rounded-2xl"
                  render={<Link href={`/app/${market.address}`} />}
                />

                <TokenAvatar symbol={market.symbol} />

                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2">
                    <span className="truncate font-semibold text-[0.9375rem] tracking-[-0.012em]">
                      {market.name}
                    </span>
                    {here ? <Pill>Open</Pill> : null}
                  </p>
                  <CopyAddress address={market.address} />
                </div>

                <div className="shrink-0 text-right">
                  <p className="figures text-caption">
                    ${fmtPrice(market.price)}
                  </p>
                  <p
                    className={cn(
                      "figures text-kicker",
                      up ? "text-up" : "text-down",
                    )}
                  >
                    {signedPct(market.changePct)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
