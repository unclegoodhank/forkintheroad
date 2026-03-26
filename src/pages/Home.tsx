import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../lib/api'
import { Restaurant } from '../types/api'
import { smartify } from '../lib/smartify'
import { normalizeState, TYPE_OPTIONS, FOOD_DRINK_TYPES } from '../lib/admin-utils'
import LocationSection from '../components/LocationSection'
import FilterSection, { sliderToDistance, sliderLabel } from '../components/FilterSection'
import { FilterPreset } from '../types/filters'
import { generatePresetName } from '../lib/preset-utils'



function launchConfetti(el: HTMLElement) {
  const rect = el.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  const colors = [
    'hsl(135 76% 40%)', 'hsl(135 76% 55%)',
    'hsl(75 35% 38%)', 'hsl(75 50% 55%)',
    'hsl(40 66% 45%)', 'hsl(42 80% 68%)',
    'hsl(36 23% 55%)',
  ]
  for (let i = 0; i < 22; i++) {
    const angle = (i / 22) * 360 + (Math.random() - 0.5) * 28
    const dist = 38 + Math.random() * 65
    const size = 3 + Math.random() * 5
    const isRect = Math.random() > 0.5
    const dur = 550 + Math.random() * 350
    const rot = Math.random() * 360
    const p = document.createElement('div')
    p.style.cssText = `
      position:fixed; left:${cx}px; top:${cy}px; z-index:99999;
      width:${isRect ? size * 1.8 : size}px; height:${size}px;
      border-radius:${isRect ? '2px' : '50%'};
      background:${colors[Math.floor(Math.random() * colors.length)]}; pointer-events:none;
      transform:translate(-50%,-50%) rotate(${rot}deg); opacity:1;
      transition:transform ${dur}ms cubic-bezier(0.22,0.61,0.36,1),
                 opacity ${dur * 0.6}ms ease ${dur * 0.4}ms;
    `
    document.body.appendChild(p)
    const dx = Math.cos((angle * Math.PI) / 180) * dist
    const dy = Math.sin((angle * Math.PI) / 180) * dist
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        p.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${rot + 120}deg)`
        p.style.opacity = '0'
      })
    )
    setTimeout(() => p.remove(), dur + 100)
  }
}

export default function Home() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [filteredData, setFilteredData] = useState<Restaurant[]>([])
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number; name: string } | null>(
    () => JSON.parse(localStorage.getItem('currentLocation') || 'null')
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter state (persisted to localStorage)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCuisine, setSelectedCuisine] = useState(() => localStorage.getItem('filter_cuisine') ?? '')
  const [radiusFilter, setRadiusFilter] = useState(() => parseFloat(localStorage.getItem('filter_radius') ?? '11.67'))
  const [visitedFilter, setVisitedFilter] = useState<'' | 'visited' | 'unvisited'>(() => (localStorage.getItem('filter_visited') ?? '') as '' | 'visited' | 'unvisited')
  const [addedDaysFilter, setAddedDaysFilter] = useState(() => localStorage.getItem('filter_added') ?? '')
  const [sortOrder, setSortOrder] = useState(() => localStorage.getItem('filter_sort') ?? 'distance')

  useEffect(() => { localStorage.setItem('filter_cuisine', selectedCuisine) }, [selectedCuisine])
  useEffect(() => { localStorage.setItem('filter_radius', String(radiusFilter)) }, [radiusFilter])
  useEffect(() => { localStorage.setItem('filter_visited', visitedFilter) }, [visitedFilter])
  useEffect(() => { localStorage.setItem('filter_added', addedDaysFilter) }, [addedDaysFilter])
  useEffect(() => { localStorage.setItem('filter_sort', sortOrder) }, [sortOrder])

  // Presets
  const [presets, setPresets] = useState<FilterPreset[]>(() => {
    const saved = localStorage.getItem('filter_presets')
    return saved ? JSON.parse(saved) : []
  })
  const [activePresetId, setActivePresetId] = useState<string | null>(null)

  useEffect(() => {
    localStorage.setItem('filter_presets', JSON.stringify(presets))
  }, [presets])

  // Clear active preset when filters change, unless they still match the active preset
  useEffect(() => {
    if (!activePresetId) return
    const preset = presets.find(p => p.id === activePresetId)
    if (preset &&
      preset.searchQuery === searchQuery &&
      preset.cuisine === selectedCuisine &&
      preset.radius === radiusFilter &&
      preset.visited === visitedFilter &&
      preset.added === addedDaysFilter &&
      preset.sort === sortOrder) {
      return // Filters still match the preset, keep it active
    }
    setActivePresetId(null) // Filters diverged, clear the active preset
  }, [searchQuery, selectedCuisine, radiusFilter, visitedFilter, addedDaysFilter, sortOrder, activePresetId, presets])

  const handleResetFilters = () => {
    setSearchQuery('')
    setSelectedCuisine('')
    setRadiusFilter(11.67)
    setVisitedFilter('')
    setAddedDaysFilter('')
    setSortOrder('distance')
  }


  const saveCurrentAsPreset = () => {
    const newPreset: FilterPreset = {
      id: Date.now().toString(),
      name: generatePresetName(selectedCuisine, visitedFilter, sortOrder),
      description: '',
      searchQuery,
      cuisine: selectedCuisine,
      radius: radiusFilter,
      visited: visitedFilter,
      added: addedDaysFilter,
      sort: sortOrder,
    }
    if (presets.length < 3) {
      setPresets([...presets, newPreset])
    }
  }

  const savePresetWithName = (name: string, description: string) => {
    const newPreset: FilterPreset = {
      id: Date.now().toString(),
      name,
      description,
      searchQuery,
      cuisine: selectedCuisine,
      radius: radiusFilter,
      visited: visitedFilter,
      added: addedDaysFilter,
      sort: sortOrder,
    }
    if (presets.length < 3) {
      setPresets([...presets, newPreset])
    }
  }

  const loadPreset = (preset: FilterPreset) => {
    setSearchQuery(preset.searchQuery)
    setSelectedCuisine(preset.cuisine)
    setRadiusFilter(preset.radius)
    setVisitedFilter(preset.visited)
    setAddedDaysFilter(preset.added)
    setSortOrder(preset.sort)
    setActivePresetId(preset.id)
  }

  const deletePreset = (id: string) => {
    setPresets(presets.filter(p => p.id !== id))
  }

  const updatePresetName = (id: string, newName: string) => {
    setPresets(presets.map(p => p.id === id ? { ...p, name: newName } : p))
  }

  const updatePresetDescription = (id: string, description: string) => {
    setPresets(presets.map(p => p.id === id ? { ...p, description } : p))
  }

  const overwritePreset = (id: string) => {
    setPresets(presets.map(p => p.id === id ? {
      ...p,
      searchQuery,
      cuisine: selectedCuisine,
      radius: radiusFilter,
      visited: visitedFilter,
      added: addedDaysFilter,
      sort: sortOrder,
    } : p))
  }

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const perPage = 10

  // Edit modal
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null)
  const [editFormData, setEditFormData] = useState<Partial<Restaurant>>({})
  const [editIndex, setEditIndex] = useState(-1)
  const [metaHeld, setMetaHeld] = useState(false)
  const editTriggerRef = useRef<HTMLButtonElement | null>(null)
  const justMarkedVisitedRef = useRef<number | null>(null)
  const cardRefs = useRef<Map<number, HTMLLIElement>>(new Map())
  const countRef = useRef<HTMLParagraphElement>(null)
  const prevCountRef = useRef<number | null>(null)

  // Fetch restaurants on mount — show first 5 immediately, then load all
  useEffect(() => {
    fetchInitial()
  }, [])

  // Track meta/ctrl key held state for button hint
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === 'Meta' || e.key === 'Control') setMetaHeld(true) }
    const up = (e: KeyboardEvent) => { if (e.key === 'Meta' || e.key === 'Control') setMetaHeld(false) }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  // Data refresh on page visibility
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') fetchRestaurants()
    }
    const pageShow = (e: PageTransitionEvent) => {
      if (e.persisted) fetchRestaurants()
    }
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('pageshow', pageShow)
    return () => {
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('pageshow', pageShow)
    }
  }, [])

  // iOS Safari zoom prevention
  useEffect(() => {
    if (!/iP(ad|hone|od)/.test(navigator.userAgent) || !/WebKit/.test(navigator.userAgent) || /CriOS|FxiOS/.test(navigator.userAgent)) return
    const preventPinch = (e: TouchEvent) => { if (e.touches.length > 1) e.preventDefault() }
    let lastTap = 0
    const preventDoubleTap = (e: TouchEvent) => {
      const now = Date.now()
      if (now - lastTap < 300 && !(e.target as HTMLElement)?.closest?.('button, a, input, select, textarea, label')) e.preventDefault()
      lastTap = now
    }
    document.addEventListener('touchmove', preventPinch, { passive: false })
    document.addEventListener('touchend', preventDoubleTap, { passive: false })
    return () => {
      document.removeEventListener('touchmove', preventPinch)
      document.removeEventListener('touchend', preventDoubleTap)
    }
  }, [])

  // Confetti after visited animation
  useEffect(() => {
    if (justMarkedVisitedRef.current !== null) {
      const id = justMarkedVisitedRef.current
      justMarkedVisitedRef.current = null
      requestAnimationFrame(() => {
        const cardEl = cardRefs.current.get(id)
        if (!cardEl) return
        const badge = cardEl.querySelector('.visited-badge')
        if (badge) {
          badge.classList.add('is-new')
          launchConfetti(badge as HTMLElement)
        }
      })
    }
  }, [filteredData])

  // Flash the count whenever it changes (any filter)
  useEffect(() => {
    if (loading) return
    const el = countRef.current
    if (!el) return
    if (prevCountRef.current === filteredData.length) return
    prevCountRef.current = filteredData.length
    el.classList.remove('count-changed')
    void el.offsetWidth // force reflow to restart animation
    el.classList.add('count-changed')
  }, [filteredData.length, loading])

  // Apply filters whenever they change
  useEffect(() => {
    applyFilters()
  }, [restaurants, searchQuery, selectedCuisine, radiusFilter, visitedFilter, addedDaysFilter, sortOrder, currentLocation])

  const fetchInitial = async () => {
    try {
      setLoading(true)
      // Phase 1: fetch first 5 to show cards fast
      const first = await api.get('/api/restaurants?limit=5')
      setRestaurants(first.data)
      setError(null)
      setLoading(false)
      // Phase 2: fetch all in background
      const all = await api.get('/api/restaurants')
      setRestaurants(all.data)
    } catch (err) {
      setError('Failed to fetch restaurants')
      console.error(err)
      setLoading(false)
    }
  }

  const fetchRestaurants = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/restaurants')
      setRestaurants(response.data)
      setError(null)
    } catch (err) {
      setError('Failed to fetch restaurants')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const saveLocation = (loc: { lat: number; lng: number; name: string }) => {
    setCurrentLocation(loc)
    localStorage.setItem('currentLocation', JSON.stringify(loc))
  }

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 3959
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLng = ((lng2 - lng1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
    return R * (2 * Math.asin(Math.sqrt(a)))
  }

  const applyFilters = () => {
    let filtered = [...restaurants]

    // Search filter — match title, tags, note, city, state, cuisine
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          (r.tags && r.tags.toLowerCase().includes(q)) ||
          (r.note && r.note.toLowerCase().includes(q)) ||
          (r.city && r.city.toLowerCase().includes(q)) ||
          (r.state && r.state.toLowerCase().includes(q)) ||
          (r.cuisine && r.cuisine.toLowerCase().includes(q))
      )
    }

    // Cuisine filter
    if (selectedCuisine === '__food') {
      filtered = filtered.filter((r) => FOOD_DRINK_TYPES.has(r.type))
    } else if (selectedCuisine) {
      filtered = filtered.filter((r) => r.cuisine === selectedCuisine)
    }

    // Radius filter
    if (currentLocation && radiusFilter < 100) {
      const maxDistance = sliderToDistance(radiusFilter)
      filtered = filtered.filter((r) => {
        if (!r.lat || !r.lng) return false
        const dist = calculateDistance(currentLocation.lat, currentLocation.lng, r.lat, r.lng)
        return dist <= maxDistance
      })
    }

    // Visited filter
    if (visitedFilter === 'visited') {
      filtered = filtered.filter((r) => !!r.visited)
    } else if (visitedFilter === 'unvisited') {
      filtered = filtered.filter((r) => !r.visited)
    }

    // Added days filter
    if (addedDaysFilter) {
      const days = parseInt(addedDaysFilter)
      const cutoffDate = new Date(Date.now() - days * 864e5)
      filtered = filtered.filter((r) => r.added_at && new Date(r.added_at + 'Z') >= cutoffDate)
    }

    // Sort
    if (sortOrder === 'distance' && currentLocation) {
      filtered.sort((a, b) => {
        const distA = a.lat && a.lng ? calculateDistance(currentLocation.lat, currentLocation.lng, a.lat, a.lng) : Infinity
        const distB = b.lat && b.lng ? calculateDistance(currentLocation.lat, currentLocation.lng, b.lat, b.lng) : Infinity
        return distA - distB
      })
    } else if (sortOrder === 'oldest') {
      filtered.sort((a, b) => (a.added_at || '').localeCompare(b.added_at || ''))
    } else if (sortOrder === 'newest') {
      filtered.sort((a, b) => (b.added_at || '').localeCompare(a.added_at || ''))
    }

    setFilteredData(filtered)
    setCurrentPage(1)
  }

  const handleSaveEdit = async () => {
    if (!editingRestaurant) return
    const wasVisited = !!editingRestaurant.visited
    try {
      await api.put(`/api/restaurants/${editingRestaurant.id}`, editFormData)
      setRestaurants((prev) =>
        prev.map((r) =>
          r.id === editingRestaurant.id ? { ...r, ...editFormData } : r
        )
      )
      if (!wasVisited && !!editFormData.visited) {
        justMarkedVisitedRef.current = editingRestaurant.id
      }
      closeEditModal()
    } catch (err) {
      console.error('Failed to save restaurant:', err)
      alert('Failed to save changes')
    }
  }

  const openEditModal = (restaurant: Restaurant, triggerEl?: HTMLButtonElement) => {
    setEditingRestaurant(restaurant)
    setEditFormData({ ...restaurant })
    setEditIndex(filteredData.findIndex((r) => r.id === restaurant.id))
    if (triggerEl) editTriggerRef.current = triggerEl
  }

  const closeEditModal = () => {
    setEditingRestaurant(null)
    setEditFormData({})
    setEditIndex(-1)
    if (editTriggerRef.current) {
      editTriggerRef.current.focus()
      editTriggerRef.current = null
    }
  }

  const navigateEditModal = (dir: number) => {
    const nextIdx = editIndex + dir
    if (nextIdx < 0 || nextIdx >= filteredData.length) return
    const nextR = filteredData[nextIdx]
    setEditingRestaurant(nextR)
    setEditFormData({ ...nextR })
    setEditIndex(nextIdx)
  }

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSaveEdit()
      return
    }
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
      e.preventDefault()
      handleSaveEdit()
      return
    }
  }

  const handleVisitedCheckChange = (checked: boolean) => {
    const today = new Date().toISOString().split('T')[0]
    setEditFormData((prev) => ({
      ...prev,
      visited: (checked ? 1 : 0) as any,
      visited_at: checked ? (prev.visited_at || today) : null,
    }))
  }

  const totalPages = Math.ceil(filteredData.length / perPage)
  const startIdx = (currentPage - 1) * perPage
  const paginatedData = filteredData.slice(startIdx, startIdx + perPage)

  const formatDistance = (dist: number) => {
    if (dist > 100) return Math.round(dist).toLocaleString()
    return (Math.round(dist * 10) / 10).toString()
  }

  return (
    <main id="recommender">
      <LocationSection currentLocation={currentLocation} onLocationChange={saveLocation} />

      <FilterSection
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCuisine={selectedCuisine}
        onCuisineChange={setSelectedCuisine}
        radiusFilter={radiusFilter}
        onRadiusChange={setRadiusFilter}
        visitedFilter={visitedFilter}
        onVisitedChange={setVisitedFilter}
        addedDaysFilter={addedDaysFilter}
        onAddedDaysChange={setAddedDaysFilter}
        sortOrder={sortOrder}
        onSortChange={setSortOrder}
        restaurants={restaurants}
        onReset={handleResetFilters}
        presets={presets}
        activePresetId={activePresetId}
        onSavePreset={saveCurrentAsPreset}
        onSavePresetWithName={savePresetWithName}
        onLoadPreset={loadPreset}
        onDeletePreset={deletePreset}
        onRenamePreset={updatePresetName}
        onUpdateDescription={updatePresetDescription}
        onOverwritePreset={overwritePreset}
        hasLocation={!!currentLocation}
      />

      <div className="results-row">
        <p id="resultsCount" ref={countRef} aria-live="polite" aria-atomic="true">
          {loading ? 'Loading...' : `${filteredData.length} place${filteredData.length !== 1 ? 's' : ''}`}
        </p>
        {totalPages > 1 && (
          <nav id="pagination-top" className="pagination" aria-label="Page navigation">
            <span className="pagination-info" aria-live="polite">
              Page {currentPage} of {totalPages}
            </span>
            <div className="pagination-btns">
              <button
                type="button"
                className="pagination-btn prev-btn"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Prev
              </button>
              <button
                type="button"
                className="pagination-btn next-btn"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          </nav>
        )}
      </div>

      <ul id="cardContainer" tabIndex={-1}>
        {loading ? (
          <li className="card loading">
            <div className="loading-pulse"></div>
          </li>
        ) : paginatedData.length === 0 ? (
          <li className="card empty-state-card">
            <div className="empty-state">
              <p className="empty-state-heading">No places match your filters</p>
              <p className="empty-state-sub">Try adjusting your preferences or location</p>
            </div>
          </li>
        ) : (
          paginatedData.map((r) => {
            const isVisited = !!r.visited
            const mapsUrl = r.url || (r.lat && r.lng ? `https://maps.google.com/?q=${r.lat},${r.lng}` : null)
            const dist = currentLocation && r.lat && r.lng
              ? calculateDistance(currentLocation.lat, currentLocation.lng, r.lat, r.lng)
              : null

            return (
              <li
                key={r.id}
                className={`card${isVisited ? ' is-visited' : ''}`}
                ref={(el) => { if (el) cardRefs.current.set(r.id, el); else cardRefs.current.delete(r.id) }}
              >
                <article>
                  <header>
                    <h2 className="restaurant-name">{smartify(r.title)}</h2>
                    {isVisited && (
                      <span className="visited-badge">
                        <span className="visited-badge-star">✦</span> Visited
                        {r.visited_at && (() => {
                          const visitedDate = new Date(r.visited_at + 'T12:00:00')
                          const today = new Date()
                          const isToday = visitedDate.toDateString() === today.toDateString()
                          const dateStr = isToday ? 'today' : visitedDate.toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric',
                          })
                          return (
                            <>
                              {' '}
                              <time dateTime={r.visited_at}>{dateStr}</time>
                            </>
                          )
                        })()}
                      </span>
                    )}
                    <ul className="card-tags">
                      {r.cuisine && <li className="tag">{r.cuisine}</li>}
                      {r.tags && <li className="tag">{r.tags}</li>}
                    </ul>
                  </header>
                  {r.note && <p className="note">{smartify(r.note)}</p>}
                  <div className="card-footer">
                    <div className="card-location">
                      {r.city && r.state && (
                        <address className="loc-city">
                          {r.city}, {normalizeState(r.state)}
                        </address>
                      )}
                      {dist !== null && (
                        <output className="distance-badge">
                          {formatDistance(dist)} mi
                        </output>
                      )}
                      {mapsUrl && (
                        <>
                          <span className="maps-sep" aria-hidden="true">·</span>
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Open ${r.title} in Maps`}
                            className="maps-link"
                          >
                            Open map ↗
                          </a>
                        </>
                      )}
                    </div>
                    <button
                      className="card-edit-btn"
                      aria-label={`Edit ${r.title}`}
                      onClick={(e) => openEditModal(r, e.currentTarget)}
                      type="button"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 18 18"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        <path
                          d="M12.5 2.5a1.414 1.414 0 0 1 2 2L5.5 13.5l-3 .5.5-3L12.5 2.5Z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                  {r.added_at && (
                    <time className="card-added-date" dateTime={r.added_at}>
                      Added {new Date(r.added_at + 'Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </time>
                  )}
                </article>
              </li>
            )
          })
        )}
      </ul>

      {totalPages > 1 && (
        <nav id="pagination-bottom" className="pagination" aria-label="Page navigation">
          <span className="pagination-info" aria-live="polite">
            Page {currentPage} of {totalPages}
          </span>
          <div className="pagination-btns">
            <button
              type="button"
              className="pagination-btn prev-btn"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Prev
            </button>
            <button
              type="button"
              className="pagination-btn next-btn"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </nav>
      )}

      {editingRestaurant && (
        <dialog id="cardEditModal" open onKeyDown={handleEditKeyDown} onClick={(e) => { if ((e.target as HTMLElement).id === 'cardEditModal') closeEditModal() }}>
          <div className="card-edit-sheet">
            <div className="card-edit-header">
              <h2>{editFormData.title || editingRestaurant.title}</h2>
              <div className="card-edit-nav-group">
                <button
                  id="ce-prev"
                  type="button"
                  className="card-edit-nav-btn"
                  disabled={editIndex <= 0}
                  onClick={() => navigateEditModal(-1)}
                  aria-label="Previous card"
                >
                  ‹
                </button>
                <button
                  id="ce-next"
                  type="button"
                  className="card-edit-nav-btn"
                  disabled={editIndex < 0 || editIndex >= filteredData.length - 1}
                  onClick={() => navigateEditModal(1)}
                  aria-label="Next card"
                >
                  ›
                </button>
              </div>
            </div>

            <div className="edit-field">
              <label htmlFor="edit-title">Restaurant Name</label>
              <input
                id="edit-title"
                type="text"
                value={editFormData.title || ''}
                onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
              />
            </div>

            <div className="filter-row-pair">
              <div className="edit-field">
                <label htmlFor="edit-cuisine">Cuisine</label>
                <input
                  id="edit-cuisine"
                  type="text"
                  value={editFormData.cuisine || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, cuisine: e.target.value })}
                />
              </div>
              <div className="edit-field">
                <label htmlFor="edit-type">Type</label>
                <select
                  id="edit-type"
                  value={editFormData.type || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value })}
                >
                  <option value="">—</option>
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="edit-field">
              <label htmlFor="edit-tags">Tags</label>
              <input
                id="edit-tags"
                type="text"
                value={editFormData.tags || ''}
                onChange={(e) => setEditFormData({ ...editFormData, tags: e.target.value })}
              />
            </div>

            <div className="edit-field">
              <label htmlFor="edit-note">
                Note
                {(editFormData.note?.length ?? 0) > 139 && (
                  <span className="edit-note-counter" data-warn={240 - (editFormData.note?.length ?? 0) < 50 ? 'red' : 'orange'}>
                    {240 - (editFormData.note?.length ?? 0)} left
                  </span>
                )}
              </label>
              <textarea
                id="edit-note"
                rows={1}
                maxLength={240}
                value={editFormData.note || ''}
                onChange={(e) => {
                  e.target.style.height = 'auto'
                  e.target.style.height = e.target.scrollHeight + 'px'
                  setEditFormData({ ...editFormData, note: e.target.value })
                }}
                style={{ resize: 'none', overflow: 'hidden' }}
              />
            </div>

            <div className="filter-row-pair">
              <div className="edit-field">
                <label htmlFor="edit-city">City</label>
                <input
                  id="edit-city"
                  type="text"
                  value={editFormData.city || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                />
              </div>
              <div className="edit-field">
                <label htmlFor="edit-state">State</label>
                <input
                  id="edit-state"
                  type="text"
                  value={editFormData.state || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
                />
              </div>
            </div>

            <div className="edit-field">
              <label htmlFor="edit-country">Country</label>
              <input
                id="edit-country"
                type="text"
                value={editFormData.country || ''}
                onChange={(e) => setEditFormData({ ...editFormData, country: e.target.value })}
              />
            </div>

            <div className="edit-field">
              <label htmlFor="edit-url">Google Maps URL</label>
              <div className="edit-url-wrap">
                <input
                  id="edit-url"
                  type="text"
                  value={editFormData.url || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, url: e.target.value })}
                />
                {editFormData.url && (
                  <a
                    href={editFormData.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="edit-url-link"
                    aria-label="Open URL"
                  >
                    ↗
                  </a>
                )}
              </div>
            </div>

            <div className="edit-field">
              <label htmlFor="edit-open-after">Open after</label>
              <select
                id="edit-open-after"
                value={
                  editFormData.open_after_midnight ? 'midnight'
                  : editFormData.open_after_11pm ? '11pm'
                  : editFormData.open_after_10pm ? '10pm'
                  : ''
                }
                onChange={(e) => {
                  const v = e.target.value
                  setEditFormData({
                    ...editFormData,
                    open_after_10pm: v === '10pm' || v === '11pm' || v === 'midnight',
                    open_after_11pm: v === '11pm' || v === 'midnight',
                    open_after_midnight: v === 'midnight',
                  })
                }}
              >
                <option value="">—</option>
                <option value="10pm">Open past 10 PM</option>
                <option value="11pm">Open past 11 PM</option>
                <option value="midnight">Open past midnight</option>
              </select>
            </div>

            <div className="edit-field edit-field-row">
              <label htmlFor="edit-visited" className="checkbox-label">
                <input
                  id="edit-visited"
                  type="checkbox"
                  checked={!!editFormData.visited}
                  onChange={(e) => handleVisitedCheckChange(e.target.checked)}
                />
                Visited
              </label>
              {!!editFormData.visited && (
                <div style={{ position: 'relative', width: '328px', overflow: 'visible' }}>
                  <input
                    id="edit-visited-at"
                    type="date"
                    className="edit-visited-date-input"
                    value={editFormData.visited_at || ''}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setEditFormData({ ...editFormData, visited_at: e.target.value })}
                  />
                  {editFormData.visited_at && (() => {
                    const selectedDate = new Date(editFormData.visited_at + 'T12:00:00')
                    const today = new Date()
                    return selectedDate.toDateString() === today.toDateString() ? (
                      <span style={{
                        position: 'absolute',
                        left: '111px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '0.9375rem',
                        color: 'var(--md-on-surface-variant)',
                        pointerEvents: 'none',
                        whiteSpace: 'nowrap'
                      }}>
                        – Today
                      </span>
                    ) : null
                  })()}
                </div>
              )}
            </div>

            <div className="card-edit-actions">
              <button className="btn" onClick={closeEditModal}>
                Cancel
              </button>
              <button className="btn primary" onClick={handleSaveEdit}>
                Save{metaHeld && <span style={{ marginLeft: '6px' }}>{/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'}↵</span>}
              </button>
            </div>
          </div>
        </dialog>
      )}
    </main>
  )
}
