import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Reveal } from "./motion";

/**
 * The page grid.
 *
 * Sections are open runs of the page column with generous vertical room, not
 * bands closed by rules. Structure comes from the surfaces inside them: content
 * sits on rounded cards that float over the ground with their own light, and
 * the space between cards does the separating that hairlines used to do.
 *
 * Nothing here draws a border. If two things need to read as separate, they get
 * separate surfaces.
 */
export function Section({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section className="scroll-mt-28" id={id}>
      <div
        className={cn(
          "container-x px-4 py-14 sm:px-6 md:py-20 lg:px-8 lg:py-28",
          className,
        )}
      >
        {children}
      </div>
    </section>
  );
}

/**
 * The base material: a rounded surface with an edge, a shadow, and a hairline
 * of light along the top.
 *
 * `raised` is the next step up and adds a top-to-bottom gradient, so a card on
 * a card still reads as two objects. Don't nest two raised surfaces.
 */
export function Panel({
  children,
  className,
  raised = false,
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  raised?: boolean;
  /** Rises toward the pointer on hover. For cards that are worth exploring. */
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        raised ? "surface-raised" : "surface",
        // Radius lives here, not in the utility, so a caller can pass a
        // different `rounded-*` and have tailwind-merge honour it.
        "sheen-top overflow-hidden rounded-2xl",
        interactive && "liftable",
        className,
      )}
    >
      {children}
    </div>
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
    <Tag className={cn("text-heading text-foreground", className)} id={id}>
      {children}
    </Tag>
  );
}

/** Small mono label, for figures inside a card. Sentence case, never caps. */
export function Kicker({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("font-mono text-fg-subtle text-kicker", className)}>
      {children}
    </p>
  );
}

/**
 * Headline and an optional lead. Opens most sections.
 *
 * Centred by default: with sections now reading as floating cards rather than
 * as a ruled sheet, a left-aligned header leaves the right half of the column
 * empty above a full-width card and the page looks like it lost something.
 */
export function SectionHead({
  children,
  lead,
  className,
  id,
  align = "center",
}: {
  children: ReactNode;
  lead?: ReactNode;
  className?: string;
  id?: string;
  align?: "center" | "left";
}) {
  const centred = align === "center";

  return (
    <Reveal
      className={cn(
        "mb-10 flex flex-col md:mb-14",
        centred ? "items-center text-center" : "items-start",
        className,
      )}
    >
      <Headline className={cn("max-w-[20ch]", !centred && "mt-0")} id={id}>
        {children}
      </Headline>
      {lead ? (
        <p
          className={cn(
            "mt-5 text-body text-fg-muted",
            centred ? "max-w-[54ch]" : "max-w-[56ch]",
          )}
        >
          {lead}
        </p>
      ) : null}
    </Reveal>
  );
}

/** A cell inside a panel's grid. Padding only; separation is the panel's job. */
export function Cell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("p-6 md:p-8", className)}>{children}</div>
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
        "relative flex items-center justify-center rounded-xl bg-surface-2 bg-grid",
        className,
      )}
      role="img"
    >
      <div className="flex flex-col items-center gap-1.5 rounded-lg bg-background px-4 py-3 text-center shadow-card">
        <span className="font-mono text-foreground text-xs">{file}</span>
        <span className="text-fg-subtle text-xs">{note}</span>
      </div>
    </div>
  );
}
