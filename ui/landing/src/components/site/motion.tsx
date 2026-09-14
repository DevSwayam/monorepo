"use client";

import {
  type ElementType,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

/**
 * Arrival, once. The observer disconnects on first intersection, so a section
 * scrolled past twice doesn't animate twice.
 *
 * `index` offsets the animation-delay so siblings arrive as one gesture with a
 * falloff. Keep the group small — six at most — or the last item lands after
 * the reader has moved on.
 *
 * The pre-state is CSS (`[data-reveal]`) rather than React state, so the
 * server-rendered markup is hidden before hydration instead of flashing in at
 * full opacity first.
 */
export function Reveal({
  children,
  className,
  index = 0,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  index?: number;
  as?: ElementType;
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Fires straight away for anything already on screen at mount, so
        // above-the-fold content doesn't wait for a scroll that never comes.
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      // Fires a little before the element's top edge clears the fold, so the
      // motion is finishing as the reader arrives rather than starting then.
      { rootMargin: "0px 0px -12% 0px", threshold: 0.01 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      className={className}
      data-reveal=""
      data-shown={shown ? "" : undefined}
      ref={ref}
      style={{ ["--i" as string]: index }}
    >
      {children}
    </Tag>
  );
}

/**
 * A soft brand-tinted light tracking the cursor across a card. Decoration
 * only, and mouse-only: there is no cursor to follow on touch, and it is
 * dropped under reduced motion.
 */
export function Spotlight({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  return (
    <div
      className={cn("relative", className)}
      onPointerLeave={() => setActive(false)}
      onPointerMove={(event) => {
        if (event.pointerType !== "mouse") {
          return;
        }
        const el = ref.current;
        if (!el) {
          return;
        }
        const rect = el.getBoundingClientRect();
        el.style.setProperty("--x", `${event.clientX - rect.left}px`);
        el.style.setProperty("--y", `${event.clientY - rect.top}px`);
        setActive(true);
      }}
      ref={ref}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-slow ease-smooth-out motion-reduce:hidden"
        style={{
          opacity: active ? 1 : 0,
          background:
            "radial-gradient(420px circle at var(--x) var(--y), color-mix(in srgb, var(--brand) 9%, transparent), transparent 70%)",
        }}
      />
      {children}
    </div>
  );
}
