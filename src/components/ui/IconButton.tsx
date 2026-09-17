import type { ButtonHTMLAttributes } from 'react';
import { Icon, type IconName } from './Icon';
import styles from './IconButton.module.css';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  label: string;
  variant?: 'solid' | 'ghost' | 'onHero';
}

export function IconButton({ icon, label, variant = 'solid', ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      className={`${styles.iconButton} ${styles[variant]}`}
      aria-label={label}
      title={label}
      {...rest}
    >
      <Icon name={icon} size={18} />
    </button>
  );
}
