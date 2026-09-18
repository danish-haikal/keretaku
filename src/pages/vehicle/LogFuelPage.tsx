import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useCreateFuelLog,
  useDeleteFuelLog,
  useFuelLog,
  useFuelLogs,
  useUpdateFuelLog,
} from '@/api/logs';
import { useVehicle } from '@/api/vehicles';
import { Button } from '@/components/ui/Button';
import { Field, FieldRow, TextArea, TextInput } from '@/components/ui/Field';
import { IconButton } from '@/components/ui/IconButton';
import { PillSelect } from '@/components/ui/PillSelect';
import { ErrorState, LoadingState } from '@/components/ui/StateMessage';
import { Sheet } from '@/components/ui/Sheet';
import { Switch } from '@/components/ui/Switch';
import { useToast } from '@/hooks/useToast';
import { todayIso } from '@/lib/dates';
import { cleanText, formatRM, parseNumberInput } from '@/lib/format';
import { FUEL_GRADES, type FuelGrade, type FuelLog, type Vehicle } from '@/types/database';
import { LogFormLayout } from './LogFormLayout';
import styles from './LogFormLayout.module.css';

const STATION_PRESETS = ['Shell', 'Petronas', 'BHP', 'Petron', 'Other'] as const;

/* BUDI Madani (BUDI95) defaults — both prices are user-adjustable because
 * the market price in particular changes roughly weekly; these are just
 * sensible starting points, not fixed constants. */
const BUDI_DEFAULT_SUBSIDY_PRICE = 1.99;
const BUDI_DEFAULT_MARKET_PRICE = 4.27;
const BUDI_DEFAULT_MONTHLY_QUOTA = 200;

export function LogFuelPage() {
  const { vehicleId = '', logId } = useParams();
  const { data: vehicle, isPending: vehiclePending, error: vehicleError } = useVehicle(vehicleId);
  const existingLog = useFuelLog(logId);

  if (vehiclePending || (logId && existingLog.isPending)) return <LoadingState />;
  if (vehicleError || !vehicle) {
    return <ErrorState error={vehicleError ?? new Error('Vehicle not found')} />;
  }
  if (logId && (existingLog.error || !existingLog.data)) {
    return <ErrorState error={existingLog.error ?? new Error('Fill-up not found')} />;
  }

  return (
    <FuelLogForm
      key={logId ?? 'new'}
      vehicle={vehicle}
      log={logId ? (existingLog.data ?? null) : null}
    />
  );
}

