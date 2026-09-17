import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMaintenanceReminders } from '@/api/reminders';
import { useVehicles } from '@/api/vehicles';
import { PageHeader } from '@/components/layout/PageHeader';
import page from '@/components/layout/Page.module.css';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState, LoadingState } from '@/components/ui/StateMessage';
import { buildReminderList } from '@/lib/reminders';
import styles from './RemindersPage.module.css';

export function RemindersPage() {
  const navigate = useNavigate();
  const vehicles = useVehicles();
  const reminders = useMaintenanceReminders();

  const items = useMemo(
    () => buildReminderList(vehicles.data ?? [], reminders.data ?? []),
    [vehicles.data, reminders.data],
  );

  const isPending = vehicles.isPending || reminders.isPending;
  const error = vehicles.error ?? reminders.error;

  const overdue = items.filter((i) => i.urgency === 'overdue');
  const soon = items.filter((i) => i.urgency === 'soon');
  const later = items.filter((i) => i.urgency === 'ok');

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
                  <button
                    key={item.key}
                    type="button"
                    className={styles.card}
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
                ))}
              </div>
            </section>
          ),
        )}
      </div>
    </>
  );
}
