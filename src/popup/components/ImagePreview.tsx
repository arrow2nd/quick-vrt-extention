import { h } from 'preact';
import clsx from 'clsx';
import type { CaptureResult } from '../../shared/types';

interface ImagePreviewProps {
  image: CaptureResult | null;
  type: 'before' | 'after';
  onRetake: () => void;
  onNext?: () => void;
  className?: string;
}

export function ImagePreview({ image, type, onRetake, onNext, className }: ImagePreviewProps) {
  if (!image) return null;

  return (
    <div className={clsx('image-preview', className)}>
      <img 
        src={image.dataUrl} 
        alt={`${type} screenshot`}
        className="preview-image"
      />
      <div className="preview-actions">
        <button className="btn secondary" onClick={onRetake}>
          撮り直し
        </button>
        {onNext && (
          <button className="btn primary" onClick={onNext}>
            次へ →
          </button>
        )}
      </div>
    </div>
  );
}