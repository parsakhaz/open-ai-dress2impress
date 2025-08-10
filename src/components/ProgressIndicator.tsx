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
  color = 'bg-foreground'
}: ProgressIndicatorProps) {
  const percentage = Math.round((current / total) * 100);

  return (
    <div className="space-y-2">
      {(label || showPercentage) && (
        <div className="flex justify-between text-sm">
          {label && <span className="text-foreground/70">{label}</span>}
          {showPercentage && (
            <span className="text-foreground font-medium">
              {percentage}%
            </span>
          )}
        </div>
      )}
      <div className="w-full h-2 bg-foreground/10 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} transition-all duration-300 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
