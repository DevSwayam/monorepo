import { RedrawPanel } from "./redraw-panel";
import { Band, SectionHead } from "./ui";

/**
 * §7, the line is not a commitment.
 *
 * Its own section because it is its own idea, and because folding it into the
 * three endings meant one scenario had to carry two lessons at once.
 */
export function Redraw() {
  return (
    <Band id="redraw">
      <SectionHead
        id="redraw-title"
        kicker="Change your mind"
        lead="You called it down and price went the other way, so you chase it. Grab the square on the end of the line and pull it up after the candles: entry and size stay put, the two prices that end the trade follow the shape, and dragging the end past your entry turns the position round. Have a go yourself."
      >
        Nothing you draw is final.
      </SectionHead>

      <RedrawPanel />
    </Band>
  );
}
