import { describe, expect, it } from 'vitest';
import { addMonths, daysUntil } from '@/lib/dates';
import { buildReminderList, maintenanceStatus } from '@/lib/reminders';
import type { MaintenanceReminder, Vehicle } from '@/types/database';

const TODAY = new Date(2026, 8, 18); // 18 Sep 2026, local time

const vehicle = (overrides: Partial<Vehicle> = {}): Vehicle => ({
  id: 'v1',
  household_id: 'h1',
  body_type: 'compact',
  fuel_type: 'petrol',
  make: 'Perodua',
  model: 'Axia',
  variant: '1.0G',
  year: 2015,
  plate_number: 'WB 6224 M',
  road_tax_expiry: null,
  insurance_expiry: null,
  road_tax_reminder_dismissed_at: null,
  insurance_reminder_dismissed_at: null,
  odometer_km: 62_450,
  rim_type: 'default',
  tyre_pressure_unit: 'psi',
  tyre_pressure_front: null,
  tyre_pressure_rear: null,
  ncd_rate: null,
  tank_capacity_liters: null,
  hire_purchase_loan_amount: null,
  hire_purchase_monthly_payment: null,
  hire_purchase_tenure_months: null,
  hire_purchase_start_date: null,
  hire_purchase_last_payment_date: null,
  created_at: '',
  updated_at: '',
  ...overrides,
});

const reminder = (overrides: Partial<MaintenanceReminder> = {}): MaintenanceReminder => ({
  service_log_id: 's1',
  vehicle_id: 'v1',
  item: 'Engine oil',
  last_serviced_on: '2026-05-10',
  last_odometer_km: 58_200,
  next_due_km: null,
  next_due_date: null,
  ...overrides,
});

describe('dates', () => {
  it('counts days until a date', () => {
    expect(daysUntil('2026-09-18', TODAY)).toBe(0);
    expect(daysUntil('2026-09-28', TODAY)).toBe(10);
    expect(daysUntil('2026-09-17', TODAY)).toBe(-1);
    expect(daysUntil(null, TODAY)).toBeNull();
  });

  it('adds months and clamps to month end', () => {
    expect(addMonths('2026-05-10', 6)).toBe('2026-11-10');
    expect(addMonths('2026-08-31', 6)).toBe('2027-02-28');
  });
});

describe('maintenanceStatus', () => {
  it('flags due soon by km', () => {
    const s = maintenanceStatus(reminder({ next_due_km: 63_200 }), 62_450, TODAY);
    expect(s.kmLeft).toBe(750);
    expect(s.urgency).toBe('soon');
  });

  it('flags overdue by date even when km is fine', () => {
    const s = maintenanceStatus(
      reminder({ next_due_km: 80_000, next_due_date: '2026-09-01' }),
      62_450,
      TODAY,
    );
    expect(s.urgency).toBe('overdue');
  });

  it('is ok when both limits are far away', () => {
    const s = maintenanceStatus(
      reminder({ next_due_km: 80_000, next_due_date: '2027-06-01' }),
      62_450,
      TODAY,
    );
    expect(s.urgency).toBe('ok');
  });
});

describe('buildReminderList', () => {
  it('skips unset renewal dates and sorts most urgent first', () => {
    const list = buildReminderList(
      [vehicle({ road_tax_expiry: '2027-08-27' })],
      [reminder({ next_due_km: 63_200 })],
      TODAY,
    );
    expect(list).toHaveLength(2);
    expect(list[0]?.title).toBe('Engine oil');
    expect(list[1]?.kind).toBe('road_tax');
  });
});
