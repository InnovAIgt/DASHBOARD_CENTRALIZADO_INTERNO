// Flujo de ventas v2 · barra de filtros (diseño basado en la de Activaciones).
// País (Todos / GT / SV) · Período desde–hasta · panel "Filtros" (Asesor y Tipo de lead) ·
// volver a filtros por defecto · actualizar.
import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, ChevronDown, Filter, Search, X } from 'lucide-react'
import { formatNumber } from '../utils/analytics.js'
import { Bandera, CODIGO_PAIS } from './comunes.jsx'
import { conteosDeFiltro, FILTROS_DEL_PANEL, opcionesDeFiltro, PAISES } from './datos.js'

function BotonesPais({ filters }) {
  const seleccion = filters.filterPais
  const activo = (pais) => (pais == null ? seleccion == null : seleccion?.length === 1 && seleccion[0] === pais)
  return <div className="fv2-grupo-pais" role="group" aria-label="País">
    <span className="fv2-etiqueta-grupo">País</span>
    <button type="button" className={`fv2-btn-pais ${activo(null) ? 'is-activo' : ''}`} onClick={() => filters.setFilter('filterPais', null)}>Todos</button>
    {PAISES.map((pais) => <button
      type="button"
      key={pais}
      className={`fv2-btn-pais ${activo(pais) ? 'is-activo' : ''}`}
      onClick={() => filters.setFilter('filterPais', [pais])}
      title={pais}
    ><Bandera pais={pais} />{CODIGO_PAIS[pais]}</button>)}
  </div>
}

function ControlPeriodo({ periodo, onCambiar }) {
  return <div className="fv2-periodo">
    <span className="fv2-periodo-etiqueta"><CalendarDays size={15} />Período</span>
    <input type="date" className="fv2-fecha" aria-label="Desde" value={periodo.desde} max={periodo.hasta || undefined} onChange={(e) => onCambiar({ ...periodo, desde: e.target.value })} />
    <span className="fv2-periodo-guion">—</span>
    <input type="date" className="fv2-fecha" aria-label="Hasta" value={periodo.hasta} min={periodo.desde || undefined} onChange={(e) => onCambiar({ ...periodo, hasta: e.target.value })} />
    {(periodo.desde || periodo.hasta) && <button type="button" className="fv2-periodo-limpiar" title="Quitar el período (ver todo el historial)" aria-label="Quitar el período" onClick={() => onCambiar({ desde: '', hasta: '' })}><X size={14} /></button>}
  </div>
}

/** Una columna del panel: buscador, "Seleccionar todo" y casillas con conteo. */
function ColumnaFiltro({ def, leads, filters, periodo, borrador, onCambiar }) {
  const [busqueda, setBusqueda] = useState('')
  const display = def.display ?? String
  const opciones = useMemo(() => opcionesDeFiltro(def, leads), [def, leads])
  const conteos = useMemo(() => conteosDeFiltro(def, leads, filters, periodo), [def, leads, filters, periodo])
  const seleccion = borrador ?? opciones
  const visibles = opciones.filter((op) => String(display(op)).toLowerCase().includes(busqueda.trim().toLowerCase()))
  const marcadas = opciones.filter((op) => seleccion.includes(op)).length
  const todoRef = useRef(null)

  useEffect(() => {
    if (todoRef.current) todoRef.current.indeterminate = marcadas > 0 && marcadas < opciones.length
  }, [marcadas, opciones.length])

  const fijar = (siguiente) => onCambiar(siguiente.length === opciones.length ? null : siguiente)
  const alternar = (op) => {
    const set = new Set(seleccion)
    if (set.has(op)) set.delete(op)
    else set.add(op)
    fijar(opciones.filter((o) => set.has(o)))
  }
  const alternarTodo = () => fijar(marcadas === opciones.length ? [] : opciones)

  return <div className="fv2-xf-col">
    <div className="fv2-xf-cabeza">
      <span className="fv2-xf-titulo">{def.label}</span>
      <span className="fv2-xf-cuenta">{marcadas}/{opciones.length}</span>
    </div>
    <div className="fv2-xf-buscar">
      <Search size={14} aria-hidden="true" />
      <input type="text" placeholder="Buscar…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} aria-label={`Buscar en ${def.label}`} />
    </div>
    <div className="fv2-xf-lista">
      {!busqueda && <label className="fv2-xf-item is-todo">
        <input ref={todoRef} type="checkbox" className="fv2-casilla" checked={marcadas === opciones.length} onChange={alternarTodo} />
        <span>Seleccionar todo</span>
      </label>}
      {visibles.map((op) => <label key={op} className="fv2-xf-item">
        <input type="checkbox" className="fv2-casilla" checked={seleccion.includes(op)} onChange={() => alternar(op)} />
        <span className="fv2-xf-nombre">{display(op)}</span>
        <small>{formatNumber(conteos.get(op) ?? 0)}</small>
      </label>)}
      {!visibles.length && <p className="fv2-xf-sin">Sin coincidencias.</p>}
    </div>
  </div>
}

