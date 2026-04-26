import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from '@renderer/lib/utils';
export function StatusBadge({ status }) {
    const base = 'inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium';
    const styleMap = {
        Complete: 'bg-status-complete/15 text-status-complete',
        Success: 'bg-status-complete/15 text-status-complete',
        Imported: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
        Generating: 'bg-status-generating/15 text-status-generating',
        Pending: 'bg-status-pending/15 text-status-pending',
        Failed: 'bg-destructive/15 text-destructive'
    };
    return (_jsx("span", { className: cn(base, styleMap[status] ?? 'bg-muted text-muted-foreground'), children: status }));
}
const isWaitingStatus = (status) => status === 'Pending' || status === 'Generating';
/**
 * Shows StatusBadge plus a progress bar when the filter is still in flight.
 * Falls back to an indeterminate shimmer if the backend doesn't expose progress.
 */
export function FilterStatusWithProgress({ status, progressPercent, currentStep, compact = false }) {
    if (!isWaitingStatus(status)) {
        return _jsx(StatusBadge, { status: status });
    }
    const hasProgress = typeof progressPercent === 'number' && Number.isFinite(progressPercent);
    const clamped = hasProgress ? Math.max(0, Math.min(100, progressPercent)) : null;
    const trimmedStep = typeof currentStep === 'string' ? currentStep.trim() : '';
    return (_jsxs("div", { className: cn('flex flex-col gap-1', compact ? 'min-w-[140px]' : 'min-w-[200px]'), children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(StatusBadge, { status: status }), clamped != null ? (_jsxs("span", { className: "font-mono text-[11px] text-muted-foreground", children: [Math.round(clamped), "%"] })) : null] }), _jsx("div", { className: "h-1 overflow-hidden rounded-full bg-muted", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": clamped ?? undefined, children: clamped != null ? (_jsx("div", { className: "h-full bg-status-generating transition-[width] duration-500 ease-out", style: { width: `${clamped}%` } })) : (_jsx("div", { className: "h-full w-1/3 animate-pulse bg-status-generating/60" })) }), !compact && trimmedStep.length > 0 ? (_jsx("p", { className: "truncate text-[11px] text-muted-foreground", title: trimmedStep, children: trimmedStep })) : null] }));
}
