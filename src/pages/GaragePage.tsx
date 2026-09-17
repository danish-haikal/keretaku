import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHousehold } from '@/api/household';
import { useVehicles } from '@/api/vehicles';
import { PageHeader } from '@/components/layout/PageHeader';
import page from '@/components/layout/Page.module.css';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { bodyIcon } from '@/components/ui/iconMap';
import { ListRow } from '@/components/ui/ListRow';
import { Sheet } from '@/components/ui/Sheet';
import { ErrorState, LoadingState } from '@/components/ui/StateMessage';
import { formatKm, vehicleSubtitle, vehicleTitle } from '@/lib/format';
import styles from './GaragePage.module.css';

export function GaragePage() {
  const navigate = useNavigate();
  const household = useHousehold();
  const { data: vehicles, isPending, error } = useVehicles();
  const [quickLogOpen, setQuickLogOpen] = useState(false);

  const title = household.data?.name ?? 'Garage';

  return (
    <>
      <PageHeader title={title} />
      <div className={page.body}>
        {isPending && <LoadingState />}
        {error && <ErrorState error={error} />}

        {vehicles && vehicles.length === 0 && (
          <EmptyState
            icon="garage"
            title="No vehicles yet"
            description="Add your first car, and its service history lives here instead of in WhatsApp."
            action={<Button onClick={() => navigate('/vehicles/new')}>Add vehicle</Button>}
          />
        )}

        {vehicles && vehicles.length > 0 && (
          <>
            <div className={page.list}>
              {vehicles.map((v) => (
                <ListRow
                  key={v.id}
                  icon={bodyIcon(v.body_type)}
                  title={vehicleTitle(v)}
                  meta={
                    <>
                      {vehicleSubtitle(v)}
                      {vehicleSubtitle(v) && ' · '}
                      <span className="num">{formatKm(v.odometer_km)}</span>
                    </>
                  }
                  onClick={() => navigate(`/vehicles/${v.id}`)}
                  chevron
                />
              ))}
            </div>
            <p className={styles.nudge}>Keep your mileage updated for accurate reminders</p>
          </>
        )}
      </div>

      <div className={styles.fabWrap}>
        <button
          type="button"
          className={styles.fab}
          aria-label="Add"
          onClick={() => setQuickLogOpen(true)}
        >
          <Icon name="plus" size={24} />
        </button>
      </div>

      <Sheet
        open={quickLogOpen}
        title="What would you like to do?"
        onClose={() => setQuickLogOpen(false)}
      >
        <div className={page.list}>
          {(vehicles ?? []).map((v) => (
            <ListRow
              key={v.id}
              icon={v.fuel_type === 'electric' ? 'bolt' : 'fuel'}
              iconTone={v.fuel_type === 'electric' ? 'secondary' : 'primary'}
              title={`Log ${v.fuel_type === 'electric' ? 'charge' : 'fuel'} — ${vehicleTitle(v)}`}
              meta={v.plate_number ?? undefined}
              onClick={() => {
                setQuickLogOpen(false);
                navigate(
                  `/vehicles/${v.id}/log/${v.fuel_type === 'electric' ? 'charging' : 'fuel'}`,
                );
              }}
            />
          ))}
          <ListRow
            icon="garage"
            title="Add vehicle"
            meta="Register another car or motorcycle"
            onClick={() => {
              setQuickLogOpen(false);
              navigate('/vehicles/new');
            }}
          />
        </div>
      </Sheet>
    </>
  );
}
