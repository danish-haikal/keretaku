import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCreateFuelLog } from '@/api/logs';
import { useVehicle } from '@/api/vehicles';
import { Button } from '@/components/ui/Button';
import { Field, FieldRow, TextArea, TextInput } from '@/components/ui/Field';
import { ErrorState, LoadingState } from '@/components/ui/StateMessage';
import { Switch } from '@/components/ui/Switch';
import { useToast } from '@/hooks/useToast';
import { todayIso } from '@/lib/dates';
import { cleanText, parseNumberInput } from '@/lib/format';
import { LogFormLayout } from './LogFormLayout';
import styles from './LogFormLayout.module.css';

export function LogFuelPage() {
  const { vehicleId = '' } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: vehicle, isPending, error } = useVehicle(vehicleId);
  const createLog = useCreateFuelLog();

  const [loggedOn, setLoggedOn] = useState(todayIso());
  const [odometer, setOdometer] = useState('');
  const [litres, setLitres] = useState('');
  const [cost, setCost] = useState('');
  const [station, setStation] = useState('');
  const [fullTank, setFullTank] = useState(true);
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  if (isPending) return <LoadingState />;
  if (error || !vehicle) return <ErrorState error={error ?? new Error('Vehicle not found')} />;

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

    try {
      await createLog.mutateAsync({
        vehicle_id: vehicleId,
        logged_on: loggedOn || todayIso(),
        odometer_km: parseNumberInput(odometer),
        litres: litresValue,
        total_cost: costValue,
        station: cleanText(station),
        is_full_tank: fullTank,
        notes: cleanText(notes),
      });
      showToast('Fill-up saved');
      navigate(`/vehicles/${vehicleId}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save this fill-up.');
    }
  }

  return (
    <LogFormLayout title="Log fuel" vehicle={vehicle} icon="fuel" onSubmit={handleSubmit}>
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

      <Field label="Station (optional)">
        {(id) => (
          <TextInput
            id={id}
            placeholder="Where you filled up"
            value={station}
            onChange={(e) => setStation(e.target.value)}
          />
        )}
      </Field>

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

      <Button type="submit" block disabled={createLog.isPending}>
        {createLog.isPending ? 'Saving…' : 'Save fill-up'}
      </Button>
    </LogFormLayout>
  );
}
