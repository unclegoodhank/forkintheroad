import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Restaurant } from '../types/api'
import AdminRestaurantList from '../components/AdminRestaurantList'

export default function Admin() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    fetchRestaurants()
  }, [])

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
      <h1>Restaurant Admin</h1>

      {error && <div className="error-banner">{error}</div>}

      <div className="admin-controls">
        <button onClick={() => setShowAddForm(!showAddForm)} className="btn-primary" type="button">
          {showAddForm ? 'Cancel' : 'Add Restaurant'}
        </button>

        <label className="file-upload">
          Import CSV
          <input
            type="file"
            accept=".csv"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleImportCSV(file)
            }}
            style={{ display: 'none' }}
          />
        </label>

        <span className="count">{restaurants.length} total</span>
      </div>

      {showAddForm && (
        <AddRestaurantForm
          onSubmit={async (data: any) => {
            try {
              const response = await api.post('/api/restaurants', data)
              const newRestaurant: Restaurant = {
                ...data,
                id: response.data.id,
                added_at: new Date().toISOString(),
                visited: false,
                visited_at: null,
                tags: data.tags || '',
                open_after_10pm: false,
                open_after_11pm: false,
                open_after_midnight: false,
              }
              setRestaurants((prev) => [...prev, newRestaurant])
              setShowAddForm(false)
            } catch (err) {
              alert('Failed to add restaurant')
              console.error(err)
            }
          }}
        />
      )}

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <AdminRestaurantList
          restaurants={restaurants}
          onDelete={handleDelete}
          editingId={editingId}
          onEditStart={setEditingId}
          onRefresh={fetchRestaurants}
        />
      )}
    </div>
  )
}

function AddRestaurantForm({
  onSubmit,
}: {
  onSubmit: (data: Partial<Restaurant>) => Promise<void>
}) {
  const [formData, setFormData] = useState({
    title: '',
    note: '',
    url: '',
    tags: '',
    cuisine: '',
    lat: '',
    lng: '',
    city: '',
    state: '',
    country: '',
    type: '',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      alert('Title is required')
      return
    }

    setLoading(true)
    try {
      await onSubmit({
        ...formData,
        lat: formData.lat ? parseFloat(formData.lat) : null,
        lng: formData.lng ? parseFloat(formData.lng) : null,
        visited: false,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="add-form">
      <input
        type="text"
        placeholder="Restaurant name *"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        required
      />
      <input
        type="text"
        placeholder="Cuisine"
        value={formData.cuisine}
        onChange={(e) => setFormData({ ...formData, cuisine: e.target.value })}
      />
      <input
        type="text"
        placeholder="Note"
        value={formData.note}
        onChange={(e) => setFormData({ ...formData, note: e.target.value })}
      />
      <input
        type="url"
        placeholder="URL"
        value={formData.url}
        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Adding...' : 'Add Restaurant'}
      </button>
    </form>
  )
}
