import { cn } from "@/lib/utils";

/**
 * The mark is a flat single-colour shape, so it is painted as a CSS mask filled
 * with `currentColor` rather than shipped as a coloured image. That keeps it
 * crisp at 24 to 28px and lets each placement choose its own weight.
 *
 * Copied from `ui/landing/src/components/site/logo.tsx`, minus the link: in
 * the app the wordmark is a label on the screen you are already on, and a link
 * that reloads the current page is a trap for a keyboard.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("block shrink-0 bg-current", className)}
      style={{
        maskImage: "url(/assets/logo-mark-alpha.webp)",
        maskRepeat: "no-repeat",
        maskPosition: "center",
        maskSize: "contain",
        WebkitMaskImage: "url(/assets/logo-mark-alpha.webp)",
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        WebkitMaskSize: "contain",
      }}
    />
  );
}

/**
 * The mark and the wordmark. It is "skech", one t. Never "sketch".
 *
 * Sized to fill the app bar rather than to sit inside a control: a 32px mark in
 * a 44px row leaves six pixels above and below, which is as large as it goes
 * before it starts pushing the row open. It carries no surface of its own — the
 * bar's other five controls are objects you press, and the mark is the one
 * thing there that is simply the product's name.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-3 text-foreground", className)}>
      <LogoMark className="h-8 w-9" />
      <span className="font-semibold text-[1.375rem] tracking-[-0.025em]">
        skech
      </span>
    </span>
  );
}
