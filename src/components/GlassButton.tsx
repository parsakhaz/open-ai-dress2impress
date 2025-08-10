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
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ].join(' ')

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm rounded-lg',
    md: 'px-4 py-2 text-sm rounded-xl', 
    lg: 'px-6 py-3 text-base rounded-xl',
  }

  const variantStyles = {
    primary: [
      'bg-foreground text-background border border-foreground',
      'hover:opacity-90',
      'active:opacity-80',
    ].join(' '),
    
    secondary: [
      'bg-background border border-border text-foreground',
      'hover:bg-foreground/10',
      'active:opacity-90',
    ].join(' '),
    
    ghost: [
      'text-foreground border border-transparent',
      'hover:bg-foreground/10',
      'active:opacity-90',
    ].join(' '),
  }

  return (
    <button
      className={[
        baseStyles,
        sizeStyles[size],
        variantStyles[variant],
        disabled ? '' : '',
        className,
      ].join(' ')}
      disabled={disabled}
      {...props}
    >
      <span className="relative">{children}</span>
    </button>
  )
}