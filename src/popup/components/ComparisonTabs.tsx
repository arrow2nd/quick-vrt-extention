import { h } from 'preact';
import clsx from 'clsx';
import type { ComparisonTab } from '../../shared/types';

interface ComparisonTabsProps {
  activeTab: ComparisonTab;
  onTabChange: (tab: ComparisonTab) => void;
}

export function ComparisonTabs({ activeTab, onTabChange }: ComparisonTabsProps) {
  const tabs = [
    { id: 'side-by-side' as const, label: '並列表示' },
    { id: 'slider' as const, label: 'スライダー' },
    { id: 'diff-only' as const, label: '差分のみ' }
  ];

  return (
    <div className="comparison-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={clsx('tab-btn', { active: activeTab === tab.id })}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}