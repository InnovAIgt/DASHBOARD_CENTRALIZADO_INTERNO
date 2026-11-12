// Copiado de InnovAIgt/DashboardLeads (Dashboard-Leds/src/context/FiltersProvider.jsx)
import { useMemo, useState } from 'react'
import { FiltersContext } from './filtersContext.js'

const EMPTY_FILTERS = {
  filterPais: null,
  filterEjecutivo: null,
  filterMonthToDayMonth: null,
  filterMonthToDayDay: null,
  filterTipoLead: null,
}

export function FiltersProvider({ children }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const value = useMemo(() => ({
    ...filters,
    setFilter: (key, selection) => setFilters((current) => ({ ...current, [key]: selection })),
    clearFilters: () => setFilters(EMPTY_FILTERS),
  }), [filters])

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>
}
