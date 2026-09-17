/**
 * The walkthrough video's details.
 *
 * A plain module, deliberately. This started out as an export from
 * `video-dialog.tsx`, which is `"use client"`, and a server component cannot
 * read a constant out of a client module: React replaces client-module exports
 * with client *references*, so `VIDEO.id` came back undefined in the hero and
 * the button silently never rendered. Configuration that both sides read has to
 * sit outside the client boundary.
 */
export const VIDEO = {
  /** The YouTube video id — the part after `v=`, not the whole URL. */
  id: "4_SpI84ztHw",
  /** Names the dialog for screen readers, and titles the player. */
  title: "How skech works",
  /**
   * Shown beside the title, so the reader knows what they are committing to
   * before they start it. Typed out rather than read off the video: a YouTube
   * embed will not report its duration without loading their data API, which
   * is a second network dependency for one short string.
   */
  duration: "",
  /**
   * Playback rate. 1 is as recorded.
   *
   * 1.25 was too quick to follow, and the step below it is not 1.1: YouTube's
   * player only accepts the rates in its own list — 0.25, 0.5, 0.75, 1, 1.25,
   * 1.5, 1.75, 2 — and `setPlaybackRate` silently ignores anything else, so
   * asking for 1.1 would have left it running at 1.25 with nothing to show
   * why. 1 is the next one down.
   *
   * There is no URL parameter for rate either, so anything other than 1 is
   * sent to the player over `postMessage` once it is up, which is what the
   * embed's `enablejsapi` is for. Best effort by nature: it is a cross-origin
   * frame, so nothing here can read back whether it took.
   */
  rate: 1,
} as const;
