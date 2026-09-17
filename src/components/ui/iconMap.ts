import type { IconName } from './Icon';
import type { BodyType, FuelType } from '@/types/database';

/** Body-type chip/list icon for a vehicle. */
export function bodyIcon(bodyType: BodyType): IconName {
  return `body-${bodyType}`;
}

/** Icon representing how a vehicle is fuelled. */
export function fuelIcon(fuelType: FuelType): IconName {
  if (fuelType === 'electric') return 'bolt';
  if (fuelType === 'hybrid') return 'hybrid';
  return 'fuel';
}
