export type Study = {
  id: string
  name: string
  description?: string
}

export type Measurement = {
  id: string
  location_name?: string
  ph?: number
  temperature?: number
}

export type Filter = {
  id: string
  status?: string
  score?: number
  created_at?: string
}
