import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchHousehold } from '@/api/household';
import { queryKeys } from '@/api/queryKeys';
import { supabase } from '@/lib/supabase';
import type { Vehicle, VehicleInput } from '@/types/database';

export function useVehicles() {
  return useQuery({
    queryKey: queryKeys.vehicles,
    queryFn: async (): Promise<Vehicle[]> => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Vehicle[];
    },
  });
}

export function useVehicle(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.vehicle(id ?? ''),
    enabled: Boolean(id),
    queryFn: async (): Promise<Vehicle> => {
      const { data, error } = await supabase.from('vehicles').select('*').eq('id', id!).single();
      if (error) throw error;
      return data as Vehicle;
    },
  });
}

function useInvalidateVehicles() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: queryKeys.vehicles });
    void qc.invalidateQueries({ queryKey: queryKeys.reminders });
  };
}

export function useCreateVehicle() {
  const invalidate = useInvalidateVehicles();
  return useMutation({
    mutationFn: async (input: VehicleInput): Promise<Vehicle> => {
      const household = await fetchHousehold();
      const { data, error } = await supabase
        .from('vehicles')
        .insert({ ...input, household_id: household.id })
        .select()
        .single();
      if (error) throw error;
      return data as Vehicle;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateVehicle(id: string) {
  const invalidate = useInvalidateVehicles();
  return useMutation({
    mutationFn: async (patch: Partial<VehicleInput>): Promise<Vehicle> => {
      const { data, error } = await supabase
        .from('vehicles')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Vehicle;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteVehicle() {
  const invalidate = useInvalidateVehicles();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vehicles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}
