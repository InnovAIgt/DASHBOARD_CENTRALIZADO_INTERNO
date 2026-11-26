// Flujo de ventas v2 · pestaña "Detalle de leads" (Informe detallado; respeta los filtros de arriba).
// Rediseño Parte 4 (DECISIONES D27):
//   · Título con la conclusión (cuántos leads van más de 2 días hábiles tarde en su etapa).
//   · Las 7 vistas rápidas se quedan; además, botones de color Todos · Rojo · Ámbar · A tiempo como filtro extra
//     dentro de la vista elegida (no lo usa el PDF, que sigue igual).
//   · Por defecto 8 columnas; las demás (ninguna se borró) se activan con «Columnas».
//   · Orden por defecto: primero los más atrasados. Clic en un encabezado ordena por esa columna, como antes.
//   · Excel: exporta las mismas columnas que antes por defecto (grupos visibles de siempre + los que se activen).
import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Columns3, Search } from 'lucide-react'
import { formatNumber, PIPELINE_STAGES, qualificationLabel } from '../utils/analytics.js'
import { evaluarSlaEtapa } from '../utils/sla.js'
import { Calificacion, CODIGO_PAIS, EstadoLead, MiniEtapas } from './comunes.jsx'
import { descargarInforme } from './excel.js'
import { buscarFilas, COLUMNAS, conteoVistas, filasInforme, GRUPOS, ordenarFilas, textoCelda, VISTAS } from './informeDatos.js'
import { EncabezadoSeccion, EtiquetaPais } from './piezas.jsx'
import { Semaforo, SemaforoEtapa } from './Semaforo.jsx'
import { DetalleLead } from './Ventanas.jsx'

const POR_PAGINA = 50
const hoyISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const aDMA = (iso) => (iso ? iso.split('-').reverse().join('/') : '')

/** Las 8 columnas que se ven por defecto (en el orden de COLUMNAS). */
const COLUMNAS_BASE = new Set(['cliente', 'ejecutivo', 'pais', 'etapa', 'diasEtapa', 'slaEtapa', 'proximaGestion', 'unidades'])
/** Nombre en pantalla (el Excel conserva el nombre de siempre). */
const NOMBRE_PANTALLA = { slaEtapa: 'Semáforo' }
/** Grupos que el Excel exportaba por defecto antes del rediseño. */
const GRUPOS_EXCEL = new Set(GRUPOS.filter((g) => g.visible).map((g) => g.key))

/** Filtro de color del semáforo de etapa (D27). Sin cálculos nuevos: el estado de evaluarSlaEtapa. */
const COLORES_SEMAFORO = [
  { key: 'todos', label: 'Todos', filtro: () => true },
  { key: 'rojo', label: 'Rojo', filtro: (estado) => estado === 'rojo' },
  { key: 'amarillo', label: 'Ámbar', filtro: (estado) => estado === 'amarillo' },
  { key: 'verde', label: 'A tiempo', filtro: (estado) => estado === 'verde' },
]
const estadoDe = (fila) => evaluarSlaEtapa(fila.lead)?.estado ?? null

/** «Primero los más atrasados»: rojo → amarillo → verde → sin fecha → cerrado; dentro de cada uno, más días primero. */
function ordenarPorAtraso(filas) {
  const vacio = (x) => x === null || x === undefined
  return [...filas].sort((a, b) => {
    const pa = a.v.slaEtapa
    const pb = b.v.slaEtapa
    if (vacio(pa) !== vacio(pb)) return vacio(pa) ? 1 : -1
    return (pa ?? 0) - (pb ?? 0) || (b.v.diasEtapa ?? -1) - (a.v.diasEtapa ?? -1)
  })
}

function DiasEnEtapa({ fila, max }) {
  const dias = fila.v.diasEtapa
  if (dias === null || dias === undefined) return <span className="fv2-tenue">—</span>
  const estado = estadoDe(fila)
  return <span className="fv2n-dias">
    <b>{formatNumber(dias)} d</b>
    <span className="fv2n-dias-pista" aria-hidden="true"><i className={`is-${estado ?? 'gris'}`} style={{ width: `${max ? Math.min(100, (dias / max) * 100) : 0}%` }} /></span>
  </span>
}

