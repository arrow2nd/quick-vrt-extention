import { useState, useCallback, useEffect } from 'preact/compat';
import { ChromeAPI } from '../../shared/chrome-api';
import { ImageUtils } from '../../shared/image-utils';
import type { 
  CaptureResult, 
  ComparisonResult, 
  VRTSettings, 
  HistoryItem,
  ViewType,
  ComparisonTab,
  StepNumber 
} from '../../shared/types';

export function useVRT() {
  // UI状態
  const [currentView, setCurrentView] = useState<ViewType>('main-menu');
  const [currentStep, setCurrentStep] = useState<StepNumber>(1);
  const [activeTab, setActiveTab] = useState<ComparisonTab>('side-by-side');
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('処理中...');

  // データ状態
  const [beforeImage, setBeforeImage] = useState<CaptureResult | null>(null);
  const [afterImage, setAfterImage] = useState<CaptureResult | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [settings, setSettings] = useState<VRTSettings>({
    captureDelay: 1,
    imageQuality: 'medium',
    autoScroll: false,
    diffThreshold: 0.1,
    diffColor: '#ff0000'
  });
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [afterUrl, setAfterUrl] = useState<string>('');
  const [showTabSelector, setShowTabSelector] = useState(false);
  const [useFullPageCapture, setUseFullPageCapture] = useState(true);
  const [shouldAutoCompare, setShouldAutoCompare] = useState(false);
  const [viewportWidth, setViewportWidth] = useState<number | null>(null); // null = デバイスデフォルト

  // 比較実行
  const compareImages = useCallback(async () => {
    console.log('比較実行開始 - beforeImage:', !!beforeImage, 'afterImage:', !!afterImage);
    
    if (!beforeImage || !afterImage) {
      console.error('画像が不足しています:', { beforeImage: !!beforeImage, afterImage: !!afterImage });
      throw new Error('Before/After画像が不足しています');
    }

    setLoading(true);
    setLoadingText('画像を比較中...');

    try {
      const result = await ImageUtils.compareImagesAdvanced(beforeImage, afterImage, {
        threshold: settings.diffThreshold,
        diffColor: settings.diffColor,
        includeAA: false,
        alpha: 0.1
      });

      setComparisonResult(result);

      // 履歴に保存（基本情報のみ）
      await ChromeAPI.saveToHistory({
        timestamp: result.timestamp,
        beforeUrl: result.beforeUrl,
        afterUrl: result.afterUrl,
        diffPercentage: result.diffPercentage,
        diffPixels: result.diffPixels,
        beforeImageData: beforeImage.dataUrl,
        afterImageData: afterImage.dataUrl,
        diffImageUrl: result.diffImageUrl
      });

      // 結果を別タブで開く
      try {
        // HTMLレポートを生成
        const reportHtml = ImageUtils.generateReportHtml(result, beforeImage, afterImage);
        // data:URLで即座表示（CSPの制約なしでJSが動作）
        const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(reportHtml);
        
        // 新しいタブでレポートを開く
        await chrome.tabs.create({
          url: dataUrl,
          active: true
        });
        
        // ポップアップを閉じる
        window.close();
        
      } catch (tabError) {
        console.error('結果タブ作成エラー:', tabError);
      }

      return result;
    } catch (error) {
      console.error('画像比較エラー:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [beforeImage, afterImage, settings]);

  // 自動比較の実行
  useEffect(() => {
    if (shouldAutoCompare && beforeImage && afterImage && !loading) {
      console.log('自動比較を実行します');
      setShouldAutoCompare(false); // フラグをリセット
      compareImages().catch(error => {
        console.error('自動比較エラー:', error);
      });
    }
  }, [shouldAutoCompare, beforeImage, afterImage, loading, compareImages]);

  // 初期化
  const initialize = useCallback(async () => {
    try {
      const [loadedSettings, loadedHistory, tabInfo] = await Promise.all([
        ChromeAPI.loadSettings(),
        ChromeAPI.loadHistory(),
        ChromeAPI.getCurrentTab()
      ]);
      
      setSettings(loadedSettings);
      setHistory(loadedHistory);
      setCurrentUrl(tabInfo.url || '');
    } catch (error) {
      console.error('初期化エラー:', error);
    }
  }, []);

  // ナビゲーション
  const navigateTo = useCallback((view: ViewType) => {
    setCurrentView(view);
    
    if (view === 'comparison-view') {
      setCurrentStep(1);
      setBeforeImage(null);
      setAfterImage(null);
      setComparisonResult(null);
      setActiveTab('side-by-side');
      updateCurrentUrl();
    } else if (view === 'history-view') {
      loadHistory();
    }
  }, []);

  // 現在のURLを更新
  const updateCurrentUrl = useCallback(async () => {
    try {
      const tabInfo = await ChromeAPI.getCurrentTab();
      setCurrentUrl(tabInfo.url || '');
    } catch (error) {
      console.error('URL取得エラー:', error);
    }
  }, []);

  // スクリーンショット撮影
  const captureScreenshot = useCallback(async (type: 'before' | 'after') => {
    setLoading(true);
    setLoadingText(`${type}スクリーンショットを撮影中...`);

    try {
      // 撮影遅延
      if (settings.captureDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, settings.captureDelay * 1000));
      }

      let result;
      if (useFullPageCapture) {
        try {
          setLoadingText(`${type}フルページスクリーンショットを準備中...`);
          
          // プログレス表示のためのコールバック
          const updateProgress = (current: number, total: number) => {
            setLoadingText(`${type}フルページスクリーンショット撮影中... (${current}/${total})`);
          };
          
          result = await ChromeAPI.captureFullPageWithViewportResize(undefined, {
            imageQuality: settings.imageQuality,
            disableAnimations: true,
            triggerLazyLoading: true,
            progressCallback: updateProgress,
            viewportWidth: viewportWidth // ビューポート幅を渡す
          });
        } catch (fullPageError) {
          console.warn('フルページスクリーンショット失敗、通常のスクリーンショットで代替:', fullPageError);
          setLoadingText(`${type}スクリーンショットを撮影中...`);
          result = await ChromeAPI.captureScreenshot({
            imageQuality: settings.imageQuality,
            autoScroll: settings.autoScroll
          });
        }
      } else {
        result = await ChromeAPI.captureScreenshot({
          imageQuality: settings.imageQuality,
          autoScroll: settings.autoScroll
        });
      }

      if (type === 'before') {
        setBeforeImage(result);
        // Beforeスクリーンショット撮影後、自動的にステップ2に遷移
        setCurrentStep(2);
      } else {
        setAfterImage(result);
        // Afterスクリーンショット撮影後、自動比較フラグを設定
        setShouldAutoCompare(true);
        // ステップ3（比較結果表示）に遷移
        setCurrentStep(3);
      }

      return result;
    } catch (error) {
      console.error(`${type}スクリーンショット撮影エラー:`, error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [settings, useFullPageCapture]);

  // タブからのキャプチャ結果を設定
  const setCaptureResult = useCallback((type: 'before' | 'after', result: CaptureResult) => {
    if (type === 'before') {
      setBeforeImage(result);
    } else {
      setAfterImage(result);
    }
  }, []);

  // URL指定でAfterスクリーンショット撮影（同一タブ遷移方式）
  const captureFromUrl = useCallback(async (url: string) => {
    setLoading(true);
    setLoadingText('指定URLに移動しています...');

    try {
      // 現在のタブを取得
      const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!currentTab || !currentTab.id) {
        throw new Error('現在のタブが見つかりません');
      }

      // 現在のタブで指定URLに移動
      await chrome.tabs.update(currentTab.id, { url: url });

      // ページの読み込みを待つ（タイムアウト付き）
      setLoadingText('ページの読み込みを待っています...');
      await new Promise((resolve) => {
        let checkCount = 0;
        const maxChecks = 30; // 15秒でタイムアウト (500ms × 30回)
        
        const checkTabStatus = () => {
          checkCount++;
          
          if (checkCount >= maxChecks) {
            console.warn('ページ読み込みタイムアウト、強制的に撮影を続行します');
            resolve(null);
            return;
          }
          
          chrome.tabs.get(currentTab.id!, (tab) => {
            if (chrome.runtime.lastError) {
              console.warn('タブ取得エラー:', chrome.runtime.lastError.message);
              resolve(null);
              return;
            }
            
            // 読み込みが完了している場合（URLチェックを緩める）
            if (tab.status === 'complete') {
              resolve(tab);
            } else {
              setTimeout(checkTabStatus, 500);
            }
          });
        };
        
        // 少し待ってからチェック開始
        setTimeout(checkTabStatus, 1000);
      });

      // 撮影遅延
      if (settings.captureDelay > 0) {
        setLoadingText('撮影準備中...');
        await new Promise(resolve => setTimeout(resolve, settings.captureDelay * 1000));
      }

      // スクリーンショット撮影
      let result;
      if (useFullPageCapture) {
        try {
          setLoadingText('Afterフルページスクリーンショットを準備中...');
          
          // プログレス表示のためのコールバック
          const updateProgress = (current: number, total: number) => {
            setLoadingText(`Afterフルページスクリーンショット撮影中... (${current}/${total})`);
          };
          
          result = await ChromeAPI.captureFullPageWithViewportResize(undefined, {
            imageQuality: settings.imageQuality,
            disableAnimations: true,
            triggerLazyLoading: true,
            progressCallback: updateProgress,
            viewportWidth: viewportWidth // ビューポート幅を渡す
          });
        } catch (fullPageError) {
          console.warn('フルページスクリーンショット失敗、通常のスクリーンショットで代替:', fullPageError);
          setLoadingText('Afterスクリーンショットを撮影中...');
          result = await ChromeAPI.captureScreenshot({
            imageQuality: settings.imageQuality,
            autoScroll: settings.autoScroll
          });
        }
      } else {
        setLoadingText('Afterスクリーンショットを撮影中...');
        result = await ChromeAPI.captureScreenshot({
          imageQuality: settings.imageQuality,
          autoScroll: settings.autoScroll
        });
      }

      setAfterImage(result);
      
      // 撮影後、現在のURLを更新
      setCurrentUrl(url);
      
      // Afterスクリーンショット撮影後、自動比較フラグを設定
      setShouldAutoCompare(true);
      // ステップ3（比較結果表示）に遷移
      setCurrentStep(3);
      
      return result;
    } catch (error) {
      console.error('URL指定スクリーンショット撮影エラー:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [settings]);

  // ステップ進行
  const goToStep = useCallback((step: StepNumber) => {
    setCurrentStep(step);
    if (step === 2) {
      updateCurrentUrl();
    }
  }, [updateCurrentUrl]);

  // 結果保存
  const saveResult = useCallback(async () => {
    if (!comparisonResult || !beforeImage || !afterImage) return;

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportHtml = ImageUtils.generateReportHtml(comparisonResult, beforeImage, afterImage);
      const blob = new Blob([reportHtml], { type: 'text/html' });
      
      await ChromeAPI.downloadFile(blob, `vrt-report-${timestamp}.html`);
      await ChromeAPI.showNotification('Quick VRT', 'レポートを保存しました');
    } catch (error) {
      console.error('保存エラー:', error);
      throw error;
    }
  }, [comparisonResult, beforeImage, afterImage]);

  // 設定保存
  const saveSettings = useCallback(async (newSettings: VRTSettings) => {
    try {
      await ChromeAPI.saveSettings(newSettings);
      setSettings(newSettings);
      await ChromeAPI.showNotification('Quick VRT', '設定を保存しました');
    } catch (error) {
      console.error('設定保存エラー:', error);
      throw error;
    }
  }, []);

  // 履歴読み込み
  const loadHistory = useCallback(async () => {
    try {
      const loadedHistory = await ChromeAPI.loadHistory();
      setHistory(loadedHistory);
    } catch (error) {
      console.error('履歴読み込みエラー:', error);
    }
  }, []);

  // 結果を別タブで開く
  const openResultInNewTab = useCallback(async (result: ComparisonResult, before: CaptureResult, after: CaptureResult) => {
    try {
      const reportHtml = ImageUtils.generateReportHtml(result, before, after);
      
      // HTMLをBlobとして作成
      const blob = new Blob([reportHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      // 新しいタブでレポートを開く
      await chrome.tabs.create({
        url: url,
        active: true
      });
      
      // ポップアップを閉じる
      window.close();
      
    } catch (error) {
      console.error('結果タブ作成エラー:', error);
    }
  }, []);

  // 新しい比較開始
  const startNewComparison = useCallback(() => {
    navigateTo('comparison-view');
  }, [navigateTo]);

  // タブ一覧を取得
  const getAllTabs = useCallback(async () => {
    try {
      const tabs = await chrome.tabs.query({});
      // 拡張機能のタブやシステムページを除外
      const extensionUrl = chrome.runtime.getURL('');
      const filteredTabs = tabs.filter(tab => {
        if (!tab.url) return false;
        if (tab.url.startsWith(extensionUrl)) return false;
        if (tab.url.startsWith('chrome://') || 
            tab.url.startsWith('edge://') ||
            tab.url.startsWith('about:')) {
          return false;
        }
        return true;
      });
      return filteredTabs;
    } catch (error) {
      console.error('タブ一覧取得エラー:', error);
      return [];
    }
  }, []);

  // タブからURLを選択
  const selectUrlFromTab = useCallback((url: string) => {
    setAfterUrl(url);
    setShowTabSelector(false);
  }, []);

  // 履歴項目のテストレポートをローカルファイルとして保存してから開く
  const openHistoryItemAsHtml = useCallback(async (item: HistoryItem) => {
    try {
      await ChromeAPI.openHistoryItemAsHtml(item);
    } catch (error) {
      console.error('履歴項目HTML表示エラー:', error);
      throw error;
    }
  }, []);


  return {
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
    openResultInNewTab,
    saveResult,
    saveSettings,
    loadHistory,
    startNewComparison,
    setActiveTab,
    openHistoryItemAsHtml
  };
}