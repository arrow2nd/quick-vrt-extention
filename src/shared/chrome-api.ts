// Chrome Extension API のユーティリティ関数

import type { 
  ChromeMessage, 
  ChromeMessageResponse, 
  CaptureResult, 
  TabInfo,
  VRTSettings,
  HistoryItem 
} from './types';

export class ChromeAPI {
  // スクリーンショットを撮影
  static async captureScreenshot(options: any = {}): Promise<CaptureResult> {
    return new Promise(async (resolve, reject) => {
      try {
        // 現在のタブ情報を先に取得
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const activeTab = tabs[0];
        
        if (!activeTab || !activeTab.id) {
          reject(new Error('アクティブなタブが見つかりません'));
          return;
        }

        // content scriptを通じてページの準備
        if (options.maskVideos || options.autoScroll) {
          try {
            await this.sendTabMessage(activeTab.id, {
              type: 'PREPARE_FOR_CAPTURE',
              options: options
            });
          } catch (error) {
            console.warn('ページ準備エラー（続行）:', error);
          }
        }

        // キャプチャ遅延
        if (options.captureDelay && options.captureDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, options.captureDelay * 1000));
        }

        // タブのウィンドウIDを指定してキャプチャ
        chrome.tabs.captureVisibleTab(activeTab.windowId!, { format: 'png' }, (dataUrl) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (dataUrl) {
            resolve({
              dataUrl,
              timestamp: Date.now(),
              url: activeTab?.url || ''
            });
          } else {
            reject(new Error('スクリーンショットの撮影に失敗しました'));
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // 指定したタブでスクリーンショットを撮影
  static async captureScreenshotFromTab(tabId: number, options: any = {}): Promise<CaptureResult> {
    return new Promise((resolve, reject) => {
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        chrome.tabs.captureVisibleTab(tab.windowId!, { format: 'png' }, (dataUrl) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (dataUrl) {
            resolve({
              dataUrl,
              timestamp: Date.now(),
              url: tab.url || ''
            });
          } else {
            reject(new Error('スクリーンショットの撮影に失敗しました'));
          }
        });
      });
    });
  }

  // 現在のタブ情報を取得
  static async getCurrentTab(): Promise<TabInfo> {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        resolve({
          id: tab?.id,
          url: tab?.url,
          title: tab?.title,
          favIconUrl: tab?.favIconUrl,
          status: tab?.status
        });
      });
    });
  }

  // バックグラウンドスクリプトにメッセージを送信
  static async sendMessage(message: ChromeMessage): Promise<ChromeMessageResponse> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response: ChromeMessageResponse) => {
        if (chrome.runtime.lastError) {
          resolve({ 
            success: false, 
            error: chrome.runtime.lastError.message 
          });
        } else {
          resolve(response || { success: false, error: 'No response' });
        }
      });
    });
  }

  // コンテンツスクリプトにメッセージを送信
  static async sendTabMessage(tabId: number, message: ChromeMessage): Promise<ChromeMessageResponse> {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, message, (response: ChromeMessageResponse) => {
        if (chrome.runtime.lastError) {
          resolve({ 
            success: false, 
            error: chrome.runtime.lastError.message 
          });
        } else {
          resolve(response || { success: false, error: 'No response' });
        }
      });
    });
  }

  // 設定の保存
  static async saveSettings(settings: VRTSettings): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ vrtSettings: settings }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }

  // 設定の読み込み
  static async loadSettings(): Promise<VRTSettings> {
    return new Promise((resolve) => {
      const defaultSettings: VRTSettings = {
        captureDelay: 1,
        imageQuality: 'medium',
        autoScroll: false,
        diffThreshold: 0.1,
        diffColor: '#ff0000',
        maskVideos: false
      };

      chrome.storage.local.get('vrtSettings', (result) => {
        if (chrome.runtime.lastError) {
          resolve(defaultSettings);
        } else {
          resolve({ ...defaultSettings, ...result.vrtSettings });
        }
      });
    });
  }

  // 履歴の保存
  static async saveToHistory(item: Omit<HistoryItem, 'id'>): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get('vrtHistory', (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        const history: HistoryItem[] = result.vrtHistory || [];
        const newItem: HistoryItem = {
          ...item,
          id: Date.now().toString()
        };

        history.unshift(newItem);

        // 最新20件まで
        if (history.length > 20) {
          history.length = 20;
        }

        chrome.storage.local.set({ vrtHistory: history }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
    });
  }

  // 履歴の読み込み
  static async loadHistory(): Promise<HistoryItem[]> {
    return new Promise((resolve) => {
      chrome.storage.local.get('vrtHistory', (result) => {
        if (chrome.runtime.lastError) {
          resolve([]);
        } else {
          resolve(result.vrtHistory || []);
        }
      });
    });
  }

  // 履歴項目のテストレポートを新しいタブで開く（ローカルファイルとして保存してから開く）
  static async openHistoryItemAsHtml(item: HistoryItem): Promise<void> {
    try {
      // 履歴項目から比較結果を再構築
      const beforeImage = {
        dataUrl: item.beforeImageData,
        timestamp: item.timestamp,
        url: item.beforeUrl
      };
      
      const afterImage = {
        dataUrl: item.afterImageData,
        timestamp: item.timestamp,
        url: item.afterUrl
      };
      
      const comparisonResult = {
        diffPixels: item.diffPixels,
        diffPercentage: item.diffPercentage,
        totalPixels: 0,
        diffImageUrl: item.diffImageUrl,
        beforeUrl: item.beforeUrl,
        afterUrl: item.afterUrl,
        timestamp: item.timestamp
      };
      
      // ImageUtilsを使ってHTMLレポートを生成
      const ImageUtils = (await import('./image-utils')).ImageUtils;
      const reportHtml = ImageUtils.generateReportHtml(comparisonResult, beforeImage, afterImage);
      
      // data:URLで新しいタブで開く（CSPの制約なしでJSが動作）
      const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(reportHtml);
      
      // 新しいタブでレポートを開く
      await chrome.tabs.create({
        url: dataUrl,
        active: true
      });
      
    } catch (error) {
      console.error('履歴項目HTML表示エラー:', error);
      throw error;
    }
  }


  // ファイルダウンロード
  static async downloadFile(blob: Blob, filename: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      
      chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: true
      }, (downloadId) => {
        URL.revokeObjectURL(url);
        
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }

  // 通知の表示
  static async showNotification(title: string, message: string): Promise<void> {
    return new Promise((resolve) => {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: title,
        message: message
      }, () => {
        resolve();
      });
    });
  }


  // Chrome DevTools Protocolを使用したフルページスクリーンショット
  static async captureFullPageWithViewportResize(tabId?: number, options: any = {}): Promise<CaptureResult> {
    const targetTabId = tabId || await this.getCurrentTabId();
    
    try {
      // プログレス更新
      if (options.progressCallback) {
        options.progressCallback(1, 1);
      }

      // DevTools APIを使用してフルページスクリーンショットを撮影
      const screenshot = await this.captureFullPageWithDebuggerAPI(targetTabId, options);

      return screenshot;

    } catch (error) {
      console.error('DevTools API フルページスクリーンショット撮影エラー:', error);
      throw error;
    }
  }

  // 現在のタブIDを取得
  private static async getCurrentTabId(): Promise<number> {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0] || !tabs[0].id) {
      throw new Error('現在のタブが見つかりません');
    }
    return tabs[0].id;
  }

  // Chrome DevTools Protocolを使用したスクリーンショット撮影
  private static async captureFullPageWithDebuggerAPI(tabId: number, options: any = {}): Promise<CaptureResult> {
    return new Promise(async (resolve, reject) => {
      try {
        // デバッガーをタブにアタッチ
        chrome.debugger.attach({ tabId: tabId }, '1.3', async () => {
          if (chrome.runtime.lastError) {
            reject(new Error(`デバッガーアタッチエラー: ${chrome.runtime.lastError.message}`));
            return;
          }

          try {
            // ページを有効化
            await this.sendDebuggerCommand(tabId, 'Page.enable', {});
            await this.sendDebuggerCommand(tabId, 'Runtime.enable', {});


            // DOMContentLoadedまで待機
            await this.sendDebuggerCommand(tabId, 'Page.reload', { ignoreCache: false });
            await new Promise(resolve => setTimeout(resolve, 2000));

            // ページ全体をスクロールして lazy loading をトリガー
            await this.sendDebuggerCommand(tabId, 'Runtime.evaluate', {
              expression: `
                (function() {
                  // video要素のマスク処理
                  ${options.maskVideos ? `
                  const videoElements = document.querySelectorAll('video');
                  videoElements.forEach(video => {
                    const computedStyle = window.getComputedStyle(video);
                    if (computedStyle.position === 'static') {
                      video.style.position = 'relative';
                    }
                    
                    const maskElement = document.createElement('div');
                    maskElement.style.cssText = \`
                      position: absolute;
                      top: 0;
                      left: 0;
                      width: 100%;
                      height: 100%;
                      background-color: #f0f0f0;
                      background-image: linear-gradient(45deg, #e0e0e0 25%, transparent 25%), 
                                       linear-gradient(-45deg, #e0e0e0 25%, transparent 25%), 
                                       linear-gradient(45deg, transparent 75%, #e0e0e0 75%), 
                                       linear-gradient(-45deg, transparent 75%, #e0e0e0 75%);
                      background-size: 20px 20px;
                      background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      color: #888;
                      font-family: Arial, sans-serif;
                      font-size: 14px;
                      font-weight: bold;
                      text-align: center;
                      z-index: 999999;
                      pointer-events: none;
                    \`;
                    maskElement.textContent = 'VIDEO MASKED';
                    maskElement.className = 'quick-vrt-video-mask';
                    video.appendChild(maskElement);
                  });
                  ` : ''}
                  
                  // ページの最下部まで段階的にスクロール
                  const scrollHeight = document.documentElement.scrollHeight;
                  const viewportHeight = window.innerHeight;
                  let currentPosition = 0;
                  const scrollStep = viewportHeight;
                  
                  function scrollNext() {
                    if (currentPosition < scrollHeight) {
                      window.scrollTo(0, currentPosition);
                      currentPosition += scrollStep;
                      setTimeout(scrollNext, 200);
                    } else {
                      // lazy loading 要素を強制読み込み
                      const lazyImages = document.querySelectorAll('img[data-src], img[loading="lazy"]');
                      lazyImages.forEach(img => {
                        if (img.dataset.src) {
                          img.src = img.dataset.src;
                        }
                        if (img.loading === 'lazy') {
                          img.loading = 'eager';
                        }
                      });
                      
                      // 最上部に戻る
                      window.scrollTo(0, 0);
                    }
                  }
                  
                  scrollNext();
                })();
              `
            });

            // スクロールと画像読み込み完了を待つ
            await new Promise(resolve => setTimeout(resolve, 3000));

            // 最終的なキャプチャサイズを決定
            let captureWidth, captureHeight;
            
            // レイアウトメトリクスを取得
            const layoutMetrics = await this.sendDebuggerCommand(tabId, 'Page.getLayoutMetrics', {});
            
            {
              // メモリ制限ありのデフォルトサイズ
              captureWidth = Math.min(layoutMetrics.cssContentSize.width, 2000); // 幅制限
              captureHeight = Math.min(layoutMetrics.cssContentSize.height, 10000); // 高さ制限
              
              console.log(`制限付きデフォルトサイズ: ${captureWidth} x ${captureHeight}`);
              
              await this.sendDebuggerCommand(tabId, 'Emulation.setDeviceMetricsOverride', {
                width: captureWidth,
                height: captureHeight,
                deviceScaleFactor: 1,
                mobile: false
              });
            }

            // レイアウト変更の完了を待つ
            await new Promise(resolve => setTimeout(resolve, 1000));

            // フルページスクリーンショットを撮影（clipなし）
            const screenshotResult = await this.sendDebuggerCommand(tabId, 'Page.captureScreenshot', {
              format: 'png'
            });

            // デバイスメトリクスをリセット
            await this.sendDebuggerCommand(tabId, 'Emulation.clearDeviceMetricsOverride', {});

            // デバッガーをデタッチ
            chrome.debugger.detach({ tabId: tabId }, () => {
              if (chrome.runtime.lastError) {
                console.warn('デバッガーデタッチ警告:', chrome.runtime.lastError.message);
              }
            });

            // タブの情報を取得してURLを含める
            chrome.tabs.get(tabId, (tab) => {
              resolve({
                dataUrl: `data:image/png;base64,${screenshotResult.data}`,
                timestamp: Date.now(),
                url: tab.url || '',
                isFullPage: true,
                dimensions: {
                  width: captureWidth,
                  height: captureHeight
                }
              });
            });

          } catch (commandError) {
            // エラー時もデバイスメトリクスをリセット
            try {
              await this.sendDebuggerCommand(tabId, 'Emulation.clearDeviceMetricsOverride', {});
            } catch (resetError) {
              console.warn('デバイスメトリクスリセットエラー:', resetError);
            }
            
            // デバッガーをデタッチ
            chrome.debugger.detach({ tabId: tabId }, () => {
              if (chrome.runtime.lastError) {
                console.warn('デバッガーデタッチ警告:', chrome.runtime.lastError.message);
              }
            });
            reject(commandError);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // デバッガーコマンドを送信
  private static async sendDebuggerCommand(tabId: number, method: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      chrome.debugger.sendCommand({ tabId: tabId }, method, params, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(`${method} エラー: ${chrome.runtime.lastError.message}`));
        } else {
          resolve(result);
        }
      });
    });
  }
}