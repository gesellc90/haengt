import { House, CirclePlus, List, BookOpen } from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import type { ComponentType } from 'react';

export type TabId = 'stube' | 'strich' | 'liste' | 'buch';

interface TabBarProps {
  active: TabId;
  onChange: (tab: TabId) => void;
}

const ICON_MAP: Record<string, ComponentType<LucideProps>> = {
  house: House,
  'plus-circle': CirclePlus,
  list: List,
  'book-open': BookOpen,
};

const TABS: { id: TabId; label: string; lucideIcon: string }[] = [
  { id: 'stube', label: 'Stube', lucideIcon: 'house' },
  { id: 'strich', label: 'Strich', lucideIcon: 'plus-circle' },
  { id: 'liste', label: 'Liste', lucideIcon: 'list' },
  { id: 'buch', label: 'Buch', lucideIcon: 'book-open' },
];

export default function TabBar({ active, onChange }: TabBarProps) {
  return (
    <div
      style={{
        background: 'var(--eiche)',
        borderRadius: 14,
        padding: '6px 10px',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
        border: '1px solid #3d2616',
        height: 64,
      }}
    >
      {TABS.map((tab) => {
        const Icon = ICON_MAP[tab.lucideIcon];
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            aria-label={tab.label}
            aria-current={isActive ? 'page' : undefined}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              padding: 4,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: isActive ? 'var(--messing)' : 'rgba(251, 247, 238, 0.55)',
              transition: 'color 200ms',
            }}
          >
            {Icon && <Icon size={22} strokeWidth={1.5} color="currentColor" />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