function Celda({ col, fila, maxDias }) {
  const valor = fila.v[col.key]
  const { lead } = fila
  if (col.key === 'diasEtapa') return <DiasEnEtapa fila={fila} max={maxDias} />
  switch (col.tipo) {
    case 'cliente': return <span className="fv2-doble"><span className="fv2-fuerte">{valor}</span><small>{fila.v.codigo}</small></span>
    case 'calificacion': return <Calificacion tipo={lead.tipoLead} />
    case 'estado': return <EstadoLead estado={lead.estado} />
    case 'etapa': return valor ? <span className="fv2-etapa-celda"><MiniEtapas etapa={valor} ganado={lead.estado === 'ganado'} /><small>{valor} · {PIPELINE_STAGES[valor - 1]}</small></span> : '—'
    case 'semaforo': return <Semaforo lead={lead} fecha={valor} />
    case 'sla': return <SemaforoEtapa lead={lead} />
    case 'fecha': return valor ? <span className="fv2-mono">{textoCelda(col, valor)}</span> : <span className="fv2-tenue">—</span>
    case 'numero': return valor === null || valor === '' ? <span className="fv2-tenue">—</span> : typeof valor === 'number' ? formatNumber(valor) : valor
    case 'largo': return valor ? <span className="fv2-recorte" title={valor}>{valor}</span> : <span className="fv2-tenue">—</span>
    default:
      if (col.key === 'pais') return valor ? <EtiquetaPais pais={valor} /> : <span className="fv2-tenue">—</span>
      return valor ? valor : <span className="fv2-tenue">—</span>
  }
}

/** Texto de los filtros aplicados (hoja 2 del Excel). */
function textoFiltros({ filters, periodo, vista, color, busqueda, grupos, total }) {
  const lista = (sel, todos, fmt = String) => (sel == null ? todos : sel.length ? sel.map(fmt).join(', ') : 'Ninguno')
  return [
    ['País', lista(filters.filterPais, 'Todos (Guatemala y El Salvador)')],
    ['Período', periodo.desde || periodo.hasta ? `${aDMA(periodo.desde) || 'inicio'} al ${aDMA(periodo.hasta) || 'hoy'} (fecha de cierre si es ganado; si no, de creación)` : 'Todo el historial'],
    ['Asesor / Ejecutivo', lista(filters.filterEjecutivo, 'Todos')],
    ['Tipo de lead', lista(filters.filterTipoLead, 'Todos', qualificationLabel)],
    ['Vista rápida', vista.label],
    ...(color.key === 'todos' ? [] : [['Semáforo de etapa', color.label]]),
    ['Búsqueda', busqueda.trim() || '(sin búsqueda)'],
    ['Columnas visibles', GRUPOS.filter((g) => grupos.has(g.key)).map((g) => g.label).join(', ')],
    ['Leads exportados', String(total)],
  ]
}

