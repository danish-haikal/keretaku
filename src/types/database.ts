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
  odometer_km: number;
  created_at: string;
  updated_at: string;
}

export type VehicleInput = Omit<Vehicle, 'id' | 'household_id' | 'created_at' | 'updated_at'>;

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
  item: string;
  workshop: string | null;
  cost: number;
  notes: string | null;
  next_due_km: number | null;
  next_due_date: string | null;
  created_at: string;
}

export type ServiceLogInput = Omit<ServiceLog, 'id' | 'created_at'>;

export interface MaintenanceReminder {
  service_log_id: string;
  vehicle_id: string;
  item: string;
  last_serviced_on: string;
  last_odometer_km: number | null;
  next_due_km: number | null;
  next_due_date: string | null;
}
