import { cn } from "@/lib/utils";

/**
 * The mark is a flat single-colour shape, so it is painted as a CSS mask filled
 * with `currentColor` rather than shipped as a coloured image. That keeps it
 * crisp at 24 to 28px and lets each placement choose its own weight, the nav gets
 * foreground, the footer gets subtle. It also keeps the mark from spending one
 * of the two green moments allowed per viewport.
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

/** Mark plus wordmark. It is "skech", one t. Never "sketch". */
export function Logo({
  className,
  markClassName = "h-7 w-9",
  wordmarkClassName,
}: {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className={markClassName} />
      <span
        className={cn(
          "font-semibold text-[1.0625rem] tracking-[-0.02em]",
          wordmarkClassName,
        )}
      >
        skech
      </span>
    </span>
  );
}
