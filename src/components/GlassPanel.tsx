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
    modal: 'rounded-3xl p-6 shadow-elev-2',
    dock: 'rounded-3xl px-2 py-1 shadow-elev-2',
  }

  return (
    <div
      className={[
        // Layout & shape
        'relative border box-border min-h-0',
        variantStyles[variant],
        // Surface & border with high contrast
        'bg-[var(--surface)] border-2 border-[var(--surface-border)]',
        // Backdrop material
        'backdrop-blur-[var(--blur)] backdrop-saturate-[var(--saturate)]',
        // Soft depth
        'shadow-elev-1 will-change-[backdrop-filter]',
        // Fallback class when backdrop isn't supported
        'supports-no-backdrop',
        className,
      ].join(' ')}
      {...props}
    >
      {/* Top edge highlight (masked to upper portion) */}
      <div className="pointer-events-none absolute inset-0 rounded-[inherit]">
        <div className="absolute inset-0 rounded-[inherit] [mask-image:linear-gradient(180deg,rgba(0,0,0,var(--edge)),transparent_60%)] border border-white/60" />
      </div>

      {/* Micro noise *inside* the panel for material feel */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit] mix-blend-overlay"
        style={{ 
          backgroundImage: 'var(--noise)', 
          opacity: 'calc(var(--noise-opacity) * 1.5)' 
        }}
      />

      {/* Content with relative positioning to appear above overlays */}
      <div className="relative z-10 min-h-0">
        {children}
      </div>
    </div>
  )
}