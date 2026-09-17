import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/api/queryKeys';
import { supabase } from '@/lib/supabase';
import type { MaintenanceReminder } from '@/types/database';

export function useMaintenanceReminders() {
  return useQuery({
    queryKey: queryKeys.reminders,
    queryFn: async (): Promise<MaintenanceReminder[]> => {
      const { data, error } = await supabase.from('maintenance_reminders').select('*');
      if (error) throw error;
      return data as MaintenanceReminder[];
    },
  });
}
