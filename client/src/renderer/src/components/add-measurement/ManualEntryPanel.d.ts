import { type BarcelonaMeasurementPreset } from '@renderer/data/barcelonaPresets';
type ManualEntryPanelProps = {
    preset?: BarcelonaMeasurementPreset | null;
    onBackToMethodSelection?: () => void;
};
export declare function ManualEntryPanel({ preset, onBackToMethodSelection, }: ManualEntryPanelProps): React.JSX.Element;
export {};
