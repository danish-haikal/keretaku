import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDismissServiceReminder } from '@/api/logs';
import { useMaintenanceReminders } from '@/api/reminders';
import { useDismissRenewalReminder, useVehicles } from '@/api/vehicles';
import { PageHeader } from '@/components/layout/PageHeader';
import page from '@/components/layout/Page.module.css';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { Sheet } from '@/components/ui/Sheet';
import { ErrorState, LoadingState } from '@/components/ui/StateMessage';
import { useToast } from '@/hooks/useToast';
import { buildReminderList, type ReminderItem } from '@/lib/reminders';
import styles from './RemindersPage.module.css';

export function RemindersPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const vehicles = useVehicles();
  const reminders = useMaintenanceReminders();
  const dismissServiceReminder = useDismissServiceReminder();
  const dismissRenewalReminder = useDismissRenewalReminder();

  const [selected, setSelected] = useState<ReminderItem | null>(null);

  const items = useMemo(
    () => buildReminderList(vehicles.data ?? [], reminders.data ?? []),
    [vehicles.data, reminders.data],
  );

  const isPending = vehicles.isPending || reminders.isPending;
  const error = vehicles.error ?? reminders.error;

  const overdue = items.filter((i) => i.urgency === 'overdue');
  const soon = items.filter((i) => i.urgency === 'soon');
  const later = items.filter((i) => i.urgency === 'ok');

  async function handleMarkComplete() {
    if (!selected) return;
    if (selected.kind === 'maintenance' && selected.serviceLogId) {
      await dismissServiceReminder.mutateAsync({
        id: selected.serviceLogId,
        vehicleId: selected.vehicleId,
      });
    } else if (selected.kind === 'road_tax' || selected.kind === 'insurance') {
      await dismissRenewalReminder.mutateAsync({
        id: selected.vehicleId,
        field:
          selected.kind === 'road_tax'
            ? 'road_tax_reminder_dismissed_at'
            : 'insurance_reminder_dismissed_at',
      });
    }
    showToast('Reminder marked complete');
    setSelected(null);
  }

  function handleRecordNow() {
    if (!selected) return;
    if (selected.kind === 'maintenance') {
      navigate(`/vehicles/${selected.vehicleId}/log/service`);
    } else {
      navigate(`/vehicles/${selected.vehicleId}/edit`);
    }
    setSelected(null);
  }

  const dismissing = dismissServiceReminder.isPending || dismissRenewalReminder.isPending;

  return (
    <>
      <PageHeader title="Reminders" />
      <div className={page.body}>
        {isPending && <LoadingState />}
        {error && <ErrorState error={error} />}

        {!isPending && !error && items.length === 0 && (
          <EmptyState
            icon="bell"
            title="Nothing due"
            description="Add road tax and insurance dates to a vehicle, or set a next service when you log one."
          />
        )}

        {[
          { label: 'Overdue', list: overdue },
          { label: 'Due soon', list: soon },
          { label: 'Later', list: later },
        ].map((group) =>
          group.list.length === 0 ? null : (
            <section key={group.label}>
              <h2 className={styles.groupLabel}>
                {group.label} <span className="num">{group.list.length}</span>
              </h2>
              <div className={styles.group}>
                {group.list.map((item) => (
                  <div key={item.key} className={styles.card}>
                    <button
                      type="button"
                      className={styles.cardMain}
                      onClick={() => navigate(`/vehicles/${item.vehicleId}`)}
                    >
                      <span className={`${styles.dot} ${styles[item.urgency]}`} />
                      <span className={styles.body}>
                        <span className={styles.title}>{item.title}</span>
                        <span className={styles.meta}>{item.vehicleName}</span>
                      </span>
                      <span className={`${styles.detail} ${styles[item.urgency]} num`}>
                        {item.detail}
                      </span>
                    </button>
                    <IconButton
                      icon="check"
                      label="Mark complete"
                      onClick={() => setSelected(item)}
                    />
                  </div>
                ))}
              </div>
            </section>
          ),
        )}
      </div>

      <Sheet
        open={selected !== null}
        title={
          selected?.kind === 'maintenance'
            ? 'Log this service now?'
            : `Update ${selected?.kind === 'road_tax' ? 'road tax' : 'insurance'} date now?`
        }
        hint={
          selected?.kind === 'maintenance'
            ? 'Choose "Log it now" to fill in today\'s visit, or mark it complete for now and log it manually later.'
            : 'Choose "Update now" to set the new expiry date, or mark it complete for now and update it manually later.'
        }
        onClose={() => setSelected(null)}
      >
        <div className={styles.sheetActions}>
          <button
            type="button"
            className={styles.sheetPrimary}
            onClick={handleRecordNow}
            disabled={dismissing}
          >
            {selected?.kind === 'maintenance' ? 'Log it now' : 'Update now'}
          </button>
          <button
            type="button"
            className={styles.sheetSecondary}
            onClick={() => void handleMarkComplete()}
            disabled={dismissing}
          >
            {dismissing ? 'Marking…' : 'No, just mark complete'}
          </button>
        </div>
      </Sheet>
    </>
  );
}
