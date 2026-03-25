import { useState, useEffect, useRef, useCallback } from 'react'
import { Restaurant } from '../types/api'
import { api } from '../lib/api'
import { normalizeState, extractNameFromMapsUrl, todayStr, TYPE_OPTIONS } from '../lib/admin-utils'

interface AdminEditModalProps {
  restaurant: Partial<Restaurant> | null // null = add mode
  cuisines: string[]
  onSave: (data: Partial<Restaurant>) => Promise<void>
  onClose: () => void
  onNavigate?: (dir: -1 | 1) => void
  canNavigate?: { prev: boolean; next: boolean }
}

const EMPTY_FORM = {
  title: '',
  city: '',
  state: '',
  country: '',
  cuisine: '',
  type: '',
  tags: '',
  note: '',
  url: '',
  lat: '' as string | number,
  lng: '' as string | number,
  visited: false,
  visited_at: '',
  open_after_10pm: false,
  open_after_11pm: false,
  open_after_midnight: false,
}

export default function AdminEditModal({
  restaurant,
  cuisines,
  onSave,
  onClose,
  onNavigate,
  canNavigate,
}: AdminEditModalProps) {
  const isEdit = restaurant?.id != null
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [lookupUrl, setLookupUrl] = useState('')
  const [lookupStatus, setLookupStatus] = useState<{ msg: string; ok: boolean } | null>(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [metaHeld, setMetaHeld] = useState(false)
  const lookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const lookupRef = useRef<HTMLInputElement>(null)
  const modalOpenedAt = useRef(Date.now())
  const handleSubmitRef = useRef<() => void>(() => {})

  // Populate form when restaurant changes
  useEffect(() => {
    modalOpenedAt.current = Date.now()
    if (restaurant) {
      setForm({
        title: restaurant.title || '',
        city: restaurant.city || '',
        state: restaurant.state || '',
        country: restaurant.country || '',
        cuisine: restaurant.cuisine || '',
        type: restaurant.type || '',
        tags: restaurant.tags || '',
        note: restaurant.note || '',
        url: restaurant.url || '',
        lat: restaurant.lat ?? '',
        lng: restaurant.lng ?? '',
        visited: restaurant.visited || false,
        visited_at: restaurant.visited_at ? restaurant.visited_at.split('T')[0] : '',
        open_after_10pm: restaurant.open_after_10pm || false,
        open_after_11pm: restaurant.open_after_11pm || false,
        open_after_midnight: restaurant.open_after_midnight || false,
      })
    } else {
      setForm({ ...EMPTY_FORM })
    }
    setLookupUrl('')
    setLookupStatus(null)
    setTimeout(() => {
      if (isEdit) titleRef.current?.focus()
      else lookupRef.current?.focus()
    }, 50)
  }, [restaurant])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Meta' || e.key === 'Control') setMetaHeld(true)
      if (e.key === 'Escape') onClose()
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        handleSubmitRef.current()
      }
      if (e.altKey && e.key === 'ArrowLeft' && onNavigate && canNavigate?.prev) {
        e.preventDefault()
        onNavigate(-1)
      }
      if (e.altKey && e.key === 'ArrowRight' && onNavigate && canNavigate?.next) {
        e.preventDefault()
        onNavigate(1)
      }
    }
    const upHandler = (e: KeyboardEvent) => {
      if (e.key === 'Meta' || e.key === 'Control') setMetaHeld(false)
    }
    window.addEventListener('keydown', handler)
    window.addEventListener('keyup', upHandler)
    return () => {
      window.removeEventListener('keydown', handler)
      window.removeEventListener('keyup', upHandler)
    }
  }, [onClose, onNavigate, canNavigate])

  const doLookup = useCallback(async (url: string) => {
    if (!url.trim()) return
    setLookupLoading(true)
    setLookupStatus(null)
    try {
      const res = await api.post('/api/lookup', { url })
      const d = res.data
      setForm((prev) => ({
        ...prev,
        title: d.title || prev.title,
        city: d.city || prev.city,
        state: normalizeState(d.state) || prev.state,
        country: d.country || prev.country,
        cuisine: d.cuisine || prev.cuisine,
        url: d.url || prev.url,
        lat: d.lat != null ? Number(d.lat.toFixed(5)) : prev.lat,
        lng: d.lng != null ? Number(d.lng.toFixed(5)) : prev.lng,
      }))
      setLookupUrl('')
      setLookupStatus({ msg: 'Lookup complete', ok: true })
      setTimeout(() => titleRef.current?.focus(), 50)
    } catch (err: any) {
      setLookupStatus({ msg: err.response?.data?.error || 'Lookup failed', ok: false })
    } finally {
      setLookupLoading(false)
    }
  }, [])

  const handleLookupInput = (val: string) => {
    setLookupUrl(val)
    if (lookupTimer.current) clearTimeout(lookupTimer.current)
    // Try instant name extraction
    const name = extractNameFromMapsUrl(val)
    if (name && !form.title) {
      setForm((prev) => ({ ...prev, title: name }))
    }
    if (val.trim()) {
      lookupTimer.current = setTimeout(() => doLookup(val), 600)
    }
  }

  const handleLookupPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text')
    if (text.trim()) {
      if (lookupTimer.current) clearTimeout(lookupTimer.current)
      const name = extractNameFromMapsUrl(text)
      if (name && !form.title) {
        setForm((prev) => ({ ...prev, title: name }))
      }
      setTimeout(() => doLookup(text), 100)
    }
  }

  const handleGeocode = async () => {
    if (!form.lat || !form.lng) return
    setGeocoding(true)
    try {
      const res = await api.post('/api/geocode', {
        lat: Number(form.lat),
        lng: Number(form.lng),
      })
      const d = res.data
      setForm((prev) => ({
        ...prev,
        city: prev.city || d.city || '',
        state: prev.state || normalizeState(d.state) || '',
        country: prev.country || d.country || '',
      }))
    } catch {
      alert('Geocoding failed')
    } finally {
      setGeocoding(false)
    }
  }

  const handleVisitedChange = (checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      visited: checked,
      visited_at: checked ? (prev.visited_at || todayStr()) : '',
    }))
  }

  const clampDate = (val: string) => {
    const today = todayStr()
    if (val > today) return today
    return val
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      alert('Name is required')
      return
    }
    setSaving(true)
    try {
      await onSave({
        ...form,
        state: normalizeState(form.state),
        lat: form.lat !== '' ? Number(form.lat) : null,
        lng: form.lng !== '' ? Number(form.lng) : null,
        visited_at: form.visited ? (form.visited_at || todayStr()) : null,
      })
    } finally {
      setSaving(false)
    }
  }
  handleSubmitRef.current = handleSubmit

  const handleBackdropClick = () => {
    if (Date.now() - modalOpenedAt.current > 350) onClose()
  }

  const update = (field: string, value: any) => setForm((prev) => ({ ...prev, [field]: value }))

  return (
    <div className="admin-dialog-overlay" onClick={handleBackdropClick}>
      <div className="admin-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="admin-dialog__header">
          <h2>{isEdit ? 'Edit Place' : 'Add Place'}</h2>
          <div className="admin-dialog__header-actions">
            {isEdit && onNavigate && (
              <>
                <button
                  type="button"
                  className="admin-dialog__nav"
                  disabled={!canNavigate?.prev}
                  onClick={() => onNavigate(-1)}
                  aria-label="Previous"
                >
                  ←
                </button>
                <button
                  type="button"
                  className="admin-dialog__nav"
                  disabled={!canNavigate?.next}
                  onClick={() => onNavigate(1)}
                  aria-label="Next"
                >
                  →
                </button>
              </>
            )}
            <button type="button" className="admin-dialog__close" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        <div className="admin-dialog__body">
          {/* Lookup URL */}
          <div className="admin-dialog__field admin-dialog__full">
            <label>Google Maps Link</label>
            <div className="admin-dialog__lookup-wrap">
              <input
                ref={lookupRef}
                type="text"
                placeholder="Paste a Google Maps link…"
                value={lookupUrl}
                onChange={(e) => handleLookupInput(e.target.value)}
                onPaste={handleLookupPaste}
              />
              {lookupLoading && <span className="admin-dialog__spinner" />}
            </div>
            {lookupStatus && (
              <span className={`admin-dialog__status ${lookupStatus.ok ? 'ok' : 'err'}`}>
                {lookupStatus.msg}
              </span>
            )}
          </div>

          {/* Name */}
          <div className="admin-dialog__field admin-dialog__full">
            <label>Name</label>
            <input
              ref={titleRef}
              type="text"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
            />
          </div>

          {/* City / State */}
          <div className="admin-dialog__field">
            <label>City</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => update('city', e.target.value)}
            />
          </div>
          <div className="admin-dialog__field">
            <label>State</label>
            <input
              type="text"
              value={form.state}
              onChange={(e) => update('state', e.target.value)}
            />
          </div>

          {/* Category / Type */}
          <div className="admin-dialog__field">
            <label>Category</label>
            <select value={form.cuisine} onChange={(e) => update('cuisine', e.target.value)}>
              <option value="">—</option>
              {cuisines.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="admin-dialog__field">
            <label>Type</label>
            <select value={form.type} onChange={(e) => update('type', e.target.value)}>
              <option value="">—</option>
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div className="admin-dialog__field">
            <label>Tags</label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => update('tags', e.target.value)}
            />
          </div>

          {/* Note */}
          <div className="admin-dialog__field admin-dialog__full">
            <label>Note</label>
            <textarea
              value={form.note}
              onChange={(e) => update('note', e.target.value)}
              rows={2}
            />
          </div>

          {/* Maps URL */}
          <div className="admin-dialog__field admin-dialog__full">
            <label>Maps URL</label>
            <input
              type="text"
              value={form.url}
              onChange={(e) => update('url', e.target.value)}
            />
          </div>

          {/* Lat / Lng */}
          <div className="admin-dialog__field">
            <label>Latitude</label>
            <input type="number" step="any" value={form.lat} readOnly className="readonly" />
          </div>
          <div className="admin-dialog__field">
            <label>Longitude</label>
            <input type="number" step="any" value={form.lng} readOnly className="readonly" />
          </div>

          {/* Checkboxes row */}
          <div className="admin-dialog__field admin-dialog__full admin-dialog__checks">
            <label>
              <input
                type="checkbox"
                checked={form.visited}
                onChange={(e) => handleVisitedChange(e.target.checked)}
              />
              Visited
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.open_after_10pm}
                onChange={(e) => update('open_after_10pm', e.target.checked)}
              />
              Open after 10 PM
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.open_after_11pm}
                onChange={(e) => update('open_after_11pm', e.target.checked)}
              />
              Open after 11 PM
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.open_after_midnight}
                onChange={(e) => update('open_after_midnight', e.target.checked)}
              />
              Open after Midnight
            </label>
          </div>

          {/* Visited date */}
          {form.visited && (
            <div className="admin-dialog__field admin-dialog__full">
              <label>
                Visited date
                {form.visited_at === todayStr() && (
                  <span className="admin-dialog__date-hint"> – Today</span>
                )}
              </label>
              <input
                type="date"
                value={form.visited_at}
                max={todayStr()}
                onChange={(e) => update('visited_at', clampDate(e.target.value))}
              />
            </div>
          )}
        </div>

        <div className="admin-dialog__footer">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          {isEdit && (
            <button
              type="button"
              onClick={handleGeocode}
              disabled={geocoding || !form.lat || !form.lng}
            >
              {geocoding ? 'Looking up…' : 'Get missing info'}
            </button>
          )}
          <button type="button" className="primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : <>Save{metaHeld && <span style={{ marginLeft: '6px' }}>{/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'}↵</span>}</>}
          </button>
        </div>
      </div>
    </div>
  )
}
