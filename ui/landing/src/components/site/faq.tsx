import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Band, SectionHead } from "./ui";

const FAQS = [
  {
    q: "What exactly does the drawing set?",
    a: "Start of the curve is your entry, the end is your target, the lowest point it passes through is your invalidation. You still set size. The shape sets the prices.",
  },
  {
    q: "What if price does not follow my line?",
    a: "It almost never will, exactly. The line is a thesis, not a promise the market made. You are out at your target or your invalidation, and the shape is what sets those two.",
  },
  {
    q: "Can I redraw after opening?",
    a: "Yes. Redrawing amends the position rather than opening a second one, and costs nothing.",
  },
  {
    q: "Is this custodial?",
    a: "No. Connect a wallet and draw. Nothing to install, no account to approve.",
  },
  {
    q: "Why could this not be built before?",
    a: "Filling against a drawn path means keeping up with the hand that drew it. Until block times came down, the line you got was never the line you meant.",
  },
] as const;

/**
 * §8, real questions a trader would actually ask, answered plainly. Placeholder
 * FAQs are transparent; these are the objections the product has to survive.
 */
export function Faq() {
  return (
    <Band id="faq">
      <SectionHead id="faq-title" kicker="FAQ">
        Questions, answered.
      </SectionHead>
      <Accordion className="w-full">
        {FAQS.map((item) => (
          <AccordionItem
            className="border-border border-b px-5 last:border-b-0 md:px-10"
            key={item.q}
          >
            <AccordionTrigger className="py-5 text-left text-foreground text-title">
              {item.q}
            </AccordionTrigger>
            <AccordionPanel className="measure pb-6 text-fg-muted text-sm leading-[1.75]">
              {item.a}
            </AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>
    </Band>
  );
}
