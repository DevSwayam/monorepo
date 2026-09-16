import { getBtcMarket } from "./btc";
import { DrawCanvas } from "./draw-canvas";
import { GradientCard } from "./gradient-card";
import { HeadlineMix } from "./headline-mix";
import { Reveal } from "./motion";
import { Body } from "./type";
import { Section } from "./ui";

/**
 * §2, the claim, then the thing itself: except the thing is now usable.
 *
 * The page used to carry a picture of the product here, and a picture cannot
 * teach a gesture. Everything below the fold was doing the work of explaining
 * what a drawn line means; one drawable chart does it in a second and a half,
 * to someone who has never traded, without a word of vocabulary. See
 * ui/landing/CONTENT.md §5.1.
 *
 * There is no call to action above the canvas. The canvas is the call to
 * action: a button pointing at a drawable chart one scroll below it is a sign
 * saying "sign" next to a pen.
 */
export async function Hero() {
  const market = await getBtcMarket();

  return (
    <Section className="pt-6 pb-10 md:pt-10 md:pb-14" id="top">
      <div className="flex flex-col items-center text-center">
        <Reveal index={1}>
          <HeadlineMix className="mt-2" />
        </Reveal>

        <Reveal className="contents" index={3}>
          <Body className="measure mt-7 text-balance md:text-lg">
            Think it goes up? Draw it going up.{" "}
            <span className="text-foreground">That&rsquo;s the whole thing.</span>
          </Body>
        </Reveal>
      </div>

      {/* The product, live. Real BTC candles, the real gesture; nothing is at
          stake and no wallet is connected. */}
      <Reveal className="mt-14 md:mt-20" index={4}>
        <GradientCard className="scroll-mt-28" id="try">
          <div className="cult-card overflow-hidden rounded-3xl">
            <DrawCanvas
              candles={market.candles}
              live={market.live}
              price={market.price}
            />
          </div>
        </GradientCard>
      </Reveal>
    </Section>
  );
}
