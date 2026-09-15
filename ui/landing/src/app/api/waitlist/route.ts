/**
 * The waitlist, appended to a Google Sheet.
 *
 * The sheet is written through an Apps Script web app rather than the Sheets
 * API, because that needs no service account, no OAuth and no key to rotate.
 * See ui/landing/WAITLIST.md for the script and how to deploy it.
 *
 * The endpoint stays server-side (WAITLIST_SHEET_URL, not NEXT_PUBLIC_). An
 * Apps Script web app deployed as "anyone" is an open write endpoint, and
 * shipping its URL to the browser hands anyone a direct line to the sheet.
 */
const ENDPOINT = process.env.WAITLIST_SHEET_URL;

/**
 * Deliberately permissive. Real addresses break every clever pattern, and the
 * confirmation email is the only test that actually proves one works, so this
 * only catches the obvious typo before it reaches the sheet.
 */
const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: Request) {
  let email: unknown;
  try {
    ({ email } = await request.json());
  } catch {
    return Response.json({ error: "Malformed request." }, { status: 400 });
  }

  if (typeof email !== "string" || !LOOKS_LIKE_EMAIL.test(email.trim())) {
    return Response.json(
      { error: "That doesn't look like an email address." },
      { status: 400 },
    );
  }

  if (!ENDPOINT) {
    // Loud on the server, vague to the visitor: a missing deploy step is our
    // problem, and "not configured" tells a stranger about our plumbing.
    console.error("WAITLIST_SHEET_URL is not set; dropped:", email);
    return Response.json(
      { error: "Sign-ups aren't open yet. Try again shortly." },
      { status: 503 },
    );
  }

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        source: "landing",
        at: new Date().toISOString(),
      }),
      // Apps Script is not fast and not always up. Better a clear failure the
      // visitor can retry than a request that hangs until the tab gives up.
      signal: AbortSignal.timeout(8000),
    });
    // Apps Script always answers 200. ContentService cannot set a status
    // code, so a script that threw still arrives here looking healthy and the
    // only evidence of failure is in the body. Checking `res.ok` alone would
    // tell someone they are on the list when nothing was written.
    const body = await res.json().catch(() => null);
    if (!res.ok || body?.ok !== true) {
      throw new Error(
        `sheet responded ${res.status}: ${body ? JSON.stringify(body) : "unparseable"}`,
      );
    }
  } catch (cause) {
    console.error("waitlist append failed:", cause);
    return Response.json(
      { error: "Couldn't save that just now. Try again?" },
      { status: 502 },
    );
  }

  return Response.json({ ok: true });
}
