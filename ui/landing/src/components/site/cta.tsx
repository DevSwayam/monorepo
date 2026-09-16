import { GradientCard } from "./gradient-card";
import { Reveal } from "./motion";
import { WaitlistForm } from "./waitlist";
import { Display } from "./type";
import { Section } from "./ui";

/**
 * The close, and the only thing the page asks for: an email.
 *
 * Nothing is launched, so there is nowhere to send anyone. A button that opens
 * a toast saying "coming soon" is a dead end dressed as an action; a field that
 * takes an address is the one useful thing a visitor can do today.
 *
 * Three things, and it used to be six: an eyebrow, a headline, a lead, the
 * form, its note, and the risk line, stacked over one input. The lead only
 * restated the note under the field, and the risk line is already the last
 * thing in the footer.
 */
export function Cta() {
  return (
    <Section id="start">
      <Reveal>
        <GradientCard glow="always">
          <div className="surface flex flex-col items-center overflow-hidden rounded-3xl px-6 py-16 text-center md:px-12 md:py-20">
            <Display as="h2" className="max-w-[16ch]" id="cta-title">
              Be first to draw.
            </Display>
            <WaitlistForm className="mt-8 w-full max-w-md" />
          </div>
        </GradientCard>
      </Reveal>
    </Section>
  );
}
