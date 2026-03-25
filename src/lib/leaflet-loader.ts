// Lazy-load Leaflet library and CSS after main content renders
let leafletPromise: Promise<typeof import('leaflet')> | null = null
let cssLoaded = false

export function loadLeaflet() {
  if (leafletPromise) return leafletPromise

  leafletPromise = (async () => {
    // Load CSS if not already loaded
    if (!cssLoaded) {
      try {
        await import('leaflet/dist/leaflet.css')
        cssLoaded = true
      } catch (e) {
        console.warn('[Leaflet] Failed to load CSS')
      }
    }
    // Load JavaScript module
    return import('leaflet')
  })()

  return leafletPromise
}

// Deferred loader - starts loading when browser is idle
export function deferredLoadLeaflet() {
  // Check if already loading or loaded
  if (leafletPromise) return leafletPromise

  return new Promise<typeof import('leaflet')>((resolve) => {
    // Use requestIdleCallback if available (modern browsers)
    if ('requestIdleCallback' in window) {
      requestIdleCallback(
        () => {
          loadLeaflet().then(resolve).catch(() => {
            console.log('[Leaflet] Failed to load in background')
            resolve(null as any)
          })
        },
        { timeout: 5000 } // Load within 5 seconds anyway
      )
    } else {
      // Fallback: load after page paint
      requestAnimationFrame(() => {
        setTimeout(() => {
          loadLeaflet().then(resolve).catch(() => {
            console.log('[Leaflet] Failed to load in background')
            resolve(null as any)
          })
        }, 100)
      })
    }
  })
}
