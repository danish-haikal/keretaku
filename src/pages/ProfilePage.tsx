import { useState } from 'react';
import { useHousehold, useUpdateHousehold } from '@/api/household';
import { useVehicles } from '@/api/vehicles';
import { PageHeader } from '@/components/layout/PageHeader';
import page from '@/components/layout/Page.module.css';
import { Button } from '@/components/ui/Button';
import { Field, TextInput } from '@/components/ui/Field';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Sheet';
import { useAuth } from '@/hooks/useAuth';
import { useTheme, type ThemePreference } from '@/hooks/useTheme';
import { useToast } from '@/hooks/useToast';
import styles from './ProfilePage.module.css';

const THEMES: { value: ThemePreference; label: string; icon: IconName }[] = [
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
  { value: 'system', label: 'System', icon: 'auto' },
];

export function ProfilePage() {
  const { user, signOut } = useAuth();
  const household = useHousehold();
  const updateHousehold = useUpdateHousehold();
  const vehicles = useVehicles();
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();

  const [nameSheetOpen, setNameSheetOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  const count = vehicles.data?.length ?? 0;

  async function saveName() {
    const trimmed = nameDraft.trim();
    if (!trimmed) return;
    await updateHousehold.mutateAsync(trimmed);
    setNameSheetOpen(false);
    showToast('Garage name updated');
  }

  return (
    <>
      <PageHeader title="Profile" />
      <div className={page.body}>
        <div className={styles.head}>
          <div className={styles.avatar}>{(user?.email ?? '?').charAt(0).toUpperCase()}</div>
          <div>
            <button
              type="button"
              className={styles.nameButton}
              onClick={() => {
                setNameDraft(household.data?.name ?? '');
                setNameSheetOpen(true);
              }}
            >
              <span className={styles.name}>{household.data?.name ?? 'Your garage'}</span>
              <Icon name="edit" size={13} />
            </button>
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

      <Sheet
        open={nameSheetOpen}
        title="Rename garage"
        hint="This is just a label for your household — it doesn't have to be your name."
        onClose={() => setNameSheetOpen(false)}
      >
        <Field label="Garage name">
          {(id) => (
            <TextInput
              id={id}
              autoFocus
              maxLength={80}
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
            />
          )}
        </Field>
        <Button
          block
          onClick={() => void saveName()}
          disabled={updateHousehold.isPending || !nameDraft.trim()}
        >
          Save
        </Button>
      </Sheet>
    </>
  );
}