export type ChartParam = {
    code: string;
    name: string;
    value: number;
    unit: string;
};
export type ParameterChartBarRow = {
    name: string;
    code: string;
    value: number;
    rawValue: number;
    unit: string;
};
export type ParameterDonutRow = {
    name: string;
    code: string;
    value: number;
    rawValue: number;
    unit: string;
};
export declare function buildExperimentParameterCharts(params: ChartParam[]): {
    bar: ParameterChartBarRow[];
    radar: Array<{
        parameter: string;
        value: number;
    }>;
    donut: ParameterDonutRow[];
};
