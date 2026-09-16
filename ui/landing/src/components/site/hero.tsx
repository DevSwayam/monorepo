import { ArrowDownIcon, PenLineIcon } from "lucide-react";
import { getBtcMarket } from "./btc";
import { DrawCanvas } from "./draw-canvas";
import { Expandable } from "./expandable";
import { GradientCard } from "./gradient-card";
import { HeadlineMix } from "./headline-mix";
import styles from "./hero.module.css";
import { HeroScene } from "./illo";
import { Reveal } from "./motion";
import { Body, Heading } from "./type";

/** A full-width illustrated introduction, followed by the live practice chart. */
export async function Hero() {
  const market = await getBtcMarket();

  return (
    <>
      <section aria-labelledby="hero-title" className={styles.stage} id="top">
        <HeroScene />

        <div className={styles.content}>
          <Reveal index={1}>
            <HeadlineMix />
          </Reveal>

          <Reveal index={2}>
            <Body className="mx-auto mt-6 max-w-[25rem] text-balance md:text-lg">
              Think it goes up? Draw it going up.
              <span className="block">That&rsquo;s the whole thing.</span>
            </Body>
          </Reveal>

          <Reveal index={3}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a
                className="pressable inline-flex min-h-12 items-center justify-center gap-2.5 rounded-full bg-primary px-6 font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
                href="#try"
              >
                <PenLineIcon aria-hidden="true" className="size-4" />
                Try drawing
              </a>
              <a
                className="pressable inline-flex min-h-12 items-center justify-center gap-2.5 rounded-full bg-secondary px-6 font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
                href="#start"
              >
                Join waitlist
                <ArrowDownIcon aria-hidden="true" className="size-4" />
              </a>
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
          <Body>A practice chart. No wallet needed.</Body>
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
