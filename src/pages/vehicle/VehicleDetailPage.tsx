import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useChargingLogs, useFuelLogs, useServiceLogs } from '@/api/logs';
import {
  useCreateRenewalLog,
  useCreateVehicleValueLog,
  useDeleteRenewalLog,
  useDeleteVehicleValueLog,
  useRenewalLogs,
  useUpdateRenewalLog,
  useUpdateVehicleValueLog,
  useVehicleValueLogs,
} from '@/api/records';
import { useUpdateVehicle, useVehicle } from '@/api/vehicles';
import page from '@/components/layout/Page.module.css';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ChipSelect, type ChipOption } from '@/components/ui/ChipSelect';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, FieldRow, TextInput } from '@/components/ui/Field';
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
import {
  cleanText,
  formatDate,
  formatKm,
  formatRM,
  hirePurchaseRemainingLabel,
  parseNumberInput,
  parseTyreDotCode,
  serviceLogTitle,
} from '@/lib/format';
import type { RenewalKind, RenewalLog, Vehicle, VehicleValueLog } from '@/types/database';
import styles from './VehicleDetailPage.module.css';

type DateField = 'road_tax_expiry' | 'insurance_expiry';

type DeleteTarget =
  { type: 'renewal'; id: string; kind: RenewalKind } | { type: 'value'; id: string } | null;

const RENEWAL_KIND_OPTIONS: ChipOption<RenewalKind>[] = [
  { value: 'road_tax', label: 'Road tax', icon: 'doc' },
  { value: 'insurance', label: 'Insurance', icon: 'shield' },
];

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

