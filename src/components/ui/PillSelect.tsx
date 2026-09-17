import styles from './PillSelect.module.css';

interface PillSelectProps<T extends string> {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
}

export function PillSelect<T extends string>({
  options,
  value,
  onChange,
  label,
}: PillSelectProps<T>) {
  return (
    <div className={styles.group} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === value}
          className={`${styles.pill} ${option === value ? styles.selected : ''}`}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

interface QuickPillsProps {
  options: { label: string; onClick: () => void }[];
}

/** Dashed "quick add" chips, e.g. +5,000 km or +6 months. */
export function QuickPills({ options }: QuickPillsProps) {
  return (
    <div className={styles.group}>
      {options.map((o) => (
        <button key={o.label} type="button" className={styles.quick} onClick={o.onClick}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
