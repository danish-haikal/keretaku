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
