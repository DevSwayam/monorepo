import { getBtcMarket } from "./btc";
import { DrawCanvas } from "./draw-canvas";
import { GradientCard } from "./gradient-card";
import { HeadlineMix } from "./headline-mix";
import { HeroScene } from "./illo";
import { Reveal } from "./motion";

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
    <section className="scroll-mt-24" id="top">
      {/* The scene is scoped to the headline band, not the whole section. Given
          the run of it the flanks would sit behind the canvas too, and artwork
          behind a surface you are meant to draw on is just noise. The wrapper
          is full width so they can bleed off the page rather than stopping at
          the column edge. */}
      <div className="relative overflow-hidden">
        <HeroScene />

        <div className="container-x relative px-4 pt-6 pb-10 sm:px-6 md:pt-10 md:pb-14 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <Reveal index={1}>
              <HeadlineMix className="mt-2" />
            </Reveal>

            <Reveal className="contents" index={3}>
              <p className="measure mt-7 text-balance text-body text-fg-muted md:text-lg">
                Think it goes up? Draw it going up.{" "}
                <span className="text-foreground">
                  That&rsquo;s the whole thing.
                </span>
              </p>
            </Reveal>
          </div>
        </div>
      </div>

      {/* The product, live. Real BTC candles, the real gesture; nothing is at
          stake and no wallet is connected. */}
      <div className="container-x px-4 pb-12 sm:px-6 md:pb-20 lg:px-8">
        <Reveal index={4}>
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
      </div>
    </section>
  );
}
