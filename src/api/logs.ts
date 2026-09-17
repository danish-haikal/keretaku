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

/* ---------- Queries: lists ---------- */

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

/* ---------- Queries: single log (for edit forms) ---------- */

export function useFuelLog(logId?: string) {
  return useQuery({
    queryKey: queryKeys.fuelLog(logId ?? ''),
    enabled: !!logId,
    queryFn: async (): Promise<FuelLog> => {
      const { data, error } = await supabase.from('fuel_logs').select('*').eq('id', logId).single();
      if (error) throw error;
      return data as FuelLog;
    },
  });
}

export function useChargingLog(logId?: string) {
  return useQuery({
    queryKey: queryKeys.chargingLog(logId ?? ''),
    enabled: !!logId,
    queryFn: async (): Promise<ChargingLog> => {
      const { data, error } = await supabase
        .from('charging_logs')
        .select('*')
        .eq('id', logId)
        .single();
      if (error) throw error;
      return data as ChargingLog;
    },
  });
}

export function useServiceLog(logId?: string) {
  return useQuery({
    queryKey: queryKeys.serviceLog(logId ?? ''),
    enabled: !!logId,
    queryFn: async (): Promise<ServiceLog> => {
      const { data, error } = await supabase
        .from('service_logs')
        .select('*')
        .eq('id', logId)
        .single();
      if (error) throw error;
      return data as ServiceLog;
    },
  });
}

/* ---------- Mutations ---------- */

/** A log can move the odometer (DB trigger) and change reminders, so refresh those too. */
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

export function useUpdateFuelLog() {
  const invalidate = useInvalidateAfterLog();
  return useMutation({
    mutationFn: async ({ id, ...input }: FuelLogInput & { id: string }) => {
      const { error } = await supabase.from('fuel_logs').update(input).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, input) => invalidate(input.vehicle_id, queryKeys.fuelLogs(input.vehicle_id)),
  });
}

export function useDeleteFuelLog() {
  const invalidate = useInvalidateAfterLog();
  return useMutation({
    mutationFn: async ({ id }: { id: string; vehicleId: string }) => {
      const { error } = await supabase.from('fuel_logs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, { vehicleId }) => invalidate(vehicleId, queryKeys.fuelLogs(vehicleId)),
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

export function useUpdateChargingLog() {
  const invalidate = useInvalidateAfterLog();
  return useMutation({
    mutationFn: async ({ id, ...input }: ChargingLogInput & { id: string }) => {
      const { error } = await supabase.from('charging_logs').update(input).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, input) =>
      invalidate(input.vehicle_id, queryKeys.chargingLogs(input.vehicle_id)),
  });
}

export function useDeleteChargingLog() {
  const invalidate = useInvalidateAfterLog();
  return useMutation({
    mutationFn: async ({ id }: { id: string; vehicleId: string }) => {
      const { error } = await supabase.from('charging_logs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, { vehicleId }) => invalidate(vehicleId, queryKeys.chargingLogs(vehicleId)),
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

export function useUpdateServiceLog() {
  const invalidate = useInvalidateAfterLog();
  return useMutation({
    mutationFn: async ({ id, ...input }: ServiceLogInput & { id: string }) => {
      const { error } = await supabase.from('service_logs').update(input).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, input) => invalidate(input.vehicle_id, queryKeys.serviceLogs(input.vehicle_id)),
  });
}

export function useDeleteServiceLog() {
  const invalidate = useInvalidateAfterLog();
  return useMutation({
    mutationFn: async ({ id }: { id: string; vehicleId: string }) => {
      const { error } = await supabase.from('service_logs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, { vehicleId }) => invalidate(vehicleId, queryKeys.serviceLogs(vehicleId)),
  });
}
