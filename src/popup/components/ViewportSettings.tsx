import { h } from 'preact';
import { useState } from 'preact/compat';

type ViewportSettingsProps = {
  viewportWidth: number | null;
  onViewportWidthChange: (width: number | null) => void;
};

const PRESET_WIDTHS = [
  { label: 'デバイスデフォルト', value: null },
  { label: 'スマートフォン (375px)', value: 375 },
  { label: 'タブレット (768px)', value: 768 },
  { label: 'デスクトップ (1024px)', value: 1024 },
  { label: 'ワイドスクリーン (1440px)', value: 1440 }
];

export function ViewportSettings({ viewportWidth, onViewportWidthChange }: ViewportSettingsProps) {
  const [customWidth, setCustomWidth] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handlePresetSelect = (value: number | null) => {
    onViewportWidthChange(value);
    setShowCustomInput(false);
    setCustomWidth('');
  };

  const handleCustomWidthApply = () => {
    const width = parseInt(customWidth, 10);
    if (width > 0 && width <= 3000) {
      onViewportWidthChange(width);
      setShowCustomInput(false);
      setCustomWidth('');
    }
  };

  return (
    <div className="viewport-settings">
      <div className="setting-group">
        <h3 className="setting-title">📱 ビューポート幅設定</h3>
        <p className="setting-description">スクリーンショット撮影時のビューポート幅を選択</p>
        
        <div className="preset-buttons">
          {PRESET_WIDTHS.map((preset, index) => (
            <button
              key={index}
              className={`preset-btn ${viewportWidth === preset.value ? 'active' : ''}`}
              onClick={() => handlePresetSelect(preset.value)}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="custom-width-section">
          {!showCustomInput && (
            <button 
              className="custom-btn"
              onClick={() => setShowCustomInput(true)}
            >
              ⚙️ カスタム幅を設定
            </button>
          )}

          {showCustomInput && (
            <div className="custom-input-group">
              <input
                type="number"
                className="custom-width-input"
                placeholder="幅 (px)"
                value={customWidth}
                onChange={(e) => setCustomWidth(e.currentTarget.value)}
                min="320"
                max="3000"
              />
              <button 
                className="apply-btn"
                onClick={handleCustomWidthApply}
                disabled={!customWidth || parseInt(customWidth, 10) <= 0}
              >
                適用
              </button>
              <button 
                className="cancel-btn"
                onClick={() => {
                  setShowCustomInput(false);
                  setCustomWidth('');
                }}
              >
                キャンセル
              </button>
            </div>
          )}
        </div>

        {viewportWidth !== null && (
          <div className="current-setting">
            <span className="current-width">現在の設定: {viewportWidth}px</span>
          </div>
        )}
      </div>
    </div>
  );
}