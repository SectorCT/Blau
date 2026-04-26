import type { Study, StudyCreateRequest, StudyListResponse, StudyUpdateRequest } from '../types';
export declare const getStudies: () => Promise<StudyListResponse>;
export declare const createStudy: (request: StudyCreateRequest) => Promise<Study>;
export declare const getStudyById: (id: string) => Promise<Study>;
export declare const updateStudy: (id: string, request: StudyUpdateRequest) => Promise<Study>;
export declare const deleteStudy: (id: string) => Promise<{
    success: boolean;
}>;
