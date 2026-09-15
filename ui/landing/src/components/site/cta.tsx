import { Reveal } from "./motion";
import { SoonButton } from "./soon";
import { Kicker, Section } from "./ui";

/** §9, close. Same words as the nav action; an action keeps its name. */
export function Cta() {
  return (
    <Section id="start">
      <Reveal>
        <div className="surface-raised sheen-top relative overflow-hidden rounded-3xl px-6 py-16 text-center md:px-12 md:py-24">
          {/* The brightest ground on the page, because this is the last thing
              asked of the reader. One wash, centred behind the headline, and
              nothing else competes with it in this section. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 60% 70% at 50% 100%, color-mix(in srgb, var(--brand) 16%, transparent), transparent 70%)",
            }}
          />
          <div className="relative flex flex-col items-center">
            <Kicker>Get started</Kicker>
            <h2 className="mt-6 max-w-[14ch] text-display" id="cta-title">
              Go draw something.
            </h2>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <SoonButton
                className="pressable h-12 rounded-full bg-linear-to-b from-brand-soft to-brand px-6 text-base shadow-brand sm:h-12 sm:text-base"
                detail="Opens with early access."
                size="lg"
              >
                Start drawing
              </SoonButton>
              <SoonButton
                className="pressable h-12 rounded-full px-6 text-base sm:h-12 sm:text-base"
                detail="Lands with early access."
                size="lg"
                variant="outline"
              >
                Read the docs
              </SoonButton>
            </div>

            <p className="mt-8 max-w-[38ch] text-balance text-fg-subtle text-sm leading-[1.7]">
              You can lose what you put in. Never put in more than you&rsquo;d be
              fine losing.
            </p>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
