/**
 * Client-only JSON import flow: treat uploaded API-shaped JSON like a saved filter without persisting.
 * Route id {@link IMPORTED_FILTER_ROUTE_ID} + location state / sessionStorage backup.
 */
import type { Location as RouterLocation } from 'react-router-dom';
import type { FilterDetailsSuccessResponse, FilterInfo } from '@renderer/utils/api/types';
export declare const IMPORTED_FILTER_ROUTE_ID: "imported";
export type ImportedFilterLocationState = {
    importedFilterJson: unknown;
    importedFileName?: string;
};
export declare function writeImportedFilterSession(state: ImportedFilterLocationState): void;
export declare function readImportedFilterSession(location: Pick<RouterLocation, 'state'>): ImportedFilterLocationState | null;
export declare function isImportedFilterRouteId(id: string | undefined): boolean;
/** Normalize various JSON export shapes into `FilterInfo` for visualization / analysis / simulation. */
export declare function normalizeImportedFilterInfo(payload: unknown): FilterInfo;
export declare function buildFilterDetailsFromImportedJson(payload: unknown, _fileName?: string): FilterDetailsSuccessResponse;
