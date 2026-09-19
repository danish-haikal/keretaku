import type { IconName } from '@/components/ui/Icon';
import type { FuelType } from '@/types/database';

export type VehicleTab = 'fuel' | 'charging' | 'service' | 'records' | 'spending';

export interface TabDef {
  id: VehicleTab;
  label: string;
  icon: IconName;
}

/** Fuel type decides which energy tab(s) a vehicle gets. Hybrid gets both. */
export function tabsForFuelType(fuelType: FuelType): TabDef[] {
  const tabs: TabDef[] = [];
  if (fuelType === 'petrol' || fuelType === 'diesel' || fuelType === 'hybrid') {
    tabs.push({ id: 'fuel', label: 'Fuel', icon: 'fuel' });
  }
  if (fuelType === 'electric' || fuelType === 'hybrid') {
    tabs.push({ id: 'charging', label: 'Charging', icon: 'bolt' });
  }
  tabs.push({ id: 'service', label: 'Service', icon: 'wrench' });
  tabs.push({ id: 'records', label: 'Records', icon: 'doc' });
  tabs.push({ id: 'spending', label: 'Spending', icon: 'wallet' });
  return tabs;
}
