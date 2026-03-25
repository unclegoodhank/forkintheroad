import { useState } from 'react'

interface LocationSectionProps {
  currentLocation: { lat: number; lng: number; name: string } | null
  onLocationChange: (loc: { lat: number; lng: number; name: string }) => void
}

export default function LocationSection({ currentLocation, onLocationChange }: LocationSectionProps) {
  const [detecting, setDetecting] = useState(false)
  const [mapOpen, setMapOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.')
      return
    }

    setDetecting(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude

        // Update hidden inputs
        const latInput = document.getElementById('lat') as HTMLInputElement
        const lngInput = document.getElementById('lng') as HTMLInputElement
        if (latInput) latInput.value = lat.toFixed(6)
        if (lngInput) lngInput.value = lng.toFixed(6)

        onLocationChange({ lat, lng, name: null as any })
        setError(null)

        // Try to reverse geocode
        try {
          const place = await reverseGeocode(lat, lng)
          onLocationChange({ lat, lng, name: place || null as any })
        } catch (err) {
          console.error('Reverse geocoding failed:', err)
          onLocationChange({ lat, lng, name: null as any })
        } finally {
          setDetecting(false)
        }
      },
      (err) => {
        const tips: Record<number, string> = {
          1: 'Location access was denied. Allow it in your browser settings, then try again.',
          2: 'Location unavailable. Enable Location Services for this browser in System Settings → Privacy & Security → Location Services.',
          3: 'Timed out. Enable Location Services for this browser in System Settings → Privacy & Security → Location Services.',
        }
        setError(tips[err.code] || err.message)
        setDetecting(false)
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
    )
  }

  const reverseGeocode = async (lat: number, lng: number): Promise<string | null> => {
    try {
      // Try Nominatim (OpenStreetMap)
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

  return (
    <section className="location-section">
      <p id="currentLocationDisplay" className="current-location">
        <span className="location-label">
          You're in
          <span id="locName" className={detecting ? 'is-detecting' : ''}>
            {currentLocation?.name ? ` ${currentLocation.name}` : ''}
          </span>
        </span>
        <button
          id="updateLocationLink"
          type="button"
          onClick={useCurrentLocation}
          disabled={detecting}
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

      <button
        id="mapToggle"
        type="button"
        className="hidden"
        aria-expanded={mapOpen}
        aria-controls="locationMapFigure"
        aria-label="Toggle location map"
        onClick={() => setMapOpen(!mapOpen)}
      ></button>

      <figure id="locationMapFigure" className={mapOpen ? 'is-open' : ''}>
        <div id="locationMap"></div>
      </figure>

      {error && (
        <p id="locationError" className="location-error">
          {error}
        </p>
      )}

      <input type="hidden" id="lat" value={currentLocation?.lat.toFixed(6) || ''} />
      <input type="hidden" id="lng" value={currentLocation?.lng.toFixed(6) || ''} />
    </section>
  )
}
