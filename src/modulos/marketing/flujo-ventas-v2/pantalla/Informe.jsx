// Flujo de ventas v2 · pestaña "Informe detallado" (respeta los filtros de arriba).
import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { formatNumber, PIPELINE_STAGES, qualificationLabel } from '../utils/analytics.js'
import { Calificacion, CODIGO_PAIS, EstadoLead, PaisChip } from './comunes.jsx'
import { descargarInforme } from './excel.js'
import { buscarFilas, COLUMNAS, conteoVistas, filasInforme, GRUPOS, ordenarFilas, semaforo, textoCelda, VISTAS } from './informeDatos.js'
import { DetalleLead } from './Ventanas.jsx'

const POR_PAGINA = 50
const fechaHora = new Intl.DateTimeFormat('es-SV', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
const hora = new Intl.DateTimeFormat('es-SV', { hour: '2-digit', minute: '2-digit' })
const dm = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
const tieneHora = (d) => d.getHours() !== 0 || d.getMinutes() !== 0
const hoyISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const aDMA = (iso) => (iso ? iso.split('-').reverse().join('/') : '')

function MiniEtapas({ etapa, ganado }) {
  return <span className="fv2-minietapas" aria-label={`Etapa ${etapa} de 6`}>
    {[1, 2, 3, 4, 5, 6].map((n) => <i key={n} className={n <= etapa ? (ganado ? 'is-ganado' : 'is-hecha') : ''} />)}
  </span>
}

function Semaforo({ lead, fecha }) {
  if (!fecha) return <span className="fv2-tenue">—</span>
  const s = semaforo(lead)
  const texto = s === 'vencida' ? `Vencida · ${dm(fecha)}`
    : s === 'hoy' ? `Hoy${tieneHora(fecha) ? ` · ${hora.format(fecha)}` : ''}`
      : tieneHora(fecha) ? fechaHora.format(fecha) : textoCelda({ tipo: 'fecha' }, fecha)
  return <span className={`fv2-semaforo is-${s}`} title={s === 'cerrado' ? 'Lead cerrado' : undefined}>{texto}</span>
}

function Celda({ col, fila }) {
  const valor = fila.v[col.key]
  const { lead } = fila
  switch (col.tipo) {
    case 'cliente': return <span className="fv2-doble"><span className="fv2-fuerte">{valor}</span><small>{fila.v.codigo}</small></span>
    case 'calificacion': return <Calificacion tipo={lead.tipoLead} />
    case 'estado': return <EstadoLead estado={lead.estado} />
    case 'etapa': return valor ? <span className="fv2-etapa-celda"><MiniEtapas etapa={valor} ganado={lead.estado === 'ganado'} /><small>{valor} · {PIPELINE_STAGES[valor - 1]}</small></span> : '—'
    case 'semaforo': return <Semaforo lead={lead} fecha={valor} />
    case 'fecha': return valor ? <span className="fv2-mono">{textoCelda(col, valor)}</span> : <span className="fv2-tenue">—</span>
    case 'numero': return valor === null || valor === '' ? <span className="fv2-tenue">—</span> : typeof valor === 'number' ? formatNumber(valor) : valor
    case 'largo': return valor ? <span className="fv2-recorte" title={valor}>{valor}</span> : <span className="fv2-tenue">—</span>
    default:
      if (col.key === 'pais') return <PaisChip pais={valor} />
      return valor ? valor : <span className="fv2-tenue">—</span>
  }
}

/** Texto de los filtros aplicados (hoja 2 del Excel). */
function textoFiltros({ filters, periodo, vista, busqueda, grupos, total }) {
  const lista = (sel, todos, fmt = String) => (sel == null ? todos : sel.length ? sel.map(fmt).join(', ') : 'Ninguno')
  return [
    ['País', lista(filters.filterPais, 'Todos (Guatemala y El Salvador)')],
    ['Período', periodo.desde || periodo.hasta ? `${aDMA(periodo.desde) || 'inicio'} al ${aDMA(periodo.hasta) || 'hoy'} (fecha de cierre si es ganado; si no, de creación)` : 'Todo el historial'],
    ['Asesor / Ejecutivo', lista(filters.filterEjecutivo, 'Todos')],
    ['Tipo de lead', lista(filters.filterTipoLead, 'Todos', qualificationLabel)],
    ['Vista rápida', vista.label],
    ['Búsqueda', busqueda.trim() || '(sin búsqueda)'],
    ['Columnas visibles', GRUPOS.filter((g) => grupos.has(g.key)).map((g) => g.label).join(', ')],
    ['Leads exportados', String(total)],
  ]
}

export function Informe({ leads, filters, periodo }) {
  const [vistaKey, setVistaKey] = useState('todos')
  const [grupos, setGrupos] = useState(() => new Set(GRUPOS.filter((g) => g.visible).map((g) => g.key)))
  const [busqueda, setBusqueda] = useState('')
  const [orden, setOrden] = useState({ key: 'fCreacion', dir: 'desc' })
  const [pagina, setPagina] = useState(0)
  const [leadSel, setLeadSel] = useState(null)
  const [descargando, setDescargando] = useState(false)

  const filasTodas = useMemo(() => filasInforme(leads), [leads])
  const conteos = useMemo(() => conteoVistas(leads), [leads])
  const vista = VISTAS.find((v) => v.key === vistaKey)
  const filas = useMemo(() => {
    const deVista = filasTodas.filter((fila) => vista.filtro(fila.lead))
    return ordenarFilas(buscarFilas(deVista, busqueda), orden.key, orden.dir)
  }, [filasTodas, vista, busqueda, orden])
  const columnas = COLUMNAS.filter((col) => grupos.has(col.grupo))
  const paginas = Math.max(1, Math.ceil(filas.length / POR_PAGINA))
  const paginaActual = Math.min(pagina, paginas - 1)
  const visibles = filas.slice(paginaActual * POR_PAGINA, (paginaActual + 1) * POR_PAGINA)

  const cambiar = (fn) => { fn(); setPagina(0) }
  const alternarGrupo = (key) => setGrupos((actual) => {
    const nuevo = new Set(actual)
    if (nuevo.has(key)) { if (nuevo.size > 1) nuevo.delete(key) } else nuevo.add(key)
    return nuevo
  })
  const ordenarPor = (key) => cambiar(() => setOrden((o) => ({ key, dir: o.key === key && o.dir === 'asc' ? 'desc' : 'asc' })))

  const descargar = async () => {
    setDescargando(true)
    const pais = filters.filterPais?.length === 1 ? CODIGO_PAIS[filters.filterPais[0]] : 'GT-SV'
    const region = filters.filterPais?.length === 1 ? filters.filterPais[0] : 'Guatemala y El Salvador'
    const desde = periodo.desde || 'inicio'
    const hasta = periodo.hasta || hoyISO()
    const ahora = new Date()
    try {
      await descargarInforme({
        filas,
        columnas,
        nombreBase: `Informe_flujo_ventas_${pais}_${desde}_${hasta}`,
        subtitulo: `${region} · Período ${aDMA(periodo.desde) || 'inicio'} al ${aDMA(periodo.hasta) || 'hoy'} · ${formatNumber(filas.length)} leads · Vista: ${vista.label}`,
        generado: `${ahora.toLocaleDateString('es-SV')} a las ${ahora.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })}`,
        filtros: textoFiltros({ filters, periodo, vista, busqueda, grupos, total: filas.length }),
      })
    } finally {
      setDescargando(false)
    }
  }

  // Tarjeta con el mismo formato que el "Informe detallado" de Activaciones.
  return <section className="fv2-informe">
    {/* Como el Informe detallado de Facturación: título a la izquierda; pastilla y Excel a la derecha */}
    <header className="fv2-informe-cabeza">
      <div>
        <div className="fv2-informe-eyebrow">Auditoría y exportación comercial</div>
        <h2 className="fv2-informe-titulo">Informe detallado de leads</h2>
        <p className="fv2-informe-desc">Consulta comercial completa. Se aplican automáticamente los filtros seleccionados en el encabezado general (País, Período, Ejecutivo y Tipo de lead).</p>
      </div>
      <div className="fv2-informe-acciones">
        <span className="fv2-informe-cuenta">Mostrando {formatNumber(filas.length)} leads filtrados</span>
        <button type="button" className="fv2-btn-excel" onClick={descargar} disabled={descargando || !filas.length} title="Descarga lo que se ve: vista rápida, filtros, búsqueda y columnas visibles">
          {descargando ? 'Preparando…' : 'Descargar Excel'}
        </button>
      </div>
    </header>

    <div className="fv2-buscador fv2-informe-buscar">
      <Search size={16} aria-hidden="true" />
      <input type="text" placeholder="Buscar dentro de los leads filtrados por cliente, código, ejecutivo, producto o rubro…" value={busqueda} onChange={(e) => cambiar(() => setBusqueda(e.target.value))} aria-label="Buscar en el informe" />
    </div>

    <div className="fv2-vistas" role="tablist" aria-label="Vistas rápidas">
      {VISTAS.map((v) => <button type="button" key={v.key} role="tab" aria-selected={vistaKey === v.key}
        className={`fv2-vista-pildora ${vistaKey === v.key ? 'is-activa' : ''}`} onClick={() => cambiar(() => setVistaKey(v.key))}>
        {v.label}<span className={`fv2-vista-cuenta is-${v.tono}`}>{formatNumber(conteos[v.key])}</span>
      </button>)}
    </div>

    <div className="fv2-informe-panel">
      <div className="fv2-informe-herramientas">
        <div className="fv2-columnas" role="group" aria-label="Columnas visibles">
          <span>Columnas:</span>
          {GRUPOS.map((g) => <button type="button" key={g.key} aria-pressed={grupos.has(g.key)} className={`fv2-columna-btn ${grupos.has(g.key) ? 'is-activa' : ''}`} onClick={() => alternarGrupo(g.key)}>{g.label}</button>)}
        </div>
      </div>

      <div className="fv2-tabla-caja fv2-informe-tabla">
        <table className="fv2-tabla">
          <thead>
            <tr className="fv2-informe-grupos">
              {GRUPOS.filter((g) => grupos.has(g.key)).map((g) => <th key={g.key} colSpan={columnas.filter((col) => col.grupo === g.key).length}>{g.label}</th>)}
            </tr>
            <tr>
              {columnas.map((col) => <th key={col.key} className={col.tipo === 'numero' ? 'num' : ''}>
                <button type="button" className="fv2-orden" onClick={() => ordenarPor(col.key)} title={`Ordenar por ${col.label}`}>
                  {col.label}
                  {orden.key === col.key && (orden.dir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
                </button>
              </th>)}
            </tr>
          </thead>
          <tbody>
            {visibles.map((fila) => <tr key={fila.lead.id} className="fv2-fila-clic" onClick={() => setLeadSel(fila.lead)} title="Abrir la ficha del lead">
              {columnas.map((col) => <td key={col.key} className={`${col.tipo === 'numero' ? 'num' : ''} ${col.tipo === 'largo' ? 'is-largo' : ''}`}><Celda col={col} fila={fila} /></td>)}
            </tr>)}
            {!visibles.length && <tr><td colSpan={columnas.length} className="fv2-tabla-vacia">Ningún lead coincide con la vista, los filtros o la búsqueda.</td></tr>}
          </tbody>
        </table>
      </div>

      <footer className="fv2-informe-pie">
        <span>
          Mostrando {filas.length ? formatNumber(paginaActual * POR_PAGINA + 1) : 0}–{formatNumber(paginaActual * POR_PAGINA + visibles.length)} de {formatNumber(filas.length)} leads · clic en una fila para abrir la ficha completa
        </span>
        <div className="fv2-paginacion">
          <button type="button" className="fv2-pildora" onClick={() => setPagina(paginaActual - 1)} disabled={paginaActual === 0} aria-label="Página anterior"><ChevronLeft size={14} /></button>
          <span>Página {paginaActual + 1} de {paginas}</span>
          <button type="button" className="fv2-pildora" onClick={() => setPagina(paginaActual + 1)} disabled={paginaActual >= paginas - 1} aria-label="Página siguiente"><ChevronRight size={14} /></button>
        </div>
        <span className="fv2-semaforo-leyenda"><i className="is-vencida" />Gestión vencida <i className="is-hoy" />Para hoy <i className="is-a_tiempo" />A tiempo</span>
      </footer>
    </div>

    {leadSel && <DetalleLead lead={leadSel} onClose={() => setLeadSel(null)} />}
  </section>
}
