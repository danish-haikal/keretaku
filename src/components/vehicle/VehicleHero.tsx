import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { bodyIcon } from '@/components/ui/iconMap';
import { IconButton } from '@/components/ui/IconButton';
import { formatKm, vehicleSubtitle, vehicleTitle } from '@/lib/format';
import type { Vehicle } from '@/types/database';
import styles from './VehicleHero.module.css';

interface VehicleHeroProps {
  vehicle: Vehicle;
  onUpdateOdometer: () => void;
}

export function VehicleHero({ vehicle, onUpdateOdometer }: VehicleHeroProps) {
  const navigate = useNavigate();
  const isElectric = vehicle.fuel_type === 'electric';

  return (
    <header className={`${styles.hero} ${isElectric ? styles.electric : styles.petrol}`}>
      <div className={styles.topRow}>
        <IconButton
          icon="chevron-left"
          label="Back to garage"
          variant="onHero"
          onClick={() => navigate('/garage')}
        />
        <IconButton
          icon="edit"
          label="Edit vehicle"
          variant="onHero"
          onClick={() => navigate(`/vehicles/${vehicle.id}/edit`)}
        />
      </div>

      <Icon name={bodyIcon(vehicle.body_type)} size={96} className={styles.watermark} />

      <div className={styles.info}>
        <div className={styles.names}>
          <h1 className={styles.name}>{vehicleTitle(vehicle)}</h1>
          <p className={styles.sub}>{vehicleSubtitle(vehicle)}</p>
        </div>
        <button type="button" className={styles.odometer} onClick={onUpdateOdometer}>
          <span className={`${styles.odoValue} num`}>{formatKm(vehicle.odometer_km)}</span>
          <span className={styles.odoLabel}>Update km</span>
        </button>
      </div>
    </header>
  );
}
