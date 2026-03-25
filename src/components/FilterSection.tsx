import { useCallback, useRef, useEffect, useState } from 'react'
import { Restaurant } from '../types/api'
import { FOOD_DRINK_TYPES } from '../lib/admin-utils'
import { FilterPreset } from '../types/filters'
import { generatePresetName } from '../lib/preset-utils'




const SLIDER_SNAPS = [0, 11.67, 23.33, 35, 46.67, 58.33, 70, 75, 80, 85, 90, 95, 100]
const SLIDER_DISTANCES = [5, 10, 20, 30, 40, 50, 60, 100, 200, 300, 400, 500, Infinity]

function snapSlider(val: number): number {
  return SLIDER_SNAPS.reduce((closest, s) => Math.abs(s - val) < Math.abs(closest - val) ? s : closest)
}

export function sliderToDistance(val: number): number {
  const snapped = snapSlider(val)
  const idx = SLIDER_SNAPS.indexOf(snapped)
  return idx !== -1 ? SLIDER_DISTANCES[idx] : SLIDER_DISTANCES[0]
}

export function sliderLabel(val: number): string {
  const dist = sliderToDistance(val)
  if (dist === Infinity) return 'Unlimited distance'
  const mi = Math.round(dist)
  return mi <= 5 ? 'Within 5 miles' : `Within ${mi} miles`
}

interface CuisineGroup {
  label: string
  options: { value: string; count: number }[]
}

function getCuisineGroups(restaurants: Restaurant[]): CuisineGroup[] {
  const cuisineCounts: Record<string, number> = {}
  restaurants.forEach((r) => {
    if (r.cuisine) cuisineCounts[r.cuisine] = (cuisineCounts[r.cuisine] || 0) + 1
  })

  const allCuisines = Object.keys(cuisineCounts).sort()
  const foodCuisineSet = new Set(
    restaurants.filter((r) => FOOD_DRINK_TYPES.has(r.type) && r.cuisine).map((r) => r.cuisine)
  )

  const groups: CuisineGroup[] = []
  const foodCuisines = allCuisines.filter((c) => foodCuisineSet.has(c))
  const otherCuisines = allCuisines.filter((c) => !foodCuisineSet.has(c))

  if (foodCuisines.length) {
    groups.push({
      label: 'Food & drink',
      options: foodCuisines.map((c) => ({ value: c, count: cuisineCounts[c] })),
    })
  }
  if (otherCuisines.length) {
    groups.push({
      label: 'Other',
      options: otherCuisines.map((c) => ({ value: c, count: cuisineCounts[c] })),
    })
  }
  return groups
}

interface FilterSectionProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  selectedCuisine: string
  onCuisineChange: (cuisine: string) => void
  radiusFilter: number
  onRadiusChange: (radius: number) => void
  visitedFilter: '' | 'visited' | 'unvisited'
  onVisitedChange: (filter: '' | 'visited' | 'unvisited') => void
  addedDaysFilter: string
  onAddedDaysChange: (days: string) => void
  sortOrder: string
  onSortChange: (order: string) => void
  restaurants: Restaurant[]
  onReset: () => void
  presets: FilterPreset[]
  activePresetId: string | null
  onSavePreset: () => void
  onSavePresetWithName: (name: string, description: string) => void
  onLoadPreset: (preset: FilterPreset) => void
  onDeletePreset: (id: string) => void
  onRenamePreset: (id: string, name: string) => void
  onUpdateDescription: (id: string, description: string) => void
  onOverwritePreset: (id: string) => void
  hasLocation: boolean
}

