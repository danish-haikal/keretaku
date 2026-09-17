import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCreateChargingLog } from '@/api/logs';
import { useVehicle } from '@/api/vehicles';
import { Button } from '@/components/ui/Button';
import { Field, FieldRow, TextArea, TextInput } from '@/components/ui/Field';
import { PillSelect } from '@/components/ui/PillSelect';
import { ErrorState, LoadingState } from '@/components/ui/StateMessage';
import { Switch } from '@/components/ui/Switch';
import { useToast } from '@/hooks/useToast';
import { todayIso } from '@/lib/dates';
import { cleanText, parseNumberInput } from '@/lib/format';
import type { CurrentType } from '@/types/database';
import { LogFormLayout } from './LogFormLayout';
import styles from './LogFormLayout.module.css';

const CHARGER_PRESETS = ['Home', 'Gentari', 'ChargEV', 'TNB Electron', 'Other'] as const;
const CURRENT_TYPES: readonly CurrentType[] = ['AC', 'DC'];

export function LogChargingPage() {
  const { vehicleId = '' } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: vehicle, isPending, error } = useVehicle(vehicleId);
  const createLog = useCreateChargingLog();

  const [loggedOn, setLoggedOn] = useState(todayIso());
  const [odometer, setOdometer] = useState('');
  const [energy, setEnergy] = useState('');
  const [cost, setCost] = useState('');
  const [charger, setCharger] = useState<(typeof CHARGER_PRESETS)[number]>('Home');
  const [otherCharger, setOtherCharger] = useState('');
  const [currentType, setCurrentType] = useState<CurrentType>('AC');
  const [fullCharge, setFullCharge] = useState(true);
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  if (isPending) return <LoadingState />;
  if (error || !vehicle) return <ErrorState error={error ?? new Error('Vehicle not found')} />;

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

    try {
      await createLog.mutateAsync({
        vehicle_id: vehicleId,
        logged_on: loggedOn || todayIso(),
        odometer_km: parseNumberInput(odometer),
        energy_kwh: energyValue,
        total_cost: costValue,
        charger_location: location,
        current_type: currentType,
        is_full_charge: fullCharge,
        notes: cleanText(notes),
      });
      showToast('Charge saved');
      navigate(`/vehicles/${vehicleId}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save this charge.');
    }
  }

  return (
    <LogFormLayout
      title="Log charging"
      vehicle={vehicle}
      icon="bolt"
      tone="secondary"
      onSubmit={handleSubmit}
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

      <Button type="submit" block disabled={createLog.isPending}>
        {createLog.isPending ? 'Saving…' : 'Save charge'}
      </Button>
    </LogFormLayout>
  );
}
