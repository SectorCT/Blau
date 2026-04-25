import { apiRequest } from '../lib/http'
import type { Study } from '../types'

export async function listStudies() {
  return apiRequest<Study[]>('/api/studies/')
}

export async function createStudy(name: string, description: string) {
  return apiRequest<Study>('/api/studies/', {
    method: 'POST',
    body: JSON.stringify({ name, description }),
  })
}
