"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { ExpandIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./expandable.module.css";

const ExpandContext = createContext<{ open: boolean; label: string; expand: () => void } | null>(null);

/**
 * Panels that can be opened from elsewhere on the page, by label.
 *
 * The obvious move — hoist the provider above both hero sections so a button in
 * the first can use the context — does not work here. The `<dialog>` *is* the
 * panel's in-flow container: closed it lays out inline, open it goes fixed and
 * fullscreen, and that is what lets the chart change places without
 * remounting and losing the trade in progress. Lifting the provider would mean
 * lifting the chart out of the section it belongs to.
 *
 * So the panel publishes its opener instead, and a trigger anywhere can ask
 * for it by name. Module scope rather than context precisely because the two
 * are not in the same tree.
 */
const openers = new Map<string, () => void>();

/** In-flow header control: it never covers the chart's labels. */
export function ExpandButton() {
  const context = useContext(ExpandContext);
  if (!context || context.open) return null;
  return (
    <button aria-label={`Expand ${context.label}`} aria-haspopup="dialog" className={styles.expand} onClick={context.expand} type="button">
      <ExpandIcon aria-hidden="true" size={16} />
    </button>
  );
}

/**
 * A control that opens a panel it does not contain.
 *
 * Falls back to an anchor when the panel has not registered — during the first
 * paint before hydration, the press scrolls to the chart rather than doing
 * nothing, which is the behaviour this button used to have.
 */
export function ExpandTrigger({
  label,
  href,
  className,
  children,
}: {
  label: string;
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      aria-haspopup="dialog"
      className={className}
      href={href}
      onClick={(event) => {
        const open = openers.get(label);
        if (!open) return;
        event.preventDefault();
        open();
      }}
    >
      {children}
    </a>
  );
}

/** The top layer escapes ancestor transforms without remounting the chart. */
export function Expandable({ children, label, className }: { children: ReactNode; label: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [slot, setSlot] = useState<number>();
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLElement | null>(null);

  const expand = useCallback(() => {
    if (!dialog.current) return;
    trigger.current = document.activeElement as HTMLElement;
    setSlot(dialog.current.getBoundingClientRect().height);
    dialog.current.showModal();
    setOpen(true);
  }, []);
  const close = () => dialog.current?.close();

  // Published for `ExpandTrigger`, and withdrawn on unmount so a stale opener
  // cannot be called against a dialog that has gone.
  useEffect(() => {
    openers.set(label, expand);
    return () => {
      openers.delete(label);
    };
  }, [label, expand]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  return (
    <ExpandContext.Provider value={{ open, label, expand }}>
      <div style={open ? { height: slot } : undefined}>
        <dialog
          aria-label={open ? `Expanded ${label}` : undefined}
          aria-modal={open ? true : undefined}
          className={cn(styles.panel, className)}
          onCancel={event => { event.preventDefault(); close(); }}
          onKeyDown={event => {
            if (!open || event.key !== "Tab") return;
            const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
              'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
            )).filter(element => element.getClientRects().length > 0 && element.tabIndex >= 0);
            const first = controls[0];
            const last = controls[controls.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }}
          onClose={() => {
            setOpen(false);
            // The inline control is rendered again before restoring focus.
            requestAnimationFrame(() => {
              const control = dialog.current?.querySelector<HTMLButtonElement>(`button[aria-haspopup="dialog"]`);
              (control ?? trigger.current)?.focus({ preventScroll: true });
            });
          }}
          ref={dialog}
          role={open ? "dialog" : "group"}
        >
          {open && <div className={styles.toolbar}>
            <span>Practice chart</span>
            <button aria-label={`Close ${label}`} className={styles.close} onClick={close} ref={closeButton} type="button"><XIcon aria-hidden="true" size={18} />Close</button>
          </div>}
          <div className={styles.content}>{children}</div>
        </dialog>
      </div>
    </ExpandContext.Provider>
  );
}
