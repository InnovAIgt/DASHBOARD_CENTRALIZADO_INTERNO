// Copiado de InnovAIgt/DashboardLeads (Dashboard-Leds/src/hooks/useFilters.js)
import { useContext } from 'react'
import { FiltersContext } from '../context/filtersContext.js'

export function useFilters() {
  const value = useContext(FiltersContext)
  if (!value) throw new Error('useFilters debe usarse dentro de FiltersProvider.')
  return value
}