function PanelFiltros({ leads, filters, periodo }) {
  const [abierto, setAbierto] = useState(false)
  const [borrador, setBorrador] = useState({})
  const raizRef = useRef(null)
  const activos = FILTROS_DEL_PANEL.filter((def) => filters[def.key] != null).length

  const abrir = () => {
    setBorrador(Object.fromEntries(FILTROS_DEL_PANEL.map((def) => [def.key, filters[def.key]])))
    setAbierto(true)
  }
  const aplicar = () => {
    for (const def of FILTROS_DEL_PANEL) filters.setFilter(def.key, borrador[def.key] ?? null)
    setAbierto(false)
  }
  const limpiarTodo = () => setBorrador(Object.fromEntries(FILTROS_DEL_PANEL.map((def) => [def.key, null])))

  useEffect(() => {
    if (!abierto) return undefined
    const alClicFuera = (event) => { if (!raizRef.current?.contains(event.target)) setAbierto(false) }
    const alEscape = (event) => { if (event.key === 'Escape') setAbierto(false) }
    document.addEventListener('pointerdown', alClicFuera)
    document.addEventListener('keydown', alEscape)
    return () => {
      document.removeEventListener('pointerdown', alClicFuera)
      document.removeEventListener('keydown', alEscape)
    }
  }, [abierto])

  return <div ref={raizRef} className="fv2-ancla-filtros">
    <button type="button" className={`fv2-btn-filtros ${abierto ? 'is-abierto' : ''}`} aria-expanded={abierto} onClick={() => (abierto ? setAbierto(false) : abrir())}>
      <Filter size={16} /><span>Filtros</span>
      {activos > 0 && <span className="fv2-filtros-cuenta">{activos}</span>}
      <ChevronDown size={14} className="fv2-chevron" />
    </button>
    {abierto && <div className="fv2-xf-panel" role="dialog" aria-label="Filtros">
      <div className="fv2-xf-grid">
        {FILTROS_DEL_PANEL.map((def) => <ColumnaFiltro
          key={def.key}
          def={def}
          leads={leads}
          filters={filters}
          periodo={periodo}
          borrador={borrador[def.key]}
          onCambiar={(valor) => setBorrador((actual) => ({ ...actual, [def.key]: valor }))}
        />)}
      </div>
      <div className="fv2-xf-pie">
        <button type="button" className="fv2-xf-limpiar" onClick={limpiarTodo}>Limpiar todo</button>
        <button type="button" className="fv2-xf-aplicar" onClick={aplicar}>Aplicar</button>
      </div>
    </div>}
  </div>
}

export function BarraFiltros({ leads, filters, periodo, onPeriodo, accion }) {
  return <section className="fv2-filtros-caja">
    <span className="fv2-filtros-eyebrow">Filtros</span>
    <div className="fv2-filtros-barra">
      <BotonesPais filters={filters} />
      <ControlPeriodo periodo={periodo} onCambiar={onPeriodo} />
      <PanelFiltros leads={leads} filters={filters} periodo={periodo} />
      {/* Botón PDF a la derecha (en el lugar del antiguo contador "N de M leads").
          "Volver a filtros por defecto" se quitó a pedido (12/11/2026). */}
      <span className="fv2-filtros-accion">{accion}</span>
    </div>
  </section>
}
