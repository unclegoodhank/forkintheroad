import { useState, useEffect, useRef } from 'react'
import { loadLeaflet, deferredLoadLeaflet } from '../lib/leaflet-loader'
import { createOptimizedTileLayer, smoothTransitionTiles, preloadAdjacentTiles } from '../lib/tile-manager'

interface LocationSectionProps {
  currentLocation: { lat: number; lng: number; name: string } | null
  onLocationChange: (loc: { lat: number; lng: number; name: string }) => void
}

export default function LocationSection({ currentLocation, onLocationChange }: LocationSectionProps) {
  const [detecting, setDetecting] = useState(false)
  const [mapOpen, setMapOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [locNameClass, setLocNameClass] = useState('')
  const [showMapToggle, setShowMapToggle] = useState(!!currentLocation)
  const [showUpdate, setShowUpdate] = useState(true)
  const hasAutoDetected = useRef(false)
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const tileLayerRef = useRef<any>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)

  // Initialize or update Leaflet map when location changes
  useEffect(() => {
    if (!currentLocation?.lat || !currentLocation?.lng) return
    const lat = currentLocation.lat
    const lng = currentLocation.lng

    loadLeaflet().then((L) => {
      const icon = L.divIcon({
        html: '<div class="loc-pin"></div>',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        className: '',
      })
      if (!mapRef.current && mapContainerRef.current) {
        mapRef.current = L.map(mapContainerRef.current, {
          zoomControl: false,
          attributionControl: false,
          dragging: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          touchZoom: false,
          keyboard: false,
        }).setView([lat, lng], 14)
        
        // Create optimized tile layer with smooth transitions
        const newTileLayer = createOptimizedTileLayer(L)
        smoothTransitionTiles(tileLayerRef.current, newTileLayer, mapRef.current)
        tileLayerRef.current = newTileLayer
        
        markerRef.current = L.marker([lat, lng], { icon }).addTo(mapRef.current)
        
        // Preload adjacent tiles
        setTimeout(() => preloadAdjacentTiles(mapRef.current, L), 100)
      } else if (mapRef.current) {
        mapRef.current.setView([lat, lng], 14)
        if (markerRef.current) markerRef.current.setLatLng([lat, lng])
        
        // Smooth transition to new tiles when location updates
        const oldTileLayer = tileLayerRef.current
        const newTileLayer = createOptimizedTileLayer(L)
        smoothTransitionTiles(oldTileLayer, newTileLayer, mapRef.current)
        tileLayerRef.current = newTileLayer
        
        // Preload adjacent tiles
        setTimeout(() => preloadAdjacentTiles(mapRef.current, L), 100)
      }
    })
  }, [currentLocation?.lat, currentLocation?.lng])

  // Invalidate map size when toggled open
  useEffect(() => {
    if (mapOpen && mapRef.current) {
      const fig = document.getElementById('locationMapFigure')
      if (fig) {
        // Call invalidateSize immediately and again after transition
        mapRef.current.invalidateSize()
        fig.addEventListener('transitionend', () => mapRef.current?.invalidateSize(), { once: true })
      }
    }
  }, [mapOpen])

  // Auto-detect location on mount
  useEffect(() => {
    if (!hasAutoDetected.current) {
      hasAutoDetected.current = true
      detectLocation()
    }
  }, [])

  // Deferred load Leaflet after page content renders
  useEffect(() => {
    deferredLoadLeaflet().catch(() => {
      // Silently fail
    })
  }, [])

  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.')
      return
    }

    setDetecting(true)
    setError(null)
    setShowUpdate(false)
    setLocNameClass('is-detecting')

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude

        // Set location immediately for distance calculations
        onLocationChange({ lat, lng, name: null as any })
        setError(null)
        setShowMapToggle(true)

        const detectingShownAt = Date.now()

        // Reverse geocode
        const place = await reverseGeocode(lat, lng)

        // Ensure detecting state shows for at least 1 second
        const elapsed = Date.now() - detectingShownAt
        if (elapsed < 1000) {
          await new Promise((r) => setTimeout(r, 1000 - elapsed))
        }

        onLocationChange({ lat, lng, name: place || (null as any) })

        // Animate the location name reveal
        setLocNameClass('fading')
        setTimeout(() => {
          setLocNameClass('revealing')
          setDetecting(false)
          setTimeout(() => setShowUpdate(true), 1000)
        }, 150)
      },
      (err) => {
        const tips: Record<number, string> = {
          1: 'Location access was denied. Allow it in your browser settings, then try again.',
          2: 'Location unavailable. Enable Location Services for this browser in System Settings \u2192 Privacy & Security \u2192 Location Services.',
          3: 'Timed out. Enable Location Services for this browser in System Settings \u2192 Privacy & Security \u2192 Location Services.',
        }
        setError(tips[err.code] || err.message)
        setDetecting(false)
        setShowUpdate(true)
        setLocNameClass('')
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
    )
  }

  const reverseGeocode = async (lat: number, lng: number): Promise<string | null> => {
    // Try BigDataCloud first
    try {
      const res = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      )
      const d = await res.json()
      const zip = d.postcode || ''
      if (zip) {
        const fromZip = await zipToCity(zip)
        if (fromZip) return `${fromZip.city}, ${fromZip.state} ${zip}`
      }
      const city = d.city || d.locality || ''
      const state = (d.principalSubdivisionCode || '').replace('US-', '')
      if (city) return [[city, state].filter(Boolean).join(', '), zip].filter(Boolean).join(' ')
    } catch {
      /* fall through to Nominatim */
    }

    // Fallback to Nominatim
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18`,
        { headers: { 'User-Agent': 'want-to-go-app/1.0' } }
      )
      const data = await res.json()
      const a = data.address || {}
      const city = a.city || a.town || a.village || a.suburb || a.county || ''
      const state = (a['ISO3166-2-lvl4'] || '').replace('US-', '')
      const zip = a.postcode || ''
      if (zip) {
        const fromZip = await zipToCity(zip)
        if (fromZip) return `${fromZip.city}, ${fromZip.state} ${zip}`
      }
      return [[city, state].filter(Boolean).join(', '), zip].filter(Boolean).join(' ')
    } catch {
      return null
    }
  }

  const zipToCity = async (zip: string): Promise<{ city: string; state: string } | null> => {
    try {
      const res = await fetch(`https://api.zippopotam.us/us/${zip}`)
      if (!res.ok) return null
      const d = await res.json()
      const place = d.places?.[0]
      if (!place) return null
      return { city: place['place name'], state: place['state abbreviation'] }
    } catch {
      return null
    }
  }

  const toggleMap = () => {
    setMapOpen((prev) => !prev)
  }

  return (
    <section className="location-section">
      <p id="currentLocationDisplay" className="current-location">
        <span className="location-label">
          You&rsquo;re in
          <span id="locName" className={locNameClass}>
            {!detecting && currentLocation?.name ? `\u00a0${currentLocation.name}` : ''}
          </span>
        </span>
        <button
          id="updateLocationLink"
          type="button"
          onClick={detectLocation}
          style={showUpdate ? undefined : { visibility: 'hidden' }}
          className={showUpdate ? 'visible' : ''}
        >
          <svg
            aria-hidden="true"
            focusable="false"
            width="11"
            height="11"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="location-icon"
          >
            <circle cx="6" cy="6" r="3.5" stroke="currentColor" strokeWidth="1.25" />
            <circle cx="6" cy="6" r="0.75" fill="currentColor" />
            <line x1="6" y1="1" x2="6" y2="2.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
            <line x1="6" y1="9.5" x2="6" y2="11" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
            <line x1="1" y1="6" x2="2.5" y2="6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
            <line x1="9.5" y1="6" x2="11" y2="6" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
          </svg>
          Update
        </button>
      </p>

      {showMapToggle && (
        <button
          id="mapToggle"
          type="button"
          aria-expanded={mapOpen}
          aria-controls="locationMapFigure"
          aria-label="Toggle location map"
          onClick={toggleMap}
        />
      )}

      <figure id="locationMapFigure" className={mapOpen ? 'is-open' : ''}>
        <div id="locationMap" ref={mapContainerRef}></div>
      </figure>

      {error && (
        <p id="locationError" className="location-error">
          {error}
        </p>
      )}

      <input type="hidden" id="lat" value={currentLocation?.lat?.toFixed(6) || ''} />
      <input type="hidden" id="lng" value={currentLocation?.lng?.toFixed(6) || ''} />
    </section>
  )
}
