export interface FilterPreset {
  id: string
  name: string
  description: string
  searchQuery: string
  cuisine: string
  radius: number
  visited: '' | 'visited' | 'unvisited'
  added: string
  sort: string
}
