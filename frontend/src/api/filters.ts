import { apiRequest } from '../lib/http'
import type { Filter } from '../types'

export async function listFilters() {
  return apiRequest<Filter[]>('/api/filters/')
}

export async function generateFilter(input: {
  measurement_id: string
  study_id?: string
  use_quantum_computer: boolean
}) {
  return apiRequest('/api/filters/generate/', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
