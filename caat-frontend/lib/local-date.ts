/**
 * Local-time date helpers.
 *
 * A bare `new Date("2026-03-23")` parses the string as UTC midnight, so for
 * users west of UTC it reads back as the previous calendar day. Deadlines are
 * stored as date-only (`YYYY-MM-DD`) values and must be compared/displayed in
 * the user's local time, so we parse and stamp them locally to avoid the
 * off-by-one.
 */

/** Parse a YYYY-MM-DD string as a local-midnight Date (avoids UTC off-by-one). */
export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Today's date as YYYY-MM-DD in local time. */
export function todayKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
