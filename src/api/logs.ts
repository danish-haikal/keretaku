import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/queryKeys';
import { supabase } from '@/lib/supabase';
import type {
  ChargingLog,
  ChargingLogInput,
  FuelLog,
  FuelLogInput,
  ServiceLog,
  ServiceLogInput,
} from '@/types/database';

/* ---------- Queries ---------- */

export function useFuelLogs(vehicleId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.fuelLogs(vehicleId),
    enabled,
    queryFn: async (): Promise<FuelLog[]> => {
      const { data, error } = await supabase
        .from('fuel_logs')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('logged_on', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as FuelLog[];
    },
  });
}

export function useChargingLogs(vehicleId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.chargingLogs(vehicleId),
    enabled,
    queryFn: async (): Promise<ChargingLog[]> => {
      const { data, error } = await supabase
        .from('charging_logs')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('logged_on', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ChargingLog[];
    },
  });
}

export function useServiceLogs(vehicleId: string) {
  return useQuery({
    queryKey: queryKeys.serviceLogs(vehicleId),
    queryFn: async (): Promise<ServiceLog[]> => {
      const { data, error } = await supabase
        .from('service_logs')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('serviced_on', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ServiceLog[];
    },
  });
}

/* ---------- Mutations ---------- */

/** A new log can move the odometer (DB trigger), so refresh vehicles + reminders too. */
function useInvalidateAfterLog() {
  const qc = useQueryClient();
  return (vehicleId: string, key: readonly unknown[]) => {
    void qc.invalidateQueries({ queryKey: key });
    void qc.invalidateQueries({ queryKey: ['vehicles'] });
    void qc.invalidateQueries({ queryKey: queryKeys.vehicle(vehicleId) });
    void qc.invalidateQueries({ queryKey: queryKeys.reminders });
  };
}

export function useCreateFuelLog() {
  const invalidate = useInvalidateAfterLog();
  return useMutation({
    mutationFn: async (input: FuelLogInput) => {
      const { error } = await supabase.from('fuel_logs').insert(input);
      if (error) throw error;
    },
    onSuccess: (_d, input) => invalidate(input.vehicle_id, queryKeys.fuelLogs(input.vehicle_id)),
  });
}

export function useCreateChargingLog() {
  const invalidate = useInvalidateAfterLog();
  return useMutation({
    mutationFn: async (input: ChargingLogInput) => {
      const { error } = await supabase.from('charging_logs').insert(input);
      if (error) throw error;
    },
    onSuccess: (_d, input) =>
      invalidate(input.vehicle_id, queryKeys.chargingLogs(input.vehicle_id)),
  });
}

export function useCreateServiceLog() {
  const invalidate = useInvalidateAfterLog();
  return useMutation({
    mutationFn: async (input: ServiceLogInput) => {
      const { error } = await supabase.from('service_logs').insert(input);
      if (error) throw error;
    },
    onSuccess: (_d, input) => invalidate(input.vehicle_id, queryKeys.serviceLogs(input.vehicle_id)),
  });
}
