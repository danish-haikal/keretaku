import { parseIsoDate } from '@/lib/dates';

const LOCALE = 'en-MY';

const rmFormatter = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const intFormatter = new Intl.NumberFormat(LOCALE);
const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export function formatRM(amount: number | null | undefined): string {
  return `RM ${rmFormatter.format(Number(amount ?? 0))}`;
}

export function formatKm(km: number | null | undefined): string {
  return `${intFormatter.format(Number(km ?? 0))} km`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return 'Not set';
  return dateFormatter.format(parseIsoDate(iso));
}

/** Display label for a multi-item service visit: its item names, joined. */
export function serviceLogTitle(log: { service_log_items: { name: string }[] }): string {
  return log.service_log_items.map((i) => i.name).join(', ') || 'Service';
}

export function vehicleTitle(v: { year: number; make: string; model: string }): string {
  return `${v.year} ${v.make} ${v.model}`;
}

export function vehicleSubtitle(v: {
  variant: string | null;
  plate_number: string | null;
}): string {
  return [v.variant, v.plate_number].filter(Boolean).join(' · ');
}

/** Parse an <input type="number"> value; empty string becomes null. */
export function parseNumberInput(value: string): number | null {
  if (value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Trim a text input; empty becomes null (so the DB stores NULL, not ''). */
export function cleanText(value: string): string | null {
  const t = value.trim();
  return t === '' ? null : t;
}

/**
 * Parses a 4-digit tyre DOT date code (WWYY — first two digits are the
 * manufacture week, last two are the year) into a comparable/display form.
 * Returns null for anything that isn't exactly 4 digits or has an
 * out-of-range week. Assumes a 20xx year, which covers any tyre made since
 * the 4-digit code format took effect in 2000.
 */
export function parseTyreDotCode(
  code: string | null | undefined,
): { week: number; year: number; label: string; sortKey: number } | null {
  if (!code) return null;
  const match = /^(\d{2})(\d{2})$/.exec(code.trim());
  if (!match) return null;
  const week = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (week < 1 || week > 53) return null;
  return { week, year, label: `Week ${week}, ${year}`, sortKey: year * 100 + week };
}
