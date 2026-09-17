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
   * Played a little faster than recorded.
   *
   * There is no URL parameter for playback rate, so this is sent to the player
   * over `postMessage` once it is up, which is why the embed asks for
   * `enablejsapi`. Best effort by nature: it is a cross-origin frame, so
   * nothing here can read back whether it took.
   */
  rate: 1.25,
} as const;
