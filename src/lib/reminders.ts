import { daysUntil } from '@/lib/dates';
import type { MaintenanceReminder, Vehicle } from '@/types/database';

export type Urgency = 'overdue' | 'soon' | 'ok';

/** Thresholds for "due soon". */
export const SOON_DAYS = 30;
export const SOON_KM = 1_500;

const RANK: Record<Urgency, number> = { overdue: 0, soon: 1, ok: 2 };

export function urgencyFromDays(days: number): Urgency {
  if (days < 0) return 'overdue';
  if (days <= SOON_DAYS) return 'soon';
  return 'ok';
}

export function urgencyFromKm(kmLeft: number): Urgency {
  if (kmLeft <= 0) return 'overdue';
  if (kmLeft <= SOON_KM) return 'soon';
  return 'ok';
}

export function worseOf(a: Urgency, b: Urgency): Urgency {
  return RANK[a] <= RANK[b] ? a : b;
}

export interface ReminderItem {
  key: string;
  vehicleId: string;
  vehicleName: string;
  kind: 'road_tax' | 'insurance' | 'maintenance';
  title: string;
  detail: string;
  urgency: Urgency;
  daysLeft: number | null;
  kmLeft: number | null;
  /** Lower = sooner. km are converted at ~50 km/day so mixed items sort sensibly. */
  sortKey: number;
}

const KM_PER_DAY_ESTIMATE = 50;

export function maintenanceStatus(
  reminder: Pick<MaintenanceReminder, 'next_due_km' | 'next_due_date'>,
  currentOdometer: number,
  today: Date = new Date(),
) {
  const kmLeft = reminder.next_due_km != null ? reminder.next_due_km - currentOdometer : null;
  const daysLeft = daysUntil(reminder.next_due_date, today);

  let urgency: Urgency = 'ok';
  if (kmLeft != null) urgency = worseOf(urgency, urgencyFromKm(kmLeft));
  if (daysLeft != null) urgency = worseOf(urgency, urgencyFromDays(daysLeft));

  const candidates = [kmLeft != null ? kmLeft / KM_PER_DAY_ESTIMATE : null, daysLeft].filter(
    (n): n is number => n != null,
  );
  const sortKey = candidates.length ? Math.min(...candidates) : Number.POSITIVE_INFINITY;

  return { kmLeft, daysLeft, urgency, sortKey };
}

export function describeDays(days: number): string {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Due today';
  return `${days}d left`;
}

export function describeKm(km: number): string {
  const n = new Intl.NumberFormat('en-MY').format(Math.abs(km));
  return km < 0 ? `${n} km overdue` : `${n} km left`;
}

/** Combine renewal dates and maintenance reminders into one sorted list. */
export function buildReminderList(
  vehicles: Vehicle[],
  maintenance: MaintenanceReminder[],
  today: Date = new Date(),
): ReminderItem[] {
  const items: ReminderItem[] = [];
  const byId = new Map(vehicles.map((v) => [v.id, v]));

  for (const v of vehicles) {
    const vehicleName = `${v.year} ${v.make} ${v.model}`;
    const renewals = [
      { kind: 'road_tax' as const, title: 'Road tax renewal', date: v.road_tax_expiry },
      { kind: 'insurance' as const, title: 'Insurance renewal', date: v.insurance_expiry },
    ];
    for (const r of renewals) {
      const days = daysUntil(r.date, today);
      if (days == null) continue;
      items.push({
        key: `${v.id}-${r.kind}`,
        vehicleId: v.id,
        vehicleName,
        kind: r.kind,
        title: r.title,
        detail: describeDays(days),
        urgency: urgencyFromDays(days),
        daysLeft: days,
        kmLeft: null,
        sortKey: days,
      });
    }
  }

  for (const m of maintenance) {
    const v = byId.get(m.vehicle_id);
    if (!v) continue;
    const s = maintenanceStatus(m, v.odometer_km, today);
    const parts: string[] = [];
    if (s.kmLeft != null) parts.push(describeKm(s.kmLeft));
    if (s.daysLeft != null) parts.push(describeDays(s.daysLeft));
    items.push({
      key: `${m.vehicle_id}-${m.service_log_id}`,
      vehicleId: v.id,
      vehicleName: `${v.year} ${v.make} ${v.model}`,
      kind: 'maintenance',
      title: m.item,
      detail: parts.join(' · '),
      urgency: s.urgency,
      daysLeft: s.daysLeft,
      kmLeft: s.kmLeft,
      sortKey: s.sortKey,
    });
  }

  return items.sort((a, b) => RANK[a.urgency] - RANK[b.urgency] || a.sortKey - b.sortKey);
}
