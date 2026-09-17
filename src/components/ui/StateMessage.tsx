import styles from './StateMessage.module.css';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className={styles.state} role="status">
      <span className={styles.spinner} />
      {label}
    </div>
  );
}

export function ErrorState({ error }: { error: unknown }) {
  const message =
    error instanceof Error ? error.message : 'Something went wrong. Please try again.';
  return (
    <div className={`${styles.state} ${styles.error}`} role="alert">
      {message}
    </div>
  );
}
