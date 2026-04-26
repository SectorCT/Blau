import type { FilterInfo } from '@renderer/utils/api/types';
import { type EnrichmentMineral } from '@renderer/data/enrichmentMinerals';
export type EnrichmentMineralRuntime = {
    mineral: EnrichmentMineral;
    releaseRate: number;
    targetMin: number;
    targetMax: number;
    unit: string;
    /** mg/L equivalent of one released particle, calibrated so steady-state at 100% releaseRate sits in band. */
    mgPerParticle: number;
};
export type EnrichmentConfig = {
    minerals: EnrichmentMineralRuntime[];
    poreSize?: number;
    layerThickness?: number;
    materialType?: string;
    temperature?: number;
    ph?: number;
    bindingEnergy?: number;
};
export type EnrichmentStats = {
    totalWaterSpawned: number;
    totalReleased: number;
    releasedByType: Record<string, number>;
    /** Current sliding-window mg/L per mineral key. */
    concentrationByType: Record<string, number>;
    /** Fraction of minerals currently in their target band [0..1]. */
    coverageRatio: number;
};
export declare const DEFAULT_ENRICHMENT_CONFIG: EnrichmentConfig;
export declare function buildEnrichmentConfigFromFilterInfo(info: FilterInfo | null | undefined): EnrichmentConfig;
export declare class EnrichmentEngine {
    config: EnrichmentConfig;
    paused: boolean;
    speed: number;
    stats: EnrichmentStats;
    private particles;
    private boundSites;
    private width;
    private height;
    private spawnAccumulator;
    /** Recent crossings into the right detection zone, used for sliding-window concentration. */
    private detectionLog;
    constructor(config?: EnrichmentConfig);
    get filterLeft(): number;
    get filterRight(): number;
    get rightDetectionX(): number;
    resize(width: number, height: number): void;
    reset(): void;
    setSpeed(multiplier: number): void;
    private placeBoundSites;
    tick(dtFrames: number, nowMs: number): void;
    private spawnWater;
    private detachFromSite;
    private recomputeConcentrations;
    draw(ctx: CanvasRenderingContext2D): void;
    private drawFilter;
    private drawBoundSite;
    private drawWater;
    private drawFree;
}
