import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type {
  RenewalLog,
  RenewalLogInput,
  VehicleValueLog,
  VehicleValueLogInput,
} from '@/types/database';

/* ------------------------------------------------------------------ */
/*  Renewal logs                                                       */
/* ------------------------------------------------------------------ */

export function useRenewalLogs(vehicleId: string | undefined) {
  return useQuery({
    queryKey: ['renewal-logs', vehicleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('renewal_logs')
        .select('*')
        .eq('vehicle_id', vehicleId!)
        .order('renewed_on', { ascending: false });
      if (error) throw error;
      return data as RenewalLog[];
    },
    enabled: !!vehicleId,
  });
}

/**
 * Insert a renewal log AND update the vehicle's expiry date (linked behavior).
 * Both writes happen in a single call — the expiry update is the "linked" part
 * the prototype toggle showed.
 */
export function useCreateRenewalLog() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: RenewalLogInput) => {
      const { data, error } = await supabase.from('renewal_logs').insert(input).select().single();
      if (error) throw error;

      const expiryField = input.kind === 'road_tax' ? 'road_tax_expiry' : 'insurance_expiry';
      const { error: updateError } = await supabase
        .from('vehicles')
        .update({ [expiryField]: input.expiry_date })
        .eq('id', input.vehicle_id);
      if (updateError) throw updateError;

      return data as RenewalLog;
    },
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ['renewal-logs', variables.vehicle_id] });
      void qc.invalidateQueries({ queryKey: ['vehicle', variables.vehicle_id] });
      void qc.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
}

export function useUpdateRenewalLog() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: RenewalLogInput & { id: string }) => {
      const { data, error } = await supabase
        .from('renewal_logs')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      const { data: latest } = await supabase
        .from('renewal_logs')
        .select('expiry_date')
        .eq('vehicle_id', input.vehicle_id)
        .eq('kind', input.kind)
        .order('renewed_on', { ascending: false })
        .limit(1)
        .single();

      if (latest) {
        const expiryField = input.kind === 'road_tax' ? 'road_tax_expiry' : 'insurance_expiry';
        await supabase
          .from('vehicles')
          .update({ [expiryField]: latest.expiry_date })
          .eq('id', input.vehicle_id);
      }

      return data as RenewalLog;
    },
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ['renewal-logs', variables.vehicle_id] });
      void qc.invalidateQueries({ queryKey: ['vehicle', variables.vehicle_id] });
      void qc.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
}

export function useDeleteRenewalLog() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      vehicleId,
      kind,
    }: {
      id: string;
      vehicleId: string;
      kind: string;
    }) => {
      const { error } = await supabase.from('renewal_logs').delete().eq('id', id);
      if (error) throw error;

      const { data: latest } = await supabase
        .from('renewal_logs')
        .select('expiry_date')
        .eq('vehicle_id', vehicleId)
        .eq('kind', kind)
        .order('renewed_on', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latest) {
        const expiryField = kind === 'road_tax' ? 'road_tax_expiry' : 'insurance_expiry';
        await supabase
          .from('vehicles')
          .update({ [expiryField]: latest.expiry_date })
          .eq('id', vehicleId);
      }

      return { id };
    },
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ['renewal-logs', variables.vehicleId] });
      void qc.invalidateQueries({ queryKey: ['vehicle', variables.vehicleId] });
      void qc.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Vehicle value logs                                                 */
/* ------------------------------------------------------------------ */

export function useVehicleValueLogs(vehicleId: string | undefined) {
  return useQuery({
    queryKey: ['value-logs', vehicleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_value_logs')
        .select('*')
        .eq('vehicle_id', vehicleId!)
        .order('recorded_on', { ascending: false });
      if (error) throw error;
      return data as VehicleValueLog[];
    },
    enabled: !!vehicleId,
  });
}

export function useCreateVehicleValueLog() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: VehicleValueLogInput) => {
      const { data, error } = await supabase
        .from('vehicle_value_logs')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as VehicleValueLog;
    },
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ['value-logs', variables.vehicle_id] });
    },
  });
}

export function useUpdateVehicleValueLog() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: VehicleValueLogInput & { id: string }) => {
      const { data, error } = await supabase
        .from('vehicle_value_logs')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as VehicleValueLog;
    },
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ['value-logs', variables.vehicle_id] });
    },
  });
}

export function useDeleteVehicleValueLog() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; vehicleId: string }) => {
      const { error } = await supabase.from('vehicle_value_logs').delete().eq('id', params.id);
      if (error) throw error;
      return { id: params.id };
    },
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ['value-logs', variables.vehicleId] });
    },
  });
}
