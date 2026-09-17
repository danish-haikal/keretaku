import { useEffect, type ReactNode } from 'react';
import styles from './Sheet.module.css';

interface SheetProps {
  open: boolean;
  title: string;
  hint?: string;
  onClose: () => void;
  children: ReactNode;
}

/** Bottom sheet used for quick actions (update odometer, renewal dates). */
export function Sheet({ open, title, hint, onClose, children }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={styles.scrim}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.card} role="dialog" aria-modal="true" aria-label={title}>
        <div className={styles.handle} />
        <h3 className={styles.title}>{title}</h3>
        {hint && <p className={styles.hint}>{hint}</p>}
        {children}
      </div>
    </div>
  );
}
