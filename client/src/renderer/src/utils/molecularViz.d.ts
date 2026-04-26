import type { FilterInfo } from '@renderer/utils/api/types';
export type MoleculeDefinition = {
    code: string;
    name: string;
    formula: string;
    color: string;
    concentration: number;
    unit: string;
    normalized: number;
    radiusScale: number;
    removalRate: number;
    filterable: boolean;
};
export type MolecularHoverInfo = {
    code: string;
    name: string;
    formula: string;
    concentration: number;
    unit: string;
    zone: 'unfiltered' | 'filtered';
};
export type MolecularSceneOptions = {
    definitions: MoleculeDefinition[];
    poreSize?: number;
    materialType?: string;
    layerThickness?: number;
    removalEfficiency: number;
};
export declare function buildMoleculeDefinitions(info: FilterInfo): MoleculeDefinition[];
export declare class MolecularScene {
    private width;
    private height;
    private nodes;
    private hoverRadiusPad;
    private poreSize?;
    private materialType?;
    private layerThickness?;
    private removalEfficiency;
    private definitions;
    constructor(options: MolecularSceneOptions);
    setViewport(width: number, height: number): void;
    update(options: MolecularSceneOptions): void;
    private rebuildNodes;
    get filterLeft(): number;
    get filterRight(): number;
    frame(dtMs: number): void;
    draw(ctx: CanvasRenderingContext2D): void;
    private drawMembrane;
    pick(x: number, y: number): MolecularHoverInfo | null;
}
