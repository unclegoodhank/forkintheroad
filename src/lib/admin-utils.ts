export const STATE_ABBR: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA',
  kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD',
  massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS', missouri: 'MO',
  montana: 'MT', nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND',
  ohio: 'OH', oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI',
  'south carolina': 'SC', 'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT',
  vermont: 'VT', virginia: 'VA', washington: 'WA', 'west virginia': 'WV',
  wisconsin: 'WI', wyoming: 'WY', 'district of columbia': 'DC',
}

export function normalizeState(s: string): string {
  if (!s) return s
  const trimmed = s.trim()
  const lower = trimmed.toLowerCase()
  // Full name → abbreviation
  if (STATE_ABBR[lower]) return STATE_ABBR[lower]
  // Already a 2-letter code → uppercase it
  if (trimmed.length === 2) return trimmed.toUpperCase()
  return trimmed
}

export const FOOD_DRINK_TYPES = new Set([
  'Restaurant', 'Bar', 'Café / Coffee', 'Bakery', 'Ice Cream / Dessert', 'Brewery', 'Winery',
])

export function isFoodDrink(type: string): boolean {
  return FOOD_DRINK_TYPES.has(type)
}

export const TYPE_OPTIONS = [
  'Restaurant', 'Bar', 'Café / Coffee', 'Bakery', 'Ice Cream / Dessert',
  'Brewery', 'Winery', 'Park / Nature', 'Museum', 'Shop', 'Market',
  'Hotel', 'Experience', 'Library',
]

export function extractNameFromMapsUrl(url: string): string | null {
  try {
    const placeMatch = url.match(/\/maps\/place\/([^/]+)/)
    if (placeMatch) {
      let name = decodeURIComponent(placeMatch[1]).replace(/\+/g, ' ')
      const numIdx = name.search(/\d/)
      if (numIdx > 0) name = name.substring(0, numIdx).replace(/,\s*$/, '')
      return name.trim()
    }
    const qMatch = url.match(/[?&]q=([^&]+)/)
    if (qMatch) {
      let name = decodeURIComponent(qMatch[1]).replace(/\+/g, ' ')
      const numIdx = name.search(/\d/)
      if (numIdx > 0) name = name.substring(0, numIdx).replace(/,\s*$/, '')
      return name.trim()
    }
  } catch { /* ignore */ }
  return null
}

export function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}
