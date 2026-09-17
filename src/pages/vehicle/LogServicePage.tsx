import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCreateServiceLog } from '@/api/logs';
import { useVehicle } from '@/api/vehicles';
import { Button } from '@/components/ui/Button';
import { Field, FieldRow, TextArea, TextInput } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { PillSelect, QuickPills } from '@/components/ui/PillSelect';
import { ErrorState, LoadingState } from '@/components/ui/StateMessage';
import { useToast } from '@/hooks/useToast';
import { addMonths, todayIso } from '@/lib/dates';
import { cleanText, formatDate, formatKm, parseNumberInput } from '@/lib/format';
import { LogFormLayout } from './LogFormLayout';
import layout from './LogFormLayout.module.css';
import styles from './LogServicePage.module.css';

const NEXT_MODES = ['By km', 'By date', 'Both', 'Skip'] as const;
type NextMode = (typeof NEXT_MODES)[number];

const KM_STEPS = [5000, 10000, 20000];
const MONTH_STEPS = [3, 6, 12];

export function LogServicePage() {
  const { vehicleId = '' } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: vehicle, isPending, error } = useVehicle(vehicleId);
  const createLog = useCreateServiceLog();

  const [servicedOn, setServicedOn] = useState(todayIso());
  const [odometer, setOdometer] = useState('');
  const [item, setItem] = useState('');
  const [workshop, setWorkshop] = useState('');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');
  const [nextMode, setNextMode] = useState<NextMode>('Both');
  const [nextKm, setNextKm] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  if (isPending) return <LoadingState />;
  if (error || !vehicle) return <ErrorState error={error ?? new Error('Vehicle not found')} />;

  const baseOdometer = parseNumberInput(odometer) ?? vehicle.odometer_km;
  const baseDate = servicedOn || todayIso();
  const showKm = nextMode === 'By km' || nextMode === 'Both';
  const showDate = nextMode === 'By date' || nextMode === 'Both';

  const summaryParts = [
    showKm && nextKm ? `at ${formatKm(Number(nextKm))}` : null,
    showDate && nextDate ? `by ${formatDate(nextDate)}` : null,
  ].filter(Boolean);

  const summary =
    nextMode === 'Skip'
      ? 'No reminder will be set for this item.'
      : summaryParts.length > 0
        ? `Reminder: next service ${summaryParts.join(' or ')}.`
        : 'Pick a quick option or type a value.';

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (!item.trim()) {
      setFormError('Enter what was done, e.g. engine oil.');
      return;
    }

    try {
      await createLog.mutateAsync({
        vehicle_id: vehicleId,
        serviced_on: baseDate,
        odometer_km: parseNumberInput(odometer),
        item: item.trim(),
        workshop: cleanText(workshop),
        cost: parseNumberInput(cost) ?? 0,
        notes: cleanText(notes),
        next_due_km: showKm ? parseNumberInput(nextKm) : null,
        next_due_date: showDate && nextDate ? nextDate : null,
      });
      showToast(summaryParts.length > 0 ? 'Saved · reminder set' : 'Service record saved');
      navigate(`/vehicles/${vehicleId}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save this service record.');
    }
  }

  return (
    <LogFormLayout title="Log service" vehicle={vehicle} icon="wrench" onSubmit={handleSubmit}>
      <FieldRow>
        <Field label="Date">
          {(id) => (
            <TextInput
              id={id}
              type="date"
              value={servicedOn}
              onChange={(e) => setServicedOn(e.target.value)}
            />
          )}
        </Field>
        <Field label="Odometer (km)">
          {(id) => (
            <TextInput
              id={id}
              type="number"
              inputMode="numeric"
              placeholder={String(vehicle.odometer_km)}
              value={odometer}
              onChange={(e) => setOdometer(e.target.value)}
            />
          )}
        </Field>
      </FieldRow>

      <Field label="Item / category">
        {(id) => (
          <TextInput
            id={id}
            required
            placeholder="e.g. Engine oil, brake pads…"
            value={item}
            onChange={(e) => setItem(e.target.value)}
          />
        )}
      </Field>

      <Field label="Workshop">
        {(id) => (
          <TextInput
            id={id}
            placeholder="Workshop name"
            value={workshop}
            onChange={(e) => setWorkshop(e.target.value)}
          />
        )}
      </Field>

      <Field label="Cost (RM)">
        {(id) => (
          <TextInput
            id={id}
            type="number"
            step="0.01"
            inputMode="decimal"
            placeholder="0.00"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
        )}
      </Field>

      <Field label="Notes (optional)">
        {(id) => (
          <TextArea
            id={id}
            placeholder="Parts used, warranty, etc."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        )}
      </Field>

      {/* ---------- Next service ---------- */}
      <section className={styles.nextCard}>
        <header className={styles.nextHead}>
          <span className={styles.nextIcon}>
            <Icon name="bell" size={18} />
          </span>
          <div>
            <div className={styles.nextTitle}>Next service</div>
            <div className={styles.nextHint}>We&apos;ll remind you on whichever comes first.</div>
          </div>
        </header>

        <div className={styles.modeRow}>
          <PillSelect
            label="How to track the next service"
            options={NEXT_MODES}
            value={nextMode}
            onChange={setNextMode}
          />
        </div>

        {showKm && (
          <Field label="Next service at (km)">
            {(id) => (
              <>
                <TextInput
                  id={id}
                  type="number"
                  inputMode="numeric"
                  placeholder={String(baseOdometer + 10000)}
                  value={nextKm}
                  onChange={(e) => setNextKm(e.target.value)}
                />
                <div className={styles.quick}>
                  <QuickPills
                    options={KM_STEPS.map((step) => ({
                      label: `+${step.toLocaleString('en-MY')} km`,
                      onClick: () => setNextKm(String(baseOdometer + step)),
                    }))}
                  />
                </div>
              </>
            )}
          </Field>
        )}

        {showDate && (
          <Field label="Next service by (date)">
            {(id) => (
              <>
                <TextInput
                  id={id}
                  type="date"
                  value={nextDate}
                  onChange={(e) => setNextDate(e.target.value)}
                />
                <div className={styles.quick}>
                  <QuickPills
                    options={MONTH_STEPS.map((months) => ({
                      label: `+${months} months`,
                      onClick: () => setNextDate(addMonths(baseDate, months)),
                    }))}
                  />
                </div>
              </>
            )}
          </Field>
        )}

        <p className={styles.summary}>{summary}</p>
      </section>

      {formError && <p className={layout.error}>{formError}</p>}

      <Button type="submit" block disabled={createLog.isPending}>
        {createLog.isPending ? 'Saving…' : 'Save service record'}
      </Button>
    </LogFormLayout>
  );
}
