// Flujo de ventas v2 (prueba) · pantalla principal dentro del portal.
// Lógica (carga de datos, filtros y cálculos): copiada de InnovAIgt/DashboardLeads, en utils/,
// hooks/, context/ y services/, sin cambios. Diseño visual propio basado en el dashboard de
// Activaciones (ver pantalla/ y flujo-ventas-v2.css). Documentación: docs/marketing/README.md
import { useEffect, useMemo, useRef, useState } from 'react'
import { RefreshCw, Users } from 'lucide-react'
import { FiltersProvider } from './context/FiltersProvider.jsx'
import { useFilters } from './hooks/useFilters.js'
import { useLeads } from './hooks/useLeads.js'
import { qualificationLabel, summarize } from './utils/analytics.js'
import { AvisoError, Vacio } from './pantalla/comunes.jsx'
import { aplicarFiltros, FILTROS_POR_DEFECTO, listaEjecutivos, periodoPorDefecto } from './pantalla/datos.js'
import { Ejecutivos } from './pantalla/Ejecutivos.jsx'
import { BarraFiltros } from './pantalla/Filtros.jsx'
import { Informe } from './pantalla/Informe.jsx'
import { cargarHerramientaPdf, construirReporte, MODULOS_PDF, nombreArchivoPdf, textosFiltros } from './pantalla/pdf.js'
import { VistaGeneral } from './pantalla/VistaGeneral.jsx'
import './flujo-ventas-v2.css'

/** Valor que se recuerda mientras la página esté abierta (sessionStorage; si falla, solo en memoria). */
function useRecordado(clave, inicial) {
  const [valor, setValor] = useState(() => {
    try { const v = sessionStorage.getItem(clave); return v == null ? inicial : v } catch { return inicial }
  })
  const guardar = (v) => {
    setValor(v)
    try { sessionStorage.setItem(clave, v) } catch { /* solo en memoria */ }
  }
  return [valor, guardar]
}

const ID_BOTON_PDF = 'fv2BtnPdf'

const PESTANAS = [
  { key: 'resumen', label: 'Resumen' },
  { key: 'ejecutivos', label: 'Ejecutivos' },
  { key: 'informe', label: 'Informe detallado' },
]
// La pestaña elegida se recuerda mientras la página esté abierta (sessionStorage), aunque se
// cambie a otro dashboard del menú y se vuelva.
const CLAVE_PESTANA = 'fv2-pestana'
const leerPestana = () => {
  try { const v = sessionStorage.getItem(CLAVE_PESTANA); return PESTANAS.some((p) => p.key === v) ? v : 'resumen' } catch { return 'resumen' }
}

const horaFormato = new Intl.DateTimeFormat('es-SV', { hour: '2-digit', minute: '2-digit' })

/**
 * Estado de la consulta, igual que la pastilla estándar del portal (.std-sync de estandar.js /
 * estandar.css, la de SIMs): "Consultando la API…" con spinner y, si tarda más de 2.5 s,
 * "Consultando la API… puede tardar hasta un minuto". Al terminar: "Actualizado: HH:MM" o el error.
 */
function EstadoConsulta({ cargando, error, actualizado }) {
  const [lento, setLento] = useState(false)
  useEffect(() => {
    if (!cargando) { setLento(false); return undefined }
    const temporizador = setTimeout(() => setLento(true), 2500)
    return () => clearTimeout(temporizador)
  }, [cargando])

  if (cargando) {
    return <p className="fv2-consultando" role="status" aria-live="polite">
      {lento ? 'Consultando la API… puede tardar hasta un minuto' : 'Consultando la API…'}
    </p>
  }
  if (error) return <div className="fv2-estado is-error" role="status">Sin conexión con Prospekt IA</div>
  return <div className="fv2-estado" role="status">Actualizado: <b>{actualizado ? horaFormato.format(actualizado) : '—'}</b></div>
}

