import { NavLink, Outlet } from 'react-router-dom';
import { Icon, type IconName } from '@/components/ui/Icon';
import styles from './AppLayout.module.css';

const TABS: { to: string; label: string; icon: IconName }[] = [
  { to: '/garage', label: 'Garage', icon: 'garage' },
  { to: '/reminders', label: 'Reminders', icon: 'bell' },
  { to: '/profile', label: 'Profile', icon: 'user' },
];

/** Shell for the three main tabs: scrolling content + bottom navigation. */
export function AppLayout() {
  return (
    <div className={styles.shell}>
      <main className={styles.content}>
        <Outlet />
      </main>
      <nav className={styles.nav} aria-label="Main">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}
          >
            <Icon name={tab.icon} size={22} />
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
