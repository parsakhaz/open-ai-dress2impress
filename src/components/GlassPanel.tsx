import * as React from 'react'

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'modal' | 'dock' | 'card'
  children: React.ReactNode
}

export function GlassPanel({ 
  variant = 'default', 
  className = '', 
  children, 
  ...props 
}: GlassPanelProps) {
  const variantStyles = {
    default: 'rounded-2xl p-4',
    card: 'rounded-2xl p-6',
    modal: 'rounded-3xl p-6',
    dock: 'rounded-3xl px-2 py-1',
  }

  return (
    <div
      className={[
        'relative box-border min-h-0',
        variantStyles[variant],
        'bg-background border border-border',
        className,
      ].join(' ')}
      {...props}
    >
      <div className="relative min-h-0">{children}</div>
    </div>
  )
}