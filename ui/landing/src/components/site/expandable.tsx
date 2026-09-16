"use client";

import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from "react";
import { ExpandIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./expandable.module.css";

const ExpandContext = createContext<{ open: boolean; label: string; expand: () => void } | null>(null);

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

/** The top layer escapes ancestor transforms without remounting the chart. */
export function Expandable({ children, label, className }: { children: ReactNode; label: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [slot, setSlot] = useState<number>();
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLElement | null>(null);

  const expand = () => {
    if (!dialog.current) return;
    trigger.current = document.activeElement as HTMLElement;
    setSlot(dialog.current.getBoundingClientRect().height);
    dialog.current.showModal();
    setOpen(true);
  };
  const close = () => dialog.current?.close();

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
