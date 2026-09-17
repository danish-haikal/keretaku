import { Icon } from '@/components/ui/Icon';
import type { TabDef, VehicleTab } from './tabDefinitions';
import styles from './VehicleTabs.module.css';

interface VehicleTabsProps {
  tabs: TabDef[];
  active: VehicleTab;
  onChange: (tab: VehicleTab) => void;
}

export function VehicleTabs({ tabs, active, onChange }: VehicleTabsProps) {
  return (
    <div className={styles.tabs} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={tab.id === active}
          className={`${styles.tab} ${tab.id === active ? styles.active : ''}`}
          onClick={() => onChange(tab.id)}
        >
          <Icon name={tab.icon} size={18} />
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
