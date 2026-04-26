import { type Measurement, type MeasurementCreateRequest, type MeasurementCreateResponse, type MeasurementListResponse, type MeasurementMapResponse } from '../types';
export declare const createMeasurement: (request: MeasurementCreateRequest) => Promise<MeasurementCreateResponse>;
export declare const getMeasurements: () => Promise<MeasurementListResponse>;
export declare const getMeasurementById: (measurementId: string) => Promise<Measurement>;
export declare const getMeasurementsMap: () => Promise<MeasurementMapResponse>;
export type ImportMeasurementCsvRequest = {
    file: File;
    name?: string;
};
export declare const importMeasurementCsv: (request: ImportMeasurementCsvRequest) => Promise<MeasurementCreateResponse>;
