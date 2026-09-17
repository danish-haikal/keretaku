import { useRef, useState, type FormEvent } from 'react';
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
import { cleanText, formatDate, formatKm, formatRM, parseNumberInput } from '@/lib/format';
import type { ServiceLogWithItems, Vehicle } from '@/types/database';
import { LogFormLayout } from './LogFormLayout';
import layout from './LogFormLayout.module.css';
import styles from './LogServicePage.module.css';

const NEXT_MODES = ['By km', 'By date', 'Both', 'Skip'] as const;
type NextMode = (typeof NEXT_MODES)[number];

const KM_STEPS = [5000, 10000, 20000];
const MONTH_STEPS = [3, 6, 12];

/** Fixed category presets. Tapping one adds an (empty) category section
 * you then add items under — it is NOT itself an item. */
const CATEGORY_PRESETS = [
  'Basic Service',
  'Major Service',
  'Brake Service',
  'Tyre & Battery',
  'Aircond Service',
] as const;

/** Common item names, for quickly adding an item without typing — shown
 * inside every category section. */
const ITEM_NAME_CHIPS = [
  'Oil',
  'Filter',
  'Brake',
  'Tyre',
  'Belt',
  'Battery',
  'Aircond',
  'Labour',
] as const;

/** Label for items saved before categories existed (category = null). */
const OTHER_CATEGORY_LABEL = 'Other';

interface ItemRow {
  key: string;
  name: string;
  price: string;
}

interface CategoryGroup {
  key: string;
  name: string;
  /** True only for the fallback group holding pre-existing category-less items. */
  isOther: boolean;
  items: ItemRow[];
}

function buildInitialCategories(log: ServiceLogWithItems | null): CategoryGroup[] {
  if (!log) return [];
  const order: string[] = [];
  const groups = new Map<string, CategoryGroup>();
  for (const item of log.service_log_items) {
    const groupKey = item.category ?? '__other__';
    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        key: groupKey,
        name: item.category ?? OTHER_CATEGORY_LABEL,
        isOther: !item.category,
        items: [],
      });
      order.push(groupKey);
    }
    groups.get(groupKey)!.items.push({ key: item.id, name: item.name, price: String(item.price) });
  }
  return order.map((key) => groups.get(key)!);
}