/** Value logs are fetched newest-first, so the entry "older" than logs[i] is logs[i + 1]. */
function valueChangeLabel(
  logs: VehicleValueLog[],
  index: number,
): { text: string; color: string } | null {
  const current = logs[index];
  const older = logs[index + 1];
  if (!current || !older) return null;
  const diff = current.value - older.value;
  if (diff === 0) return { text: 'No change', color: 'var(--ink-soft, #6b6058)' };
  const arrow = diff > 0 ? '▲' : '▼';
  const color = diff > 0 ? 'var(--success, #2e7d32)' : 'var(--danger, #c0392b)';
  return { text: `${arrow} ${formatRM(Math.abs(diff))}`, color };
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

  const [renewalSheetOpen, setRenewalSheetOpen] = useState(false);
  const [editingRenewalId, setEditingRenewalId] = useState<string | null>(null);
  const [renewalKind, setRenewalKind] = useState<RenewalKind>('road_tax');
  const [renewalDate, setRenewalDate] = useState('');
  const [renewalAmount, setRenewalAmount] = useState('');
  const [renewalExpiry, setRenewalExpiry] = useState('');
  const [renewalNotes, setRenewalNotes] = useState('');

  const [valueSheetOpen, setValueSheetOpen] = useState(false);
  const [editingValueId, setEditingValueId] = useState<string | null>(null);
  const [valueDate, setValueDate] = useState('');
  const [valueAmount, setValueAmount] = useState('');
  const [valueNotes, setValueNotes] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);

  const hasFuel = vehicle ? vehicle.fuel_type !== 'electric' : false;
  const hasCharging = vehicle
    ? vehicle.fuel_type === 'electric' || vehicle.fuel_type === 'hybrid'
    : false;

  const fuelLogs = useFuelLogs(vehicleId, hasFuel);
  const chargingLogs = useChargingLogs(vehicleId, hasCharging);
  const serviceLogs = useServiceLogs(vehicleId);
  const renewalLogs = useRenewalLogs(vehicleId);
  const valueLogs = useVehicleValueLogs(vehicleId);

  const createRenewal = useCreateRenewalLog();
  const updateRenewal = useUpdateRenewalLog();
  const deleteRenewal = useDeleteRenewalLog();
  const createValue = useCreateVehicleValueLog();
  const updateValue = useUpdateVehicleValueLog();
  const deleteValue = useDeleteVehicleValueLog();

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

  function openRenewalSheet() {
    const today = new Date().toISOString().slice(0, 10);
    setEditingRenewalId(null);
    setRenewalKind('road_tax');
    setRenewalDate(today);
    setRenewalAmount('');
    setRenewalExpiry('');
    setRenewalNotes('');
    setRenewalSheetOpen(true);
  }

  function openEditRenewalSheet(log: RenewalLog) {
    setEditingRenewalId(log.id);
    setRenewalKind(log.kind);
    setRenewalDate(log.renewed_on);
    setRenewalAmount(String(log.amount));
    setRenewalExpiry(log.expiry_date);
    setRenewalNotes(log.notes ?? '');
    setRenewalSheetOpen(true);
  }

  const saveRenewal = async () => {
    const amount = parseNumberInput(renewalAmount);
    if (!renewalDate || amount == null || !renewalExpiry) return;
    const payload = {
      vehicle_id: vehicle.id,
      kind: renewalKind,
      renewed_on: renewalDate,
      amount,
      expiry_date: renewalExpiry,
      notes: cleanText(renewalNotes),
    };
    if (editingRenewalId) {
      await updateRenewal.mutateAsync({ id: editingRenewalId, ...payload });
      showToast('Renewal updated');
    } else {
      await createRenewal.mutateAsync(payload);
      showToast(
        `${renewalKind === 'road_tax' ? 'Road tax' : 'Insurance'} renewal logged · expiry updated to ${formatDate(renewalExpiry)}`,
      );
    }
    setRenewalSheetOpen(false);
  };

  function openValueSheet() {
    const today = new Date().toISOString().slice(0, 10);
    setEditingValueId(null);
    setValueDate(today);
    setValueAmount('');
    setValueNotes('');
    setValueSheetOpen(true);
  }

  function openEditValueSheet(log: VehicleValueLog) {
    setEditingValueId(log.id);
    setValueDate(log.recorded_on);
    setValueAmount(String(log.value));
    setValueNotes(log.notes ?? '');
    setValueSheetOpen(true);
  }

  const saveValue = async () => {
    const value = parseNumberInput(valueAmount);
    if (!valueDate || value == null) return;
    const payload = {
      vehicle_id: vehicle.id,
      recorded_on: valueDate,
      value,
      notes: cleanText(valueNotes),
    };
    if (editingValueId) {
      await updateValue.mutateAsync({ id: editingValueId, ...payload });
      showToast('Value updated');
    } else {
      await createValue.mutateAsync(payload);
      showToast('Value logged');
    }
    setValueSheetOpen(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'renewal') {
      await deleteRenewal.mutateAsync({
        id: deleteTarget.id,
        vehicleId: vehicle.id,
        kind: deleteTarget.kind,
      });
      showToast('Renewal entry removed');
    } else {
      await deleteValue.mutateAsync({ id: deleteTarget.id, vehicleId: vehicle.id });
      showToast('Value entry removed');
    }
    setDeleteTarget(null);
  };

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
                    : (hirePurchaseRemainingLabel({
                        paidOff: vehicle.hire_purchase_paid_off,
                        monthlyPayment: vehicle.hire_purchase_monthly_payment,
                        tenureMonths: vehicle.hire_purchase_tenure_months,
                        startDate: vehicle.hire_purchase_start_date,
                      }) ?? undefined)
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

        {activeTab === 'records' && (
          <>
            <div className={page.sectionHead}>
              <h2>Road tax & insurance</h2>
              <Button onClick={openRenewalSheet}>
                <Icon name="plus" size={15} />
                Log renewal
              </Button>
            </div>
            {renewalLogs.isPending && <LoadingState />}
            {renewalLogs.data?.length === 0 && (
              <EmptyState
                icon="doc"
                title="No renewals logged yet"
                description="Log a renewal to keep a history and update the expiry date in one step."
              />
            )}
            <div className={page.list}>
              {(renewalLogs.data ?? []).map((log) => (
                <ListRow
                  key={log.id}
                  icon={log.kind === 'road_tax' ? 'doc' : 'shield'}
                  title={log.kind === 'road_tax' ? 'Road tax renewed' : 'Insurance renewed'}
                  meta={`${formatDate(log.renewed_on)} · expires ${formatDate(log.expiry_date)}`}
                  trailing={formatRM(log.amount)}
                  chevron
                  onClick={() => openEditRenewalSheet(log)}
                />
              ))}
            </div>

            <div className={page.sectionHead} style={{ marginTop: 24 }}>
              <h2>Market value</h2>
              <Button onClick={openValueSheet}>
                <Icon name="plus" size={15} />
                Log value
              </Button>
            </div>
            {valueLogs.isPending && <LoadingState />}
            {valueLogs.data?.length === 0 && (
              <EmptyState
                icon="wallet"
                title="No value logged yet"
                description="Track the vehicle's market value over time, e.g. from Carlist or Mudah listings."
              />
            )}
            <div className={page.list}>
              {(valueLogs.data ?? []).map((log, index) => {
                const change = valueChangeLabel(valueLogs.data ?? [], index);
                return (
                  <ListRow
                    key={log.id}
                    icon="wallet"
                    title={formatRM(log.value)}
                    meta={
                      change ? (
                        <>
                          {formatDate(log.recorded_on)} ·{' '}
                          <span style={{ color: change.color }}>{change.text}</span>
                        </>
                      ) : (
                        `${formatDate(log.recorded_on)} · First entry`
                      )
                    }
                    chevron
                    onClick={() => openEditValueSheet(log)}
                  />
                );
              })}
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
            renewalTotal={(renewalLogs.data ?? []).reduce((sum, l) => sum + Number(l.amount), 0)}
            entryCount={
              (fuelLogs.data?.length ?? 0) +
              (chargingLogs.data?.length ?? 0) +
              (serviceLogs.data?.length ?? 0) +
              (renewalLogs.data?.length ?? 0)
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

      <Sheet
        open={renewalSheetOpen}
        title={editingRenewalId ? 'Edit renewal' : 'Log renewal'}
        hint={
          renewalExpiry
            ? `Saving this will also update your ${renewalKind === 'road_tax' ? 'Road tax' : 'Insurance'} expiry date to ${formatDate(renewalExpiry)}.`
            : "This also updates the vehicle's expiry date for the type you pick."
        }
        onClose={() => setRenewalSheetOpen(false)}
      >
        <Field label="Type">
          {() => (
            <ChipSelect
              label="Renewal type"
              options={RENEWAL_KIND_OPTIONS}
              value={renewalKind}
              onChange={setRenewalKind}
            />
          )}
        </Field>
        <FieldRow>
          <Field label="Renewed on">
            {(id) => (
              <TextInput
                id={id}
                type="date"
                value={renewalDate}
                onChange={(e) => setRenewalDate(e.target.value)}
              />
            )}
          </Field>
          <Field label="Amount (RM)">
            {(id) => (
              <TextInput
                id={id}
                type="number"
                inputMode="decimal"
                step="0.01"
                value={renewalAmount}
                onChange={(e) => setRenewalAmount(e.target.value)}
              />
            )}
          </Field>
        </FieldRow>
        <Field label="New expiry date">
          {(id) => (
            <TextInput
              id={id}
              type="date"
              value={renewalExpiry}
              onChange={(e) => setRenewalExpiry(e.target.value)}
            />
          )}
        </Field>
        <Field label="Notes">
          {(id) => (
            <TextInput
              id={id}
              value={renewalNotes}
              onChange={(e) => setRenewalNotes(e.target.value)}
            />
          )}
        </Field>
        <Button
          block
          onClick={() => void saveRenewal()}
          disabled={
            createRenewal.isPending ||
            updateRenewal.isPending ||
            !renewalDate ||
            !renewalExpiry ||
            parseNumberInput(renewalAmount) == null
          }
        >
          {createRenewal.isPending || updateRenewal.isPending
            ? 'Saving…'
            : editingRenewalId
              ? 'Save changes'
              : 'Save renewal'}
        </Button>
        {editingRenewalId && (
          <Button
            type="button"
            variant="danger"
            block
            onClick={() => {
              setRenewalSheetOpen(false);
              setDeleteTarget({ type: 'renewal', id: editingRenewalId, kind: renewalKind });
            }}
          >
            Remove entry
          </Button>
        )}
      </Sheet>

      <Sheet
        open={valueSheetOpen}
        title={editingValueId ? 'Edit value' : 'Log value'}
        hint="Handy for tracking depreciation or checking against Carlist/Mudah listings."
        onClose={() => setValueSheetOpen(false)}
      >
        <FieldRow>
          <Field label="Date">
            {(id) => (
              <TextInput
                id={id}
                type="date"
                value={valueDate}
                onChange={(e) => setValueDate(e.target.value)}
              />
            )}
          </Field>
          <Field label="Value (RM)">
            {(id) => (
              <TextInput
                id={id}
                type="number"
                inputMode="decimal"
                step="0.01"
                value={valueAmount}
                onChange={(e) => setValueAmount(e.target.value)}
              />
            )}
          </Field>
        </FieldRow>
        <Field label="Notes">
          {(id) => (
            <TextInput id={id} value={valueNotes} onChange={(e) => setValueNotes(e.target.value)} />
          )}
        </Field>
        <Button
          block
          onClick={() => void saveValue()}
          disabled={
            createValue.isPending ||
            updateValue.isPending ||
            !valueDate ||
            parseNumberInput(valueAmount) == null
          }
        >
          {createValue.isPending || updateValue.isPending
            ? 'Saving…'
            : editingValueId
              ? 'Save changes'
              : 'Save value'}
        </Button>
        {editingValueId && (
          <Button
            type="button"
            variant="danger"
            block
            onClick={() => {
              setValueSheetOpen(false);
              setDeleteTarget({ type: 'value', id: editingValueId });
            }}
          >
            Remove entry
          </Button>
        )}
      </Sheet>

      <Sheet
        open={deleteTarget !== null}
        title="Remove this entry?"
        hint={
          deleteTarget?.type === 'renewal'
            ? "This can't be undone. It won't change the vehicle's current expiry date unless this was the most recent renewal of its type."
            : "This can't be undone."
        }
        onClose={() => setDeleteTarget(null)}
      >
        <Button
          type="button"
          variant="danger"
          block
          onClick={() => void confirmDelete()}
          disabled={deleteRenewal.isPending || deleteValue.isPending}
        >
          {deleteRenewal.isPending || deleteValue.isPending ? 'Removing…' : 'Remove entry'}
        </Button>
      </Sheet>
    </div>
  );
}
