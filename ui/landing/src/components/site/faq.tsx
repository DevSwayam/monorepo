import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Reveal } from "./motion";
import { Panel, Section, SectionHead } from "./ui";

const FAQS = [
  {
    q: "What does my drawing actually do?",
    a: "Where the line starts is where you get in. The furthest it gets from there is what you're aiming at, and the furthest it swings the other way is where you're out. The whole shape counts, not just where you stopped drawing.",
  },
  {
    q: "What if the price doesn't follow my line?",
    a: "It almost never will, and it doesn't need to. Your line says what you're aiming at and where you'd give up. You're out at one or the other.",
  },
  {
    q: "Can I change it after?",
    a: "Yes — draw over it. That updates the trade you already have rather than starting a second one, and it costs nothing.",
  },
  {
    q: "Do you hold my money?",
    a: "No. Nothing to install, no account to approve, and we never take custody of anything.",
  },
  {
    q: "Why has nobody built this before?",
    a: "Following a hand-drawn line means keeping up with the hand. Blockchains only recently got fast enough that the line you get is the line you meant.",
  },
] as const;

/**
 * §8, real questions a trader would actually ask, answered plainly. Placeholder
 * FAQs are transparent; these are the objections the product has to survive.
 *
 * Each question is its own small surface rather than a row in a bordered list,
 * so opening one reads as that card growing rather than as a table reflowing.
 * The panel's height transition comes from the primitive; what matters here is
 * that the closed state has somewhere to grow *from*.
 */
export function Faq() {
  return (
    <Section className="max-w-4xl" id="faq">
      <SectionHead id="faq-title">
        Questions, answered.
      </SectionHead>

      <Accordion className="flex w-full flex-col gap-3">
        {FAQS.map((item, i) => (
          <Reveal index={i} key={item.q}>
            <AccordionItem className="border-b-0">
              <Panel className="rounded-xl px-5 md:px-7">
                <AccordionTrigger className="py-5 text-left text-body text-foreground data-panel-open:text-foreground">
                  {item.q}
                </AccordionTrigger>
                <AccordionPanel className="measure pt-0 pb-6 text-fg-muted text-sm leading-[1.75]">
                  {item.a}
                </AccordionPanel>
              </Panel>
            </AccordionItem>
          </Reveal>
        ))}
      </Accordion>
    </Section>
  );
}
