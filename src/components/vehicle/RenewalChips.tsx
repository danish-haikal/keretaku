import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/format';
import { daysUntil } from '@/lib/dates';
import { describeDays, urgencyFromDays } from '@/lib/reminders';
import type { Vehicle } from '@/types/database';
import styles from './RenewalChips.module.css';

interface RenewalChipsProps {
  vehicle: Vehicle;
  onEdit: (field: 'road_tax_expiry' | 'insurance_expiry') => void;
}

export function RenewalChips({ vehicle, onEdit }: RenewalChipsProps) {
  const chips = [
    { field: 'road_tax_expiry' as const, label: 'Road tax', value: vehicle.road_tax_expiry },
    { field: 'insurance_expiry' as const, label: 'Insurance', value: vehicle.insurance_expiry },
  ];

  return (
    <div className={styles.row}>
      {chips.map((chip) => {
        const days = daysUntil(chip.value);
        return (
          <button
            key={chip.field}
            type="button"
            className={styles.chip}
            onClick={() => onEdit(chip.field)}
          >
            <span className={styles.label}>{chip.label}</span>
            <span className={styles.value}>{formatDate(chip.value)}</span>
            {days == null ? (
              <Badge urgency="neutral">Tap to add</Badge>
            ) : (
              <Badge urgency={urgencyFromDays(days)}>{describeDays(days)}</Badge>
            )}
          </button>
        );
      })}
    </div>
  );
}
