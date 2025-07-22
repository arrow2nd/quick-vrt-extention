import { useState, useCallback } from 'preact/compat';
import { ChromeAPI } from '../../shared/chrome-api';
import type { CaptureResult } from '../../shared/types';

export function useTabCapture() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [selectedTabId, setSelectedTabId] = useState<number | null>(null);

  // タブを選択してスクリーンショットを撮影
  const captureTabScreenshot = useCallback(async (
    tabId: number, 
    options: any = {}
  ): Promise<CaptureResult> => {
    setIsCapturing(true);
    
    try {
      // バックグラウンドスクリプトにタブIDを送信して撮影
      const response = await chrome.runtime.sendMessage({
        type: 'CAPTURE_SCREENSHOT_TAB',
        tabId: tabId,
        options: options
      });

      if (!response.success) {
        throw new Error(response.error || 'スクリーンショット撮影に失敗');
      }

      return response.data;
    } catch (error) {
      console.error('タブスクリーンショット撮影エラー:', error);
      throw error;
    } finally {
      setIsCapturing(false);
    }
  }, []);

  // タブ選択
  const selectTab = useCallback((tabId: number) => {
    setSelectedTabId(tabId);
  }, []);

  // 選択されたタブの情報を取得
  const getSelectedTabInfo = useCallback(async () => {
    if (!selectedTabId) return null;

    try {
      const tab = await chrome.tabs.get(selectedTabId);
      return {
        id: tab.id,
        url: tab.url,
        title: tab.title
      };
    } catch (error) {
      console.error('タブ情報取得エラー:', error);
      return null;
    }
  }, [selectedTabId]);

  // Background Scriptでキャプチャを保存
  const storeCaptureInBackground = useCallback(async (
    captureType: 'before' | 'after',
    captureData: CaptureResult
  ): Promise<void> => {
    try {
      await chrome.runtime.sendMessage({
        type: 'STORE_CAPTURE',
        captureType: captureType,
        data: captureData
      });
    } catch (error) {
      console.error('キャプチャ保存エラー:', error);
    }
  }, []);

  // Background Scriptから保存されたキャプチャを取得
  const getStoredCaptures = useCallback(async (): Promise<{
    before?: CaptureResult;
    after?: CaptureResult;
  }> => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_STORED_CAPTURES'
      });
      
      return response.success ? response.data : {};
    } catch (error) {
      console.error('保存されたキャプチャ取得エラー:', error);
      return {};
    }
  }, []);

  // 保存されたキャプチャをクリア
  const clearStoredCaptures = useCallback(async (): Promise<void> => {
    try {
      await chrome.runtime.sendMessage({
        type: 'CLEAR_STORED_CAPTURES'
      });
    } catch (error) {
      console.error('キャプチャクリアエラー:', error);
    }
  }, []);

  return {
    isCapturing,
    selectedTabId,
    captureTabScreenshot,
    selectTab,
    getSelectedTabInfo,
    storeCaptureInBackground,
    getStoredCaptures,
    clearStoredCaptures
  };
}