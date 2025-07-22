import { h } from 'preact';
import { useEffect, useRef } from 'preact/compat';
import type { ComparisonResult, CaptureResult, ComparisonTab } from '../../shared/types';

interface ComparisonViewProps {
  result: ComparisonResult;
  beforeImage: CaptureResult;
  afterImage: CaptureResult;
  activeTab: ComparisonTab;
}

export function ComparisonView({ result, beforeImage, afterImage, activeTab }: ComparisonViewProps) {
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'slider' && sliderRef.current) {
      setupSlider();
    }
  }, [activeTab]);

  const setupSlider = () => {
    const container = sliderRef.current;
    if (!container) return;

    const handle = container.querySelector('.slider-handle') as HTMLDivElement;
    const afterImg = container.querySelector('.slider-after') as HTMLImageElement;
    
    if (!handle || !afterImg) return;

    let isDragging = false;

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      
      handle.style.left = percentage + '%';
      afterImg.style.clipPath = `inset(0 ${100 - percentage}% 0 0)`;
    };

    const onMouseUp = () => {
      isDragging = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    handle.addEventListener('mousedown', (e) => {
      isDragging = true;
      e.preventDefault();
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  };

  const renderSideBySide = () => (
    <div className="side-by-side-view">
      <div className="image-column">
        <div className="image-label">Before</div>
        <img src={beforeImage.dataUrl} alt="Before" className="comparison-image" />
      </div>
      <div className="image-column">
        <div className="image-label">After</div>
        <img src={afterImage.dataUrl} alt="After" className="comparison-image" />
      </div>
      <div className="image-column">
        <div className="image-label">Diff</div>
        <img src={result.diffImageUrl} alt="Diff" className="comparison-image" />
      </div>
    </div>
  );

  const renderSlider = () => (
    <div className="slider-view" ref={sliderRef}>
      <img 
        src={beforeImage.dataUrl} 
        alt="Before" 
        className="slider-before"
      />
      <img 
        src={afterImage.dataUrl} 
        alt="After" 
        className="slider-after"
      />
      <div className="slider-handle">
        <div className="slider-handle-circle" />
      </div>
    </div>
  );

  const renderDiffOnly = () => (
    <div className="diff-only-view">
      <div className="image-label">差分のみ表示</div>
      <img src={result.diffImageUrl} alt="Diff" className="comparison-image" />
    </div>
  );

  return (
    <div className="comparison-container">
      {activeTab === 'side-by-side' && renderSideBySide()}
      {activeTab === 'slider' && renderSlider()}
      {activeTab === 'diff-only' && renderDiffOnly()}
    </div>
  );
}