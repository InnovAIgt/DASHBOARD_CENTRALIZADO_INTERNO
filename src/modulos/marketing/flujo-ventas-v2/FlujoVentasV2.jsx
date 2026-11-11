// Flujo de ventas v2 (prueba) · pantalla principal dentro del portal.
// Lógica (carga de datos, filtros y cálculos): copiada de InnovAIgt/DashboardLeads, en utils/,
// hooks/, context/ y services/, sin cambios. Diseño visual propio basado en el dashboard de
// Activaciones (ver pantalla/ y flujo-ventas-v2.css). Documentación: docs/marketing/README.md
import { useMemo, useState } from 'react'
import { Users } from 'lucide-react'
import { FiltersProvider } from './context/FiltersProvider.jsx'
import { useFilters } from './hooks/useFilters.js'
import { useLeads } from './hooks/useLeads.js'
import { summarize } from './utils/analytics.js'
import { AvisoError, Cargando, Vacio } from './pantalla/comunes.jsx'
import { aplicarFiltros, hayFiltrosActivos, PERIODO_VACIO } from './pantalla/datos.js'
import { BarraFiltros } from './pantalla/Filtros.jsx'
import { VistaGeneral } from './pantalla/VistaGeneral.jsx'
import './flujo-ventas-v2.css'

const horaFormato = new Intl.DateTimeFormat('es-SV', { hour: '2-digit', minute: '2-digit' })

function EstadoConexion({ cargando, error, actualizado }) {
  if (error) return <div className="fv2-estado is-error">Sin conexión con Prospekt IA</div>
  if (cargando && !actualizado) return <div className="fv2-estado is-cargando">Sincronizando…</div>
  return <div className="fv2-estado">Actualizado: <b>{actualizado ? horaFormato.format(actualizado) : '—'}</b></div>
}

function FlujoVentasV2Contenido() {
  const api = useLeads()
  const { leads, loading, error } = api
  const filters = useFilters()
  const [periodo, setPeriodo] = useState(PERIODO_VACIO)

  const filtrados = useMemo(() => aplicarFiltros(leads, filters, periodo), [leads, filters, periodo])
  const summary = useMemo(() => summarize(filtrados), [filtrados])
  const restablecer = () => {
    filters.clearFilters()
    setPeriodo(PERIODO_VACIO)
  }

  return <div className="fv2-pagina">
    <header className="fv2-encabezado">
      <div>
        <div className="fv2-eyebrow">Marketing · Flujo de ventas</div>
        <h1 className="fv2-titulo">Flujo de ventas <span className="fv2-etiqueta-prueba">v2 · prueba</span></h1>
        <p className="fv2-subtitulo">Cómo avanzan los leads asignados a cada ejecutivo, de la asignación al cierre · Guatemala y El Salvador.</p>
      </div>
      <EstadoConexion cargando={loading} error={error} actualizado={api.lastUpdated} />
    </header>

    {leads.length > 0 && <BarraFiltros
      leads={leads}
      filters={filters}
      periodo={periodo}
      onPeriodo={setPeriodo}
      onRestablecer={restablecer}
      filtrados={filtrados.length}
      cargando={loading}
      onActualizar={api.reload}
    />}

    {error && <AvisoError mensaje={error} onReintentar={api.reload} />}
    {loading && !leads.length && <Cargando />}
    {leads.length > 0 && <VistaGeneral leads={filtrados} summary={summary} showAllFunnel={!hayFiltrosActivos(filters, periodo)} />}
    {!loading && !error && !leads.length && <div className="fv2-panel"><Users size={22} /><Vacio titulo="Prospekt IA no devolvió leads." texto="Revisa la conexión e inténtalo de nuevo." /></div>}
  </div>
}

export function FlujoVentasV2() {
  return <div className="fv2">
    <FiltersProvider><FlujoVentasV2Contenido /></FiltersProvider>
  </div>
}
