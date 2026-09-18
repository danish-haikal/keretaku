/**
 * Hand-written row types matching supabase/migrations.
 * Once the Supabase CLI is linked you can replace these with generated types:
 *   npx supabase gen types typescript --linked > src/types/supabase.ts
 */

export const BODY_TYPES = ['compact', 'sedan', 'suv', 'mpv', 'motorcycle'] as const;
export type BodyType = (typeof BODY_TYPES)[number];

export const FUEL_TYPES = ['petrol', 'diesel', 'electric', 'hybrid'] as const;
export type FuelType = (typeof FUEL_TYPES)[number];

export type CurrentType = 'AC' | 'DC';

export const FUEL_GRADES = ['RON95', 'RON97', 'Diesel'] as const;
export type FuelGrade = (typeof FUEL_GRADES)[number];

export const RIM_TYPES = ['default', 'aftermarket'] as const;
export type RimType = (typeof RIM_TYPES)[number];

export const TYRE_PRESSURE_UNITS = ['psi', 'kpa'] as const;
export type TyrePressureUnit = (typeof TYRE_PRESSURE_UNITS)[number];

export interface Household {
  id: string;
  name: string;
  created_at: string;
}

export interface Vehicle {
  id: string;
  household_id: string;
  body_type: BodyType;
  fuel_type: FuelType;
  make: string;
  model: string;
  variant: string | null;
  year: number;
  plate_number: string | null;
  road_tax_expiry: string | null;
  insurance_expiry: string | null;
  road_tax_reminder_dismissed_at: string | null;
  insurance_reminder_dismissed_at: string | null;
  odometer_km: number;
  rim_type: RimType;
  tyre_pressure_unit: TyrePressureUnit;
  tyre_pressure_front: number | null;
  tyre_pressure_rear: number | null;
  ncd_rate: number | null;
  tank_capacity_liters: number | null;
  hire_purchase_loan_amount: number | null;
  hire_purchase_monthly_payment: number | null;
  hire_purchase_tenure_months: number | null;
  hire_purchase_start_date: string | null;
  hire_purchase_last_payment_date: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * road_tax_reminder_dismissed_at / insurance_reminder_dismissed_at are
 * excluded — they're only ever set via useDismissRenewalReminder(), so
 * VehicleFormPage's explicit input object never needs to know about them.
 */
export type VehicleInput = Omit<
  Vehicle,
  | 'id'
  | 'household_id'
  | 'created_at'
  | 'updated_at'
  | 'road_tax_reminder_dismissed_at'
  | 'insurance_reminder_dismissed_at'
>;

export interface FuelLog {
  id: string;
  vehicle_id: string;
  logged_on: string;
  odometer_km: number | null;
  litres: number;
  total_cost: number;
  station: string | null;
  grade: FuelGrade | null;
  budi_madani: boolean;
  is_full_tank: boolean;
  notes: string | null;
  created_at: string;
}

export type FuelLogInput = Omit<FuelLog, 'id' | 'created_at'>;

export interface ChargingLog {
  id: string;
  vehicle_id: string;
  logged_on: string;
  odometer_km: number | null;
  energy_kwh: number;
  total_cost: number;
  charger_location: string | null;
  current_type: CurrentType;
  is_full_charge: boolean;
  notes: string | null;
  created_at: string;
}

export type ChargingLogInput = Omit<ChargingLog, 'id' | 'created_at'>;

export interface ServiceLog {
  id: string;
  vehicle_id: string;
  serviced_on: string;
  odometer_km: number | null;
  workshop: string | null;
  cost: number;
  notes: string | null;
  next_due_km: number | null;
  next_due_date: string | null;
  reminder_dismissed_at: string | null;
  created_at: string;
}

export interface ServiceLogItem {
  id: string;
  service_log_id: string;
  name: string;
  price: number;
  /** One of the fixed category presets (e.g. "Aircond Service"), or null for items logged before categories existed — shown as "Other". */
  category: string | null;
  position: number;
  created_at: string;
}

/** A service log fetched together with its line items (name + price + category). */
export type ServiceLogWithItems = ServiceLog & { service_log_items: ServiceLogItem[] };

export type ServiceLogItemInput = { name: string; price: number; category: string | null };

/**
 * reminder_dismissed_at is excluded — it's only ever set via
 * useDismissServiceReminder(), so the Log Service form's input shape is
 * unaffected by this batch.
 */
export type ServiceLogInput = Omit<ServiceLog, 'id' | 'created_at' | 'reminder_dismissed_at'> & {
  items: ServiceLogItemInput[];
};

export interface MaintenanceReminder {
  service_log_id: string;
  vehicle_id: string;
  item: string;
  last_serviced_on: string;
  last_odometer_km: number | null;
  next_due_km: number | null;
  next_due_date: string | null;
}
