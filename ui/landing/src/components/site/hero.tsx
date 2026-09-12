import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HeadlineMix } from "./headline-mix";
import { SoonButton } from "./soon";
import { Ticker } from "./ticker";
import { TradePanel } from "./trade-panel";
import { Band, Kicker } from "./ui";

/**
 * §2, the claim, then the thing itself.
 *
 * One column of copy, then the product frame full width beneath it, then the
 * market strip. The frame is real markup rather than a render: a page selling
 * an interface cannot ask a trader to trust a picture of one.
 */
export function Hero() {
  return (
    <>
      <Band id="top">
        <div className="px-5 py-16 md:px-10 md:py-20">
          <Kicker>Perpetuals, drawn</Kicker>
          <HeadlineMix className="mt-5" />
          <p className="measure mt-7 text-body text-fg-muted md:text-lg">
            You already scribble the line on a screenshot before you size
            anything. This just makes that scribble{" "}
            <span className="text-foreground">the order</span>.
          </p>
          <div className="mt-9 flex flex-wrap gap-2">
            <SoonButton
              className="h-11 px-5"
              detail="Trading opens with the public testnet."
              size="lg"
            >
              Start sketching
            </SoonButton>
            <Button
              className="h-11 px-5"
              render={<Link href="#how-it-works" />}
              size="lg"
              variant="outline"
            >
              See it work
            </Button>
          </div>
        </div>

        <TradePanel />
      </Band>

      {/* Edge to edge: the strip is the one element that should feel like it
          continues past the sides of the page. */}
      <Band bleed>
        <Ticker />
      </Band>
    </>
  );
}
