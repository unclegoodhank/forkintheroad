// Lazy-loaded smartypants module (only loads when needed)
let smartypantsModule: any = null
let loadingPromise: Promise<any> | null = null

async function loadSmartypants() {
  if (smartypantsModule) return smartypantsModule
  if (loadingPromise) return loadingPromise
  
  loadingPromise = import('smartypants').then((mod) => {
    smartypantsModule = mod
    return mod
  })
  
  return loadingPromise
}

// Decode HTML numeric entities back to Unicode
function decodeEntities(str: string): string {
  const map: Record<string, string> = {
    '&#8217;': '\u2019', // right single quotation mark
    '&#8216;': '\u2018', // left single quotation mark
    '&#8220;': '\u201c', // left double quotation mark
    '&#8221;': '\u201d', // right double quotation mark
    '&#8212;': '\u2014', // em dash
    '&#8211;': '\u2013', // en dash
    '&#8230;': '\u2026', // ellipsis
  }
  
  return str.replace(/&#\d+;/g, (entity) => map[entity] || entity)
}

// Cache for processed strings to avoid re-processing
const smartifyCache = new Map<string, string>()

// Synchronous smartify with lazy loading fallback
export function smartify(text: string | null | undefined): string {
  if (!text) return ''
  
  // Check cache first
  if (smartifyCache.has(text)) {
    return smartifyCache.get(text)!
  }
  
  // If smartypants not loaded yet, return unprocessed
  // (it will be loaded in background and subsequent calls will use cached module)
  if (!smartypantsModule) {
    // Trigger lazy load in background
    loadSmartypants().catch(() => {
      // Silently fail - site works without smartypants
      console.log('[smartify] Smartypants not available, continuing without')
    })
    return text
  }
  
  // Process with smartypants
  const result = decodeEntities(smartypantsModule.smartypants(text, '1'))
  smartifyCache.set(text, result)
  return result
}

// Pre-load smartypants on app startup (non-blocking)
export function preloadSmartypants() {
  loadSmartypants().catch(() => {
    console.log('[smartify] Failed to preload smartypants')
  })
}
