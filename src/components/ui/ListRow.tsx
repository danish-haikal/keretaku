import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import styles from './ListRow.module.css';

interface ListRowProps {
  icon: IconName;
  iconTone?: 'primary' | 'secondary';
  title: ReactNode;
  meta?: ReactNode;
  footer?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  chevron?: boolean;
}

export function ListRow({
  icon,
  iconTone = 'primary',
  title,
  meta,
  footer,
  trailing,
  onClick,
  chevron = false,
}: ListRowProps) {
  const content = (
    <>
      <span className={`${styles.iconWrap} ${styles[iconTone]}`}>
        <Icon name={icon} size={20} />
      </span>
      <span className={styles.body}>
        <span className={styles.title}>{title}</span>
        {meta && <span className={styles.meta}>{meta}</span>}
        {footer}
      </span>
      {trailing && <span className={styles.trailing}>{trailing}</span>}
      {chevron && <Icon name="chevron-right" size={18} className={styles.chevron} />}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={`${styles.row} ${styles.clickable}`} onClick={onClick}>
        {content}
      </button>
    );
  }
  return <div className={styles.row}>{content}</div>;
}
