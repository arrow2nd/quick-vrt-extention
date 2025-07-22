import { h } from 'preact';
import clsx from 'clsx';
import type { StepNumber } from '../../shared/types';

interface StepIndicatorProps {
  currentStep: StepNumber;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const steps = [
    { number: 1, label: '1. Before' },
    { number: 2, label: '2. After' },
    { number: 3, label: '3. 比較' }
  ];

  return (
    <div className="step-indicator">
      {steps.map((step) => (
        <div
          key={step.number}
          className={clsx('step', {
            'active': step.number === currentStep,
            'completed': step.number < currentStep
          })}
        >
          {step.label}
        </div>
      ))}
    </div>
  );
}