/** Central query keys so invalidation stays consistent across the app. */
export const queryKeys = {
  household: ['household'] as const,
  vehicles: ['vehicles'] as const,
  vehicle: (id: string) => ['vehicles', id] as const,
  fuelLogs: (vehicleId: string) => ['fuel-logs', vehicleId] as const,
  chargingLogs: (vehicleId: string) => ['charging-logs', vehicleId] as const,
  serviceLogs: (vehicleId: string) => ['service-logs', vehicleId] as const,
  fuelLog: (id: string) => ['fuel-log', id] as const,
  chargingLog: (id: string) => ['charging-log', id] as const,
  serviceLog: (id: string) => ['service-log', id] as const,
  reminders: ['maintenance-reminders'] as const,
};