import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useChargingLog,
  useCreateChargingLog,
  useDeleteChargingLog,
  useUpdateChargingLog,
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
import { cleanText, parseNumberInput } from '@/lib/format';
import type { ChargingLog, CurrentType, Vehicle } from '@/types/database';
import { LogFormLayout } from './LogFormLayout';
import styles from './LogFormLayout.module.css';

const CHARGER_PRESETS = ['Home', 'Gentari', 'ChargEV', 'TNB Electron', 'Other'] as const;
const CURRENT_TYPES: readonly CurrentType[] = ['AC', 'DC'];

export function LogChargingPage() {
  const { vehicleId = '', logId } = useParams();
  const { data: vehicle, isPending: vehiclePending, error: vehicleError } = useVehicle(vehicleId);
  const existingLog = useChargingLog(logId);

  if (vehiclePending || (logId && existingLog.isPending)) return <LoadingState />;
  if (vehicleError || !vehicle) {
    return <ErrorState error={vehicleError ?? new Error('Vehicle not found')} />;
  }
  if (logId && (existingLog.error || !existingLog.data)) {
    return <ErrorState error={existingLog.error ?? new Error('Charge not found')} />;
  }

  return (
    <ChargingLogForm
      key={logId ?? 'new'}
      vehicle={vehicle}
      log={logId ? (existingLog.data ?? null) : null}
    />
  );
}

function ChargingLogForm({ vehicle, log }: { vehicle: Vehicle; log: ChargingLog | null }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const createLog = useCreateChargingLog();
  const updateLog = useUpdateChargingLog();
  const deleteLog = useDeleteChargingLog();
  const isEditing = log != null;

  const initialCharger = log
    ? (CHARGER_PRESETS.find((p) => p === log.charger_location) ??
      (log.charger_location ? 'Other' : 'Home'))
    : 'Home';

  const [loggedOn, setLoggedOn] = useState(log?.logged_on ?? todayIso());
  const [odometer, setOdometer] = useState(log?.odometer_km != null ? String(log.odometer_km) : '');
  const [energy, setEnergy] = useState(log ? String(log.energy_kwh) : '');
  const [cost, setCost] = useState(log ? String(log.total_cost) : '');
  const [charger, setCharger] = useState<(typeof CHARGER_PRESETS)[number]>(initialCharger);
  const [otherCharger, setOtherCharger] = useState(
    initialCharger === 'Other' ? (log?.charger_location ?? '') : '',
  );
  const [currentType, setCurrentType] = useState<CurrentType>(log?.current_type ?? 'AC');
  const [fullCharge, setFullCharge] = useState(log?.is_full_charge ?? true);
  const [notes, setNotes] = useState(log?.notes ?? '');
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const saving = createLog.isPending || updateLog.isPending;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const energyValue = parseNumberInput(energy);
    const costValue = parseNumberInput(cost);
    if (energyValue == null || energyValue <= 0) {
      setFormError('Enter how many kWh you added.');
      return;
    }
    if (costValue == null || costValue < 0) {
      setFormError('Enter the total cost (use 0 for free charging).');
      return;
    }

    const location = charger === 'Other' ? cleanText(otherCharger) : charger;

    const payload = {
      vehicle_id: vehicle.id,
      logged_on: loggedOn || todayIso(),
      odometer_km: parseNumberInput(odometer),
      energy_kwh: energyValue,
      total_cost: costValue,
      charger_location: location,
      current_type: currentType,
      is_full_charge: fullCharge,
      notes: cleanText(notes),
    };

    try {
      if (isEditing && log) {
        await updateLog.mutateAsync({ id: log.id, ...payload });
        showToast('Charge updated');
      } else {
        await createLog.mutateAsync(payload);
        showToast('Charge saved');
      }
      navigate(`/vehicles/${vehicle.id}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save this charge.');
    }
  }

  async function handleDelete() {
    if (!log) return;
    await deleteLog.mutateAsync({ id: log.id, vehicleId: vehicle.id });
    showToast('Charge deleted');
    navigate(`/vehicles/${vehicle.id}`);
  }

  return (
    <>
      <LogFormLayout
        title={isEditing ? 'Edit charging log' : 'Log charging'}
        vehicle={vehicle}
        icon="bolt"
        tone="secondary"
        onSubmit={handleSubmit}
        headerActions={
          isEditing ? (
            <IconButton
              icon="trash"
              label="Delete this charge"
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

        <FieldRow>
          <Field label="Energy (kWh)">
            {(id) => (
              <TextInput
                id={id}
                type="number"
                step="0.01"
                inputMode="decimal"
                required
                placeholder="0.00"
                value={energy}
                onChange={(e) => setEnergy(e.target.value)}
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

        <Field label="Charger location">
          {() => (
            <>
              <PillSelect
                label="Charger location"
                options={CHARGER_PRESETS}
                value={charger}
                onChange={setCharger}
              />
              {charger === 'Other' && (
                <TextInput
                  placeholder="Type charger location…"
                  value={otherCharger}
                  onChange={(e) => setOtherCharger(e.target.value)}
                  style={{ marginTop: 'var(--space-2)' }}
                />
              )}
            </>
          )}
        </Field>

        <Field label="Current type">
          {() => (
            <PillSelect
              label="Current type"
              options={CURRENT_TYPES}
              value={currentType}
              onChange={setCurrentType}
            />
          )}
        </Field>

        <div className={styles.card}>
          <Switch
            checked={fullCharge}
            onChange={setFullCharge}
            label="Charged to full"
            hint="Only full charges can measure consumption"
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
          {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Save charge'}
        </Button>
      </LogFormLayout>

      <Sheet
        open={confirmingDelete}
        title="Delete this charge?"
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
          {deleteLog.isPending ? 'Deleting…' : 'Delete charge'}
        </Button>
      </Sheet>
    </>
  );
}