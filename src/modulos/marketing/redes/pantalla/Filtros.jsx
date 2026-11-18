// Redes sociales · barra de filtros ESTANDARIZADA con los demás dashboards del portal.
// Diseño y comportamiento COPIADOS del Flujo de ventas v2 (flujo-ventas-v2/pantalla/Filtros.jsx), que a su vez
// sigue a Activaciones: País (Todos / GT / SV) · Período desde–hasta · panel "Filtros" (aquí: Marca y Red,
// con buscador, "Seleccionar todo", conteos y Aplicar) · botón PDF a la derecha.
import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, ChevronDown, Filter, RotateCcw, Search } from 'lucide-react'
import { filtrarFilas, MARCAS, PAISES, REDES } from '../logica/calculos.js'
import { entero, fechaCorta } from '../logica/formato.js'
import { Bandera } from './comunes.jsx'

/** Columnas del panel "Filtros". valor(fila) = opción a la que pertenece cada fila. */
export const FILTROS_DEL_PANEL = [
  { clave: 'marca', etiqueta: 'Marca', opciones: MARCAS.map((m) => m.clave), texto: (c) => { const m = MARCAS.find((x) => x.clave === c); return `${m.nombre} (${m.pais})` }, valor: (f) => f.marcaClave },
  { clave: 'red', etiqueta: 'Red', opciones: REDES, texto: (r) => r, valor: (f) => f.red },
]

function BotonesPais({ filtros, setFiltros }) {
  const elegir = (pais) => setFiltros((f) => ({ ...f, pais }))
  return <div className="rds-grupo-pais" role="group" aria-label="País">
    <span className="rds-etiqueta-grupo">País</span>
    <button type="button" className={`rds-btn-pais ${!filtros.pais ? 'is-activo' : ''}`} onClick={() => elegir(null)}>Todos</button>
    {PAISES.map((p) => <button key={p.clave} type="button" className={`rds-btn-pais ${filtros.pais === p.clave ? 'is-activo' : ''}`}
      onClick={() => elegir(p.clave)} title={p.nombre}><Bandera pais={p.clave} />{p.clave}</button>)}
  </div>
}

/**
 * Período desde–hasta. Arranca con el rango por defecto (D25). "Restablecer" vuelve a ese rango cuando el
 * usuario lo cambió. La nota del rango por defecto no se muestra en la barra (se quitó a pedido, 17/11/2026);
 * queda solo como texto de ayuda al pasar el mouse.
 */
function ControlPeriodo({ filtros, setFiltros, minimo, maximo, periodoDefecto }) {
  const cambiar = (clave) => (e) => setFiltros((f) => ({ ...f, [clave]: e.target.value }))
  const esDefecto = periodoDefecto && filtros.desde === periodoDefecto.desde && filtros.hasta === periodoDefecto.hasta
  // Si hay publicaciones programadas, "hasta" puede ir más allá de la última fecha del Excel.
  const tope = periodoDefecto?.hasta > maximo ? periodoDefecto.hasta : maximo
  const ayuda = esDefecto && periodoDefecto.nota ? periodoDefecto.nota : `Hay publicaciones del ${fechaCorta(minimo)} al ${fechaCorta(maximo)}`
  return <div className="rds-periodo" title={ayuda}>
      <span className="rds-periodo-etiqueta"><CalendarDays size={15} />Período</span>
      <input type="date" className="rds-fecha" aria-label="Desde" value={filtros.desde} min={minimo} max={filtros.hasta || tope} onChange={cambiar('desde')} />
      <span className="rds-periodo-guion">—</span>
      <input type="date" className="rds-fecha" aria-label="Hasta" value={filtros.hasta} min={filtros.desde || minimo} max={tope} onChange={cambiar('hasta')} />
      {periodoDefecto && !esDefecto && <button type="button" className="rds-periodo-restablecer" title="Volver al período por defecto"
        onClick={() => setFiltros((f) => ({ ...f, desde: periodoDefecto.desde, hasta: periodoDefecto.hasta }))}><RotateCcw size={13} aria-hidden="true" />Restablecer</button>}
  </div>
}

/** Una columna del panel: buscador, "Seleccionar todo" y casillas con conteo (con los demás filtros aplicados). */
function ColumnaFiltro({ def, filas, filtros, borrador, onCambiar }) {
  const [busqueda, setBusqueda] = useState('')
  const conteos = useMemo(() => {
    const mapa = new Map()
    for (const f of filtrarFilas(filas, filtros, def.clave)) mapa.set(def.valor(f), (mapa.get(def.valor(f)) ?? 0) + 1)
    return mapa
  }, [def, filas, filtros])
  const opciones = def.opciones
  const seleccion = borrador ?? opciones
  const visibles = opciones.filter((op) => def.texto(op).toLowerCase().includes(busqueda.trim().toLowerCase()))
  const marcadas = opciones.filter((op) => seleccion.includes(op)).length
  const todoRef = useRef(null)
  useEffect(() => { if (todoRef.current) todoRef.current.indeterminate = marcadas > 0 && marcadas < opciones.length }, [marcadas, opciones.length])

  const fijar = (siguiente) => onCambiar(siguiente.length === opciones.length ? null : siguiente)
  const alternar = (op) => {
    const set = new Set(seleccion)
    if (set.has(op)) set.delete(op)
    else set.add(op)
    fijar(opciones.filter((o) => set.has(o)))
  }

  return <div className="rds-xf-col">
    <div className="rds-xf-cabeza">
      <span className="rds-xf-titulo">{def.etiqueta}</span>
      <span className="rds-xf-cuenta">{marcadas}/{opciones.length}</span>
    </div>
    <div className="rds-xf-buscar">
      <Search size={14} aria-hidden="true" />
      <input type="text" placeholder="Buscar…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} aria-label={`Buscar en ${def.etiqueta}`} />
    </div>
    <div className="rds-xf-lista">
      {!busqueda && <label className="rds-xf-item is-todo">
        <input ref={todoRef} type="checkbox" className="rds-casilla" checked={marcadas === opciones.length} onChange={() => fijar(marcadas === opciones.length ? [] : opciones)} />
        <span>Seleccionar todo</span>
      </label>}
      {visibles.map((op) => <label key={op} className="rds-xf-item">
        <input type="checkbox" className="rds-casilla" checked={seleccion.includes(op)} onChange={() => alternar(op)} />
        <span className="rds-xf-nombre">{def.texto(op)}</span>
        <small>{entero(conteos.get(op) ?? 0)}</small>
      </label>)}
      {!visibles.length && <p className="rds-xf-sin">Sin coincidencias.</p>}
    </div>
  </div>
}

