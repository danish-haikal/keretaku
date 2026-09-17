import { useQuery } from '@tanstack/react-query';
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
