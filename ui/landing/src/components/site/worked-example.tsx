import { ScenarioPanel } from "./scenario-panel";
import { Reveal } from "./motion";
import { Panel, Section, SectionHead } from "./ui";

/**
 * §6, one line, three endings, played rather than described.
 *
 * The static version showed two lines on a chart and said what each was worth.
 * It was accurate and nobody learned anything from it, because the thing a new
 * trader has to feel is that the number moves while they sit there. So the
 * chart runs.
 */
export function WorkedExample() {
  return (
    <Section id="worked-example">
      <SectionHead
        id="worked-example-title"
        lead="The line stays put. Only the price moves — here are three ways it can go."
      >
        Say you draw this one on BTC.
      </SectionHead>

      <Reveal>
        <Panel raised>
          <ScenarioPanel />
        </Panel>
      </Reveal>
    </Section>
  );
}