// 4.2: la vista rápida y la búsqueda vienen de FlujoVentasV2 (se recuerdan entre pestañas y las usa el PDF).
export function Informe({ leads, filters, periodo, vistaKey, setVistaKey, busqueda, setBusqueda }) {
  const [grupos, setGrupos] = useState(() => new Set()) // grupos extra activados con «Columnas»
  const [verColumnas, setVerColumnas] = useState(false)
  const [colorKey, setColorKey] = useState('todos')
  const [orden, setOrden] = useState({ key: 'atraso', dir: 'asc' })
  const [pagina, setPagina] = useState(0)
  const [leadSel, setLeadSel] = useState(null)
  const [descargando, setDescargando] = useState(false)

  const filasTodas = useMemo(() => filasInforme(leads), [leads])
  const conteos = useMemo(() => conteoVistas(leads), [leads])
  const rojosTotal = useMemo(() => filasTodas.filter((f) => estadoDe(f) === 'rojo').length, [filasTodas])
  const vista = VISTAS.find((v) => v.key === vistaKey)
  const color = COLORES_SEMAFORO.find((c) => c.key === colorKey)
  // Filas de la vista + búsqueda (lo mismo que antes); el color se aplica encima.
  const deVista = useMemo(() => buscarFilas(filasTodas.filter((fila) => vista.filtro(fila.lead)), busqueda), [filasTodas, vista, busqueda])
  const conteoColores = useMemo(() => Object.fromEntries(COLORES_SEMAFORO.map((c) => [c.key, deVista.filter((f) => c.filtro(estadoDe(f))).length])), [deVista])
  const filas = useMemo(() => {
    const conColor = deVista.filter((f) => color.filtro(estadoDe(f)))
    return orden.key === 'atraso' ? ordenarPorAtraso(conColor) : ordenarFilas(conColor, orden.key, orden.dir)
  }, [deVista, color, orden])

  const columnas = COLUMNAS.filter((col) => COLUMNAS_BASE.has(col.key) || grupos.has(col.grupo))
  const columnasExcel = COLUMNAS.filter((col) => GRUPOS_EXCEL.has(col.grupo) || grupos.has(col.grupo))
  // Encabezado agrupado: un bloque por cada grupo de columnas seguidas.
  const bloques = columnas.reduce((lista, col) => {
    const ultimo = lista[lista.length - 1]
    if (ultimo && ultimo.grupo === col.grupo) ultimo.n++
    else lista.push({ grupo: col.grupo, n: 1 })
    return lista
  }, [])
  const paginas = Math.max(1, Math.ceil(filas.length / POR_PAGINA))
  const paginaActual = Math.min(pagina, paginas - 1)
  const visibles = filas.slice(paginaActual * POR_PAGINA, (paginaActual + 1) * POR_PAGINA)
  const maxDias = Math.max(0, ...visibles.map((f) => f.v.diasEtapa ?? 0))

  const cambiar = (fn) => { fn(); setPagina(0) }
  const alternarGrupo = (key) => setGrupos((actual) => {
    const nuevo = new Set(actual)
    if (nuevo.has(key)) nuevo.delete(key)
    else nuevo.add(key)
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
    const gruposExcel = new Set([...GRUPOS_EXCEL, ...grupos])
    try {
      await descargarInforme({
        filas,
        columnas: columnasExcel,
        nombreBase: `Informe_flujo_ventas_${pais}_${desde}_${hasta}`,
        subtitulo: `${region} · Período ${aDMA(periodo.desde) || 'inicio'} al ${aDMA(periodo.hasta) || 'hoy'} · ${formatNumber(filas.length)} leads · Vista: ${vista.label}${color.key === 'todos' ? '' : ` · Semáforo: ${color.label}`}`,
        generado: `${ahora.toLocaleDateString('es-SV')} a las ${ahora.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' })}`,
        filtros: textoFiltros({ filters, periodo, vista, color, busqueda, grupos: gruposExcel, total: filas.length }),
      })
    } finally {
      setDescargando(false)
    }
  }

  const titulo = rojosTotal
    ? `${formatNumber(rojosTotal)} ${rojosTotal === 1 ? 'lead va' : 'leads van'} más de 2 días hábiles tarde en su etapa`
    : 'Ningún lead va más de 2 días hábiles tarde en su etapa'

  return <section className="fv2-informe fv2n-informe">
    <header className="fv2-informe-cabeza">
      <div>
        <div className="fv2-informe-eyebrow">Detalle de leads · auditoría y exportación</div>
        <EncabezadoSeccion titulo={titulo}
          explicacion="Primero los más atrasados. Respeta los filtros de arriba (País, Período, Ejecutivo y Tipo de lead). Clic en una fila para ver la ficha completa del lead." />
      </div>
      <div className="fv2-informe-acciones">
        <span className="fv2-informe-cuenta">Mostrando {formatNumber(filas.length)} leads filtrados</span>
        <button type="button" className="fv2-btn-excel" onClick={descargar} disabled={descargando || !filas.length} title="Descarga las filas que se ven (vista, color y búsqueda) con las columnas de siempre más las que actives">
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

    <div className="fv2n-informe-barra">
      <div className="fv2n-colores" role="group" aria-label="Filtrar por semáforo de etapa">
        <span>Semáforo de etapa:</span>
        {COLORES_SEMAFORO.map((c) => <button type="button" key={c.key} aria-pressed={colorKey === c.key}
          className={`fv2n-color is-${c.key} ${colorKey === c.key ? 'is-activo' : ''}`} onClick={() => cambiar(() => setColorKey(c.key))}>
          {c.key !== 'todos' && <i aria-hidden="true" />}{c.label} · {formatNumber(conteoColores[c.key])}
        </button>)}
      </div>
      <button type="button" className="fv2n-boton fv2n-boton-columnas" aria-expanded={verColumnas} onClick={() => setVerColumnas((v) => !v)}>
        <Columns3 size={14} aria-hidden="true" /> Columnas · {formatNumber(columnas.length)} de {formatNumber(COLUMNAS.length)}
      </button>
    </div>

    <div className="fv2-informe-panel">
      {verColumnas && <div className="fv2-informe-herramientas">
        <div className="fv2-columnas" role="group" aria-label="Columnas visibles">
          <span>Siempre: {COLUMNAS.filter((c) => COLUMNAS_BASE.has(c.key)).map((c) => NOMBRE_PANTALLA[c.key] ?? c.label).join(', ')}. Agregar:</span>
          {GRUPOS.map((g) => <button type="button" key={g.key} aria-pressed={grupos.has(g.key)} className={`fv2-columna-btn ${grupos.has(g.key) ? 'is-activa' : ''}`} onClick={() => alternarGrupo(g.key)}>{g.label}</button>)}
        </div>
      </div>}

      <div className="fv2-tabla-caja fv2-informe-tabla">
        <table className="fv2-tabla">
          <thead>
            <tr className="fv2-informe-grupos">
              {bloques.map((b, i) => <th key={`${b.grupo}-${i}`} colSpan={b.n}>{GRUPOS.find((g) => g.key === b.grupo)?.label}</th>)}
            </tr>
            <tr>
              {columnas.map((col) => <th key={col.key} className={col.tipo === 'numero' && col.key !== 'diasEtapa' ? 'num' : ''}>
                <button type="button" className="fv2-orden" onClick={() => ordenarPor(col.key)} title={`Ordenar por ${NOMBRE_PANTALLA[col.key] ?? col.label}`}>
                  {NOMBRE_PANTALLA[col.key] ?? col.label}
                  {orden.key === col.key && (orden.dir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
                </button>
              </th>)}
            </tr>
          </thead>
          <tbody>
            {visibles.map((fila) => <tr key={fila.lead.id} className="fv2-fila-clic" onClick={() => setLeadSel(fila.lead)} title="Abrir la ficha del lead">
              {columnas.map((col) => <td key={col.key} className={`${col.tipo === 'numero' && col.key !== 'diasEtapa' ? 'num' : ''} ${col.tipo === 'largo' ? 'is-largo' : ''}`}><Celda col={col} fila={fila} maxDias={maxDias} /></td>)}
            </tr>)}
            {!visibles.length && <tr><td colSpan={columnas.length} className="fv2-tabla-vacia">Ningún lead coincide con la vista, el color, los filtros o la búsqueda.</td></tr>}
          </tbody>
        </table>
      </div>

      <footer className="fv2-informe-pie">
        <span>
          Mostrando {filas.length ? formatNumber(paginaActual * POR_PAGINA + 1) : 0}–{formatNumber(paginaActual * POR_PAGINA + visibles.length)} de {formatNumber(filas.length)} leads · clic en una fila para abrir la ficha completa
          {orden.key !== 'atraso' && <> · <button type="button" className="fv2-res-enlace" onClick={() => cambiar(() => setOrden({ key: 'atraso', dir: 'asc' }))}>volver a «primero los más atrasados»</button></>}
        </span>
        <div className="fv2-paginacion">
          <button type="button" className="fv2-pildora" onClick={() => setPagina(paginaActual - 1)} disabled={paginaActual === 0} aria-label="Página anterior"><ChevronLeft size={14} /></button>
          <span>Página {paginaActual + 1} de {paginas}</span>
          <button type="button" className="fv2-pildora" onClick={() => setPagina(paginaActual + 1)} disabled={paginaActual >= paginas - 1} aria-label="Página siguiente"><ChevronRight size={14} /></button>
        </div>
        <span className="fv2-semaforo-leyenda"><i className="is-vencida" />Próxima gestión vencida <i className="is-hoy" />Gestión para hoy <i className="is-a_tiempo" />Gestión a tiempo</span>
        <span className="fv2-semaforo-leyenda"><i className="is-sla-rojo" />Semáforo rojo (&gt;2 d tarde) <i className="is-sla-amarillo" />Ámbar (1–2 d tarde) <i className="is-sla-verde" />A tiempo</span>
      </footer>
    </div>

    {leadSel && <DetalleLead lead={leadSel} onClose={() => setLeadSel(null)} />}
  </section>
}
