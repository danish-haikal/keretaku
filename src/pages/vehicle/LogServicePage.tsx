import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useCreateServiceLog,
  useDeleteServiceLog,
  useServiceLog,
  useUpdateServiceLog,
} from '@/api/logs';
import { useVehicle } from '@/api/vehicles';
import { Button } from '@/components/ui/Button';
import { Field, FieldRow, TextArea, TextInput } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { PillSelect, QuickPills } from '@/components/ui/PillSelect';
import { Sheet } from '@/components/ui/Sheet';
import { ErrorState, LoadingState } from '@/components/ui/StateMessage';
import { useToast } from '@/hooks/useToast';
import { addMonths, todayIso } from '@/lib/dates';
import { cleanText, formatDate, formatKm, parseNumberInput } from '@/lib/format';
import type { ServiceLog, Vehicle } from '@/types/database';
import { LogFormLayout } from './LogFormLayout';
import layout from './LogFormLayout.module.css';
import styles from './LogServicePage.module.css';

const NEXT_MODES = ['By km', 'By date', 'Both', 'Skip'] as const;
type NextMode = (typeof NEXT_MODES)[number];

const KM_STEPS = [5000, 10000, 20000];
const MONTH_STEPS = [3, 6, 12];

function nextModeFor(log: ServiceLog | null): NextMode {
  if (!log) return 'Both';
  const hasKm = log.next_due_km != null;
  const hasDate = !!log.next_due_date;
  if (hasKm && hasDate) return 'Both';
  if (hasKm) return 'By km';
  if (hasDate) return 'By date';
  return 'Skip';
}

export function LogServicePage() {
  const { vehicleId = '', logId } = useParams();
  const { data: vehicle, isPending: vehiclePending, error: vehicleError } = useVehicle(vehicleId);
  const existingLog = useServiceLog(logId);

  if (vehiclePending || (logId && existingLog.isPending)) return <LoadingState />;
  if (vehicleError || !vehicle) {
    return <ErrorState error={vehicleError ?? new Error('Vehicle not found')} />;
  }
  if (logId && (existingLog.error || !existingLog.data)) {
    return <ErrorState error={existingLog.error ?? new Error('Service record not found')} />;
  }

  return (
    <ServiceLogForm
      key={logId ?? 'new'}
      vehicle={vehicle}
      log={logId ? (existingLog.data ?? null) : null}
    />
  );
}

function ServiceLogForm({ vehicle, log }: { vehicle: Vehicle; log: ServiceLog | null }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const createLog = useCreateServiceLog();
  const updateLog = useUpdateServiceLog();
  const deleteLog = useDeleteServiceLog();
  const isEditing = log != null;

  const [servicedOn, setServicedOn] = useState(log?.serviced_on ?? todayIso());
  const [odometer, setOdometer] = useState(log?.odometer_km != null ? String(log.odometer_km) : '');
  const [item, setItem] = useState(log?.item ?? '');
  const [workshop, setWorkshop] = useState(log?.workshop ?? '');
  const [cost, setCost] = useState(log ? String(log.cost) : '');
  const [notes, setNotes] = useState(log?.notes ?? '');
  const [nextMode, setNextMode] = useState<NextMode>(nextModeFor(log));
  const [nextKm, setNextKm] = useState(log?.next_due_km != null ? String(log.next_due_km) : '');
  const [nextDate, setNextDate] = useState(log?.next_due_date ?? '');
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const saving = createLog.isPending || updateLog.isPending;

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

    const payload = {
      vehicle_id: vehicle.id,
      serviced_on: baseDate,
      odometer_km: parseNumberInput(odometer),
      item: item.trim(),
      workshop: cleanText(workshop),
      cost: parseNumberInput(cost) ?? 0,
      notes: cleanText(notes),
      next_due_km: showKm ? parseNumberInput(nextKm) : null,
      next_due_date: showDate && nextDate ? nextDate : null,
    };

    try {
      if (isEditing && log) {
        await updateLog.mutateAsync({ id: log.id, ...payload });
        showToast('Service record updated');
      } else {
        await createLog.mutateAsync(payload);
        showToast(summaryParts.length > 0 ? 'Saved · reminder set' : 'Service record saved');
      }
      navigate(`/vehicles/${vehicle.id}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save this service record.');
    }
  }

  async function handleDelete() {
    if (!log) return;
    await deleteLog.mutateAsync({ id: log.id, vehicleId: vehicle.id });
    showToast('Service record deleted');
    navigate(`/vehicles/${vehicle.id}`);
  }

  return (
    <>
      <LogFormLayout
        title={isEditing ? 'Edit service record' : 'Log service'}
        vehicle={vehicle}
        icon="wrench"
        onSubmit={handleSubmit}
        headerActions={
          isEditing ? (
            <IconButton
              icon="trash"
              label="Delete this service record"
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

        <Button type="submit" block disabled={saving}>
          {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Save service record'}
        </Button>
      </LogFormLayout>

      <Sheet
        open={confirmingDelete}
        title="Delete this service record?"
        hint="This can't be undone. If this was the latest entry for this item, its reminder will also disappear."
        onClose={() => setConfirmingDelete(false)}
      >
        <Button
          type="button"
          variant="danger"
          block
          onClick={() => void handleDelete()}
          disabled={deleteLog.isPending}
        >
          {deleteLog.isPending ? 'Deleting…' : 'Delete record'}
        </Button>
      </Sheet>
    </>
  );
}