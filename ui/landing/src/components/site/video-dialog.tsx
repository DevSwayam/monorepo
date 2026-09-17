"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { announceSoon } from "./soon";
import styles from "./video-dialog.module.css";
import { VIDEO } from "./video";

/** A solid triangle. The outline version reads as an icon; this reads as play. */
function PlayGlyph({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      viewBox="0 0 12 14"
    >
      <path d="M1.4.3a1 1 0 0 0-1.4.9v11.6a1 1 0 0 0 1.5.9l10-5.8a1 1 0 0 0 0-1.8z" />
    </svg>
  );
}

/**
 * "Watch the video", and the player it opens.
 *
 * A native `<dialog>` rather than a hand-rolled overlay, the same way the
 * practice chart expands: the top layer sits above every ancestor transform,
 * Escape and the backdrop come for free, and the rest of the page goes inert
 * while it is open without anybody managing `aria-hidden` on it.
 *
 * The iframe is mounted on click and unmounted on close, which is doing two
 * jobs. YouTube is not contacted at all until someone asks for the video, so a
 * page view that never plays it costs nothing; and closing the dialog actually
 * stops playback, where pausing through the embed API would need their second
 * script loaded to do it.
 *
 * `youtube-nocookie.com` sets no cookie until playback starts, and `rel=0`
 * keeps the end screen on this channel rather than offering a competitor's
 * video over the top of ours.
 */
/** The pill, shared by the real trigger and the not-yet one. */
const PILL =
  "pressable inline-flex min-h-12 w-full max-w-[14rem] cursor-pointer items-center justify-center gap-2.5 rounded-full bg-secondary px-6 font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand sm:w-auto sm:max-w-none";

export function WatchVideo({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  /*
   * The trigger is held as a ref to the element, not read off
   * `document.activeElement` when it is pressed. A click does not reliably
   * focus a button — Safari famously does not — so on close focus was being
   * handed back to whatever happened to be active at open time, which is
   * `<body>` on those browsers, dropping the reader at the top of the document
   * instead of on the control they just used.
   */
  const trigger = useRef<HTMLButtonElement>(null);

  const play = () => {
    if (!dialog.current) return;
    dialog.current.showModal();
    setOpen(true);
  };
  const close = () => dialog.current?.close();

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  /*
   * No id, no player. An empty id still builds a valid embed URL, so opening
   * the dialog would show a black frame with YouTube's error in it. The button
   * stays where it is and says the thing is not ready instead — the same
   * honesty the rest of the page uses for anything unbuilt, and the same toast.
   */
  if (!VIDEO.id) {
    return (
      <button
        className={cn(PILL, className)}
        onClick={() =>
          announceSoon("The walkthrough is being filmed. It lands here first.")
        }
        type="button"
      >
        <PlayGlyph className="h-3.5 w-3" />
        Watch the video
      </button>
    );
  }

  return (
    <>
      <button
        aria-haspopup="dialog"
        className={cn(PILL, className)}
        onClick={play}
        ref={trigger}
        type="button"
      >
        <PlayGlyph className="h-3.5 w-3" />
        Watch the video
      </button>

      <dialog
        aria-label={VIDEO.title}
        className={styles.panel}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        // Pressing the ground around the player closes it. The test is on the
        // dialog itself rather than a backdrop element, because `::backdrop`
        // cannot take a click: the dialog box fills the viewport with the
        // player inside it, so a press that lands on the dialog and not on a
        // child of it is a press outside the video.
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        onClose={() => {
          setOpen(false);
          trigger.current?.focus({ preventScroll: true });
        }}
        // Focus stays inside. Without this, tabbing past the close button walks
        // into the page behind, which is hidden under the backdrop.
        onKeyDown={(event) => {
          if (!open || event.key !== "Tab") return;
          const stops = Array.from(
            event.currentTarget.querySelectorAll<HTMLElement>(
              'button:not(:disabled), a[href], iframe, [tabindex]:not([tabindex="-1"])',
            ),
          ).filter((el) => el.getClientRects().length > 0);
          const first = stops[0];
          const last = stops[stops.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
        ref={dialog}
      >
        {open ? (
          <div className={styles.stage}>
            {/*
              The close control sits above the player's top-right corner rather
              than over it. YouTube puts its own share and watch-later buttons
              inside that corner on hover, and a close button laid on top of
              them is two controls in one place, one of which navigates away
              from the site.
            */}
            <div className={styles.bar}>
              <span className={styles.name}>
                {VIDEO.title}
                {VIDEO.duration ? (
                  <span className={styles.duration}>{VIDEO.duration}</span>
                ) : null}
              </span>
              <button
                aria-label="Close the video"
                className={styles.close}
                onClick={close}
                ref={closeButton}
                type="button"
              >
                <svg
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="2.2"
                  viewBox="0 0 24 24"
                >
                  <path d="M5 5l14 14M19 5L5 19" />
                </svg>
              </button>
            </div>
            <div className={styles.frame}>
              {/*
                `setPlaybackRate` is sent rather than set in the URL, because
                YouTube has no parameter for it. The command is repeated a few
                times because the player answers `postMessage` only once its own
                script is up, and there is no load event for that — `onLoad`
                fires when the frame's document arrives, which is earlier. The
                retries stop as soon as the dialog closes.
              */}
              <iframe
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                onLoad={(event) => {
                  const frame = event.currentTarget;
                  const ask = () =>
                    frame.contentWindow?.postMessage(
                      JSON.stringify({
                        event: "command",
                        func: "setPlaybackRate",
                        args: [VIDEO.rate],
                      }),
                      "*",
                    );
                  for (const delay of [0, 400, 1200, 2500]) {
                    setTimeout(() => {
                      if (frame.isConnected) ask();
                    }, delay);
                  }
                }}
                src={`https://www.youtube-nocookie.com/embed/${VIDEO.id}?autoplay=1&rel=0&enablejsapi=1`}
                title={VIDEO.title}
              />
            </div>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
