export type BarcelonaPresetParameter = {
    parameterCode: string;
    parameterName: string;
    unit: string;
    value: number;
};
export type BarcelonaMeasurementPreset = {
    id: string;
    name: string;
    description: string;
    temperature: number;
    ph: number;
    parameters: BarcelonaPresetParameter[];
    coordinates: {
        lat: number;
        lng: number;
    };
};
export declare const BARCELONA_MEASUREMENT_PRESETS: BarcelonaMeasurementPreset[];
