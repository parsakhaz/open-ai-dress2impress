'use client';

interface ProgressIndicatorProps {
  current: number;
  total: number;
  label?: string;
  showPercentage?: boolean;
  color?: string;
}

export function ProgressIndicator({ 
  current, 
  total, 
  label,
  showPercentage = true,
  color = 'bg-blue-500'
}: ProgressIndicatorProps) {
  const percentage = Math.round((current / total) * 100);

  return (
    <div className="space-y-2">
      {(label || showPercentage) && (
        <div className="flex justify-between text-sm">
          {label && <span className="text-slate-600 dark:text-slate-400">{label}</span>}
          {showPercentage && (
            <span className="text-slate-900 dark:text-slate-100 font-medium">
              {percentage}%
            </span>
          )}
        </div>
      )}
      <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} transition-all duration-300 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
