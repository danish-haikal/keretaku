const MS_PER_DAY = 86_400_000;

/** Today's date as YYYY-MM-DD in the user's local timezone. */
export function todayIso(now: Date = new Date()): string {
  return toIsoDate(now);
}

/** Format a Date as YYYY-MM-DD using local calendar fields (no UTC shift). */
export function toIsoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parse YYYY-MM-DD as a local-midnight Date. */
export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/** Whole days from `today` until `iso`. Negative when the date has passed. */
export function daysUntil(iso: string | null, today: Date = new Date()): number | null {
  if (!iso) return null;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((parseIsoDate(iso).getTime() - start.getTime()) / MS_PER_DAY);
}

/** Add calendar months to a YYYY-MM-DD date, clamping to the month's last day. */
export function addMonths(iso: string, months: number): string {
  const d = parseIsoDate(iso);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return toIsoDate(d);
}
