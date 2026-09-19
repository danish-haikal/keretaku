import { EmptyState } from '@/components/ui/EmptyState';
import { formatRM } from '@/lib/format';
import styles from './SpendingSummary.module.css';

interface SpendingSummaryProps {
  fuelTotal: number;
  chargingTotal: number;
  serviceTotal: number;
  renewalTotal: number;
  entryCount: number;
}

export function SpendingSummary({
  fuelTotal,
  chargingTotal,
  serviceTotal,
  renewalTotal,
  entryCount,
}: SpendingSummaryProps) {
  const total = fuelTotal + chargingTotal + serviceTotal + renewalTotal;

  if (entryCount === 0) {
    return (
      <EmptyState
        icon="wallet"
        title="No spending data"
        description="Log a fuel, charge, service or renewal record with a cost to track spending here."
      />
    );
  }

  const tiles = [
    fuelTotal > 0 ? { label: 'Fuel', value: formatRM(fuelTotal) } : null,
    chargingTotal > 0 ? { label: 'Charging', value: formatRM(chargingTotal) } : null,
    { label: 'Service', value: formatRM(serviceTotal) },
    renewalTotal > 0 ? { label: 'Renewals', value: formatRM(renewalTotal) } : null,
    { label: 'Entries logged', value: String(entryCount) },
  ].filter((t): t is { label: string; value: string } => t !== null);

  return (
    <>
      <div className={styles.hero}>
        <div className={styles.heroLabel}>Lifetime spend</div>
        <div className={`${styles.heroValue} num`}>{formatRM(total)}</div>
      </div>
      <div className={styles.grid}>
        {tiles.map((tile) => (
          <div key={tile.label} className={styles.tile}>
            <div className={styles.tileLabel}>{tile.label}</div>
            <div className={`${styles.tileValue} num`}>{tile.value}</div>
          </div>
        ))}
      </div>
    </>
  );
}
