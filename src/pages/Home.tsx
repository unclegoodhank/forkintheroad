import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Restaurant } from '../types/api'
import LocationSection from '../components/LocationSection'
import FilterSection from '../components/FilterSection'

export default function Home() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [filteredData, setFilteredData] = useState<Restaurant[]>([])
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number; name: string } | null>(
    () => JSON.parse(localStorage.getItem('currentLocation') || 'null')
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCuisine, setSelectedCuisine] = useState('')
  const [radiusFilter, setRadiusFilter] = useState(11.67)
  const [visitedFilter, setVisitedFilter] = useState<'' | 'visited' | 'unvisited'>('')
  const [addedDaysFilter, setAddedDaysFilter] = useState('')
  const [sortOrder, setSortOrder] = useState('distance')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const perPage = 10

  // Edit modal
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null)
  const [editFormData, setEditFormData] = useState<Partial<Restaurant>>({})

  // Fetch restaurants on mount
  useEffect(() => {
    fetchRestaurants()
  }, [])

  // Apply filters whenever they change
  useEffect(() => {
    applyFilters()
  }, [restaurants, searchQuery, selectedCuisine, radiusFilter, visitedFilter, addedDaysFilter, sortOrder, currentLocation])

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
    const R = 3959 // Earth radius in miles
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLng = ((lng2 - lng1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
    return R * (2 * Math.asin(Math.sqrt(a)))
  }

  const sliderToDistance = (sliderValue: number): number => {
    // Convert slider value (0-100) to actual distance in miles
    // Based on the original: 11.67 = 10 miles
    if (sliderValue <= 0) return 0
    if (sliderValue >= 100) return 500
    return Math.round((sliderValue / 11.67) * 10 * 100) / 100
  }

  const applyFilters = () => {
    let filtered = [...restaurants]

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          (r.tags && r.tags.toLowerCase().includes(q)) ||
          (r.note && r.note.toLowerCase().includes(q))
      )
    }

    // Cuisine filter
    if (selectedCuisine && selectedCuisine !== '__food') {
      filtered = filtered.filter((r) => r.cuisine && r.cuisine.toLowerCase().includes(selectedCuisine.toLowerCase()))
    }

    // Radius filter - only apply if not at max distance
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
      filtered = filtered.filter((r) => r.visited)
    } else if (visitedFilter === 'unvisited') {
      filtered = filtered.filter((r) => !r.visited)
    }

    // Added days filter
    if (addedDaysFilter) {
      const days = parseInt(addedDaysFilter)
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)
      filtered = filtered.filter((r) => new Date(r.added_at) >= cutoffDate)
    }

    // Sort
    if (sortOrder === 'distance' && currentLocation) {
      filtered.sort((a, b) => {
        const distA = a.lat && a.lng ? calculateDistance(currentLocation.lat, currentLocation.lng, a.lat, a.lng) : Infinity
        const distB = b.lat && b.lng ? calculateDistance(currentLocation.lat, currentLocation.lng, b.lat, b.lng) : Infinity
        return distA - distB
      })
    } else if (sortOrder === 'oldest') {
      filtered.sort((a, b) => new Date(a.added_at).getTime() - new Date(b.added_at).getTime())
    } else if (sortOrder === 'newest') {
      filtered.sort((a, b) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime())
    }

    setFilteredData(filtered)
    setCurrentPage(1)
  }

  const handleToggleVisited = async (id: number, nowVisited: boolean) => {
    try {
      await api.patch(`/api/restaurants/${id}/visited`, { visited: nowVisited })
      setRestaurants((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, visited: nowVisited, visited_at: nowVisited ? new Date().toISOString().split('T')[0] : null }
            : r
        )
      )
    } catch (err) {
      console.error('Failed to update visited status:', err)
    }
  }

  const openEditModal = (restaurant: Restaurant) => {
    setEditingRestaurant(restaurant)
    setEditFormData(restaurant)
  }

  const closeEditModal = () => {
    setEditingRestaurant(null)
    setEditFormData({})
  }

  const handleSaveEdit = async () => {
    if (!editingRestaurant) return
    try {
      await api.put(`/api/restaurants/${editingRestaurant.id}`, editFormData)
      setRestaurants((prev) =>
        prev.map((r) =>
          r.id === editingRestaurant.id ? { ...r, ...editFormData } : r
        )
      )
      closeEditModal()
    } catch (err) {
      console.error('Failed to save restaurant:', err)
      alert('Failed to save changes')
    }
  }

  const totalPages = Math.ceil(filteredData.length / perPage)
  const startIdx = (currentPage - 1) * perPage
  const paginatedData = filteredData.slice(startIdx, startIdx + perPage)

  const distanceMiles = sliderToDistance(radiusFilter)

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
        distanceMiles={distanceMiles}
      />

      <div className="results-row">
        <p id="resultsCount" aria-live="polite" aria-atomic="true">
          {loading ? 'Loading...' : `${filteredData.length} restaurant${filteredData.length !== 1 ? 's' : ''}`}
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
          <li className="card empty">
            <article>
              <p>No restaurants found. Try adjusting your filters.</p>
            </article>
          </li>
        ) : (
          paginatedData.map((r) => (
            <li key={r.id} className={`card${!!r.visited ? ' is-visited' : ''}`}>
              <article>
                <header>
                  <h2 className="restaurant-name">{r.title}</h2>
                  {!!r.visited && (
                    <span className="visited-badge">
                      <span className="visited-badge-star">✦</span> Visited
                      {r.visited_at && (
                        <>
                          {' · '}
                          <time dateTime={r.visited_at}>
                            {new Date(r.visited_at + 'T12:00:00').toLocaleDateString('en-US', {
                              month: 'short',
                              year: 'numeric',
                            })}
                          </time>
                        </>
                      )}
                    </span>
                  )}
                  <ul className="card-tags">
                    {r.cuisine && <li className="tag">{r.cuisine}</li>}
                    {r.tags && <li className="tag">{r.tags}</li>}
                  </ul>
                </header>
                {r.note && <p className="note">{r.note}</p>}
                <div className="card-footer">
                  <div className="card-location">
                    {r.city && r.state && (
                      <address className="loc-city">
                        {r.city}, {r.state}
                      </address>
                    )}
                    {currentLocation && r.lat && r.lng && (
                      <output className="distance-badge">
                        {calculateDistance(currentLocation.lat, currentLocation.lng, r.lat, r.lng).toFixed(1)} mi
                      </output>
                    )}
                    {r.lat && r.lng && (
                      <a
                        href={`https://maps.google.com/?q=${r.lat},${r.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${r.title} in Google Maps`}
                      >
                        Map
                      </a>
                    )}
                  </div>
                  <button
                    className="card-edit-btn"
                    aria-label={`Edit ${r.title}`}
                    onClick={() => openEditModal(r)}
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
          ))
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
        <dialog id="cardEditModal" open>
          <div className="card-edit-sheet">
            <div className="card-edit-header">
              <h2>{editingRestaurant.title}</h2>
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
              <label htmlFor="edit-note">Note</label>
              <input
                id="edit-note"
                type="text"
                value={editFormData.note || ''}
                onChange={(e) => setEditFormData({ ...editFormData, note: e.target.value })}
              />
            </div>

            <div className="edit-field edit-field-row">
              <label htmlFor="edit-visited" className="checkbox-label">
                <input
                  id="edit-visited"
                  type="checkbox"
                  checked={!!editFormData.visited}
                  onChange={(e) => setEditFormData({ ...editFormData, visited: e.target.checked ? 1 : 0 })}
                />
                Visited
              </label>
              {!!editFormData.visited && (
                <input
                  id="edit-visited-at"
                  type="date"
                  className="edit-visited-date-input"
                  value={editFormData.visited_at || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, visited_at: e.target.value })}
                />
              )}
            </div>

            <div className="card-edit-actions">
              <button className="btn" onClick={closeEditModal}>
                Cancel
              </button>
              <button className="btn primary" onClick={handleSaveEdit}>
                Save
              </button>
            </div>
          </div>
        </dialog>
      )}
    </main>
  )
}
