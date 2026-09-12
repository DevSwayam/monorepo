import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The page grid.
 *
 * Every section is a full-bleed band closed by a rule, wrapping the page column
 * whose side rules run the entire height of the document. Structure comes from
 * rules rather than from gaps and rounded cards, so sections read as a
 * continuous ruled sheet, a spec sheet, which is the right register for an
 * exchange.
 */
export function Band({
  children,
  className,
  id,
  bleed = false,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  /** Skip the page column, for content that should run edge to edge. */
  bleed?: boolean;
}) {
  return (
    <section className="scroll-mt-14 border-border border-b" id={id}>
      {bleed ? (
        children
      ) : (
        <div className={cn("container-x border-border border-x", className)}>
          {children}
        </div>
      )}
    </section>
  );
}

export function Headline({
  children,
  as: Tag = "h2",
  className,
  id,
}: {
  children: ReactNode;
  as?: "h1" | "h2" | "h3";
  className?: string;
  id?: string;
}) {
  return (
    <Tag
      className={cn("text-balance text-heading text-foreground", className)}
      id={id}
    >
      {children}
    </Tag>
  );
}

/** Small mono label above a headline. Sentence case, never caps. */
export function Kicker({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "font-mono text-fg-subtle text-kicker",
        className,
      )}
    >
      {children}
    </p>
  );
}

/** Kicker + headline, closed by a rule. Opens most sections. */
export function SectionHead({
  kicker,
  children,
  lead,
  className,
  id,
}: {
  kicker: string;
  children: ReactNode;
  lead?: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div
      className={cn(
        "border-border border-b px-5 py-12 md:px-10 md:py-16",
        className,
      )}
    >
      <Kicker>{kicker}</Kicker>
      {/* No tight character cap here. text-balance already evens the lines out,
          and a fixed 22ch forced short headlines to wrap at arbitrary places. */}
      <Headline className="mt-4 max-w-[32ch]" id={id}>
        {children}
      </Headline>
      {lead ? (
        <p className="mt-5 max-w-[56ch] text-body text-fg-muted">{lead}</p>
      ) : null}
    </div>
  );
}

/** A ruled cell in a section's grid. Rules on the inside, never the outside. */
export function Cell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("px-5 py-8 md:px-8 md:py-10", className)}>
      {children}
    </div>
  );
}

/**
 * Honest hole where an asset will go. Shows the filename it is waiting for
 * rather than pretending with a stock render.
 */
export function Placeholder({
  file,
  note,
  className,
}: {
  file: string;
  note: string;
  className?: string;
}) {
  return (
    <div
      aria-label={`${note} placeholder`}
      className={cn(
        "relative flex items-center justify-center bg-surface bg-grid",
        className,
      )}
      role="img"
    >
      <div className="flex flex-col items-center gap-1.5 bg-background px-4 py-3 text-center">
        <span className="font-mono text-foreground text-xs">{file}</span>
        <span className="text-fg-subtle text-xs">{note}</span>
      </div>
    </div>
  );
}
