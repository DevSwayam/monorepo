import { Cta } from "@/components/site/cta";
import { Faq } from "@/components/site/faq";
import { SiteFooter } from "@/components/site/footer";
import { Hero } from "@/components/site/hero";
import { HowItWorks } from "@/components/site/how-it-works";
import { Markets } from "@/components/site/markets";
import { WhatItSets } from "@/components/site/what-it-sets";
import { SiteNav } from "@/components/site/nav";
import { Thesis } from "@/components/site/thesis";

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
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        href="#main"
      >
        Skip to content
      </a>
      <SiteNav />
      <main id="main">
        <Hero />
        <Thesis />
        <WhatItSets />
        <HowItWorks />
        <Markets />
        <Faq />
        <Cta />
      </main>
      <SiteFooter />
    </>
  );
}
