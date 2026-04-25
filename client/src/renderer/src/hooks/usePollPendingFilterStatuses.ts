import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react'
import { getFilterStatus, getFilters } from '@renderer/utils/api/endpoints'
import type { FilterListItem, FilterListResponse, FilterStatus } from '@renderer/utils/api/types'

const POLL_MS = 5000
const PROGRESS_CONCURRENCY = 6

const resolveFilters = (payload: FilterListResponse): FilterListItem[] => {
  if (Array.isArray(payload)) return payload
  return payload.results ?? []
}

/** True while a filter row is still Pending or Generating (case-insensitive). */
export const isFilterStatusWaiting = (s: FilterStatus | string | undefined | null): boolean => {
  if (s == null || typeof s !== 'string') return false
  const n = s.trim().toLowerCase()
  return n === 'pending' || n === 'generating'
}

const listHasWaitingFilters = (list: FilterListItem[]): boolean =>
  list.some((it) => isFilterStatusWaiting(it.status))

/** Run async tasks with a fixed parallelism cap. Failed tasks resolve with null. */
async function fetchProgressBatched<T>(
  ids: string[],
  fetcher: (id: string) => Promise<T>,
  concurrency: number
): Promise<Array<{ id: string; result: T | null }>> {
  const out: Array<{ id: string; result: T | null }> = []
  let cursor = 0
  const workers = Array.from({ length: Math.min(concurrency, ids.length) }, async () => {
    while (cursor < ids.length) {
      const i = cursor++
      const id = ids[i]
      try {
        const result = await fetcher(id)
        out.push({ id, result })
      } catch {
        out.push({ id, result: null })
      }
    }
  })
  await Promise.all(workers)
  return out
}

/**
 * While any filter is Pending or Generating:
 *  - refresh the list on a fixed interval (catches new filters / terminal transitions),
 *  - additionally call `/filters/{id}/status/` for each in-flight filter to merge in
 *    progressPercent / currentStep / internalStatus when the backend exposes them.
 */
export function usePollPendingFilterStatuses(
  items: FilterListItem[],
  setItems: Dispatch<SetStateAction<FilterListItem[]>>
): void {
  const itemsRef = useRef(items)
  useEffect(() => {
    itemsRef.current = items
  }, [items])

  const hasWaiting = listHasWaitingFilters(items)

  useEffect(() => {
    if (!hasWaiting) return

    let cancelled = false
    let inFlight = false

    const poll = async (): Promise<void> => {
      if (cancelled || inFlight) return

      const current = itemsRef.current
      if (!listHasWaitingFilters(current)) return

      inFlight = true
      try {
        const response = await getFilters()
        if (cancelled) return
        const fresh = resolveFilters(response)

        const waitingIds = fresh
          .filter((item) => isFilterStatusWaiting(item.status))
          .map((item) => item.filterId)
        const progressById = new Map<string, { progressPercent?: number; currentStep?: string; internalStatus?: string }>()
        if (waitingIds.length > 0) {
          const results = await fetchProgressBatched(waitingIds, getFilterStatus, PROGRESS_CONCURRENCY)
          if (cancelled) return
          for (const { id, result } of results) {
            if (!result) continue
            progressById.set(id, {
              progressPercent: result.progressPercent,
              currentStep: result.currentStep,
              internalStatus: result.internalStatus
            })
          }
        }

        setItems((prev) => {
          const prevById = new Map(prev.map((p) => [p.filterId, p]))
          return fresh.map((item) => {
            const carried = prevById.get(item.filterId)
            const progress = progressById.get(item.filterId)
            return {
              ...item,
              useQuantumComputer: item.useQuantumComputer ?? carried?.useQuantumComputer,
              progressPercent: progress?.progressPercent ?? carried?.progressPercent ?? null,
              currentStep: progress?.currentStep ?? carried?.currentStep ?? null,
              internalStatus: progress?.internalStatus ?? carried?.internalStatus ?? null,
            }
          })
        })
      } catch {
        // Polling failures should not break the page.
      } finally {
        inFlight = false
      }
    }

    const interval = window.setInterval(() => {
      void poll()
    }, POLL_MS)

    void poll()

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [setItems, hasWaiting])
}
