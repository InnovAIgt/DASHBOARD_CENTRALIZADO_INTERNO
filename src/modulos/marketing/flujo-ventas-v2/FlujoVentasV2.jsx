// Flujo de ventas v2 (prueba) · Vista 1 "Dashboard General" de InnovAIgt/DashboardLeads dentro del portal.
// Basado en Dashboard-Leds/src/DashboardHome.jsx (DashboardContent) con la misma lógica, pero:
//   - solo la Vista 1 (sin la Vista 2 de Seguimientos ni las pestañas),
//   - sin modo demo y sin logo (el portal ya tiene su propio encabezado),
//   - todo dentro del contenedor .fv2, que encierra los estilos (ver flujo-ventas-v2.css).
// Documentación: docs/marketing/README.md
import { useMemo } from 'react'
import { RefreshCw, Users } from 'lucide-react'
import { FilterBar } from './components/FilterBar.jsx'
import { ErrorBanner, LoadingState } from './components/ui.jsx'
import { FiltersProvider } from './context/FiltersProvider.jsx'
import { useFilters } from './hooks/useFilters.js'
import { useLeads } from './hooks/useLeads.js'
import { applyFilters, FILTER_DEFS, summarize } from './utils/analytics.js'
import { AnalyticsView } from './views/AnalyticsView.jsx'
import './flujo-ventas-v2.css'

const timeFormat = new Intl.DateTimeFormat('es-SV', { hour: '2-digit', minute: '2-digit' })

function FlujoVentasV2Content() {
  const api = useLeads()
  const { leads, loading, error } = api
  const filters = useFilters()

  const filtered = useMemo(() => applyFilters(leads, filters), [leads, filters])
  const summary = useMemo(() => summarize(filtered), [filtered])

  return <div className="min-h-screen bg-canvas text-ink">
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold tracking-tight">Flujo de ventas v2 (prueba)</h1>
          <p className="truncate text-xs text-muted">Dashboard general · Guatemala y El Salvador</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className={`badge ${error ? 'badge-bad' : loading ? 'badge-neutral' : 'badge-good'}`}>
            <i className="status-dot" />{error ? 'API sin conexión' : loading ? 'Sincronizando…' : 'API conectada'}
          </span>
          {api.lastUpdated && <span className="hidden text-muted sm:inline">Actualizado {timeFormat.format(api.lastUpdated)}</span>}
          <button type="button" className="btn btn-ghost" onClick={api.reload} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />Actualizar
          </button>
        </div>
      </div>
    </header>

    {leads.length > 0 && <FilterBar leads={leads} filters={filters} filteredCount={filtered.length} />}

    <main className="mx-auto grid max-w-[1440px] gap-4 px-4 py-5 sm:px-6">
      {error && <ErrorBanner message={error} onRetry={api.reload} />}
      {loading && !leads.length && <LoadingState />}
      {leads.length > 0 && <AnalyticsView leads={filtered} summary={summary} showAllFunnel={FILTER_DEFS.every((def) => filters[def.key] == null)} />}
      {!loading && !error && !leads.length && <div className="card grid place-items-center gap-1 py-12 text-center text-sm text-muted">
        <Users size={22} /><strong className="text-ink">La API no devolvió leads.</strong><span>Revisa la conexión e inténtalo de nuevo.</span>
      </div>}
      <footer className="flex flex-wrap justify-between gap-2 border-t border-line pt-4 text-xs text-muted">
        <span>Fuente: Prospekt IA · lógica de InnovAIgt/DashboardLeads</span>
        <span>Actualización automática cada 2 horas</span>
      </footer>
    </main>
  </div>
}

export function FlujoVentasV2() {
  return <div className="fv2">
    <FiltersProvider><FlujoVentasV2Content /></FiltersProvider>
  </div>
}
