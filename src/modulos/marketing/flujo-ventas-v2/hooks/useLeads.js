// Copiado de InnovAIgt/DashboardLeads (Dashboard-Leds/src/hooks/useLeads.js)
import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchLeads } from '../services/api.js'

const REFRESH_INTERVAL_MS = 2 * 60 * 60 * 1000

export function useLeads({ enabled = true } = {}) {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const requestInFlight = useRef(false)
  const lastSuccessfulRefresh = useRef(null)

  const reload = useCallback(async (signal) => {
    if (signal?.aborted || requestInFlight.current) return
    requestInFlight.current = true
    setLoading(true)
    setError('')
    try {
      const nextLeads = await fetchLeads(signal)
      const updatedAt = new Date()
      setLeads(nextLeads)
      setLastUpdated(updatedAt)
      lastSuccessfulRefresh.current = updatedAt
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return
      setError(cause instanceof Error ? cause.message : 'Error desconocido al cargar los leads.')
    } finally {
      requestInFlight.current = false
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return undefined
    const controller = new AbortController()
    queueMicrotask(() => void reload(controller.signal))

    const refreshIfStale = () => {
      if (document.visibilityState !== 'visible') return
      const lastRefresh = lastSuccessfulRefresh.current
      if (lastRefresh && Date.now() - lastRefresh.getTime() < REFRESH_INTERVAL_MS) return
      void reload()
    }
    const intervalId = window.setInterval(refreshIfStale, REFRESH_INTERVAL_MS)
    document.addEventListener('visibilitychange', refreshIfStale)
    window.addEventListener('focus', refreshIfStale)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', refreshIfStale)
      window.removeEventListener('focus', refreshIfStale)
      controller.abort()
    }
  }, [reload, enabled])

  return { leads, loading, error, lastUpdated, reload: () => reload() }
}