function FlujoVentasV2Contenido() {
  const api = useLeads()
  const { leads, loading, error } = api
  const filters = useFilters()
  // Por defecto: todos los países, Tipo de lead = Calificado (4.0) y del día 1 del mes actual hasta hoy (R11).
  const [periodo, setPeriodo] = useState(() => periodoPorDefecto())
  const [pestana, setPestanaEstado] = useState(leerPestana)
  const setPestana = (p) => {
    setPestanaEstado(p)
    try { sessionStorage.setItem(CLAVE_PESTANA, p) } catch { /* sin almacenamiento: solo en memoria */ }
  }
  const { setFilter, clearFilters } = filters
  const aplicarPorDefecto = () => {
    clearFilters()
    for (const [clave, valor] of Object.entries(FILTROS_POR_DEFECTO)) setFilter(clave, valor)
  }
  // El contexto de filtros (lógica copiada) arranca vacío; al abrir se aplica el filtro por defecto una vez.
  useEffect(() => { aplicarPorDefecto() }, []) // solo al abrir

  const filtrados = useMemo(() => aplicarFiltros(leads, filters, periodo), [leads, filters, periodo])
  const summary = useMemo(() => summarize(filtrados), [filtrados])
  // Ejecutivos de la pestaña Ejecutivos: todos los del país elegido, sin importar período ni tipo.
  const baseEjecutivos = useMemo(() => listaEjecutivos(leads, filters), [leads, filters])
  const paisFiltro = filters.filterPais?.length === 1 ? filters.filterPais[0] : null
  // Vista rápida y búsqueda del Informe: se recuerdan entre pestañas y las usa el PDF (4.2).
  const [informeVista, setInformeVista] = useRecordado('fv2-informe-vista', 'todos')
  const [informeBusqueda, setInformeBusqueda] = useRecordado('fv2-informe-busqueda', '')

  // ---- PDF (4.2): herramienta compartida del portal (dashboard-pdf.js), sin modificarla ----
  // La ventana se crea una vez; lee siempre los datos actuales desde esta referencia.
  const datosPdf = useRef(null)
  datosPdf.current = { leads: filtrados, summary, baseEjecutivos, filters, periodo, informe: { vistaKey: informeVista, busqueda: informeBusqueda } }
  const hayDatos = leads.length > 0
  useEffect(() => {
    if (!hayDatos) return undefined
    let activo = true
    const antes = new Set(document.querySelectorAll('.dashboard-pdf-picker'))
    cargarHerramientaPdf().then((pdf) => {
      if (!activo || !document.getElementById(ID_BOTON_PDF)) return
      pdf.openModulePicker({
        buttonId: ID_BOTON_PDF,
        modules: MODULOS_PDF,
        getFilterChips: () => {
          const d = datosPdf.current
          return textosFiltros({ filters: d.filters, periodo: d.periodo, total: d.leads.length }).chips
        },
        buildReport: async (seleccion) => construirReporte({ seleccion, ...datosPdf.current }),
        filename: () => nombreArchivoPdf(datosPdf.current),
      })
    }).catch((err) => console.error('PDF del Flujo de ventas v2:', err))
    return () => {
      activo = false
      // Al salir de la v2 se quita la ventana de módulos que se creó para ella.
      document.querySelectorAll('.dashboard-pdf-picker').forEach((el) => { if (!antes.has(el)) el.remove() })
    }
  }, [hayDatos])
  const restablecer = () => {
    aplicarPorDefecto()
    setPeriodo(periodoPorDefecto())
  }
  const aDMA = (iso) => (iso ? iso.split('-').reverse().join('/') : '')
  const contexto = [
    filters.filterTipoLead == null ? 'Todos los tipos' : filters.filterTipoLead.map(qualificationLabel).join(', '),
    periodo.desde || periodo.hasta ? `${aDMA(periodo.desde) || 'inicio'} – ${aDMA(periodo.hasta) || 'hoy'}` : 'Todo el historial',
    filters.filterPais == null ? 'Todos los países' : filters.filterPais.join(', '),
  ].join(' · ')

  return <div className="fv2-pagina">
    <header className="fv2-encabezado">
      <div>
        <div className="fv2-eyebrow">Marketing · Flujo de ventas</div>
        <h1 className="fv2-titulo">Flujo de ventas <span className="fv2-etiqueta-prueba">v2 · prueba</span></h1>
        <p className="fv2-subtitulo">Cómo avanzan los leads asignados a cada ejecutivo, de la asignación al cierre · Guatemala y El Salvador.</p>
        <EstadoConsulta cargando={loading} error={error} actualizado={api.lastUpdated} />
      </div>
      <button type="button" className="fv2-btn-actualizar" onClick={api.reload} disabled={loading} title="Actualizar datos" aria-label="Actualizar datos">
        <RefreshCw size={16} />
      </button>
    </header>

    {/* Zona fija (4.0b): filtros y pestañas quedan arriba; solo se desplaza el contenido. */}
    {leads.length > 0 && <div className="fv2-fijo">
      <BarraFiltros
        leads={leads}
        filters={filters}
        periodo={periodo}
        onPeriodo={setPeriodo}
        onRestablecer={restablecer}
        accion={<button type="button" className="dashboard-pdf-trigger" id={ID_BOTON_PDF} title="Descargar módulos del dashboard en PDF">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          PDF
        </button>}
      />
      <nav className="fv2-pestanas" role="tablist" aria-label="Secciones del Flujo de ventas">
        {PESTANAS.map((p) => <button type="button" key={p.key} role="tab" aria-selected={pestana === p.key}
          className={`fv2-pestana ${pestana === p.key ? 'is-activa' : ''}`} onClick={() => setPestana(p.key)}>{p.label}</button>)}
      </nav>
    </div>}

    {error && <AvisoError mensaje={error} onReintentar={api.reload} />}
    {leads.length > 0 && pestana === 'resumen' && <VistaGeneral leads={filtrados} summary={summary} contexto={contexto} paisFiltro={paisFiltro} />}
    {leads.length > 0 && pestana === 'ejecutivos' && <Ejecutivos leads={filtrados} baseEjecutivos={baseEjecutivos} />}
    {leads.length > 0 && pestana === 'informe' && <Informe leads={filtrados} filters={filters} periodo={periodo}
      vistaKey={informeVista} setVistaKey={setInformeVista} busqueda={informeBusqueda} setBusqueda={setInformeBusqueda} />}
    {!loading && !error && !leads.length && <div className="fv2-panel"><Users size={22} /><Vacio titulo="Prospekt IA no devolvió leads." texto="Revisa la conexión e inténtalo de nuevo." /></div>}
  </div>
}

export function FlujoVentasV2() {
  return <div className="fv2">
    <FiltersProvider><FlujoVentasV2Contenido /></FiltersProvider>
  </div>
}
