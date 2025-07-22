import { h, render } from 'preact';
import { useEffect } from 'preact/compat';

// Components
import { Header } from './components/Header';
import { MainMenu } from './components/MainMenu';
import { StepIndicator } from './components/StepIndicator';
import { ImagePreview } from './components/ImagePreview';
import { ComparisonTabs } from './components/ComparisonTabs';
import { ComparisonView } from './components/ComparisonView';
import { LoadingSpinner } from './components/LoadingSpinner';
import { TabUrlSelector } from './components/TabUrlSelector';
import { ViewportSettings } from './components/ViewportSettings';

// Hooks
import { useVRT } from './hooks/useVRT';

function App() {
  const {
    // UI状態
    currentView,
    currentStep,
    activeTab,
    loading,
    loadingText,
    
    // データ
    beforeImage,
    afterImage,
    comparisonResult,
    settings,
    history,
    currentUrl,
    afterUrl,
    showTabSelector,
    useFullPageCapture,
    viewportWidth,
    
    // アクション
    initialize,
    navigateTo,
    updateCurrentUrl,
    captureScreenshot,
    setCaptureResult,
    captureFromUrl,
    setAfterUrl,
    getAllTabs,
    selectUrlFromTab,
    setShowTabSelector,
    setUseFullPageCapture,
    setViewportWidth,
    goToStep,
    compareImages,
    saveResult,
    saveSettings,
    loadHistory,
    startNewComparison,
    setActiveTab,
    openHistoryItemAsHtml
  } = useVRT();


  // 初期化
  useEffect(() => {
    initialize();
  }, [initialize]);

  // エラーハンドリング
  const handleError = (error: Error, context: string) => {
    console.error(`${context}:`, error);
    alert(`エラー: ${error.message}`);
  };

  // スクリーンショット撮影ハンドラー
  const handleCapture = async (type: 'before' | 'after') => {
    try {
      await captureScreenshot(type);
    } catch (error) {
      handleError(error as Error, `${type}スクリーンショット撮影`);
    }
  };

  // URL指定撮影ハンドラー
  const handleCaptureFromUrl = async () => {
    if (!afterUrl.trim()) {
      alert('URLを入力してください');
      return;
    }
    
    try {
      await captureFromUrl(afterUrl);
    } catch (error) {
      handleError(error as Error, 'URL指定スクリーンショット撮影');
    }
  };

  // 比較実行ハンドラー
  const handleCompare = async () => {
    try {
      await compareImages();
    } catch (error) {
      handleError(error as Error, '画像比較');
    }
  };

  // 保存ハンドラー
  const handleSave = async () => {
    try {
      await saveResult();
    } catch (error) {
      handleError(error as Error, '結果保存');
    }
  };

  // 設定保存ハンドラー
  const handleSettingsSave = async (newSettings: typeof settings) => {
    try {
      await saveSettings(newSettings);
    } catch (error) {
      handleError(error as Error, '設定保存');
    }
  };

  // メインメニューの表示
  const renderMainMenu = () => (
    <div className="view">
      <MainMenu onNavigate={navigateTo} />
    </div>
  );

  // 比較画面の表示
  const renderComparisonView = () => (
    <div className="view">
      <div className="header-with-back">
        <button className="back-btn" onClick={() => navigateTo('main-menu')}>
          ← 戻る
        </button>
        <h2>比較設定</h2>
      </div>
      
      <StepIndicator currentStep={currentStep} />

      {/* Step 1: Before */}
      {currentStep === 1 && (
        <div className="step-content">
          <div className="current-page-info">
            <div className="page-title">現在のページ:</div>
            <div className="page-url">{currentUrl || '読み込み中...'}</div>
          </div>
          
          <div className="instruction">
            <p>現在のページのスクリーンショットを撮影します</p>
          </div>

          <ViewportSettings
            viewportWidth={viewportWidth}
            onViewportWidthChange={setViewportWidth}
          />

          <div className="capture-options">
            <label className="checkbox-container">
              <input
                type="checkbox"
                checked={useFullPageCapture}
                onChange={(e) => setUseFullPageCapture(e.currentTarget.checked)}
              />
              <span className="checkmark"></span>
              ページ全体を撮影（フルページスクリーンショット）
            </label>
          </div>
          
          <div className="action-buttons">
            <button 
              className="btn primary"
              onClick={() => handleCapture('before')}
              disabled={loading}
            >
              📷 Beforeスクリーンショット
            </button>
          </div>
          
          <ImagePreview
            image={beforeImage}
            type="before"
            onRetake={() => handleCapture('before')}
            onNext={() => goToStep(2)}
          />
        </div>
      )}

      {/* Step 2: After */}
      {currentStep === 2 && (
        <div className="step-content">
          <div className="instruction">
            <p>比較対象のURLを指定してください</p>
            <p className="small-text">新しいタブで指定したURLを開いてスクリーンショットを撮影</p>
          </div>
          
          <div className="url-input-section">
            <label htmlFor="after-url">比較対象のURL:</label>
            <div className="url-input-group">
              <input
                type="url"
                id="after-url"
                placeholder="https://example.com"
                value={afterUrl}
                onChange={(e) => setAfterUrl(e.currentTarget.value)}
                className="url-input"
              />
              <button
                type="button"
                className="btn-small secondary"
                onClick={() => setShowTabSelector(true)}
              >
                タブから選択
              </button>
            </div>
          </div>
          
          <div className="action-buttons">
            <button 
              className="btn primary"
              onClick={handleCaptureFromUrl}
              disabled={loading || !afterUrl.trim()}
            >
              📷 Afterスクリーンショット
            </button>
          </div>
          
          <ImagePreview
            image={afterImage}
            type="after"
            onRetake={handleCaptureFromUrl}
            onNext={handleCompare}
          />
        </div>
      )}

      {/* Step 3: 比較結果 */}
      {currentStep === 3 && comparisonResult && (
        <div className="step-content">
          <div className="result-stats">
            <div className="stat">
              <div className="stat-label">差分率</div>
              <div className="stat-value">{comparisonResult.diffPercentage}%</div>
            </div>
            <div className="stat">
              <div className="stat-label">変更ピクセル数</div>
              <div className="stat-value">{comparisonResult.diffPixels.toLocaleString()}</div>
            </div>
          </div>
          
          <ComparisonTabs 
            activeTab={activeTab} 
            onTabChange={setActiveTab} 
          />
          
          <ComparisonView
            result={comparisonResult}
            beforeImage={beforeImage!}
            afterImage={afterImage!}
            activeTab={activeTab}
          />
          
          <div className="result-actions">
            <button className="btn primary" onClick={handleSave}>
              📁 結果を保存
            </button>
            <button className="btn secondary" onClick={startNewComparison}>
              新しい比較
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // 履歴画面の表示
  const renderHistoryView = () => (
    <div className="view">
      <div className="header-with-back">
        <button className="back-btn" onClick={() => navigateTo('main-menu')}>
          ← 戻る
        </button>
        <h2>比較履歴</h2>
      </div>
      
      <div className="history-list">
        {history.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <div className="empty-text">比較履歴がありません</div>
            <div className="empty-desc">まずは新しい比較を実行してください</div>
          </div>
        ) : (
          history.map((item) => (
            <div key={item.id} className="history-item">
              <div className="history-date">
                {new Date(item.timestamp).toLocaleString()}
              </div>
              <div className="history-urls">
                <div>Before: {item.beforeUrl ? item.beforeUrl.substring(0, 50) + '...' : 'Unknown URL'}</div>
                <div>After: {item.afterUrl ? item.afterUrl.substring(0, 50) + '...' : 'Unknown URL'}</div>
              </div>
              <div className="history-diff">
                差分: {item.diffPercentage}% ({item.diffPixels.toLocaleString()} pixels)
              </div>
              <div className="history-actions">
                <button 
                  className="btn small primary" 
                  onClick={() => openHistoryItemAsHtml(item)}
                >
                  📄 テストレポートを開く
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  // 設定画面の表示
  const renderSettingsView = () => (
    <div className="view">
      <div className="header-with-back">
        <button className="back-btn" onClick={() => navigateTo('main-menu')}>
          ← 戻る
        </button>
        <h2>設定</h2>
      </div>
      
      <div className="settings-form">
        <div className="settings-section">
          <h3>スクリーンショット設定</h3>
          
          <div className="setting-item">
            <label htmlFor="capture-delay">撮影遅延 (秒)</label>
            <input 
              type="number" 
              id="capture-delay" 
              min="0" 
              max="10" 
              step="0.1" 
              value={settings.captureDelay}
              onChange={(e) => {
                const newSettings = { ...settings, captureDelay: parseFloat(e.currentTarget.value) };
                saveSettings(newSettings);
              }}
            />
            <small>ページ読み込み後の待機時間</small>
          </div>
        </div>

        <div className="settings-actions">
          <button className="btn primary" onClick={() => handleSettingsSave(settings)}>
            設定を保存
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container">
      <Header />
      
      {currentView === 'main-menu' && renderMainMenu()}
      {currentView === 'comparison-view' && renderComparisonView()}
      {currentView === 'history-view' && renderHistoryView()}
      {currentView === 'settings-view' && renderSettingsView()}
      
      <LoadingSpinner show={loading} text={loadingText} />
      
      {showTabSelector && (
        <TabUrlSelector
          onSelect={selectUrlFromTab}
          onClose={() => setShowTabSelector(false)}
          getAllTabs={getAllTabs}
        />
      )}
    </div>
  );
}

// アプリケーションのマウント
const rootElement = document.getElementById('popup-root');
if (rootElement) {
  render(<App />, rootElement);
}