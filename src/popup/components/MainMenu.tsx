import { h } from 'preact';
import type { ViewType } from '../../shared/types';

interface MainMenuProps {
  onNavigate: (view: ViewType) => void;
}

export function MainMenu({ onNavigate }: MainMenuProps) {
  const menuItems = [
    {
      action: 'new-comparison' as const,
      icon: '📸',
      title: '新しい比較',
      description: 'Before/After画像を撮影して比較'
    },
    {
      action: 'history' as const,
      icon: '📊',
      title: '履歴を確認',
      description: '過去の比較結果を表示'
    },
    {
      action: 'settings' as const,
      icon: '⚙️',
      title: '設定',
      description: '撮影オプション等の設定'
    }
  ];

  const handleMenuClick = async (action: string) => {
    switch (action) {
      case 'new-comparison':
        onNavigate('comparison-view');
        break;
      case 'history':
        onNavigate('history-view');
        break;
      case 'settings':
        onNavigate('settings-view');
        break;
    }
  };

  return (
    <div className="main-menu">
      {menuItems.map((item) => (
        <div
          key={item.action}
          className="menu-item"
          onClick={() => handleMenuClick(item.action)}
        >
          <div className="menu-icon">{item.icon}</div>
          <div>
            <div className="menu-title">{item.title}</div>
            <div className="menu-desc">{item.description}</div>
          </div>
        </div>
      ))}
    </div>
  );
}