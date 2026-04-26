import type { FilterInfo, FilterLayerRow } from '@renderer/utils/api/types';
export type FilterStructureConnection = {
    from: string | number;
    to: string | number;
    order?: number;
};
export type FilterStructureAtom = {
    id?: string | number;
    x: number;
    y: number;
    z: number;
    element: string;
};
/** Graph-only slices are skipped; rows with pollutant metadata are kept. */
export declare function filterToPollutantLayerRows(value: unknown): FilterLayerRow[];
/** Prefer `filterInfo.summaryMetrics`; accept the same object nested under `filterStructure` (new API bundles). */
export declare function getSummaryMetrics(info: FilterInfo | null | undefined): FilterInfo['summaryMetrics'] | undefined;
/** Prefer top-level connections; otherwise concatenate nested `filterStructure.layers[].connections`. */
export declare function collectConnections(fs: FilterInfo['filterStructure'] | undefined): FilterStructureConnection[];
/** Prefer top-level atomPositions; otherwise concatenate nested layers (re-index atom ids). */
export declare function collectAtomPositions(fs: FilterInfo['filterStructure'] | undefined): FilterStructureAtom[];
/**
 * Per-pollutant rows: `filterInfo.layers`, or entries inside `filterStructure.layers` that carry
 * `pollutant` / `pollutantSymbol` (graph-only slices with `connections` are ignored here).
 */
export declare function getFilterLayers(info: FilterInfo | null | undefined): FilterLayerRow[];
export declare function getAggregateRemovalEfficiencyPercent(info: FilterInfo | null | undefined): number | null;
export declare function getAggregatePoreSizeNm(info: FilterInfo | null | undefined): number | null;
export declare function getAggregateBindingEnergyEv(info: FilterInfo | null | undefined): number | null;
