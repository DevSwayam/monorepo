import { RedrawPanel } from "./redraw-panel";
import { StorySection } from "./story-section";

export function Redraw() {
  return (
    <StorySection
      id="redraw"
      titleId="redraw-title"
      title="Nothing you draw is final."
      lead="Changed your mind? Drag the line somewhere else. It updates your trade, and costs nothing."
      scene="redraw"
    >
      <RedrawPanel />
    </StorySection>
  );
}
