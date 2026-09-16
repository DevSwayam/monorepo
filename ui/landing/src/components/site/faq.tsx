import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Reveal } from "./motion";
import { SectionScene } from "./illo";
import styles from "./story.module.css";

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
    a: "Yes, draw over it. That updates the trade you already have rather than starting a second one, and it costs nothing.",
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

/** The first answer is open so the questions read as part of the page. */
export function Faq() {
  return (
    <section aria-labelledby="faq-title" className={styles.faq} id="faq">
      <Reveal>
        <h2 className={styles.title} id="faq-title">
          Questions, answered.
        </h2>
        <SectionScene className={styles.faqArt} name="faq" />
      </Reveal>

      <Accordion className={styles.questions} defaultValue={[FAQS[0].q]}>
        {FAQS.map((item) => (
            <AccordionItem className={styles.question} key={item.q} value={item.q}>
              <AccordionTrigger className="py-5 text-left text-body text-foreground data-panel-open:text-foreground">
                {item.q}
              </AccordionTrigger>
              <AccordionPanel className="measure pt-0 pb-6 text-fg-muted text-sm leading-[1.75]">
                {item.a}
              </AccordionPanel>
            </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
