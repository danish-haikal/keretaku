import type { ReactNode } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import page from '@/components/layout/Page.module.css';
import { Icon, type IconName } from '@/components/ui/Icon';
import { vehicleTitle } from '@/lib/format';
import type { Vehicle } from '@/types/database';
import styles from './LogFormLayout.module.css';

interface LogFormLayoutProps {
  title: string;
  vehicle: Vehicle;
  icon: IconName;
  tone?: 'primary' | 'secondary';
  onSubmit: (event: React.FormEvent) => void;
  children: ReactNode;
  headerActions?: ReactNode;
}

/** Shared chrome for the three log forms: header, vehicle card, form body. */
export function LogFormLayout({
  title,
  vehicle,
  icon,
  tone = 'primary',
  onSubmit,
  children,
  headerActions,
}: LogFormLayoutProps) {
  return (
    <div className={styles.page}>
      <PageHeader title={title} backTo={`/vehicles/${vehicle.id}`} actions={headerActions} />
      <form className={page.body} onSubmit={onSubmit}>
        <div className={styles.vehicleCard}>
          <span className={`${styles.icon} ${styles[tone]}`}>
            <Icon name={icon} size={20} />
          </span>
          <div>
            <div className={styles.vehicleName}>{vehicleTitle(vehicle)}</div>
            <div className={styles.vehiclePlate}>{vehicle.plate_number ?? 'No plate set'}</div>
          </div>
        </div>
        {children}
      </form>
    </div>
  );
}