function PanelFiltros({ filas, filtros, setFiltros }) {
  const [abierto, setAbierto] = useState(false)
  const [borrador, setBorrador] = useState({})
  const raizRef = useRef(null)
  const activos = FILTROS_DEL_PANEL.filter((def) => filtros[def.clave] != null).length

  const abrir = () => { setBorrador(Object.fromEntries(FILTROS_DEL_PANEL.map((def) => [def.clave, filtros[def.clave]]))); setAbierto(true) }
  const aplicar = () => { setFiltros((f) => ({ ...f, ...Object.fromEntries(FILTROS_DEL_PANEL.map((def) => [def.clave, borrador[def.clave] ?? null])) })); setAbierto(false) }

  useEffect(() => {
    if (!abierto) return undefined
    const alClicFuera = (e) => { if (!raizRef.current?.contains(e.target)) setAbierto(false) }
    const alEscape = (e) => { if (e.key === 'Escape') setAbierto(false) }
    document.addEventListener('pointerdown', alClicFuera)
    document.addEventListener('keydown', alEscape)
    return () => { document.removeEventListener('pointerdown', alClicFuera); document.removeEventListener('keydown', alEscape) }
  }, [abierto])

  return <div ref={raizRef} className="rds-ancla-filtros">
    <button type="button" className={`rds-btn-filtros ${abierto ? 'is-abierto' : ''}`} aria-expanded={abierto} onClick={() => (abierto ? setAbierto(false) : abrir())}>
      <Filter size={16} /><span>Filtros</span>
      {activos > 0 && <span className="rds-filtros-cuenta">{activos}</span>}
      <ChevronDown size={14} className="rds-chevron" />
    </button>
    {abierto && <div className="rds-xf-panel" role="dialog" aria-label="Filtros">
      <div className="rds-xf-grid">
        {FILTROS_DEL_PANEL.map((def) => <ColumnaFiltro key={def.clave} def={def} filas={filas} filtros={filtros}
          borrador={borrador[def.clave]} onCambiar={(valor) => setBorrador((b) => ({ ...b, [def.clave]: valor }))} />)}
      </div>
      <div className="rds-xf-pie">
        <button type="button" className="rds-xf-limpiar" onClick={() => setBorrador({})}>Limpiar todo</button>
        <button type="button" className="rds-xf-aplicar" onClick={aplicar}>Aplicar</button>
      </div>
    </div>}
  </div>
}

export function BarraFiltros({ filas, filtros, setFiltros, minimo, maximo, periodoDefecto, accion }) {
  return <section className="rds-filtros-caja">
    <span className="rds-filtros-eyebrow">Filtros</span>
    <div className="rds-filtros-barra">
      <BotonesPais filtros={filtros} setFiltros={setFiltros} />
      <ControlPeriodo filtros={filtros} setFiltros={setFiltros} minimo={minimo} maximo={maximo} periodoDefecto={periodoDefecto} />
      <PanelFiltros filas={filas} filtros={filtros} setFiltros={setFiltros} />
      <span className="rds-filtros-accion">{accion}</span>
    </div>
  </section>
}

/** Textos de los filtros (chips de la ventana del PDF, encabezado del reporte y hoja del Excel). */
export function textosFiltros(filtros, publicaciones) {
  const pais = filtros.pais ? `${PAISES.find((p) => p.clave === filtros.pais).nombre} (${filtros.pais})` : 'Todos los países'
  const periodo = filtros.desde || filtros.hasta ? `${filtros.desde ? fechaCorta(filtros.desde) : 'Sin límite'} – ${filtros.hasta ? fechaCorta(filtros.hasta) : 'Sin límite'}` : 'Sin límite'
  const lista = (def) => (filtros[def.clave] == null ? 'Todas' : filtros[def.clave].length === 0 ? 'Ninguna' : filtros[def.clave].length === 1 ? def.texto(filtros[def.clave][0]) : `${filtros[def.clave].length} seleccionadas`)
  const [defMarca, defRed] = FILTROS_DEL_PANEL
  const marca = lista(defMarca)
  const red = lista(defRed)
  return {
    pais, periodo, marca, red,
    texto: `País: ${pais} · Período: ${periodo} · Marca: ${marca} · Red: ${red}`,
    chips: [
      { label: 'País', value: pais },
      { label: 'Período', value: periodo },
      { label: 'Marca', value: marca, tooltip: filtros.marca?.length > 1 ? filtros.marca.map(defMarca.texto).join(', ') : undefined },
      { label: 'Red', value: red, tooltip: filtros.red?.length > 1 ? filtros.red.join(', ') : undefined },
      { label: 'Publicaciones', value: entero(publicaciones) },
    ],
  }
}
