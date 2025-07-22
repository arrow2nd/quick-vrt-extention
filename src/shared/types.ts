// 共通の型定義

export interface VRTSettings {
  captureDelay: number;
  imageQuality: 'high' | 'medium' | 'low';
  autoScroll: boolean;
  diffThreshold: number;
  diffColor: string;
}

export interface CaptureResult {
  dataUrl: string;
  timestamp: number;
  url: string;
}

export interface ComparisonResult {
  diffPixels: number;
  diffPercentage: string;
  totalPixels: number;
  diffImageUrl: string;
  beforeUrl: string;
  afterUrl: string;
  timestamp: number;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  beforeUrl: string;
  afterUrl: string;
  diffPercentage: string;
  diffPixels: number;
  beforeImageData: string;
  afterImageData: string;
  diffImageUrl: string;
  reportHtml?: string; // HTMLレポートデータを保存
  reportPng?: string;  // PNGレポートデータを保存
}

export interface TabInfo {
  id?: number;
  url?: string;
  title?: string;
  favIconUrl?: string;
  status?: string;
}

// Chrome Extension Messages
export type MessageType = 
  | 'CAPTURE_SCREENSHOT'
  | 'GET_TAB_INFO'
  | 'INJECT_CONTENT_SCRIPT'
  | 'PREPARE_PAGE_FOR_CAPTURE'
  | 'PREPARE_FOR_CAPTURE'
  | 'SCROLL_TO_TOP'
  | 'SCROLL_TO_BOTTOM'
  | 'GET_PAGE_INFO'
  | 'DISABLE_ANIMATIONS'
  | 'RESTORE_PAGE';

export interface ChromeMessage {
  type: MessageType;
  options?: any;
  tabId?: number;
  [key: string]: any;
}

export interface ChromeMessageResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// UI States
export type ViewType = 'main-menu' | 'comparison-view' | 'history-view' | 'settings-view';
export type ComparisonTab = 'side-by-side' | 'slider' | 'diff-only';
export type StepNumber = 1 | 2 | 3;

// Component Props
export interface StepIndicatorProps {
  currentStep: StepNumber;
}

export interface ImagePreviewProps {
  image: CaptureResult | null;
  type: 'before' | 'after';
  onRetake: () => void;
  onNext?: () => void;
}

export interface ComparisonTabsProps {
  activeTab: ComparisonTab;
  onTabChange: (tab: ComparisonTab) => void;
}

export interface ComparisonResultProps {
  result: ComparisonResult;
  beforeImage: CaptureResult;
  afterImage: CaptureResult;
  activeTab: ComparisonTab;
  onTabChange: (tab: ComparisonTab) => void;
  onSave: () => void;
  onNewComparison: () => void;
}

export interface HistoryListProps {
  items: HistoryItem[];
  onItemClick: (item: HistoryItem) => void;
}

export interface SettingsFormProps {
  settings: VRTSettings;
  onSave: (settings: VRTSettings) => void;
  onReset: () => void;
}