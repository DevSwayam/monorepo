import Link from "next/link";
import { LogoMark } from "./logo";
import { SoonLink } from "./soon";

const LINKS = [
  { label: "App", detail: "Trading opens with the public testnet." },
  { label: "Docs", detail: "Documentation lands alongside the testnet." },
  { label: "X", detail: "The account goes up before launch." },
] as const;

/**
 * Minimal on purpose. There is an app, there are docs, and there is one social
 * account. A four-column link farm on a pre-launch site is mostly dead ends.
 */
export function SiteFooter() {
  return (
    <footer className="border-border border-b">
      <div className="container-x border-border border-x">
        <div className="flex flex-col gap-6 px-5 py-10 md:flex-row md:items-center md:justify-between md:px-10">
          <Link
            aria-label="skech home"
            className="flex items-center gap-2.5 text-foreground"
            href="/"
          >
            <LogoMark className="h-5 w-6" />
            <span className="font-semibold text-[0.9375rem] tracking-[-0.02em]">
              skech
            </span>
          </Link>

          <nav aria-label="Footer">
            <ul className="flex items-center gap-7">
              {LINKS.map((link) => (
                <li key={link.label}>
                  <SoonLink className="text-fg-muted text-sm" detail={link.detail}>
                    {link.label}
                  </SoonLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex flex-col gap-3 border-border border-t px-5 py-5 md:flex-row md:items-center md:justify-between md:px-10">
          <p className="font-mono text-fg-subtle text-xs">
            &copy; {new Date().getFullYear()} skech
          </p>
          <p className="max-w-[46ch] text-fg-subtle text-xs leading-[1.6]">
            Perps can lose you everything you put up. None of this is financial
            advice.
          </p>
        </div>
      </div>
    </footer>
  );
}
