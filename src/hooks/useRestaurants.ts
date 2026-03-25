import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Restaurant } from '../types/api'

export function useRestaurants() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = async () => {
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

  useEffect(() => {
    fetch()
  }, [])

  return { restaurants, loading, error, refetch: fetch }
}