function nextModeFor(log: ServiceLogWithItems | null): NextMode {
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

function ServiceLogForm({ vehicle, log }: { vehicle: Vehicle; log: ServiceLogWithItems | null }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const createLog = useCreateServiceLog();
  const updateLog = useUpdateServiceLog();
  const deleteLog = useDeleteServiceLog();
  const isEditing = log != null;

  const keyCounter = useRef(0);
  function newKey(): string {
    keyCounter.current += 1;
    return `new-${keyCounter.current}`;
  }

  const [servicedOn, setServicedOn] = useState(log?.serviced_on ?? todayIso());
  const [odometer, setOdometer] = useState(log?.odometer_km != null ? String(log.odometer_km) : '');
  const [categories, setCategories] = useState<CategoryGroup[]>(() => buildInitialCategories(log));
  const [workshop, setWorkshop] = useState(log?.workshop ?? '');
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

  const total = categories.reduce(
    (sum, cat) => sum + cat.items.reduce((s, row) => s + (parseNumberInput(row.price) ?? 0), 0),
    0,
  );

  function addCategory(name: string) {
    setCategories((prev) =>
      prev.some((c) => c.name === name)
        ? prev
        : [...prev, { key: newKey(), name, isOther: false, items: [] }],
    );
  }

  function removeCategory(categoryKey: string) {
    setCategories((prev) => prev.filter((c) => c.key !== categoryKey));
  }

  function addItem(categoryKey: string, name = '') {
    setCategories((prev) =>
      prev.map((c) =>
        c.key === categoryKey
          ? { ...c, items: [...c.items, { key: newKey(), name, price: '' }] }
          : c,
      ),
    );
  }

  function updateItem(
    categoryKey: string,
    itemKey: string,
    patch: Partial<Pick<ItemRow, 'name' | 'price'>>,
  ) {
    setCategories((prev) =>
      prev.map((c) =>
        c.key !== categoryKey
          ? c
          : { ...c, items: c.items.map((it) => (it.key === itemKey ? { ...it, ...patch } : it)) },
      ),
    );
  }

  function removeItem(categoryKey: string, itemKey: string) {
    setCategories((prev) =>
      prev.map((c) =>
        c.key !== categoryKey ? c : { ...c, items: c.items.filter((it) => it.key !== itemKey) },
      ),
    );
  }

  const summaryParts = [
    showKm && nextKm ? `at ${formatKm(Number(nextKm))}` : null,
    showDate && nextDate ? `by ${formatDate(nextDate)}` : null,
  ].filter(Boolean);

  const summary =
    nextMode === 'Skip'
      ? 'No reminder will be set for this visit.'
      : summaryParts.length > 0
        ? `Reminder: next service ${summaryParts.join(' or ')}.`
        : 'Pick a quick option or type a value.';

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const cleanItems = categories.flatMap((cat) =>
      cat.items
        .map((row) => ({
          name: row.name.trim(),
          price: parseNumberInput(row.price) ?? 0,
          category: cat.isOther ? null : cat.name,
        }))
        .filter((row) => row.name !== ''),
    );

    if (cleanItems.length === 0) {
      setFormError('Choose a category above, then add at least one item, e.g. engine oil.');
      return;
    }

    const payload = {
      vehicle_id: vehicle.id,
      serviced_on: baseDate,
      odometer_km: parseNumberInput(odometer),
      workshop: cleanText(workshop),
      cost: cleanItems.reduce((sum, row) => sum + row.price, 0),
      notes: cleanText(notes),
      next_due_km: showKm ? parseNumberInput(nextKm) : null,
      next_due_date: showDate && nextDate ? nextDate : null,
      items: cleanItems,
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

        {/* ---------- Parts & items ---------- */}
        <section className={styles.itemsCard}>
          <header className={styles.itemsHead}>
            <div className={styles.nextTitle}>Parts &amp; items</div>
            <div className={styles.nextHint}>Pick a category, then add items with a price.</div>
          </header>

          <div className={styles.presetsRow}>
            {CATEGORY_PRESETS.map((preset) => {
              const added = categories.some((c) => c.name === preset);
              return (
                <button
                  key={preset}
                  type="button"
                  aria-pressed={added}
                  disabled={added}
                  className={`${styles.categoryChip} ${added ? styles.categoryChipActive : ''}`}
                  onClick={() => addCategory(preset)}
                >
                  {added && <Icon name="check" size={12} />}
                  {preset}
                </button>
              );
            })}
          </div>

          {categories.length === 0 && (
            <p className={styles.itemsEmptyHint}>Choose a category above to start adding items.</p>
          )}

          <div className={styles.categoryList}>
            {categories.map((cat) => (
              <div className={styles.categoryGroup} key={cat.key}>
                <div className={styles.categoryGroupHead}>
                  <span className={styles.categoryGroupName}>{cat.name}</span>
                  <IconButton
                    icon="trash"
                    label={`Remove ${cat.name} and its items`}
                    variant="ghost"
                    onClick={() => removeCategory(cat.key)}
                  />
                </div>

                {cat.items.length > 0 && (
                  <div className={styles.itemRows}>
                    {cat.items.map((row) => (
                      <div className={styles.itemRow} key={row.key}>
                        <TextInput
                          aria-label="Item name"
                          placeholder="Item name — e.g. Engine Oil"
                          value={row.name}
                          onChange={(e) => updateItem(cat.key, row.key, { name: e.target.value })}
                          className={styles.itemName}
                        />
                        <TextInput
                          aria-label="Item price"
                          type="number"
                          step="0.01"
                          inputMode="decimal"
                          placeholder="RM 0.00"
                          value={row.price}
                          onChange={(e) => updateItem(cat.key, row.key, { price: e.target.value })}
                          className={styles.itemPrice}
                        />
                        <IconButton
                          icon="trash"
                          label="Remove this item"
                          variant="ghost"
                          onClick={() => removeItem(cat.key, row.key)}
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className={styles.chipsRow}>
                  <QuickPills
                    options={ITEM_NAME_CHIPS.map((name) => ({
                      label: name,
                      onClick: () => addItem(cat.key, name),
                    }))}
                  />
                </div>

                <button
                  type="button"
                  className={styles.addItemButton}
                  onClick={() => addItem(cat.key)}
                >
                  <Icon name="plus" size={14} />
                  Add item
                </button>
              </div>
            ))}
          </div>

          {categories.length > 0 && (
            <div className={styles.itemsTotal}>
              <span>Total</span>
              <span className="num">{formatRM(total)}</span>
            </div>
          )}
        </section>

        <Field label="Notes (optional)">
          {(id) => (
            <TextArea
              id={id}
              placeholder="Warranty, recommendations, etc."
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
        hint="This can't be undone. If this was the latest visit, its reminder will also disappear."
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