function FuelLogForm({ vehicle, log }: { vehicle: Vehicle; log: FuelLog | null }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const createLog = useCreateFuelLog();
  const updateLog = useUpdateFuelLog();
  const deleteLog = useDeleteFuelLog();
  const isEditing = log != null;

  const initialStation = log
    ? (STATION_PRESETS.find((p) => p === log.station) ?? (log.station ? 'Other' : 'Shell'))
    : 'Shell';
  const defaultGrade: FuelGrade = vehicle.fuel_type === 'diesel' ? 'Diesel' : 'RON95';

  const [loggedOn, setLoggedOn] = useState(log?.logged_on ?? todayIso());
  const [odometer, setOdometer] = useState(log?.odometer_km != null ? String(log.odometer_km) : '');
  const [litres, setLitres] = useState(log ? String(log.litres) : '');
  const [cost, setCost] = useState(log ? String(log.total_cost) : '');
  const [station, setStation] = useState<(typeof STATION_PRESETS)[number]>(initialStation);
  const [otherStation, setOtherStation] = useState(
    initialStation === 'Other' ? (log?.station ?? '') : '',
  );
  const [grade, setGrade] = useState<FuelGrade>(log?.grade ?? defaultGrade);
  const [budiMadani, setBudiMadani] = useState(log?.budi_madani ?? false);
  const [fullTank, setFullTank] = useState(log?.is_full_tank ?? true);
  const [notes, setNotes] = useState(log?.notes ?? '');
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const [budiSubsidyPrice, setBudiSubsidyPrice] = useState(String(BUDI_DEFAULT_SUBSIDY_PRICE));
  const [budiMarketPrice, setBudiMarketPrice] = useState(String(BUDI_DEFAULT_MARKET_PRICE));
  const [budiQuota, setBudiQuota] = useState(String(BUDI_DEFAULT_MONTHLY_QUOTA));

  const saving = createLog.isPending || updateLog.isPending;
  const showBudiPanel = grade === 'RON95' && budiMadani;

  const vehicleFuelLogs = useFuelLogs(vehicle.id, showBudiPanel);
  const monthKey = (loggedOn || todayIso()).slice(0, 7);
  const priorBudiLitresThisMonth = (vehicleFuelLogs.data ?? [])
    .filter((l) => l.budi_madani && l.id !== log?.id && l.logged_on.slice(0, 7) === monthKey)
    .reduce((sum, l) => sum + Number(l.litres), 0);

  const budiSubsidyPriceValue = parseNumberInput(budiSubsidyPrice) ?? BUDI_DEFAULT_SUBSIDY_PRICE;
  const budiMarketPriceValue = parseNumberInput(budiMarketPrice) ?? BUDI_DEFAULT_MARKET_PRICE;
  const budiQuotaValue = parseNumberInput(budiQuota) ?? BUDI_DEFAULT_MONTHLY_QUOTA;
  const budiQuotaRemaining = Math.max(0, budiQuotaValue - priorBudiLitresThisMonth);

  /*
   * RM is the real input at the pump (you pay the subsidised rate directly,
   * you don't choose litres). Litres, market value and savings are all
   * derived FROM the amount paid — same direction as budi95.com's "RM"
   * mode, but quota-aware: the part of your payment within this vehicle's
   * remaining monthly quota buys litres at the subsidy price; anything
   * beyond that buys litres at market price.
   */
  const costValue = parseNumberInput(cost) ?? 0;
  const subsidyCapCost = budiQuotaRemaining * budiSubsidyPriceValue;
  let budiDerivedLitres = 0;
  if (costValue > 0) {
    if (costValue <= subsidyCapCost) {
      budiDerivedLitres = budiSubsidyPriceValue > 0 ? costValue / budiSubsidyPriceValue : 0;
    } else {
      const remainder = costValue - subsidyCapCost;
      budiDerivedLitres =
        budiQuotaRemaining + (budiMarketPriceValue > 0 ? remainder / budiMarketPriceValue : 0);
    }
  }
  const budiSubsidisedLitres = Math.min(budiDerivedLitres, budiQuotaRemaining);
  const budiMarketLitres = Math.max(0, budiDerivedLitres - budiSubsidisedLitres);
  const budiMarketValue = budiDerivedLitres * budiMarketPriceValue;
  const budiSavings = Math.max(0, budiMarketValue - costValue);

  const effectiveLitres = showBudiPanel ? budiDerivedLitres : (parseNumberInput(litres) ?? 0);
  const tankCapacity = vehicle.tank_capacity_liters;
  const overTankCapacity = tankCapacity != null && effectiveLitres > tankCapacity;

  function handleBudiToggle(checked: boolean) {
    if (!checked && budiDerivedLitres > 0) {
      // Seed the now-editable Litres field with the last computed value,
      // instead of snapping back to whatever was typed before BUDI was on.
      setLitres(budiDerivedLitres.toFixed(2));
    }
    setBudiMadani(checked);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const litresValue = showBudiPanel ? budiDerivedLitres : parseNumberInput(litres);
    const costValue = parseNumberInput(cost);
    if (litresValue == null || litresValue <= 0) {
      setFormError(
        showBudiPanel ? 'Enter how much you paid.' : 'Enter how many litres you filled.',
      );
      return;
    }
    if (costValue == null || costValue < 0) {
      setFormError('Enter the total cost.');
      return;
    }

    const stationValue = station === 'Other' ? cleanText(otherStation) : station;

    const payload = {
      vehicle_id: vehicle.id,
      logged_on: loggedOn || todayIso(),
      odometer_km: parseNumberInput(odometer),
      litres: litresValue,
      total_cost: costValue,
      station: stationValue,
      grade,
      budi_madani: grade === 'RON95' ? budiMadani : false,
      is_full_tank: fullTank,
      notes: cleanText(notes),
    };

    try {
      if (isEditing && log) {
        await updateLog.mutateAsync({ id: log.id, ...payload });
        showToast('Fill-up updated');
      } else {
        await createLog.mutateAsync(payload);
        showToast('Fill-up saved');
      }
      navigate(`/vehicles/${vehicle.id}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save this fill-up.');
    }
  }

  async function handleDelete() {
    if (!log) return;
    await deleteLog.mutateAsync({ id: log.id, vehicleId: vehicle.id });
    showToast('Fill-up deleted');
    navigate(`/vehicles/${vehicle.id}`);
  }

  return (
    <>
      <LogFormLayout
        title={isEditing ? 'Edit fuel log' : 'Log fuel'}
        vehicle={vehicle}
        icon="fuel"
        onSubmit={handleSubmit}
        headerActions={
          isEditing ? (
            <IconButton
              icon="trash"
              label="Delete this fill-up"
              variant="ghost"
              onClick={() => setConfirmingDelete(true)}
            />
          ) : undefined
        }
      >
        <FieldRow>
          <Field label="Date">
            {(id) => (
              <TextInput
                id={id}
                type="date"
                value={loggedOn}
                onChange={(e) => setLoggedOn(e.target.value)}
              />
            )}
          </Field>
          <Field label="Odometer (km)">
            {(id) => (
              <TextInput
                id={id}
                type="number"
                inputMode="numeric"
                placeholder="Keeps reminders accurate"
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
              />
            )}
          </Field>
        </FieldRow>

        <Field label="Station">
          {() => (
            <>
              <PillSelect
                label="Station"
                options={STATION_PRESETS}
                value={station}
                onChange={setStation}
              />
              {station === 'Other' && (
                <TextInput
                  placeholder="Where you filled up"
                  value={otherStation}
                  onChange={(e) => setOtherStation(e.target.value)}
                  style={{ marginTop: 'var(--space-2)' }}
                />
              )}
            </>
          )}
        </Field>

        <Field label="Grade">
          {() => (
            <PillSelect label="Grade" options={FUEL_GRADES} value={grade} onChange={setGrade} />
          )}
        </Field>

        {grade === 'RON95' && (
          <div className={styles.card}>
            <Switch
              checked={budiMadani}
              onChange={handleBudiToggle}
              label="BUDI Madani"
              hint="Malaysia's targeted RON95 subsidy programme"
            />

            {showBudiPanel && (
              <div className={styles.budiPanel}>
                <p className={styles.budiHint}>
                  Enter what you paid at the pump below (Total) — litres, market value and savings
                  are all worked out from that.
                </p>

                <div className={styles.budiRates}>
                  <label className={styles.budiRateField}>
                    Subsidy price (RM/L)
                    <TextInput
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      value={budiSubsidyPrice}
                      onChange={(e) => setBudiSubsidyPrice(e.target.value)}
                    />
                  </label>
                  <label className={styles.budiRateField}>
                    Market price (RM/L)
                    <TextInput
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      value={budiMarketPrice}
                      onChange={(e) => setBudiMarketPrice(e.target.value)}
                    />
                  </label>
                  <label className={styles.budiRateField}>
                    Monthly quota (L)
                    <TextInput
                      type="number"
                      step="1"
                      inputMode="numeric"
                      value={budiQuota}
                      onChange={(e) => setBudiQuota(e.target.value)}
                    />
                  </label>
                </div>
                <p className={styles.budiHint}>
                  Market price changes roughly weekly — adjust it here if it&apos;s out of date.
                </p>
              </div>
            )}
          </div>
        )}

        <FieldRow>
          <Field
            label="Volume (L)"
            hint={showBudiPanel ? 'Calculated from Total, below' : undefined}
          >
            {(id) => (
              <TextInput
                id={id}
                type="number"
                step="0.01"
                inputMode="decimal"
                required
                placeholder="0.00"
                value={showBudiPanel ? (costValue > 0 ? budiDerivedLitres.toFixed(2) : '') : litres}
                onChange={(e) => setLitres(e.target.value)}
                readOnly={showBudiPanel}
                style={showBudiPanel ? { opacity: 0.65, cursor: 'not-allowed' } : undefined}
              />
            )}
          </Field>
          <Field label="Total (RM)">
            {(id) => (
              <TextInput
                id={id}
                type="number"
                step="0.01"
                inputMode="decimal"
                required
                placeholder="0.00"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
              />
            )}
          </Field>
        </FieldRow>
        {overTankCapacity && (
          <p className={styles.warning}>
            That&apos;s more than this vehicle&apos;s {tankCapacity} L tank — double-check the{' '}
            {showBudiPanel ? 'amount paid' : 'volume'}.
          </p>
        )}

        {showBudiPanel && costValue > 0 && (
          <div className={styles.card}>
            <div className={styles.budiStats}>
              <div className={styles.budiStat}>
                <span className={`${styles.budiStatValue} num`}>
                  {budiDerivedLitres.toFixed(2)} L
                </span>
                <span className={styles.budiStatLabel}>Litres received</span>
              </div>
              <div className={styles.budiStat}>
                <span className={`${styles.budiStatValue} num`}>{formatRM(budiMarketValue)}</span>
                <span className={styles.budiStatLabel}>Worth at market</span>
              </div>
              <div className={styles.budiStat}>
                <span className={`${styles.budiStatValue} num`}>{formatRM(budiSavings)}</span>
                <span className={styles.budiStatLabel}>You saved</span>
              </div>
            </div>

            <p className={styles.budiNote}>
              {budiMarketLitres > 0
                ? `${budiSubsidisedLitres.toFixed(2)} L at the subsidised rate, ${budiMarketLitres.toFixed(2)} L at market rate — your monthly quota ran out partway through this fill.`
                : budiQuotaRemaining > 0
                  ? `You'll have ${(budiQuotaRemaining - budiSubsidisedLitres).toFixed(0)} L of quota left this month after this fill.`
                  : 'Your monthly quota is fully used for this fill.'}
            </p>
          </div>
        )}

        <div className={styles.card}>
          <Switch
            checked={fullTank}
            onChange={setFullTank}
            label="Filled up to full"
            hint="Only turn this on when you fill all the way to the top — it's how we calculate your fuel consumption (km per litre) between full tanks. Leave it off for a partial top-up."
          />
        </div>

        <Field label="Notes (optional)">
          {(id) => (
            <TextArea
              id={id}
              placeholder="Anything worth remembering"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          )}
        </Field>

        {formError && <p className={styles.error}>{formError}</p>}

        <Button type="submit" block disabled={saving}>
          {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Save fill-up'}
        </Button>
      </LogFormLayout>

      <Sheet
        open={confirmingDelete}
        title="Delete this fill-up?"
        hint="This can't be undone."
        onClose={() => setConfirmingDelete(false)}
      >
        <Button
          type="button"
          variant="danger"
          block
          onClick={() => void handleDelete()}
          disabled={deleteLog.isPending}
        >
          {deleteLog.isPending ? 'Deleting…' : 'Delete fill-up'}
        </Button>
      </Sheet>
    </>
  );
}
