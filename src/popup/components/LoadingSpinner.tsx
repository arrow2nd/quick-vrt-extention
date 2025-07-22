import { h } from 'preact';
import clsx from 'clsx';

interface LoadingSpinnerProps {
  show: boolean;
  text?: string;
}

export function LoadingSpinner({ show, text = '処理中...' }: LoadingSpinnerProps) {
  if (!show) return null;

  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <div className="spinner" />
        <div className="loading-text">{text}</div>
      </div>
    </div>
  );
}