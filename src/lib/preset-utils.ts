export function generatePresetName(
  cuisine: string,
  visited: '' | 'visited' | 'unvisited',
  sort: string
): string {
  const parts: string[] = []
  if (cuisine) parts.push(cuisine)
  if (visited === 'visited') parts.push('Visited')
  else if (visited === 'unvisited') parts.push('Unvisited')
  if (sort !== 'distance') parts.push(sort.charAt(0).toUpperCase() + sort.slice(1))
  return parts.length ? parts.join(', ') : 'My filters'
}
