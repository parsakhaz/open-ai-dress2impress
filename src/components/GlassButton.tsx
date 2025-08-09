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
      'bg-black text-white border border-black',
      'dark:bg-white dark:text-black dark:border-white',
      'hover:scale-[1.02] hover:shadow-xl',
      'active:scale-[0.98]',
    ].join(' '),
    
    secondary: [
      'bg-white/90 border border-black/20 text-black',
      'dark:bg-black/90 dark:border-white/20 dark:text-white',
      'hover:bg-white hover:scale-[1.02] hover:shadow-lg hover:border-black/40',
      'dark:hover:bg-black dark:hover:border-white/40',
      'active:scale-[0.98]',
      'backdrop-blur-sm backdrop-saturate-150',
    ].join(' '),
    
    ghost: [
      'text-black/80 border border-transparent',
      'dark:text-white/80',
      'hover:bg-black/10 hover:text-black hover:border-black/20',
      'dark:hover:bg-white/10 dark:hover:text-white dark:hover:border-white/20',
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