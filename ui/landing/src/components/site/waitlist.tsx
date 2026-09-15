"use client";

import { type FormEvent, useState } from "react";
import { cn } from "@/lib/utils";

type State = "idle" | "sending" | "done";

/**
 * Email capture for the beta.
 *
 * One field and one button, which on a phone means the button sits under the
 * field rather than beside it: at 390px a row leaves about 150px for the input,
 * which is not enough to see your own address as you type it.
 *
 * The success state replaces the form rather than sitting beside it. Leaving a
 * filled field next to "you're on the list" invites a second submission, and
 * the only honest thing to show someone who has just signed up is that they
 * have signed up.
 *
 * Alignment is inherited, not set. The form is centred in the closing card and
 * left-aligned anywhere else it might go, and hardcoding either here is what
 * made the note sit under a centred heading looking knocked out of true.
 */
export function WaitlistForm({ className }: { className?: string }) {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (state === "sending") {
      return;
    }
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();

    setError(null);
    setState("sending");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error ?? "Couldn't save that just now.");
      }
      setState("done");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
      setState("idle");
    }
  };

  if (state === "done") {
    // Same shape as the form it replaces: one line at control height, one note
    // under it. The tick used to sit beside a two-line sentence, which left it
    // floating against the middle of a paragraph.
    return (
      <div className={cn("w-full", className)}>
        <p className="flex items-center justify-center gap-2.5 text-body text-foreground">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-up text-white">
            <svg
              aria-hidden="true"
              className="size-3"
              fill="none"
              viewBox="0 0 12 12"
            >
              <path
                d="M2.5 6.2 4.8 8.5 9.5 3.5"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
          </span>
          You&rsquo;re on the list.
        </p>
        <p className="mt-3 text-caption text-fg-subtle">
          We&rsquo;ll email you when the beta opens.
        </p>
      </div>
    );
  }

  return (
    <form className={cn("w-full", className)} noValidate onSubmit={submit}>
      <div className="flex w-full flex-col gap-2.5 sm:flex-row">
        <label className="sr-only" htmlFor="waitlist-email">
          Email address
        </label>
        <input
          autoComplete="email"
          className="h-12 w-full min-w-0 rounded-full bg-surface px-5 text-body text-foreground shadow-[inset_0_0_0_1px_var(--hairline)] outline-none transition-shadow duration-fast ease-smooth-out placeholder:text-fg-subtle focus-visible:shadow-[inset_0_0_0_2px_var(--brand)] sm:flex-1"
          disabled={state === "sending"}
          id="waitlist-email"
          inputMode="email"
          name="email"
          placeholder="you@email.com"
          required
          type="email"
        />
        <button
          className="h-12 shrink-0 cursor-pointer rounded-full bg-primary px-6 font-medium text-[1.0625rem] text-primary-foreground transition-colors duration-micro ease-smooth-out hover:bg-primary/90 disabled:opacity-64"
          disabled={state === "sending"}
          type="submit"
        >
          {state === "sending" ? "Joining…" : "Join waitlist"}
        </button>
      </div>

      <p
        className={cn("mt-3 text-caption", error ? "text-down" : "text-fg-subtle")}
        role={error ? "alert" : undefined}
      >
        {error ?? "One email when the beta opens. Nothing else."}
      </p>
    </form>
  );
}
