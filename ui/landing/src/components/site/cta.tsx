import { SoonButton } from "./soon";
import { Band, Kicker } from "./ui";

/** §9, close. Same words as the nav action; an action keeps its name. */
export function Cta() {
  return (
    <Band id="start">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="px-5 py-14 md:px-10 md:py-20">
          <Kicker>Get started</Kicker>
          <h2 className="mt-5 max-w-[18ch] text-display" id="cta-title">
            Go draw something.
          </h2>
        </div>
        <div className="border-border px-5 py-10 md:px-10 lg:border-l lg:py-20 max-lg:border-t">
          <div className="flex flex-wrap gap-2">
            <SoonButton
              className="h-11 px-5"
              detail="Trading opens with the public testnet."
              size="lg"
            >
              Start sketching
            </SoonButton>
            <SoonButton
              className="h-11 px-5"
              detail="Documentation lands alongside the testnet."
              size="lg"
              variant="outline"
            >
              Read the docs
            </SoonButton>
          </div>
          <p className="mt-5 max-w-[32ch] text-fg-subtle text-sm leading-[1.7]">
            Perps can lose you everything you put up, and then some. None of
            this is financial advice.
          </p>
        </div>
      </div>
    </Band>
  );
}
