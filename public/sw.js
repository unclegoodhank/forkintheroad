const CACHE_VERSION = 'v1'
const STATIC_CACHE = `static-${CACHE_VERSION}`
const API_CACHE = `api-${CACHE_VERSION}`
const FONT_CACHE = `fonts-${CACHE_VERSION}`

// Files to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...')
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[Service Worker] Caching static assets')
      return cache.addAll(STATIC_ASSETS)
    }).then(() => self.skipWaiting())
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== API_CACHE && cacheName !== FONT_CACHE) {
            console.log('[Service Worker] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return
  }

  // Font requests - cache first
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONT_CACHE).then((cache) => {
        return cache.match(event.request).then((response) => {
          if (response) {
            return response
          }
          return fetch(event.request).then((response) => {
            if (response.ok) {
              cache.put(event.request, response.clone())
            }
            return response
          }).catch(() => {
            // Return a fallback if offline
            return new Response('Font unavailable offline', { status: 503 })
          })
        })
      })
    )
    return
  }

  // API requests - network first, cache second
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            // Cache successful API responses
            caches.open(API_CACHE).then((cache) => {
              cache.put(event.request, response.clone())
            })
          }
          return response
        })
        .catch(() => {
          // Return cached data if network fails
          return caches.match(event.request).then((response) => {
            if (response) {
              console.log('[Service Worker] Serving from cache:', event.request.url)
              return response
            }
            // No cache available
            return new Response(JSON.stringify({ error: 'Offline - no cached data' }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            })
          })
        })
    )
    return
  }

  // Static assets - cache first, network second
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response
      }
      return fetch(event.request).then((response) => {
        // Cache successful responses
        if (response.ok && (event.request.destination === 'script' || event.request.destination === 'style' || event.request.destination === 'image')) {
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(event.request, response.clone())
          })
        }
        return response
      }).catch(() => {
        // Return offline page if available
        if (event.request.destination === 'document') {
          return caches.match('/')
        }
        return new Response('Resource unavailable offline', { status: 503 })
      })
    })
  )
})
