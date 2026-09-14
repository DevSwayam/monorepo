import { fmtUsd, ORDER } from "./market-data";
import { ScenarioPanel } from "./scenario-panel";
import { Band, SectionHead } from "./ui";

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
    <Band id="worked-example">
      <SectionHead
        id="worked-example-title"
        kicker="A worked example"
        lead={`${ORDER.size} BTC at ${ORDER.leverage}×, in at ${fmtUsd(ORDER.entry)}. The blue line is what you drew, and it does not change here. Price is the only thing that does, three different ways, and the figure in the rail is what you are up or down while it happens.`}
      >
        Say you draw this one on BTC.
      </SectionHead>

      <ScenarioPanel />
    </Band>
  );
}
