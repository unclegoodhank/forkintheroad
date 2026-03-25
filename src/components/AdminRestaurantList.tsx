import { useState } from 'react'
import { Restaurant } from '../types/api'
import { api } from '../lib/api'

interface AdminRestaurantListProps {
  restaurants: Restaurant[]
  onDelete: (id: number) => void
  editingId: number | null
  onEditStart: (id: number | null) => void
  onRefresh: () => void
}

export default function AdminRestaurantList({
  restaurants,
  onDelete,
  editingId,
  onEditStart,
  onRefresh,
}: AdminRestaurantListProps) {
  return (
    <table className="admin-table">
      <thead>
        <tr>
          <th>Title</th>
          <th>Cuisine</th>
          <th>Note</th>
          <th>Visited</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {restaurants.map((r) => (
          <AdminRestaurantRow
            key={r.id}
            restaurant={r}
            isEditing={editingId === r.id}
            onEditStart={() => onEditStart(r.id)}
            onEditEnd={() => onEditStart(null)}
            onDelete={() => onDelete(r.id)}
            onRefresh={onRefresh}
          />
        ))}
      </tbody>
    </table>
  )
}

function AdminRestaurantRow({
  restaurant,
  isEditing,
  onEditStart,
  onEditEnd,
  onDelete,
  onRefresh,
}: {
  restaurant: Restaurant
  isEditing: boolean
  onEditStart: () => void
  onEditEnd: () => void
  onDelete: () => void
  onRefresh: () => void
}) {
  const [editData, setEditData] = useState(restaurant)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put(`/api/restaurants/${restaurant.id}`, editData)
      onRefresh()
      onEditEnd()
    } catch (err) {
      alert('Failed to save')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (isEditing) {
    return (
      <tr className="editing-row">
        <td>
          <input
            type="text"
            value={editData.title}
            onChange={(e) => setEditData({ ...editData, title: e.target.value })}
          />
        </td>
        <td>
          <input
            type="text"
            value={editData.cuisine}
            onChange={(e) => setEditData({ ...editData, cuisine: e.target.value })}
          />
        </td>
        <td>
          <input
            type="text"
            value={editData.note}
            onChange={(e) => setEditData({ ...editData, note: e.target.value })}
          />
        </td>
        <td>
          <input
            type="checkbox"
            checked={editData.visited}
            onChange={(e) => setEditData({ ...editData, visited: e.target.checked })}
          />
        </td>
        <td>
          <button onClick={handleSave} disabled={saving} className="btn-save">
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button onClick={onEditEnd} className="btn-cancel">
            Cancel
          </button>
        </td>
      </tr>
    )
  }

  return (
    <tr>
      <td>{restaurant.title}</td>
      <td>{restaurant.cuisine}</td>
      <td>{restaurant.note}</td>
      <td>{restaurant.visited ? '✓' : '○'}</td>
      <td>
        <button onClick={onEditStart} className="btn-small">
          Edit
        </button>
        <button onClick={onDelete} className="btn-small btn-danger">
          Delete
        </button>
      </td>
    </tr>
  )
}
