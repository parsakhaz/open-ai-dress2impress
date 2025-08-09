import * as React from 'react'

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

export function GlassButton({ 
  variant = 'secondary', 
  size = 'md',
  className = '', 
  children,
  disabled,
  ...props 
}: GlassButtonProps) {
  const baseStyles = [
    'relative inline-flex items-center justify-center',
    'font-medium transition-all duration-200 ease-out',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ].join(' ')

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm rounded-lg',
    md: 'px-4 py-2 text-sm rounded-xl', 
    lg: 'px-6 py-3 text-base rounded-xl',
  }

  const variantStyles = {
    primary: [
      'bg-accent/90 text-white border border-accent/20',
      'hover:bg-accent hover:scale-[1.02] hover:shadow-lg',
      'active:scale-[0.98]',
    ].join(' '),
    
    secondary: [
      'bg-white/70 border border-white/60 text-slate-900',
      'dark:bg-white/10 dark:border-white/20 dark:text-white',
      'hover:bg-white/80 hover:scale-[1.02] hover:shadow-md',
      'dark:hover:bg-white/15',
      'active:scale-[0.98]',
      'backdrop-blur-sm backdrop-saturate-150',
    ].join(' '),
    
    ghost: [
      'text-slate-700 dark:text-slate-300',
      'hover:bg-white/50 hover:text-slate-900',
      'dark:hover:bg-white/10 dark:hover:text-white',
      'active:scale-[0.98]',
    ].join(' '),
  }

  return (
    <button
      className={[
        baseStyles,
        sizeStyles[size],
        variantStyles[variant],
        disabled ? '' : 'hover:will-change-transform',
        className,
      ].join(' ')}
      disabled={disabled}
      {...props}
    >
      {/* Subtle inner highlight for glass effect */}
      {variant === 'secondary' && (
        <div className="absolute inset-0 rounded-[inherit] [mask-image:linear-gradient(180deg,white_30%,transparent_70%)] bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
      )}
      
      <span className="relative z-10">
        {children}
      </span>
    </button>
  )
}