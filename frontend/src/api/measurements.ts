import { apiRequest } from '../lib/http'
import type { Measurement } from '../types'

export async function listMeasurements() {
  return apiRequest<Measurement[]>('/api/measurements/')
}

export async function createMeasurement(input: {
  location_name: string
  ph: number
  temperature: number
}) {
  return apiRequest<Measurement>('/api/measurements/', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}
