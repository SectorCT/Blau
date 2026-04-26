export type EnrichmentMineral = {
    key: string;
    label: string;
    symbol: string;
    element: string;
    target: string;
    color: string;
};
export declare const ENRICHMENT_MINERALS: readonly EnrichmentMineral[];
export declare const MINERAL_ELEMENTS: ReadonlySet<string>;
export declare const findMineralByKey: (key: string) => EnrichmentMineral | undefined;
/** Resolve a mineral by element symbol (Ca, Mg, K, …) or by free-form name (Calcium, Mg2+, …). */
export declare const findMineralByElement: (element: string) => EnrichmentMineral | undefined;
export declare const findMineralByName: (name: string) => EnrichmentMineral | undefined;
export type ParsedTargetBand = {
    min: number;
    max: number;
    unit: string;
    /** mg/L equivalent for normalization. */
    minMgPerL: number;
    maxMgPerL: number;
};
/** Parse strings like "40-80 mg/L", "10-40 ug/L", "5 mg/L". Falls back to a wide band on parse failure. */
export declare const parseTargetBand: (target: string) => ParsedTargetBand;
