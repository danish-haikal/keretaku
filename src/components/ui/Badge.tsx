import type { Urgency } from '@/lib/reminders';
import styles from './Badge.module.css';

interface BadgeProps {
  urgency: Urgency | 'neutral';
  children: React.ReactNode;
}

export function Badge({ urgency, children }: BadgeProps) {
  return <span className={`${styles.badge} ${styles[urgency]}`}>{children}</span>;
}
