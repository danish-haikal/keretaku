import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconButton } from '@/components/ui/IconButton';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
  title: string;
  /** Show a back arrow; defaults to browser back, or a specific route. */
  backTo?: string | number;
  actions?: ReactNode;
}

export function PageHeader({ title, backTo, actions }: PageHeaderProps) {
  const navigate = useNavigate();
  return (
    <header className={styles.header}>
      {backTo !== undefined && (
        <IconButton
          icon="chevron-left"
          label="Back"
          variant="ghost"
          onClick={() => (typeof backTo === 'string' ? navigate(backTo) : navigate(-1))}
        />
      )}
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.actions}>{actions}</div>
    </header>
  );
}
