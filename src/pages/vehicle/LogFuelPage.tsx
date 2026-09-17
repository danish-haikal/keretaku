import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCreateFuelLog, useDeleteFuelLog, useFuelLog, useUpdateFuelLog } from '@/api/logs';
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
import { FUEL_GRADES, type FuelGrade, type FuelLog, type Vehicle } from '@/types/database';
import { LogFormLayout } from './LogFormLayout';
import styles from './LogFormLayout.module.css';

const STATION_PRESETS = ['Shell', 'Petronas', 'BHP', 'Petron', 'Other'] as const;

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

  const saving = createLog.isPending || updateLog.isPending;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const litresValue = parseNumberInput(litres);
    const costValue = parseNumberInput(cost);
    if (litresValue == null || litresValue <= 0) {
      setFormError('Enter how many litres you filled.');
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

        <FieldRow>
          <Field label="Volume (L)">
            {(id) => (
              <TextInput
                id={id}
                type="number"
                step="0.01"
                inputMode="decimal"
                required
                placeholder="0.00"
                value={litres}
                onChange={(e) => setLitres(e.target.value)}
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
              onChange={setBudiMadani}
              label="BUDI Madani"
              hint="Malaysia's targeted RON95 subsidy programme"
            />
          </div>
        )}

        <div className={styles.card}>
          <Switch
            checked={fullTank}
            onChange={setFullTank}
            label="Filled the tank"
            hint="Only full tanks can measure consumption"
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