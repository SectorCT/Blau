import type { FilterEnrichmentSummary, FilterInfo } from '@renderer/utils/api/types';
import { type EnrichmentMineral } from '@renderer/data/enrichmentMinerals';
export type NormalizedParam = {
    code: string;
    name: string;
    value: number;
    unit: string;
};
/** Per-pollutant layer row normalized for display (multi-pollutant filters). */
export type NormalizedLayerRow = {
    pollutant: string;
    pollutantSymbol: string;
    removalEfficiency: number | null;
    bindingEnergy: number | null;
    poreSize: number | null;
    layerThickness: number | null;
    materialType: string;
    method: string;
    /** "filtration" or "enrichment" — defaults to "filtration" when missing. */
    mode: 'filtration' | 'enrichment';
    releaseRate: number | null;
    targetConcentration: string | null;
    mergedPollutants: string[];
};
export type EnrichmentMineralView = {
    mineral: EnrichmentMineral;
    releaseRate: number | null;
    targetConcentration: string | null;
    layerThickness: number | null;
    bindingEnergy: number | null;
};
export type FilterInfoViewModel = {
    params: NormalizedParam[];
    layerRows: NormalizedLayerRow[];
    metrics: {
        materialType: string;
        poreSize: number | null;
        layerThickness: number | null;
        latticeSpacing: number | null;
        bindingEnergy: number | null;
        removalEfficiency: number | null;
        pollutant: string;
        pollutantSymbol: string;
        parameterCount: number;
        temperature: number | null;
        ph: number | null;
    };
    /** Top-level binding-energy method (e.g. "mixed_empirical"). Falls back to majority across layers. */
    method: string | null;
    /** Enrichment summary (Ca/Mg/etc.) — null when enrichment was disabled or absent. */
    enrichmentSummary: FilterEnrichmentSummary | null;
    /** Layers whose mode is 'enrichment'. Subset of layerRows. */
    enrichmentLayers: NormalizedLayerRow[];
    /** Per-mineral view joined with the catalog (parsed target band, palette color, label). */
    enrichmentMinerals: EnrichmentMineralView[];
    parameterBarData: Array<{
        name: string;
        code: string;
        value: number;
        rawValue: number;
        unit: string;
    }>;
    parameterRadarData: Array<{
        parameter: string;
        value: number;
    }>;
    parameterDonutData: Array<{
        name: string;
        code: string;
        value: number;
        rawValue: number;
        unit: string;
    }>;
    atomPositions: Array<{
        id: string;
        x: number;
        y: number;
        z: number;
        element: string;
    }>;
    atomConnections: Array<{
        from: string;
        to: string;
        order: number;
    }>;
};
export declare const buildFilterInfoViewModel: (info: FilterInfo | null | undefined) => FilterInfoViewModel;
export declare const atomPositionsToXyz: (atoms: Array<{
    x: number;
    y: number;
    z: number;
    element: string;
}>) => string;
