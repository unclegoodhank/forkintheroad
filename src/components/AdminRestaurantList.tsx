import { Restaurant } from '../types/api'
import { isFoodDrink, normalizeState } from '../lib/admin-utils'

interface AdminRestaurantListProps {
  restaurants: Restaurant[]
  onDelete: (id: number) => void
  onEdit: (id: number) => void
  sortKey: string
  sortDir: number
  onSort: (key: string) => void
}

function formatLocation(r: Restaurant): string {
  const parts = [r.city, r.state ? normalizeState(r.state) : ''].filter(Boolean)
  return parts.length ? parts.join(', ') : '—'
}

function SortHeader({
  label,
  field,
  sortKey,
  sortDir,
  onSort,
}: {
  label: string
  field: string
  sortKey: string
  sortDir: number
  onSort: (key: string) => void
}) {
  const active = sortKey === field
  return (
    <th className="sortable" onClick={() => onSort(field)}>
      {label}
      {active && <span className="sort-arrow">{sortDir === 1 ? ' ▲' : ' ▼'}</span>}
    </th>
  )
}

export default function AdminRestaurantList({
  restaurants,
  onDelete,
  onEdit,
  sortKey,
  sortDir,
  onSort,
}: AdminRestaurantListProps) {
  // Group by country when sorted by city
  const grouped = sortKey === 'city'
  let groups: [string, Restaurant[]][] = []

  if (grouped) {
    const map = new Map<string, Restaurant[]>()
    for (const r of restaurants) {
      const key = r.country || '—'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r)
    }
    groups = [...map.entries()].sort(([a], [b]) => {
      if (a === 'United States') return -1
      if (b === 'United States') return 1
      if (a === '—') return 1
      if (b === '—') return -1
      return a.localeCompare(b)
    })
  }

  const renderRow = (r: Restaurant) => (
    <tr key={r.id}>
      <td className="col-title">{r.title}</td>
      <td>{formatLocation(r)}</td>
      <td>{r.cuisine}</td>
      <td className="col-note" title={r.note}>{r.note}</td>
      <td className="col-coords">
        {r.lat != null ? (
          <a
            href={`https://www.google.com/maps?q=${r.lat},${r.lng}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {r.lat.toFixed(4)}, {r.lng!.toFixed(4)}
          </a>
        ) : (
          '—'
        )}
      </td>
      <td>{r.visited ? <span className="admin-visited-badge">Visited</span> : ''}</td>
      <td style={{ textAlign: 'center' }}>{isFoodDrink(r.type) ? 'Yes' : ''}</td>
      <td style={{ textAlign: 'center' }}>{r.open_after_10pm ? '✓' : ''}</td>
      <td style={{ textAlign: 'center' }}>{r.open_after_11pm ? '✓' : ''}</td>
      <td style={{ textAlign: 'center' }}>{r.open_after_midnight ? '✓' : ''}</td>
      <td className="col-actions">
        <button onClick={() => onEdit(r.id)} className="btn-small">Edit</button>
        <button onClick={() => onDelete(r.id)} className="btn-small btn-danger">Delete</button>
      </td>
    </tr>
  )

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <SortHeader label="Name" field="title" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortHeader label="Location" field="city" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortHeader label="Cuisine" field="cuisine" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <th>Note</th>
            <SortHeader label="Coords" field="lat" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortHeader label="Visited" field="visited" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortHeader label="Food & Drink" field="type" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortHeader label="10 PM" field="open_after_10pm" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortHeader label="11 PM" field="open_after_11pm" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <SortHeader label="Midnight" field="open_after_midnight" sortKey={sortKey} sortDir={sortDir} onSort={onSort} />
            <th></th>
          </tr>
        </thead>
        <tbody>
          {grouped
            ? groups.map(([country, items]) => (
                <Fragment key={country}>
                  <tr className="group-header">
                    <td colSpan={11}>
                      {country} <span className="group-count">({items.length})</span>
                    </td>
                  </tr>
                  {items.map(renderRow)}
                </Fragment>
              ))
            : restaurants.map(renderRow)}
        </tbody>
      </table>
    </div>
  )
}

import { Fragment } from 'react'
