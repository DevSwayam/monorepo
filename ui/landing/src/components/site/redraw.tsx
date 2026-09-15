import { RedrawPanel } from "./redraw-panel";
import { GradientCard } from "./gradient-card";
import { Reveal } from "./motion";
import { Section, SectionHead } from "./ui";

/**
 * §7, the line is not a commitment.
 *
 * Its own section because it is its own idea, and because folding it into the
 * three endings meant one scenario had to carry two lessons at once.
 *
 * The lead is one imperative sentence. It used to be four, explaining what
 * stays put and what follows and which way the position turns, all of which
 * the panel underneath demonstrates the moment you touch it. Copy that narrates
 * an interactive demo is copy competing with it.
 */
export function Redraw() {
  return (
    <Section id="redraw">
      <SectionHead
        id="redraw-title"
        lead="Changed your mind? Drag the line somewhere else. It updates your trade, and costs nothing."
      >
        Nothing you draw is final.
      </SectionHead>

      <Reveal>
        <GradientCard>
          <div className="cult-card overflow-hidden rounded-3xl">
            <RedrawPanel />
          </div>
        </GradientCard>
      </Reveal>
    </Section>
  );
}
