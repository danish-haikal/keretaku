import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/queryKeys';
import { supabase } from '@/lib/supabase';
import type { Household } from '@/types/database';

/** v1: each user belongs to exactly one household (created on sign-up). */
export async function fetchHousehold(): Promise<Household> {
  const { data, error } = await supabase
    .from('households')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1)
    .single();
  if (error) throw error;
  return data as Household;
}

export function useHousehold() {
  return useQuery({ queryKey: queryKeys.household, queryFn: fetchHousehold });
}

/** Rename the household ("garage"). Only the owner's RLS policy allows this. */
export function useUpdateHousehold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data: current } = await supabase
        .from('households')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();
      if (!current) throw new Error('No household found');
      const { error } = await supabase.from('households').update({ name }).eq('id', current.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.household });
    },
  });
}
