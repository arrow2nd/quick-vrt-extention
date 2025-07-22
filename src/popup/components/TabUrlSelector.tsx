import { h } from 'preact';
import { useState, useEffect } from 'preact/compat';

interface TabUrlSelectorProps {
  onSelect: (url: string) => void;
  onClose: () => void;
  getAllTabs: () => Promise<chrome.tabs.Tab[]>;
}

export function TabUrlSelector({ onSelect, onClose, getAllTabs }: TabUrlSelectorProps) {
  const [tabs, setTabs] = useState<chrome.tabs.Tab[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTabs();
  }, []);

  const loadTabs = async () => {
    setLoading(true);
    try {
      const tabList = await getAllTabs();
      setTabs(tabList);
    } catch (error) {
      console.error('タブ読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabSelect = (url: string) => {
    onSelect(url);
  };

  const truncateUrl = (url: string, maxLength: number = 60): string => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  };

  return (
    <div className="tab-url-selector-overlay">
      <div className="tab-url-selector">
        <div className="tab-url-selector-header">
          <h3>タブからURLを選択</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        {loading ? (
          <div className="loading-state">読み込み中...</div>
        ) : (
          <div className="tab-url-list">
            {tabs.length === 0 ? (
              <div className="empty-state">選択可能なタブがありません</div>
            ) : (
              tabs.map((tab) => (
                <div
                  key={tab.id}
                  className="tab-url-item"
                  onClick={() => tab.url && handleTabSelect(tab.url)}
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
                    <div className="tab-url">{truncateUrl(tab.url || '')}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}