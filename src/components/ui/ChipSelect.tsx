import { Icon, type IconName } from './Icon';
import styles from './ChipSelect.module.css';

export interface ChipOption<T extends string> {
  value: T;
  label: string;
  icon: IconName;
}

interface ChipSelectProps<T extends string> {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}

/** Icon + label chips, used for body type and fuel type. */
export function ChipSelect<T extends string>({
  options,
  value,
  onChange,
  label,
}: ChipSelectProps<T>) {
  return (
    <div className={styles.group} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          className={`${styles.chip} ${option.value === value ? styles.selected : ''}`}
          onClick={() => onChange(option.value)}
        >
          <Icon name={option.icon} size={24} />
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}
