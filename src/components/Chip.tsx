interface ChipProps {
  label: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export function Chip({
  label,
  variant = 'default',
  size = 'md',
  icon,
  onClose,
  className = ''
}: ChipProps) {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm'
  };

  const variantClasses = {
    default: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    primary: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
    success: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
    warning: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300',
    danger: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
  };

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{label}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-1 -mr-1 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
