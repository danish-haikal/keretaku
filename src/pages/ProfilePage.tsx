import { useHousehold } from '@/api/household';
import { useVehicles } from '@/api/vehicles';
import { PageHeader } from '@/components/layout/PageHeader';
import page from '@/components/layout/Page.module.css';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useAuth } from '@/hooks/useAuth';
import { useTheme, type ThemePreference } from '@/hooks/useTheme';
import styles from './ProfilePage.module.css';

const THEMES: { value: ThemePreference; label: string; icon: IconName }[] = [
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
  { value: 'system', label: 'System', icon: 'auto' },
];

export function ProfilePage() {
  const { user, signOut } = useAuth();
  const household = useHousehold();
  const vehicles = useVehicles();
  const { theme, setTheme } = useTheme();

  const count = vehicles.data?.length ?? 0;

  return (
    <>
      <PageHeader title="Profile" />
      <div className={page.body}>
        <div className={styles.head}>
          <div className={styles.avatar}>{(user?.email ?? '?').charAt(0).toUpperCase()}</div>
          <div>
            <div className={styles.name}>{household.data?.name ?? 'Your garage'}</div>
            <div className={styles.email}>{user?.email}</div>
            <div className={styles.email}>
              {count} {count === 1 ? 'vehicle' : 'vehicles'}
            </div>
          </div>
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Appearance</h2>
          <div className={styles.themes}>
            {THEMES.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={theme === option.value}
                className={`${styles.theme} ${theme === option.value ? styles.themeActive : ''}`}
                onClick={() => setTheme(option.value)}
              >
                <Icon name={option.icon} size={20} />
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Account</h2>
          <Button variant="outline" block onClick={() => void signOut()}>
            <Icon name="logout" size={16} />
            Sign out
          </Button>
        </section>

        <p className={styles.version}>KeretaKu v0.1</p>
      </div>
    </>
  );
}
