import { Minus, Square, X } from 'lucide-react'

type WindowControlsProps = {
  compact?: boolean
}

export function WindowControls({ compact = false }: WindowControlsProps): React.JSX.Element {
  return (
    <div className="no-drag flex items-center">
      <ControlButton compact={compact} onClick={() => window.api.window.minimize()} ariaLabel="Minimize window">
        <Minus size={14} strokeWidth={1.5} />
      </ControlButton>
      <ControlButton compact={compact} onClick={() => window.api.window.toggleMaximize()} ariaLabel="Maximize window">
        <Square size={12} strokeWidth={1.5} />
      </ControlButton>
      <ControlButton compact={compact} onClick={() => window.api.window.close()} ariaLabel="Close window">
        <X size={14} strokeWidth={1.5} />
      </ControlButton>
    </div>
  )
}

function ControlButton({
  children,
  onClick,
  ariaLabel,
  compact,
}: {
  children: React.ReactNode
  onClick: () => void
  ariaLabel: string
  compact: boolean
}): React.JSX.Element {
  return (
    <button
      aria-label={ariaLabel}
      onClick={onClick}
      className={`rounded-[6px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground ${
        compact ? 'p-1.5' : 'p-2'
      }`}
    >
      {children}
    </button>
  )
}
