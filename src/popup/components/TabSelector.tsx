import { h } from 'preact';
import { useState, useEffect } from 'preact/compat';
import { ChromeAPI } from '../../shared/chrome-api';

interface TabSelectorProps {
  onTabSelect: (tabId: number) => void;
  selectedTabId?: number;
  excludeCurrentTab?: boolean;
}

export function TabSelector({ onTabSelect, selectedTabId, excludeCurrentTab = false }: TabSelectorProps) {
  const [tabs, setTabs] = useState<chrome.tabs.Tab[]>([]);
  const [currentTabId, setCurrentTabId] = useState<number | null>(null);

  useEffect(() => {
    loadTabs();
  }, []);

  const loadTabs = async () => {
    try {
      // 現在のタブ情報を取得
      const currentTab = await ChromeAPI.getCurrentTab();
      setCurrentTabId(currentTab.id || null);

      // すべてのタブを取得
      const allTabs = await chrome.tabs.query({});
      
      // 拡張機能自身のタブを除外
      const extensionUrl = chrome.runtime.getURL('');
      const filteredTabs = allTabs.filter(tab => {
        // 拡張機能のタブを除外
        if (tab.url?.startsWith(extensionUrl)) return false;
        
        // 現在のタブを除外するオプション
        if (excludeCurrentTab && tab.id === currentTabId) return false;
        
        // chrome:// や edge:// などのシステムページを除外
        if (tab.url?.startsWith('chrome://') || 
            tab.url?.startsWith('edge://') ||
            tab.url?.startsWith('about:')) {
          return false;
        }
        
        return true;
      });

      setTabs(filteredTabs);
    } catch (error) {
      console.error('タブ読み込みエラー:', error);
    }
  };

  const handleTabClick = (tabId: number) => {
    onTabSelect(tabId);
  };

  const truncateUrl = (url: string | undefined, maxLength: number = 40): string => {
    if (!url) return '';
    
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      const path = urlObj.pathname;
      
      if (domain.length + path.length <= maxLength) {
        return domain + path;
      }
      
      return domain + path.substring(0, maxLength - domain.length - 3) + '...';
    } catch {
      return url.length > maxLength ? url.substring(0, maxLength) + '...' : url;
    }
  };

  if (tabs.length === 0) {
    return (
      <div className="tab-selector-empty">
        <p>選択可能なタブがありません</p>
      </div>
    );
  }

  return (
    <div className="tab-selector">
      <div className="tab-selector-header">
        <h3>📋 タブを選択</h3>
        <button 
          className="btn-small secondary" 
          onClick={loadTabs}
        >
          更新
        </button>
      </div>
      
      <div className="tab-list">
        {tabs.map(tab => (
          <div
            key={tab.id}
            className={`tab-item ${selectedTabId === tab.id ? 'selected' : ''}`}
            onClick={() => tab.id && handleTabClick(tab.id)}
          >
            <div className="tab-favicon">
              {tab.favIconUrl ? (
                <img src={tab.favIconUrl} alt="" />
              ) : (
                <span className="tab-favicon-placeholder">🌐</span>
              )}
            </div>
            <div className="tab-info">
              <div className="tab-title">{tab.title || '無題'}</div>
              <div className="tab-url">{truncateUrl(tab.url)}</div>
            </div>
            {tab.id === currentTabId && (
              <div className="tab-current-badge">現在</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}