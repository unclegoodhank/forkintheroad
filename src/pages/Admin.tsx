import { useState, useEffect, useMemo, useCallback } from 'react'
import { api } from '../lib/api'
import { Restaurant } from '../types/api'
import { isFoodDrink } from '../lib/admin-utils'
import AdminRestaurantList from '../components/AdminRestaurantList'
import AdminEditModal from '../components/AdminEditModal'

const ADMIN_PASSWORD = 'admin'

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Search & sort
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('title')
  const [sortDir, setSortDir] = useState(1)

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const fetchRestaurants = useCallback(async () => {
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
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      fetchRestaurants()
    }
  }, [isAuthenticated, fetchRestaurants])

  // Filter restaurants
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return restaurants
    return restaurants.filter((r) =>
      [r.title, r.cuisine, r.note, r.tags, r.city, r.state, r.country].some(
        (f) => (f || '').toLowerCase().includes(q)
      )
    )
  }, [restaurants, search])

  // Sort restaurants
  const sorted = useMemo(() => {
    const arr = [...filtered]
    arr.sort((a, b) => {
      let av: any, bv: any
      if (sortKey === 'type') {
        av = isFoodDrink(a.type) ? 0 : 1
        bv = isFoodDrink(b.type) ? 0 : 1
      } else {
        av = (a as any)[sortKey] ?? ''
        bv = (b as any)[sortKey] ?? ''
      }
      if (av < bv) return -sortDir
      if (av > bv) return sortDir
      return 0
    })
    return arr
  }, [filtered, sortKey, sortDir])

  // Unique cuisines for the select
  const cuisines = useMemo(() => {
    const set = new Set<string>()
    restaurants.forEach((r) => {
      if (r.cuisine) set.add(r.cuisine)
    })
    return [...set].sort()
  }, [restaurants])

  // Missing city count
  const missingCityCount = useMemo(
    () => restaurants.filter((r) => !r.city).length,
    [restaurants]
  )

  const canNavigate = useMemo(() => {
    if (editingId == null) return { prev: false, next: false }
    const idx = sorted.findIndex((r) => r.id === editingId)
    return { prev: idx > 0, next: idx < sorted.length - 1 }
  }, [editingId, sorted])

  const editingRestaurant = useMemo(
    () => (editingId != null ? restaurants.find((r) => r.id === editingId) || null : null),
    [editingId, restaurants]
  )

  const handleNavigate = useCallback(
    (dir: -1 | 1) => {
      if (editingId == null) return
      const idx = sorted.findIndex((r) => r.id === editingId)
      const next = sorted[idx + dir]
      if (next) setEditingId(next.id)
    },
    [editingId, sorted]
  )

  const handlePasswordSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (password === ADMIN_PASSWORD) {
        setIsAuthenticated(true)
        setPasswordError('')
        setPassword('')
      } else {
        setPasswordError('Incorrect password')
        setPassword('')
      }
    },
    [password]
  )

  // ── Login screen ──
  if (!isAuthenticated) {
    return (
      <div className="admin-login">
        <div className="admin-login-box">
          <h1>Admin Access</h1>
          <form onSubmit={handlePasswordSubmit}>
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            <button type="submit">Login</button>
          </form>
          {passwordError && <p className="error">{passwordError}</p>}
        </div>
      </div>
    )
  }

  // ── Handlers (only used in authenticated view) ──
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => d * -1)
    } else {
      setSortKey(key)
      setSortDir(1)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this restaurant?')) return
    try {
      await api.delete(`/api/restaurants/${id}`)
      setRestaurants((prev) => prev.filter((r) => r.id !== id))
    } catch (err) {
      alert('Failed to delete restaurant')
      console.error(err)
    }
  }

  const openAdd = () => {
    setEditingId(null)
    setModalOpen(true)
  }

  const openEdit = (id: number) => {
    setEditingId(id)
    setModalOpen(true)
  }

  const handleModalSave = async (data: Partial<Restaurant>) => {
    if (editingId != null) {
      await api.put(`/api/restaurants/${editingId}`, data)
    } else {
      await api.post('/api/restaurants', data)
    }
    await fetchRestaurants()
    setModalOpen(false)
  }

  const handleImportCSV = async (file: File) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await api.post('/api/admin/import-csv', formData)
      alert(`Imported: ${response.data.added} added, ${response.data.updated} updated`)
      fetchRestaurants()
    } catch (err) {
      alert('Failed to import CSV')
      console.error(err)
    }
  }

  return (
    <div className="admin">
      <div className="admin-header">
        <h1>Restaurant Admin</h1>
        <button onClick={() => setIsAuthenticated(false)} className="btn-logout" type="button">
          Logout
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {missingCityCount > 0 && (
        <div className="admin-notice">
          {missingCityCount} place{missingCityCount === 1 ? '' : 's'} missing city data.
        </div>
      )}

      <div className="admin-toolbar">
        <input
          type="text"
          placeholder="Filter by name, cuisine, note…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="admin-search"
        />
        <span className="admin-count">{filtered.length} places</span>
        <button onClick={openAdd} className="admin-btn-add" type="button">
          + Add Place
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <AdminRestaurantList
          restaurants={sorted}
          onDelete={handleDelete}
          onEdit={openEdit}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
        />
      )}

      {modalOpen && (
        <AdminEditModal
          restaurant={editingId != null ? editingRestaurant : null}
          cuisines={cuisines}
          onSave={handleModalSave}
          onClose={() => setModalOpen(false)}
          onNavigate={editingId != null ? handleNavigate : undefined}
          canNavigate={editingId != null ? canNavigate : undefined}
        />
      )}
    </div>
  )
}
