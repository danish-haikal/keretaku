import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useChargingLogs, useFuelLogs, useServiceLogs } from '@/api/logs';
import { useUpdateVehicle, useVehicle } from '@/api/vehicles';
import page from '@/components/layout/Page.module.css';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, TextInput } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { ListRow } from '@/components/ui/ListRow';
import { Sheet } from '@/components/ui/Sheet';
import { ErrorState, LoadingState } from '@/components/ui/StateMessage';
import { RenewalChips } from '@/components/vehicle/RenewalChips';
import { SpendingSummary } from '@/components/vehicle/SpendingSummary';
import { VehicleDocuments } from '@/components/vehicle/VehicleDocuments';
import { VehicleHero } from '@/components/vehicle/VehicleHero';
import { VehicleTabs } from '@/components/vehicle/VehicleTabs';
import { tabsForFuelType, type VehicleTab } from '@/components/vehicle/tabDefinitions';
import { useToast } from '@/hooks/useToast';
import { formatDate, formatKm, formatRM, parseTyreDotCode, serviceLogTitle } from '@/lib/format';
import type { Vehicle } from '@/types/database';
import styles from './VehicleDetailPage.module.css';

type DateField = 'road_tax_expiry' | 'insurance_expiry';

// TODO: duplicated from VehicleFormPage.tsx — worth moving to src/lib/format.ts.
// Uses Start Date + Tenure only; loan amount is informational, not amortized
// against (flat-rate HP interest isn't modeled here).
function hirePurchaseRemainingLabel(vehicle: Vehicle): string | null {
  if (vehicle.hire_purchase_paid_off) return null;
  const { hire_purchase_monthly_payment, hire_purchase_tenure_months, hire_purchase_start_date } =
    vehicle;
  if (!hire_purchase_monthly_payment || !hire_purchase_tenure_months || !hire_purchase_start_date) {
    return null;
  }
  const start = new Date(hire_purchase_start_date);
  if (Number.isNaN(start.getTime())) return null;
  const now = new Date();
  let elapsed =
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) elapsed -= 1;
  elapsed = Math.max(0, Math.min(hire_purchase_tenure_months, elapsed));
  const remainingMonths = hire_purchase_tenure_months - elapsed;
  if (remainingMonths <= 0) return 'Fully paid off';
  const remainingBalance = remainingMonths * hire_purchase_monthly_payment;
  const monthsLabel = remainingMonths === 1 ? '1 month left' : `${remainingMonths} months left`;
  return `${monthsLabel} · est. ${formatRM(remainingBalance)} remaining`;
}

/** Summary for the "Tyre specification" row: the size if all four match
 * ("Mixed sizes" if not); a meta line combining the brand (if all four
 * match, else "Mixed brands") and the oldest DOT code across the four,
 * since that's the tyre closest to needing replacement. */
function tyreSpecSummary(vehicle: Vehicle): { trailing: string; meta?: string } {
  const specs = [
    vehicle.tyre_fl_spec,
    vehicle.tyre_fr_spec,
    vehicle.tyre_rl_spec,
    vehicle.tyre_rr_spec,
  ];
  const uniqueSpecs = Array.from(new Set(specs.filter((s): s is string => s != null)));
  let trailing: string;
  if (uniqueSpecs.length === 0) {
    trailing = '—';
  } else if (uniqueSpecs.length === 1) {
    const [onlySpec] = uniqueSpecs;
    trailing = onlySpec ?? '—';
  } else {
    trailing = 'Mixed sizes';
  }

  const brands = [
    vehicle.tyre_fl_brand,
    vehicle.tyre_fr_brand,
    vehicle.tyre_rl_brand,
    vehicle.tyre_rr_brand,
  ];
  const uniqueBrands = Array.from(new Set(brands.filter((b): b is string => b != null)));
  let brandLabel: string | null;
  if (uniqueBrands.length === 0) {
    brandLabel = null;
  } else if (uniqueBrands.length === 1) {
    const [onlyBrand] = uniqueBrands;
    brandLabel = onlyBrand ?? null;
  } else {
    brandLabel = 'Mixed brands';
  }

  const dotCodes = [
    vehicle.tyre_fl_dot_code,
    vehicle.tyre_fr_dot_code,
    vehicle.tyre_rl_dot_code,
    vehicle.tyre_rr_dot_code,
  ];
  const parsedCodes = dotCodes
    .map((c) => parseTyreDotCode(c))
    .filter((p): p is NonNullable<typeof p> => p != null);
  const oldestLabel =
    parsedCodes.length > 0
      ? `Oldest: ${parsedCodes.reduce((a, b) => (a.sortKey <= b.sortKey ? a : b)).label}`
      : null;

  const meta = [brandLabel, oldestLabel].filter(Boolean).join(' · ') || undefined;

  return { trailing, meta };
}

