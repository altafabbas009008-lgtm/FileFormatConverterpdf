import React from 'react';

interface ProgressBarProps {
  progress: number; // 0 to 100
  label?: string;
  subLabel?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  label = 'Processing...',
  subLabel,
}) => {
  const clamped = Math.min(100, Math.max(0, progress));

  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>
        <span className="font-semibold text-brand-600 dark:text-brand-400">{clamped}%</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className="h-full bg-brand-500 transition-all duration-300 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
      {subLabel && (
        <p className="text-xs text-slate-400 dark:text-slate-500">{subLabel}</p>
      )}
    </div>
  );
};
