import Image from "next/image";
import { cn } from "@/lib/utils";

/*
 * The illustration layer.
 *
 * Four flat-vector scenes of the skech cast: the pen, the drawn line as a
 * creature, and a green and a red candle. All decorative, all aria-hidden, none
 * of them load-bearing: the page said everything it needs to say before these
 * arrived and it still does with images off.
 *
 * They are drawn on paper. On the dark theme the cream and sand shapes are the
 * brightest thing on the page and the black limbs disappear into the ground, so
 * the whole layer is dimmed there rather than pretending it works.
 */
const SLOTS = {
  heroLeft: { src: "/assets/illo/hero-left.png", w: 760, h: 581 },
  heroRight: { src: "/assets/illo/hero-right.png", w: 760, h: 581 },
  heroMobile: { src: "/assets/illo/hero-mobile.png", w: 720, h: 292 },
  cta: { src: "/assets/illo/cta-scene.png", w: 900, h: 514 },
  band: { src: "/assets/illo/band-cast.png", w: 1000, h: 750 },
} as const;

/**
 * The hero flanks, running off both edges behind the headline.
 *
 * Each is weighted away from the centre and nearly empty on its inner third,
 * which is the side the headline sits on. Below md they are dropped for a
 * single strip: at phone width there is no room either side of the type, and
 * scaling them down turns two characters into two smudges.
 */
export function HeroScene() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none select-none dark:opacity-55"
    >
      <Flank slot="heroLeft" side="left" />
      <Flank slot="heroRight" side="right" />

      <div className="flex justify-center pt-6 md:hidden">
        <Image
          alt=""
          className="h-8 w-auto"
          height={SLOTS.heroMobile.h}
          priority
          src={SLOTS.heroMobile.src}
          width={SLOTS.heroMobile.w}
        />
      </div>
    </div>
  );
}

function Flank({
  slot,
  side,
}: {
  slot: "heroLeft" | "heroRight";
  side: "left" | "right";
}) {
  const s = SLOTS[slot];
  return (
    <div
      className={cn(
        "absolute inset-y-0 hidden w-[30%] max-w-[380px] items-center md:flex",
        side === "left" ? "left-0 justify-start" : "right-0 justify-end",
      )}
    >
      <Image
        alt=""
        className="max-h-full w-full object-contain"
        height={s.h}
        priority
        src={s.src}
        width={s.w}
      />
    </div>
  );
}

/**
 * The whole cast, as a break between movements.
 *
 * It sits between the last walkthrough and the questions, which was the longest
 * unbroken run of dark panels on the page. Purely a breath: nothing here is
 * information.
 */
export function BandScene({ className }: { className?: string }) {
  return (
    <div className={cn("container-x px-4 sm:px-6 lg:px-8", className)}>
      <Image
        alt=""
        aria-hidden="true"
        className="pointer-events-none mx-auto h-auto w-full max-w-[34rem] select-none dark:opacity-55"
        height={SLOTS.band.h}
        src={SLOTS.band.src}
        width={SLOTS.band.w}
      />
    </div>
  );
}

/** The closing band scene, under the waitlist form. */
export function CtaScene({ className }: { className?: string }) {
  return (
    <Image
      alt=""
      aria-hidden="true"
      className={cn("pointer-events-none select-none dark:opacity-55", className)}
      height={SLOTS.cta.h}
      src={SLOTS.cta.src}
      width={SLOTS.cta.w}
    />
  );
}