export function VehicleDetailPage() {
  const { vehicleId = '' } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const { data: vehicle, isPending, error } = useVehicle(vehicleId);
  const updateVehicle = useUpdateVehicle(vehicleId);

  const [tab, setTab] = useState<VehicleTab | null>(null);
  const [odoSheetOpen, setOdoSheetOpen] = useState(false);
  const [odoDraft, setOdoDraft] = useState('');
  const [dateField, setDateField] = useState<DateField | null>(null);
  const [dateDraft, setDateDraft] = useState('');

  const hasFuel = vehicle ? vehicle.fuel_type !== 'electric' : false;
  const hasCharging = vehicle
    ? vehicle.fuel_type === 'electric' || vehicle.fuel_type === 'hybrid'
    : false;

  const fuelLogs = useFuelLogs(vehicleId, hasFuel);
  const chargingLogs = useChargingLogs(vehicleId, hasCharging);
  const serviceLogs = useServiceLogs(vehicleId);

  const tabs = useMemo(() => (vehicle ? tabsForFuelType(vehicle.fuel_type) : []), [vehicle]);
  const activeTab: VehicleTab = tab ?? tabs[0]?.id ?? 'service';

  if (isPending) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  if (!vehicle) return <ErrorState error={new Error('Vehicle not found')} />;

  async function saveOdometer() {
    const value = Number(odoDraft);
    if (!Number.isFinite(value) || value < 0) return;
    await updateVehicle.mutateAsync({ odometer_km: Math.round(value) });
    setOdoSheetOpen(false);
    showToast('Odometer updated');
  }

  async function saveDate() {
    if (!dateField) return;
    await updateVehicle.mutateAsync({ [dateField]: dateDraft || null });
    setDateField(null);
    showToast('Renewal date saved');
  }

  const hasTyreInfo = vehicle.tyre_pressure_front != null || vehicle.tyre_pressure_rear != null;
  const hasTyreSpecInfo =
    vehicle.tyre_fl_spec != null ||
    vehicle.tyre_fl_brand != null ||
    vehicle.tyre_fl_dot_code != null ||
    vehicle.tyre_fr_spec != null ||
    vehicle.tyre_fr_brand != null ||
    vehicle.tyre_fr_dot_code != null ||
    vehicle.tyre_rl_spec != null ||
    vehicle.tyre_rl_brand != null ||
    vehicle.tyre_rl_dot_code != null ||
    vehicle.tyre_rr_spec != null ||
    vehicle.tyre_rr_brand != null ||
    vehicle.tyre_rr_dot_code != null;
  const tyreSpec = hasTyreSpecInfo ? tyreSpecSummary(vehicle) : null;
  const hasHirePurchaseInfo =
    vehicle.hire_purchase_paid_off || vehicle.hire_purchase_monthly_payment != null;
  const hasVehicleInfo =
    vehicle.tank_capacity_liters != null ||
    hasTyreInfo ||
    hasTyreSpecInfo ||
    vehicle.ncd_rate != null ||
    hasHirePurchaseInfo;

  return (
    <div className={styles.page}>
      <VehicleHero
        vehicle={vehicle}
        onUpdateOdometer={() => {
          setOdoDraft(String(vehicle.odometer_km));
          setOdoSheetOpen(true);
        }}
      />
      <RenewalChips
        vehicle={vehicle}
        onEdit={(field) => {
          setDateField(field);
          setDateDraft(vehicle[field] ?? '');
        }}
      />

      <div className={page.body}>
        <VehicleDocuments vehicle={vehicle} />
      </div>

      {hasVehicleInfo && (
        <div className={page.body}>
          <div className={page.list}>
            {vehicle.tank_capacity_liters != null && (
              <ListRow
                icon="fuel"
                title="Tank capacity"
                meta="Flags a fill-up that looks too large"
                trailing={`${vehicle.tank_capacity_liters} L`}
                chevron
                onClick={() => navigate(`/vehicles/${vehicle.id}/edit`)}
              />
            )}
            {hasTyreInfo && (
              <ListRow
                icon="tyre"
                title={`Tyre pressure (${vehicle.rim_type === 'aftermarket' ? 'aftermarket rim' : 'default rim'})`}
                meta={
                  vehicle.rim_type === 'default' ? 'Also check your driver-door sticker' : undefined
                }
                trailing={`F ${vehicle.tyre_pressure_front ?? '—'} / R ${
                  vehicle.tyre_pressure_rear ?? '—'
                } ${vehicle.tyre_pressure_unit}`}
                chevron
                onClick={() => navigate(`/vehicles/${vehicle.id}/edit`)}
              />
            )}
            {tyreSpec && (
              <ListRow
                icon="tyre"
                title="Tyre specification"
                meta={tyreSpec.meta}
                trailing={tyreSpec.trailing}
                chevron
                onClick={() => navigate(`/vehicles/${vehicle.id}/edit`)}
              />
            )}
            {vehicle.ncd_rate != null && (
              <ListRow
                icon="shield"
                title="NCD rate"
                trailing={`${vehicle.ncd_rate}%`}
                chevron
                onClick={() => navigate(`/vehicles/${vehicle.id}/edit`)}
              />
            )}
            {hasHirePurchaseInfo && (
              <ListRow
                icon="wallet"
                title="Hire purchase"
                meta={
                  vehicle.hire_purchase_paid_off
                    ? undefined
                    : (hirePurchaseRemainingLabel(vehicle) ?? undefined)
                }
                trailing={
                  vehicle.hire_purchase_paid_off
                    ? 'No active loan'
                    : vehicle.hire_purchase_monthly_payment != null
                      ? `${formatRM(vehicle.hire_purchase_monthly_payment)}/mo`
                      : '—'
                }
                chevron
                onClick={() => navigate(`/vehicles/${vehicle.id}/edit`)}
              />
            )}
          </div>
        </div>
      )}

      <VehicleTabs tabs={tabs} active={activeTab} onChange={setTab} />

      <div className={`${page.body} ${styles.tabPanel}`}>
        {activeTab === 'fuel' && (
          <>
            <div className={page.sectionHead}>
              <h2>Fuel log</h2>
              <Button onClick={() => navigate(`/vehicles/${vehicle.id}/log/fuel`)}>
                <Icon name="plus" size={15} />
                Log fill
              </Button>
            </div>
            {fuelLogs.isPending && <LoadingState />}
            {fuelLogs.data?.length === 0 && (
              <EmptyState
                icon="fuel"
                title="No fill-ups yet"
                description="Log a fill and the odometer comes with it, so km-based reminders stay accurate between services."
              />
            )}
            <div className={page.list}>
              {(fuelLogs.data ?? []).map((log) => (
                <ListRow
                  key={log.id}
                  icon="fuel"
                  title={`${log.litres} L${log.grade ? ` · ${log.grade}` : ''}${log.station ? ` · ${log.station}` : ''}`}
                  meta={
                    <>
                      {formatDate(log.logged_on)}
                      {log.odometer_km != null && (
                        <>
                          {' · '}
                          <span className="num">{formatKm(log.odometer_km)}</span>
                        </>
                      )}
                    </>
                  }
                  footer={log.budi_madani ? <Badge urgency="neutral">BUDI Madani</Badge> : null}
                  trailing={formatRM(log.total_cost)}
                  chevron
                  onClick={() => navigate(`/vehicles/${vehicle.id}/log/fuel/${log.id}`)}
                />
              ))}
            </div>
          </>
        )}

        {activeTab === 'charging' && (
          <>
            <div className={page.sectionHead}>
              <h2>Charging log</h2>
              <Button onClick={() => navigate(`/vehicles/${vehicle.id}/log/charging`)}>
                <Icon name="plus" size={15} />
                Log charge
              </Button>
            </div>
            {chargingLogs.isPending && <LoadingState />}
            {chargingLogs.data?.length === 0 && (
              <EmptyState
                icon="bolt"
                title="No charges yet"
                description="Log a charge and the odometer comes with it, keeping reminders accurate between services."
              />
            )}
            <div className={page.list}>
              {(chargingLogs.data ?? []).map((log) => (
                <ListRow
                  key={log.id}
                  icon="bolt"
                  iconTone="secondary"
                  title={`${log.energy_kwh} kWh · ${log.charger_location ?? 'Charger'} (${log.current_type})`}
                  meta={
                    <>
                      {formatDate(log.logged_on)}
                      {log.odometer_km != null && (
                        <>
                          {' · '}
                          <span className="num">{formatKm(log.odometer_km)}</span>
                        </>
                      )}
                    </>
                  }
                  trailing={formatRM(log.total_cost)}
                  chevron
                  onClick={() => navigate(`/vehicles/${vehicle.id}/log/charging/${log.id}`)}
                />
              ))}
            </div>
          </>
        )}

        {activeTab === 'service' && (
          <>
            <div className={page.sectionHead}>
              <h2>Service history</h2>
              <Button onClick={() => navigate(`/vehicles/${vehicle.id}/log/service`)}>
                <Icon name="plus" size={15} />
                Log service
              </Button>
            </div>
            {serviceLogs.isPending && <LoadingState />}
            {serviceLogs.data?.length === 0 && (
              <EmptyState
                icon="doc"
                title="No service records yet"
                description="Tap 'Log service' to record your first maintenance entry."
              />
            )}
            <div className={page.list}>
              {(serviceLogs.data ?? []).map((log) => (
                <ListRow
                  key={log.id}
                  icon="wrench"
                  title={serviceLogTitle(log)}
                  meta={
                    <>
                      {formatDate(log.serviced_on)}
                      {log.odometer_km != null && (
                        <>
                          {' · '}
                          <span className="num">{formatKm(log.odometer_km)}</span>
                        </>
                      )}
                      {log.workshop ? ` · ${log.workshop}` : ''}
                    </>
                  }
                  footer={
                    log.notes || log.next_due_km != null || log.next_due_date ? (
                      <>
                        {log.notes && (
                          <p
                            style={{
                              margin: '4px 0 0',
                              fontSize: '0.8125rem',
                              color: 'var(--ink-soft, #6b6058)',
                              fontStyle: 'italic',
                            }}
                          >
                            {log.notes}
                          </p>
                        )}
                        {(log.next_due_km != null || log.next_due_date) && (
                          <span className={`${styles.nextDue} num`}>
                            Next:{' '}
                            {[
                              log.next_due_km != null ? formatKm(log.next_due_km) : null,
                              log.next_due_date ? formatDate(log.next_due_date) : null,
                            ]
                              .filter(Boolean)
                              .join(' or ')}
                          </span>
                        )}
                      </>
                    ) : null
                  }
                  trailing={formatRM(log.cost)}
                  chevron
                  onClick={() => navigate(`/vehicles/${vehicle.id}/log/service/${log.id}`)}
                />
              ))}
            </div>
          </>
        )}

        {activeTab === 'spending' && (
          <SpendingSummary
            fuelTotal={(fuelLogs.data ?? []).reduce((sum, l) => sum + Number(l.total_cost), 0)}
            chargingTotal={(chargingLogs.data ?? []).reduce(
              (sum, l) => sum + Number(l.total_cost),
              0,
            )}
            serviceTotal={(serviceLogs.data ?? []).reduce((sum, l) => sum + Number(l.cost), 0)}
            entryCount={
              (fuelLogs.data?.length ?? 0) +
              (chargingLogs.data?.length ?? 0) +
              (serviceLogs.data?.length ?? 0)
            }
          />
        )}
      </div>

      <Sheet
        open={odoSheetOpen}
        title="Update odometer"
        hint="Keeps km-based reminders accurate between services."
        onClose={() => setOdoSheetOpen(false)}
      >
        <Field label="Current odometer (km)">
          {(id) => (
            <TextInput
              id={id}
              type="number"
              inputMode="numeric"
              value={odoDraft}
              onChange={(e) => setOdoDraft(e.target.value)}
            />
          )}
        </Field>
        <Button block onClick={() => void saveOdometer()} disabled={updateVehicle.isPending}>
          Save
        </Button>
      </Sheet>

      <Sheet
        open={dateField !== null}
        title={dateField === 'insurance_expiry' ? 'Insurance expiry' : 'Road tax expiry'}
        hint="You'll see a countdown here and in Reminders."
        onClose={() => setDateField(null)}
      >
        <Field label="Expiry date">
          {(id) => (
            <TextInput
              id={id}
              type="date"
              value={dateDraft}
              onChange={(e) => setDateDraft(e.target.value)}
            />
          )}
        </Field>
        <Button block onClick={() => void saveDate()} disabled={updateVehicle.isPending}>
          Save
        </Button>
      </Sheet>
    </div>
  );
}
