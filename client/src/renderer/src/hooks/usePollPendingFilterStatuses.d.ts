import { type Dispatch, type SetStateAction } from 'react';
import type { FilterListItem, FilterStatus } from '@renderer/utils/api/types';
/** True while a filter row is still Pending or Generating (case-insensitive). */
export declare const isFilterStatusWaiting: (s: FilterStatus | string | undefined | null) => boolean;
/**
 * While any filter is Pending or Generating:
 *  - refresh the list on a fixed interval (catches new filters / terminal transitions),
 *  - additionally call `/filters/{id}/status/` for each in-flight filter to merge in
 *    progressPercent / currentStep / internalStatus when the backend exposes them.
 */
export declare function usePollPendingFilterStatuses(items: FilterListItem[], setItems: Dispatch<SetStateAction<FilterListItem[]>>): void;
