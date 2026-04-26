import { type FilterDetailsSuccessResponse, type FilterListResponse, type FilterStatusRefreshResponse, type GenerateFilterRequest, type GenerateFilterResponse } from '../types';
export declare const generateFilter: (request: GenerateFilterRequest) => Promise<GenerateFilterResponse>;
export declare const getFilterStatus: (filterId: string) => Promise<FilterStatusRefreshResponse>;
export declare const getFilters: () => Promise<FilterListResponse>;
export declare const getFilterDetails: (filterId: string) => Promise<FilterDetailsSuccessResponse>;
