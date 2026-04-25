import { cn } from '@renderer/lib/utils'

type Props = {
  status: string
}

export function StatusBadge({ status }: Props): React.JSX.Element {
  const base = 'inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium'

  const styleMap: Record<string, string> = {
    Complete: 'bg-status-complete/15 text-status-complete',
    Success: 'bg-status-complete/15 text-status-complete',
    Imported: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
    Generating: 'bg-status-generating/15 text-status-generating',
    Pending: 'bg-status-pending/15 text-status-pending',
    Failed: 'bg-destructive/15 text-destructive'
  }

  return (
    <span className={cn(base, styleMap[status] ?? 'bg-muted text-muted-foreground')}>{status}</span>
  )
}

type ProgressProps = {
  status: string
  progressPercent?: number | null
  currentStep?: string | null
  /** Compact = single thin bar without step label (for table cells). */
  compact?: boolean
}

const isWaitingStatus = (status: string): boolean =>
  status === 'Pending' || status === 'Generating'

/**
 * Shows StatusBadge plus a progress bar when the filter is still in flight.
 * Falls back to an indeterminate shimmer if the backend doesn't expose progress.
 */
export function FilterStatusWithProgress({
  status,
  progressPercent,
  currentStep,
  compact = false
}: ProgressProps): React.JSX.Element {
  if (!isWaitingStatus(status)) {
    return <StatusBadge status={status} />
  }
  const hasProgress = typeof progressPercent === 'number' && Number.isFinite(progressPercent)
  const clamped = hasProgress ? Math.max(0, Math.min(100, progressPercent as number)) : null
  const trimmedStep = typeof currentStep === 'string' ? currentStep.trim() : ''
  return (
    <div className={cn('flex flex-col gap-1', compact ? 'min-w-[140px]' : 'min-w-[200px]')}>
      <div className="flex items-center gap-2">
        <StatusBadge status={status} />
        {clamped != null ? (
          <span className="font-mono text-[11px] text-muted-foreground">{Math.round(clamped)}%</span>
        ) : null}
      </div>
      <div
        className="h-1 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped ?? undefined}
      >
        {clamped != null ? (
          <div
            className="h-full bg-status-generating transition-[width] duration-500 ease-out"
            style={{ width: `${clamped}%` }}
          />
        ) : (
          <div className="h-full w-1/3 animate-pulse bg-status-generating/60" />
        )}
      </div>
      {!compact && trimmedStep.length > 0 ? (
        <p className="truncate text-[11px] text-muted-foreground" title={trimmedStep}>
          {trimmedStep}
        </p>
      ) : null}
    </div>
  )
}
