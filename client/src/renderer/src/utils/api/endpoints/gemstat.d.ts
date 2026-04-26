import { type GemstatLocationFetchResponse, type GemstatStationMeasurementsResponse, type GemstatSnapshotFetchResponse } from '../types';
export declare const hasGemstatLocationsCache: () => boolean;
export declare const getGemstatLocations: () => Promise<GemstatLocationFetchResponse>;
export declare const getGemstatStationMeasurements: (locationId: string) => Promise<GemstatStationMeasurementsResponse>;
export declare const getGemstatSnapshot: (locationId: string, date: string) => Promise<GemstatSnapshotFetchResponse>;
