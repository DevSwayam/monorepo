import { Cta } from "@/components/site/cta";
import { Faq } from "@/components/site/faq";
import { SiteFooter } from "@/components/site/footer";
import { Hero } from "@/components/site/hero";
import { HowItWorks } from "@/components/site/how-it-works";
import { Redraw } from "@/components/site/redraw";
import { WorkedExample } from "@/components/site/worked-example";
import { SiteNav } from "@/components/site/nav";

/**
 * Rendered per request rather than at build time, so the headline picks a new
 * pair of pixel words on every refresh. Everything else on the page is static
 * content, so the only cost is the render itself.
 */
export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <>
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-60 focus:rounded-full focus:bg-primary focus:px-5 focus:py-2.5 focus:font-medium focus:text-primary-foreground"
        href="#main"
      >
        Skip to content
      </a>
      <SiteNav />
      <main id="main">
        <Hero />
        <HowItWorks />
        <WorkedExample />
        <Redraw />
        <Faq />
        <Cta />
      </main>
      <SiteFooter />
    </>
  );
}