export default function FilterSection({
  searchQuery,
  onSearchChange,
  selectedCuisine,
  onCuisineChange,
  radiusFilter,
  onRadiusChange,
  visitedFilter,
  onVisitedChange,
  addedDaysFilter,
  onAddedDaysChange,
  sortOrder,
  onSortChange,
  restaurants,
  onReset,
  presets,
  activePresetId,
  onSavePreset,
  onSavePresetWithName,
  onLoadPreset,
  onDeletePreset,
  onRenamePreset,
  onUpdateDescription,
  onOverwritePreset,
  hasLocation,
}: FilterSectionProps) {
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null)
  const [editingDescPresetId, setEditingDescPresetId] = useState<string | null>(null)
  const [openMenuPresetId, setOpenMenuPresetId] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [pendingPresetName, setPendingPresetName] = useState<string | null>(null)
  const [pendingPresetDesc, setPendingPresetDesc] = useState<string>('')
  const [modalField, setModalField] = useState<'name' | 'description' | null>(null)
  const [modalPresetId, setModalPresetId] = useState<string | null>(null)
  const [modalValue, setModalValue] = useState<string>('')
  const sliderRef = useRef<HTMLInputElement>(null)
  const pointerDownRef = useRef(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const presetsRef = useRef<HTMLDivElement>(null)
  const filtersContentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!presetsRef.current?.contains(e.target as Node)) {
        setOpenMenuPresetId(null)
      }
    }
    if (openMenuPresetId) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [openMenuPresetId])

  const cuisineGroups = getCuisineGroups(restaurants)

  const updateSliderFill = useCallback(() => {
    const el = sliderRef.current
    if (!el) return
    const pct = ((parseFloat(el.value) - parseFloat(el.min)) / (parseFloat(el.max) - parseFloat(el.min))) * 100
    el.style.setProperty('--pct', pct + '%')
  }, [])

  useEffect(() => {
    updateSliderFill()
  }, [radiusFilter, updateSliderFill])

  const handleSliderPointerDown = () => {
    pointerDownRef.current = true
  }

  useEffect(() => {
    const handlePointerUp = () => {
      if (!pointerDownRef.current) return
      pointerDownRef.current = false
      const el = sliderRef.current
      if (!el) return
      const val = snapSlider(parseFloat(el.value))
      onRadiusChange(val)
    }
    window.addEventListener('pointerup', handlePointerUp)
    return () => window.removeEventListener('pointerup', handlePointerUp)
  }, [onRadiusChange])

  const handleSliderInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = parseFloat(e.target.value)
    if (pointerDownRef.current) {
      val = snapSlider(val)
      e.target.value = String(val)
    }
    onRadiusChange(val)
    updateSliderFill()
  }

  const handleSliderKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.key)) return
    e.preventDefault()
    const forward = e.key === 'ArrowRight' || e.key === 'ArrowUp'
    const snappedCur = snapSlider(radiusFilter)
    const next = forward
      ? SLIDER_SNAPS.find((s) => s > snappedCur) ?? 100
      : [...SLIDER_SNAPS].reverse().find((s) => s < snappedCur) ?? 0
    onRadiusChange(next)
  }

  const handleSearchClear = () => {
    onSearchChange('')
    searchRef.current?.focus()
  }

  return (
    <form className="filters" aria-label="Search and filters" onSubmit={(e) => e.preventDefault()}>
      <div className="filter-presets-section" ref={presetsRef}>
        <div className="filter-presets-label">My saved filters</div>
        <div className="filter-presets-row">
        {[0, 1, 2].map((idx) => {
          const p = presets[idx]
          return (
            <div key={idx} className="preset-slot">
              {editingPresetId === p?.id ? (
                <input
                  type="text"
                  defaultValue={p.name}
                  onBlur={(e) => {
                    const newName = e.currentTarget.value.trim()
                    if (newName && p && newName !== p.name) {
                      onRenamePreset(p.id, newName)
                    }
                    setEditingPresetId(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const newName = e.currentTarget.value.trim()
                      if (newName && p && newName !== p.name) {
                        onRenamePreset(p.id, newName)
                      }
                      setEditingPresetId(null)
                    } else if (e.key === 'Escape') {
                      setEditingPresetId(null)
                    }
                  }}
                  autoFocus
                  className="preset-name-input"
                />
              ) : p ? (
                <>
                  <div className="preset-button-group">
                    <button
                      type="button"
                      className={`preset-load-btn${activePresetId === p.id ? ' active' : ''}`}
                      onClick={() => onLoadPreset(p)}
                      title={p.name}
                    >
                      {p.name}
                    </button>
                    <button
                      type="button"
                      className="preset-menu-btn"
                      onClick={() => setOpenMenuPresetId(openMenuPresetId === p.id ? null : p.id)}
                      aria-label={`Options for ${p.name}`}
                    >
                      <svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <circle cx="4" cy="10" r="1.5" fill="currentColor" />
                        <circle cx="10" cy="10" r="1.5" fill="currentColor" />
                        <circle cx="16" cy="10" r="1.5" fill="currentColor" />
                      </svg>
                    </button>
                    {openMenuPresetId === p.id && (
                      <div className="preset-menu">
                        <button
                          type="button"
                          className="preset-menu-item"
                          onClick={() => {
                            onOverwritePreset(p.id)
                            setOpenMenuPresetId(null)
                          }}
                        >
                          Save current filters here
                        </button>
                        <button
                          type="button"
                          className="preset-menu-item"
                          onClick={() => {
                            onLoadPreset(p)
                            setOpenMenuPresetId(null)
                          }}
                        >
                          Load preset
                        </button>
                        <button
                          type="button"
                          className="preset-menu-item"
                          onClick={() => {
                            setModalField('name')
                            setModalPresetId(p.id)
                            setModalValue(p.name)
                            setOpenMenuPresetId(null)
                          }}
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          className="preset-menu-item"
                          onClick={() => {
                            setModalField('description')
                            setModalPresetId(p.id)
                            setModalValue(p.description)
                            setOpenMenuPresetId(null)
                          }}
                        >
                          Edit description
                        </button>
                        <button
                          type="button"
                          className="preset-menu-item preset-menu-item-delete"
                          onClick={() => {
                            onDeletePreset(p.id)
                            setOpenMenuPresetId(null)
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </>

              ) : pendingPresetName !== null ? (
                <div className="preset-save-form">
                  <input
                    type="text"
                    defaultValue={pendingPresetName}
                    placeholder="Preset name"
                    onBlur={(e) => {
                      const newName = e.currentTarget.value.trim()
                      if (newName) {
                        onSavePresetWithName(newName, pendingPresetDesc)
                      }
                      setPendingPresetName(null)
                      setPendingPresetDesc('')
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const newName = e.currentTarget.value.trim()
                        if (newName) {
                          onSavePresetWithName(newName, pendingPresetDesc)
                        }
                        setPendingPresetName(null)
                        setPendingPresetDesc('')
                      } else if (e.key === 'Escape') {
                        setPendingPresetName(null)
                        setPendingPresetDesc('')
                      }
                    }}
                    autoFocus
                    className="preset-name-input"
                  />
                  <textarea
                    placeholder="Optional description"
                    value={pendingPresetDesc}
                    onChange={(e) => setPendingPresetDesc(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setPendingPresetName(null)
                        setPendingPresetDesc('')
                      }
                    }}
                    className="preset-desc-input"
                    rows={2}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  className="preset-save-btn"
                  onClick={() => setPendingPresetName(generatePresetName(selectedCuisine, visitedFilter, sortOrder))}
                >
                  Save preset
                </button>
              )}
            </div>
          )
        })}
        </div>
        {activePresetId && presets.find(p => p.id === activePresetId)?.description && (
          <div className="active-preset-subheading">
            {presets.find(p => p.id === activePresetId)!.description}
          </div>
        )}
      </div>

      <button
        type="button"
        className="filter-toggle-btn"
        onClick={() => setFiltersOpen(!filtersOpen)}
        aria-expanded={filtersOpen}
        aria-label={filtersOpen ? 'Hide filters' : 'Show filters'}
      >
        <svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d={filtersOpen ? 'M7 8l6 6 6-6' : 'M7 12l6-6 6 6'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        {filtersOpen ? 'Hide' : 'Show'} filters
      </button>

      <div className="filter-content" ref={filtersContentRef} data-open={filtersOpen}>
      {/* Search */}
      <div className="filter-search-wrap">
        <input
          ref={searchRef}
          type="text"
          id="searchFilter"
          aria-label="Filter by name, cuisine, or note"
          placeholder="Enter a name, cuisine, or note"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchQuery && (
          <button
            id="searchClear"
            type="button"
            aria-label="Clear search"
            onClick={handleSearchClear}
          >
            <svg
              aria-hidden="true"
              focusable="false"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
              <line x1="6.5" y1="6.5" x2="13.5" y2="13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="13.5" y1="6.5" x2="6.5" y2="13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {/* Cuisine Category */}
      <div className="filter-category-wrap">
        <select
          id="categoryFilter"
          value={selectedCuisine}
          onChange={(e) => onCuisineChange(e.target.value)}
        >
          <option value="">All categories</option>
          <option value="__food">All food &amp; drink</option>
          {cuisineGroups.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.value} ({opt.count})
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Visited Filter */}
      <fieldset className="segmented filter-visited-row">
        <legend className="sr-only">Filter by visited status</legend>
        <label>
          <input
            type="radio"
            name="visitedFilter"
            value=""
            checked={visitedFilter === ''}
            onChange={(e) => onVisitedChange(e.target.value as any)}
          />
          All
        </label>
        <label>
          <input
            type="radio"
            name="visitedFilter"
            value="unvisited"
            checked={visitedFilter === 'unvisited'}
            onChange={(e) => onVisitedChange(e.target.value as any)}
          />
          Not visited
        </label>
        <label>
          <input
            type="radio"
            name="visitedFilter"
            value="visited"
            checked={visitedFilter === 'visited'}
            onChange={(e) => onVisitedChange(e.target.value as any)}
          />
          Visited
        </label>
      </fieldset>

      {/* Date Added & Sort */}
      <div className="filter-row-pair">
        <div className="filter-col">
          <label htmlFor="addedFilter" className="filter-label">
            Item added
          </label>
          <select
            id="addedFilter"
            value={addedDaysFilter}
            onChange={(e) => onAddedDaysChange(e.target.value)}
          >
            <option value="">Any date</option>
            <option value="7">This week</option>
            <option value="30">This month</option>
            <option value="90">Last 3 months</option>
            <option value="365">This year</option>
          </select>
        </div>

        <div className="filter-col">
          <label htmlFor="sortOrder" className="filter-label">
            Sort by
          </label>
          <select
            id="sortOrder"
            value={sortOrder}
            onChange={(e) => onSortChange(e.target.value)}
          >
            {hasLocation && <option value="distance">Distance</option>}
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>
      </div>

      {/* Radius Slider */}
      {hasLocation && (
        <div className="radius-slider-wrap">
          <div id="sliderDistance">
            <label htmlFor="radiusFilter" id="radiusLabel">
              {sliderLabel(radiusFilter)}
            </label>
            <input
              ref={sliderRef}
              type="range"
              id="radiusFilter"
              min="0"
              max="100"
              step="0.01"
              value={radiusFilter}
              onChange={handleSliderInput}
              onPointerDown={handleSliderPointerDown}
              onKeyDown={handleSliderKeyDown}
              aria-labelledby="radiusLabel"
            />
            <div className="slider-ticks" aria-hidden="true">
              {SLIDER_SNAPS.map((pos) => (
                <span
                  key={pos}
                  className={`slider-tick${pos === 0 || pos === 100 ? ' slider-tick-end' : ''}`}
                  style={{ left: `${pos}%` }}
                ></span>
              ))}
            </div>
            <div className="slider-endpoints" aria-hidden="true">
              <span>Local</span>
              <span>Distant</span>
            </div>
          </div>
        </div>
      )}
      </div>

      {modalField && modalPresetId && (
        <div className="preset-modal-overlay" onClick={() => setModalField(null)}>
          <div className="preset-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="preset-modal-title">
              {modalField === 'name' ? 'Rename preset' : 'Edit description'}
            </h3>
            {modalField === 'name' ? (
              <input
                type="text"
                value={modalValue}
                onChange={(e) => setModalValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onRenamePreset(modalPresetId, modalValue)
                    setModalField(null)
                  } else if (e.key === 'Escape') {
                    setModalField(null)
                  }
                }}
                autoFocus
                className="preset-modal-input"
              />
            ) : (
              <textarea
                value={modalValue}
                onChange={(e) => setModalValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setModalField(null)
                  }
                }}
                autoFocus
                className="preset-modal-textarea"
                rows={3}
              />
            )}
            <div className="preset-modal-buttons">
              <button
                type="button"
                className="preset-modal-btn preset-modal-btn-cancel"
                onClick={() => setModalField(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="preset-modal-btn preset-modal-btn-save"
                onClick={() => {
                  if (modalField === 'name') {
                    onRenamePreset(modalPresetId, modalValue)
                  } else {
                    onUpdateDescription(modalPresetId, modalValue)
                  }
                  setModalField(null)
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <button type="submit" className="sr-only">Apply filters</button>

    </form>
  )
}
