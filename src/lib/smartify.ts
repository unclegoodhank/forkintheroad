import { smartypants } from 'smartypants'

// Decode the HTML numeric entities smartypants produces back to Unicode
const ENTITIES: Record<string, string> = {
  '&#8216;': '\u2018', // '
  '&#8217;': '\u2019', // '
  '&#8220;': '\u201C', // "
  '&#8221;': '\u201D', // "
  '&#8212;': '\u2014', // —
  '&#8211;': '\u2013', // –
  '&#8230;': '\u2026', // …
  '&amp;':   '&',
  '&lt;':    '<',
  '&gt;':    '>',
}

function decodeEntities(str: string): string {
  return str.replace(/&#\d+;|&\w+;/g, (m) => ENTITIES[m] ?? m)
}

export function smartify(text: string | null | undefined): string {
  if (!text) return text ?? ''
  return decodeEntities(smartypants(text, '1'))
}
