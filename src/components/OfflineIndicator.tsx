import { useState, useEffect } from 'react'

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      console.log('[Offline Indicator] Back online')
    }

    const handleOffline = () => {
      setIsOnline(false)
      console.log('[Offline Indicator] Went offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline) {
    return null
  }

  return (
    <div className="offline-indicator" role="alert" aria-live="polite">
      <span className="offline-indicator-dot"></span>
      <span>You're offline — viewing cached data</span>
    </div>
  )
}
