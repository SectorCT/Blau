import { apiRequest } from '../lib/http'

export async function login(email: string, password: string) {
  return apiRequest<{ access: string }>('/api/auth/token/', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}
