type Props = {
    status: string;
};
export declare function StatusBadge({ status }: Props): React.JSX.Element;
type ProgressProps = {
    status: string;
    progressPercent?: number | null;
    currentStep?: string | null;
    /** Compact = single thin bar without step label (for table cells). */
    compact?: boolean;
};
/**
 * Shows StatusBadge plus a progress bar when the filter is still in flight.
 * Falls back to an indeterminate shimmer if the backend doesn't expose progress.
 */
export declare function FilterStatusWithProgress({ status, progressPercent, currentStep, compact }: ProgressProps): React.JSX.Element;
export {};
