// API response types for your restaurant app
export interface Restaurant {
  id: number
  title: string
  note: string
  url: string
  tags: string
  cuisine: string
  lat: number | null
  lng: number | null
  visited: boolean
  visited_at: string | null
  city: string
  state: string
  country: string
  type: string
  open_after_10pm: boolean
  open_after_11pm: boolean
  open_after_midnight: boolean
  added_at: string
}

export interface LookupResult {
  title: string
  url: string
  lat: number | null
  lng: number | null
  city: string
  state: string
  country: string
  cuisine: string
}

export interface GeocodeResult {
  city: string
  state: string
  country: string
}
