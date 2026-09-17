import { getBtcMarket } from "./btc";
import { DrawCanvas } from "./draw-canvas";
import { Expandable } from "./expandable";
import { GradientCard } from "./gradient-card";
import styles from "./hero.module.css";
import { HeroScene } from "./illo";
import { Reveal } from "./motion";
import { Body, Display, Heading } from "./type";
import { WatchVideo } from "./video-dialog";

/**
 * The drawn line, as a glyph.
 *
 * `PenLineIcon` was a stock pen nib at an angle: it says "edit this text",
 * which is the one thing the button does not do. This is the mark the product
 * actually makes — a rising line with a round head on its leading end, the same
 * shape the canvas leaves behind and the same one the logo is built from.
 */
function DrawGlyph({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.9"
      viewBox="0 0 20 20"
    >
      <path d="M2.4 13.9c2.1 0 3.1-4.1 4.9-4.1 1.4 0 1.9 2.8 3.3 2.8 1.8 0 2.6-5.4 5.2-6.2" />
      <circle cx="16.3" cy="6.2" fill="currentColor" r="1.7" stroke="none" />
    </svg>
  );
}

/** A full-width illustrated introduction, followed by the live practice chart. */
export async function Hero() {
  const market = await getBtcMarket();

  return (
    <>
      <section aria-labelledby="hero-title" className={styles.stage} id="top">
        <HeroScene />

        <div className={styles.content}>
          <Reveal index={1}>
            <Display id="hero-title">
              <span className="block">Draw the chart.</span>
              <span className="block">Trade the line.</span>
            </Display>
          </Reveal>

          <Reveal index={2}>
            <Body className="mx-auto mt-6 max-w-[25rem] text-balance md:text-lg">
              Think it goes up? Draw it going up.
              <span className="block">That&rsquo;s the whole thing.</span>
            </Body>
          </Reveal>

          <Reveal index={3}>
            <div className="mt-8 flex flex-col items-center gap-3">
              {/*
                Stacked and width-matched. Side by side they were a pair of
                different-length pills that read as one wide bar, and the
                secondary was competing with the primary for the same glance;
                one under the other puts them in order of what we want pressed
                first.
              */}
              <a
                className="pressable inline-flex min-h-12 w-full max-w-[14rem] items-center justify-center gap-2.5 rounded-full bg-primary px-6 font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
                href="#try"
              >
                <DrawGlyph className="size-5" />
                Try drawing
              </a>
              <WatchVideo />
            </div>
          </Reveal>
        </div>
      </section>

      <section
        aria-labelledby="try-title"
        className={styles.practice}
        id="try"
      >
        <Reveal className={styles.practiceHeading}>
          <Heading id="try-title">Your turn. Draw a trade.</Heading>
        </Reveal>
        <Reveal index={1}>
          <Expandable label="the chart">
            <GradientCard>
              <div className="cult-card overflow-hidden rounded-3xl">
                <DrawCanvas
                  candles={market.candles}
                  live={market.live}
                  price={market.price}
                />
              </div>
            </GradientCard>
          </Expandable>
        </Reveal>
      </section>
    </>
  );
}
