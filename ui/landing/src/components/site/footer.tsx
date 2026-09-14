import Link from "next/link";
import { LogoMark } from "./logo";
import { SoonLink } from "./soon";

const LINKS = [
  { label: "App", detail: "Opens with early access." },
  { label: "Docs", detail: "Lands with early access." },
  { label: "X", detail: "The account goes up before launch." },
] as const;

/**
 * Minimal on purpose. There is an app, there are docs, and there is one social
 * account. A four-column link farm on a pre-launch site is mostly dead ends.
 *
 * The footer is the one place that gets no surface: after a page of floating
 * materials, the last thing should read as the ground the rest were sitting
 * on. Only the legal line is separated, and by spacing, not by a rule.
 */
export function SiteFooter() {
  return (
    <footer className="container-x px-4 pt-6 pb-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6 px-2 md:flex-row md:items-center md:justify-between">
        <Link
          aria-label="skech home"
          className="pressable flex items-center gap-2.5 text-foreground"
          href="/"
        >
          <LogoMark className="h-5 w-6" />
          <span className="font-semibold text-[0.9375rem] tracking-[-0.025em]">
            skech
          </span>
        </Link>

        <nav aria-label="Footer">
          <ul className="flex items-center gap-2">
            {LINKS.map((link) => (
              <li key={link.label}>
                <SoonLink
                  className="rounded-full px-3.5 py-2 text-fg-muted text-sm transition-colors duration-fast ease-smooth-out hover:bg-surface-2 hover:text-foreground"
                  detail={link.detail}
                >
                  {link.label}
                </SoonLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="mt-8 flex flex-col gap-3 px-2 md:flex-row md:items-center md:justify-between">
        <p className="font-mono text-fg-subtle text-xs">
          &copy; {new Date().getFullYear()} skech
        </p>
        <p className="max-w-[46ch] text-fg-subtle text-xs leading-[1.6]">
          You can lose what you put in. Never put in more than you&rsquo;d be fine
          losing.
        </p>
      </div>
    </footer>
  );
}
