// Background script for Quick VRT Extension (Preact version)

class QuickVRTBackground {
  private capturedData: {
    before?: any;
    after?: any;
  } = {};

  constructor() {
    this.init();
  }

  private init(): void {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // 拡張機能インストール時の処理
    chrome.runtime.onInstalled.addListener((details) => {
      if (details.reason === 'install') {
        console.log('Quick VRT Extension がインストールされました');
        this.initializeStorage();
      } else if (details.reason === 'update') {
        console.log('Quick VRT Extension がアップデートされました');
        this.handleUpdate(details.previousVersion || '');
      }
    });

    // メッセージハンドリング
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // 非同期レスポンスを有効にする
    });

    // タブの変更を監視
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete') {
        this.handleTabUpdate(tabId, tab);
      }
    });

    // 拡張機能アイコンのクリック処理を追加
    chrome.action.onClicked.addListener((tab) => {
      this.openExtensionInTab();
    });

    // コンテキストメニューの作成
    chrome.contextMenus.onClicked.addListener((info, tab) => {
      this.handleContextMenuClick(info, tab);
    });

    this.createContextMenus();
  }

  // 拡張機能を新しいタブで開く
  private async openExtensionInTab(): Promise<void> {
    const extensionUrl = chrome.runtime.getURL('popup.html');
    await chrome.tabs.create({ url: extensionUrl });
  }

  // ストレージの初期化
  private async initializeStorage(): Promise<void> {
    try {
      // デフォルト設定の設定
      const defaultSettings = {
        captureDelay: 1,
        imageQuality: 'medium',
        autoScroll: false,
        diffThreshold: 0.1,
        diffColor: '#ff0000'
      };

      await chrome.storage.local.set({
        vrtSettings: defaultSettings,
        vrtHistory: []
      });

      console.log('ストレージが初期化されました');
    } catch (error) {
      console.error('ストレージ初期化エラー:', error);
    }
  }

  // アップデート処理
  private async handleUpdate(previousVersion: string): Promise<void> {
    try {
      // バージョン間での互換性処理
      const result = await chrome.storage.local.get(['vrtSettings', 'vrtHistory']);
      
      // 既存の設定がない場合は初期化
      if (!result.vrtSettings) {
        await this.initializeStorage();
      }

      console.log(`v${previousVersion} から更新されました`);
    } catch (error) {
      console.error('アップデート処理エラー:', error);
    }
  }

  // メッセージハンドリング
  private async handleMessage(message: any, sender: any, sendResponse: (response: any) => void): Promise<void> {
    try {
      switch (message.type) {
        case 'CAPTURE_SCREENSHOT':
          const screenshot = await this.captureScreenshot(message.options);
          sendResponse({ success: true, data: screenshot });
          break;

        case 'CAPTURE_SCREENSHOT_TAB':
          // 特定のタブIDでスクリーンショットを撮影
          const tabScreenshot = await this.captureScreenshotFromTab(message.tabId, message.options);
          sendResponse({ success: true, data: tabScreenshot });
          break;

        case 'STORE_CAPTURE':
          // キャプチャデータを一時保存
          if (message.captureType === 'before') {
            this.capturedData.before = message.data;
          } else {
            this.capturedData.after = message.data;
          }
          sendResponse({ success: true });
          break;

        case 'GET_STORED_CAPTURES':
          // 保存されたキャプチャデータを取得
          sendResponse({ success: true, data: this.capturedData });
          break;

        case 'CLEAR_STORED_CAPTURES':
          // キャプチャデータをクリア
          this.capturedData = {};
          sendResponse({ success: true });
          break;

        case 'GET_TAB_INFO':
          const tabInfo = await this.getTabInfo(message.tabId);
          sendResponse({ success: true, data: tabInfo });
          break;

        case 'GET_ALL_TABS':
          const tabs = await chrome.tabs.query({});
          sendResponse({ success: true, data: tabs });
          break;

        case 'OPEN_IN_TAB':
          await this.openExtensionInTab();
          sendResponse({ success: true });
          break;

        case 'INJECT_CONTENT_SCRIPT':
          await this.injectContentScript(message.tabId);
          sendResponse({ success: true });
          break;

        case 'PREPARE_PAGE_FOR_CAPTURE':
          await this.preparePageForCapture(message.tabId, message.options);
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('メッセージ処理エラー:', error);
      sendResponse({ success: false, error: (error as Error).message });
    }
  }

  // 特定のタブからスクリーンショット撮影
  private async captureScreenshotFromTab(tabId: number, options: any = {}): Promise<any> {
    try {
      const tab = await chrome.tabs.get(tabId);
      
      if (!tab) {
        throw new Error('タブが見つかりません');
      }

      // タブをアクティブにする
      await chrome.tabs.update(tabId, { active: true });
      
      // 少し待機
      await new Promise(resolve => setTimeout(resolve, 500));

      // ページの準備（オプション）
      if (options.prepareCapture) {
        await this.preparePageForCapture(tabId, options);
      }

      // スクリーンショット撮影の設定
      const captureOptions: chrome.tabs.CaptureVisibleTabOptions = {
        format: 'png',
        quality: this.getImageQuality(options.imageQuality)
      };

      // スクリーンショットを撮影
      const dataUrl = await new Promise<string>((resolve, reject) => {
        chrome.tabs.captureVisibleTab(tab.windowId!, captureOptions, (dataUrl) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (dataUrl) {
            resolve(dataUrl);
          } else {
            reject(new Error('スクリーンショットの撮影に失敗しました'));
          }
        });
      });

      return {
        dataUrl: dataUrl,
        timestamp: Date.now(),
        tabInfo: {
          id: tab.id,
          url: tab.url,
          title: tab.title
        }
      };
    } catch (error) {
      console.error('タブスクリーンショット撮影エラー:', error);
      throw error;
    }
  }

  // スクリーンショット撮影
  private async captureScreenshot(options: any = {}): Promise<any> {
    try {
      // アクティブなタブを取得
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!activeTab || !activeTab.id) {
        throw new Error('アクティブなタブが見つかりません');
      }

      return await this.captureScreenshotFromTab(activeTab.id, options);
    } catch (error) {
      console.error('スクリーンショット撮影エラー:', error);
      throw error;
    }
  }

  // 画像品質の設定を数値に変換
  private getImageQuality(qualitySetting: string): number {
    switch (qualitySetting) {
      case 'high': return 100;
      case 'medium': return 80;
      case 'low': return 60;
      default: return 80;
    }
  }

  // タブ情報の取得
  private async getTabInfo(tabId: number): Promise<any> {
    try {
      const tab = await chrome.tabs.get(tabId);
      return {
        id: tab.id,
        url: tab.url,
        title: tab.title,
        favIconUrl: tab.favIconUrl,
        status: tab.status
      };
    } catch (error) {
      console.error('タブ情報取得エラー:', error);
      throw error;
    }
  }

  // コンテンツスクリプトの注入
  private async injectContentScript(tabId: number): Promise<void> {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      });
    } catch (error) {
      console.error('コンテンツスクリプト注入エラー:', error);
      throw error;
    }
  }

  // ページのキャプチャ準備
  private async preparePageForCapture(tabId: number, options: any): Promise<void> {
    try {
      // コンテンツスクリプトにメッセージを送信
      await chrome.tabs.sendMessage(tabId, {
        type: 'PREPARE_FOR_CAPTURE',
        options: options
      });

      // 準備のための遅延
      if (options.captureDelay && options.captureDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, options.captureDelay * 1000));
      }
    } catch (error) {
      console.error('ページ準備エラー:', error);
      // エラーがあっても続行（コンテンツスクリプトがない場合など）
    }
  }

  // タブ更新時の処理
  private handleTabUpdate(tabId: number, tab: chrome.tabs.Tab): void {
    // 必要に応じてタブ更新時の処理を追加
    // 例：特定のページでの自動キャプチャなど
  }

  // コンテキストメニューの作成
  private createContextMenus(): void {
    try {
      // コンテキストメニューをクリア
      chrome.contextMenus.removeAll(() => {
        // メインメニュー
        chrome.contextMenus.create({
          id: 'quick-vrt-main',
          title: 'Quick VRT',
          contexts: ['page']
        });

        // サブメニュー
        chrome.contextMenus.create({
          id: 'quick-vrt-capture-before',
          parentId: 'quick-vrt-main',
          title: 'Beforeスクリーンショットを撮影',
          contexts: ['page']
        });

        chrome.contextMenus.create({
          id: 'quick-vrt-capture-after',
          parentId: 'quick-vrt-main',
          title: 'Afterスクリーンショットを撮影',
          contexts: ['page']
        });

        chrome.contextMenus.create({
          id: 'quick-vrt-separator',
          parentId: 'quick-vrt-main',
          type: 'separator',
          contexts: ['page']
        });

        chrome.contextMenus.create({
          id: 'quick-vrt-open-tab',
          parentId: 'quick-vrt-main',
          title: 'VRTツールをタブで開く',
          contexts: ['page']
        });
      });
    } catch (error) {
      console.error('コンテキストメニュー作成エラー:', error);
    }
  }

  // コンテキストメニュークリック処理
  private async handleContextMenuClick(info: chrome.contextMenus.OnClickData, tab: chrome.tabs.Tab | undefined): Promise<void> {
    try {
      if (!tab) return;

      switch (info.menuItemId) {
        case 'quick-vrt-capture-before':
          await this.handleQuickCapture('before', tab);
          break;

        case 'quick-vrt-capture-after':
          await this.handleQuickCapture('after', tab);
          break;

        case 'quick-vrt-open-tab':
          await this.openExtensionInTab();
          break;
      }
    } catch (error) {
      console.error('コンテキストメニュー処理エラー:', error);
    }
  }

  // クイックキャプチャ処理
  private async handleQuickCapture(type: 'before' | 'after', tab: chrome.tabs.Tab): Promise<void> {
    try {
      const screenshot = await this.captureScreenshotFromTab(tab.id!, {});
      
      // キャプチャしたデータを一時保存
      if (type === 'before') {
        this.capturedData.before = screenshot;
      } else {
        this.capturedData.after = screenshot;
      }

      // 通知を表示
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Quick VRT',
        message: `${type}スクリーンショットを撮影しました`
      });

    } catch (error) {
      console.error(`${type}キャプチャエラー:`, error);
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Quick VRT - エラー',
        message: `${type}スクリーンショットの撮影に失敗しました`
      });
    }
  }

  // 定期的なクリーンアップ処理
  private async performMaintenance(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(['vrtHistory']);
      
      // 履歴の制限（最新50件まで）
      if (result.vrtHistory && result.vrtHistory.length > 50) {
        const trimmedHistory = result.vrtHistory.slice(0, 50);
        await chrome.storage.local.set({ vrtHistory: trimmedHistory });
      }

      // 一時キャプチャデータをクリア（1時間以上前のもの）
      this.capturedData = {};

    } catch (error) {
      console.error('メンテナンス処理エラー:', error);
    }
  }
}

// Background scriptの初期化
const quickVRTBackground = new QuickVRTBackground();

// 定期的なメンテナンス（1日1回）
chrome.alarms.create('maintenance', { periodInMinutes: 24 * 60 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'maintenance') {
    (quickVRTBackground as any).performMaintenance();
  }
});