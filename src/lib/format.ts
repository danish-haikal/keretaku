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
const monthYearFormatter = new Intl.DateTimeFormat(LOCALE, {
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

export function parseNumberInput(value: string): number | null {
  if (value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function cleanText(value: string): string | null {
  const t = value.trim();
  return t === '' ? null : t;
}

export function parseTyreDotCode(
  code: string | null | undefined,
): { week: number; year: number; label: string; sortKey: number; monthLabel: string } | null {
  if (!code) return null;
  const match = /^(\d{2})(\d{2})$/.exec(code.trim());
  if (!match) return null;
  const week = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (week < 1 || week > 53) return null;
  // Approximate the middle day of that week to estimate a calendar month.
  // Manufacturing DOT weeks aren't strict ISO weeks, so this is a best-effort estimate.
  const approxDate = new Date(year, 0, 1 + (week - 1) * 7 + 3);
  return {
    week,
    year,
    label: `Week ${week}, ${year}`,
    sortKey: year * 100 + week,
    monthLabel: `~${monthYearFormatter.format(approxDate)}`,
  };
}

/**
 * Hint text for a tyre DOT code field: the parsed week/year + estimated month
 * once 4 digits are entered, or the format explanation while it's incomplete/invalid.
 */
export function formatDotCodeHint(code: string): string {
  const parsed = parseTyreDotCode(code);
  if (!parsed) {
    return '4-digit code near the DOT mark on the sidewall — first 2 digits are the week, last 2 are the year (e.g. 3524 = week 35 of 2024).';
  }
  return `${parsed.label} (${parsed.monthLabel})`;
}

/**
 * Months/balance remaining on a hire purchase loan, using Start Date + Tenure
 * as the source of truth (not a manually-typed payment counter, which drifts).
 * Loan amount is informational only — this does not amortize against it,
 * since Malaysian hire purchase uses flat-rate interest we haven't modeled.
 *
 * Shared between VehicleFormPage (live draft values while editing) and
 * VehicleDetailPage (the saved vehicle) — previously duplicated in both.
 */
export function hirePurchaseRemainingLabel(params: {
  paidOff: boolean;
  monthlyPayment: number | null;
  tenureMonths: number | null;
  startDate: string | null;
}): string | null {
  const { paidOff, monthlyPayment, tenureMonths, startDate } = params;
  if (paidOff) return null;
  if (!monthlyPayment || !tenureMonths || !startDate) return null;
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return null;
  const now = new Date();
  let elapsed =
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) elapsed -= 1;
  elapsed = Math.max(0, Math.min(tenureMonths, elapsed));
  const remainingMonths = tenureMonths - elapsed;
  if (remainingMonths <= 0) return 'Fully paid off, based on start date and tenure.';
  const remainingBalance = remainingMonths * monthlyPayment;
  const monthsLabel = remainingMonths === 1 ? '1 month left' : `${remainingMonths} months left`;
  return `${monthsLabel} · est. ${formatRM(remainingBalance)} remaining`;
}

/**
 * "Bought 2020 · 5 years owned" for the vehicle header. Based on calendar
 * year only, matching the single "purchase year" field (not a full date).
 */
export function ownershipLabel(purchaseYear: number | null | undefined): string | null {
  if (!purchaseYear) return null;
  const currentYear = new Date().getFullYear();
  const years = currentYear - purchaseYear;
  if (years <= 0) return `Bought ${purchaseYear}`;
  const yearsLabel = years === 1 ? '1 year' : `${years} years`;
  return `Bought ${purchaseYear} · ${yearsLabel} owned`;
}
