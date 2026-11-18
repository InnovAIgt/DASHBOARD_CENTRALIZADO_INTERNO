// Marketing por canales · barra de filtros con el FORMATO ESTÁNDAR del portal (D35), copiado del
// dashboard de Activaciones (activaciones.html / activaciones.css, que no se modificaron), igual que el
// Flujo de ventas v2:
//   tarjeta "FILTROS" · País · Período (con restablecer) · botón "Filtros" con contador →
//   panel tipo Excel (columnas Cargo y Campañas, con buscador, "todo", n/m, "Limpiar todo" y "Aplicar") ·
//   botón PDF · botón actualizar redondo.
// País, Cifras y Período se aplican al instante; Cargo y Campañas, con "Aplicar".
// El servidor recalcula los totales con todos los filtros (?pais= y ?campanas=).
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { CalendarDays, ChevronDown, Filter, RefreshCw, RotateCcw, Search, X } from 'lucide-react'
import {
  FILTROS_VACIOS, PAISES_FILTRO, VISTAS, campanasCandidatas, cargosDisponibles, fechaCorta, filtrosEnPanel, formatoLectura,
  formatoNumero, hayFiltros, textosFiltros,
} from './datos.js'

/** Una columna del panel tipo Excel: buscador, "Seleccionar todo", contador n/m y casillas. */
function ColumnaXf({ titulo, opciones, marcadas, alCambiar, vacio }) {
  const [busqueda, setBusqueda] = useState('')
  const id = useId()
  const texto = busqueda.trim().toLowerCase()
  const visibles = opciones.filter((o) => !texto || o.etiqueta.toLowerCase().includes(texto))
  const todas = opciones.length > 0 && opciones.every((o) => marcadas.has(o.valor))
  const algunas = opciones.some((o) => marcadas.has(o.valor))
  const refTodo = useRef(null)
  useEffect(() => { if (refTodo.current) refTodo.current.indeterminate = algunas && !todas }, [algunas, todas])
  const alternar = (valor) => {
    const nuevo = new Set(marcadas)
    if (nuevo.has(valor)) nuevo.delete(valor); else nuevo.add(valor)
    alCambiar(nuevo)
  }
  return <div className="mkt-xf-col">
    <div className="mkt-xf-cabeza">
      <span className="mkt-xf-titulo">{titulo}</span>
      <span className="mkt-xf-cuenta">{opciones.filter((o) => marcadas.has(o.valor)).length}/{opciones.length}</span>
    </div>
    <div className="mkt-xf-buscar">
      <Search size={14} aria-hidden="true" />
      <label htmlFor={id} className="mkt-solo-lector">Buscar en {titulo}</label>
      <input id={id} type="text" placeholder="Buscar..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} autoComplete="off" />
    </div>
    <div className="mkt-xf-lista">
      {opciones.length === 0 && <p className="mkt-xf-sin">{vacio}</p>}
      {!texto && opciones.length > 0 && <label className="mkt-xf-item is-todo">
        <input ref={refTodo} type="checkbox" className="mkt-casilla" checked={todas}
          onChange={() => alCambiar(todas ? new Set() : new Set(opciones.map((o) => o.valor)))} />
        <span className="mkt-xf-nombre">Seleccionar todo</span>
      </label>}
      {visibles.map((o) => <label key={o.valor} className="mkt-xf-item" title={o.etiqueta}>
        <input type="checkbox" className="mkt-casilla" checked={marcadas.has(o.valor)} onChange={() => alternar(o.valor)} />
        <span className="mkt-xf-nombre">{o.etiqueta}</span>
        {o.extra && <small>{o.extra}</small>}
      </label>)}
      {texto && visibles.length === 0 && <p className="mkt-xf-sin">Sin coincidencias.</p>}
    </div>
  </div>
}

/** Panel "Filtros": borrador local; se aplica con "Aplicar". */
function PanelFiltros({ filtros, disponibles, vista, alCambiarVista, alAplicar, alCerrar }) {
  const cargos = cargosDisponibles(disponibles)
  const [marcadosCargo, setMarcadosCargo] = useState(() => new Set(filtros.cargos ?? cargos))
  const borradorCargos = marcadosCargo.size === cargos.length ? null : [...marcadosCargo]
  // La columna Campañas muestra las del período y de los cargos marcados en el borrador.
  const candidatas = campanasCandidatas(disponibles, { ...filtros, cargos: borradorCargos })
  const [quitadas, setQuitadas] = useState(() => new Set(filtros.quitadas))
  const marcadasCamp = new Set(candidatas.map((c) => c.id).filter((idc) => !quitadas.has(idc)))
  const cambiarCampanas = (nuevo) => setQuitadas(new Set(candidatas.map((c) => c.id).filter((idc) => !nuevo.has(idc))))

  const aplicar = () => {
    alAplicar({ ...filtros, cargos: borradorCargos, quitadas: [...quitadas].filter((idc) => candidatas.some((c) => c.id === idc)) })
    alCerrar()
  }
  const limpiarTodo = () => {
    alAplicar({ ...filtros, cargos: null, quitadas: [] })
    alCerrar()
  }
  return <div className="mkt-xf-panel" role="dialog" aria-label="Filtros">
    <div className="mkt-grupo mkt-xf-cifras" role="group" aria-label="Cifras">
      <span className="mkt-etiqueta-grupo">Cifras</span>
      {Object.values(VISTAS).map((v) => <button key={v.key} type="button" className={`mkt-btn-grupo ${vista === v.key ? 'is-activo' : ''}`}
        aria-pressed={vista === v.key} onClick={() => alCambiarVista(v.key)}>{v.label}</button>)}
    </div>
    <div className="mkt-xf-grid">
      <ColumnaXf titulo="Cargo" opciones={cargos.map((c) => ({ valor: c, etiqueta: c }))} marcadas={marcadosCargo}
        alCambiar={setMarcadosCargo} vacio="Sin cargos." />
      <ColumnaXf titulo="Campañas" vacio="Ninguna campaña en el período o cargo elegido."
        opciones={candidatas.map((c) => ({ valor: c.id, etiqueta: `#${c.id} · ${c.nombre}`, extra: fechaCorta(c.fechaEnvio.slice(0, 10)).slice(0, 5) }))}
        marcadas={marcadasCamp} alCambiar={cambiarCampanas} />
    </div>
    <div className="mkt-xf-pie">
      <button type="button" className="mkt-xf-limpiar" onClick={limpiarTodo}>Limpiar todo</button>
      <button type="button" className="mkt-xf-aplicar" onClick={aplicar}>Aplicar</button>
    </div>
  </div>
}

/** Solo para pruebas: el panel abierto se puede dibujar sin hacer clic. */
export const PanelFiltrosParaPruebas = PanelFiltros

export const ID_BOTON_PDF = 'mktBtnPdf'

export function BarraFiltros({ vista, alCambiarVista, filtros, alCambiarFiltros, disponibles, cargando, alActualizar }) {
  const [abierto, setAbierto] = useState(false)
  const caja = useRef(null)
  const id = useId()
  const enPanel = filtrosEnPanel(filtros)
  // Cerrar el panel al hacer clic fuera o con Escape (como en Activaciones).
  useEffect(() => {
    if (!abierto) return undefined
    const fuera = (e) => { if (caja.current && !caja.current.contains(e.target)) setAbierto(false) }
    const tecla = (e) => { if (e.key === 'Escape') setAbierto(false) }
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', tecla)
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', tecla) }
  }, [abierto])

  return <section className="mkt-filtros-caja" ref={caja} aria-label="Filtros">
    <span className="mkt-filtros-eyebrow">Filtros</span>
    <div className="mkt-filtros-barra">
      <div className="mkt-grupo" role="group" aria-label="País">
        <span className="mkt-etiqueta-grupo">País</span>
        {PAISES_FILTRO.map((p) => <button key={p.valor} type="button" className={`mkt-btn-grupo ${filtros.pais === p.valor ? 'is-activo' : ''}`}
          aria-pressed={filtros.pais === p.valor} onClick={() => alCambiarFiltros({ ...filtros, pais: p.valor })}>{p.etiqueta}</button>)}
      </div>

      <div className="mkt-periodo">
        <span className="mkt-periodo-etiqueta"><CalendarDays size={15} aria-hidden="true" />Período</span>
        <label className="mkt-solo-lector" htmlFor={`${id}-desde`}>Desde</label>
        <input id={`${id}-desde`} type="date" className="mkt-fecha" value={filtros.desde} max={filtros.hasta || undefined}
          onChange={(e) => alCambiarFiltros({ ...filtros, desde: e.target.value })} />
        <span className="mkt-periodo-guion" aria-hidden="true">—</span>
        <label className="mkt-solo-lector" htmlFor={`${id}-hasta`}>Hasta</label>
        <input id={`${id}-hasta`} type="date" className="mkt-fecha" value={filtros.hasta} min={filtros.desde || undefined}
          onChange={(e) => alCambiarFiltros({ ...filtros, hasta: e.target.value })} />
        <button type="button" className="mkt-periodo-limpiar" title="Restablecer período (todo el histórico)" aria-label="Restablecer período"
          disabled={!filtros.desde && !filtros.hasta} onClick={() => alCambiarFiltros({ ...filtros, desde: '', hasta: '' })}>
          <RotateCcw size={14} aria-hidden="true" />
        </button>
      </div>

      <button type="button" className={`mkt-btn-filtros ${abierto ? 'is-abierto' : ''}`} aria-expanded={abierto} aria-haspopup="dialog"
        onClick={() => setAbierto((v) => !v)}>
        <Filter size={16} aria-hidden="true" />Filtros
        {enPanel > 0 && <span className="mkt-filtros-cuenta" aria-label={`${enPanel} filtro(s) activo(s)`}>{enPanel}</span>}
        <ChevronDown size={14} className="mkt-chevron" aria-hidden="true" />
      </button>

      <span className="mkt-filtros-accion">
        <button type="button" className="dashboard-pdf-trigger mkt-btn-pdf" id={ID_BOTON_PDF} title="Descargar módulos del dashboard en PDF">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          PDF
        </button>
        <button type="button" className="mkt-btn-actualizar" onClick={alActualizar} disabled={cargando} title="Actualizar datos" aria-label="Actualizar datos">
          <RefreshCw size={16} className={cargando ? 'mkt-girando' : ''} aria-hidden="true" />
        </button>
      </span>
    </div>
    {abierto && <PanelFiltros filtros={filtros} disponibles={disponibles} vista={vista} alCambiarVista={alCambiarVista}
      alAplicar={alCambiarFiltros} alCerrar={() => setAbierto(false)} />}
  </section>
}

/** Franja "Filtro activo" (como en Activaciones), con el botón para ver todas las campañas. */
export function FranjaFiltroActivo({ vista, filtros, disponibles, alCambiarFiltros }) {
  const t = useMemo(() => textosFiltros({ vista, filtros, disponibles }), [vista, filtros, disponibles])
  if (!hayFiltros(filtros)) return null
  const partes = [
    (filtros.desde || filtros.hasta) && `Período ${t.periodo}`,
    filtros.pais && filtros.pais !== 'todos' && `País: ${t.pais}`,
    t.cargo && `Cargo: ${t.cargo}`,
    t.campanas && `Campañas: ${t.campanas}`,
  ].filter(Boolean)
  return <div className="mkt-franja-filtro" role="status">
    <span><Search size={14} aria-hidden="true" /> Filtro activo: <strong>{partes.join(' · ')}</strong> ({partes.length})</span>
    <button type="button" onClick={() => alCambiarFiltros(FILTROS_VACIOS)} title="Restablecer todos los filtros">
      <X size={13} aria-hidden="true" /> Mostrar todas las campañas
    </button>
  </div>
}

export function LineaResumen({ datos, vista, filtros, disponibles }) {
  const t = vista === 'totalBrevo' ? datos.totales.totalBrevo : datos.totales
  const leido = datos.fuente.cache?.leidoEn ?? datos.generado
  const textos = textosFiltros({ vista, filtros, disponibles })
  const periodo = filtros.desde || filtros.hasta
    ? `del ${fechaCorta(filtros.desde) || 'inicio'} al ${fechaCorta(filtros.hasta) || 'hoy'}`
    : 'todo el histórico'
  return <div className="mkt-fx-resumen">
    Mostrando <strong>{formatoNumero(t.enviados)} correos</strong> de <strong>{formatoNumero(t.campanas)} campaña{t.campanas === 1 ? '' : 's'}</strong>
    {' '}· {periodo}{textos.pais !== 'Todos' ? ` · ${textos.pais}` : ''}{textos.cargo ? ` · ${textos.cargo}` : ''} · última lectura {formatoLectura(leido)}
  </div>
}

export function Transparencia({ datos }) {
  const [abierto, setAbierto] = useState(false)
  const { archivos, exclusiones, fuente } = datos
  const repetidos = archivos.repetidos ?? []
  const copiasIgnoradas = repetidos.reduce((suma, grupo) => suma + grupo.ignorados.length, 0)
  const internos = exclusiones.destinatariosInternos
  const pruebas = exclusiones.campanasPrueba
  const avisos = archivos.usados.flatMap((u) => [...(u.avisos ?? []), ...(u.filasDescartadas ?? [])].map((a) => ({ archivo: u.archivo, ...a })))
  return <div className="mkt-transparencia">
    <div className="mkt-transparencia-linea">
      <div>
        <div className="mkt-transparencia-titulo">Transparencia de datos</div>
        <div>{formatoNumero(archivos.usados.length)} archivo{archivos.usados.length === 1 ? '' : 's'} leído{archivos.usados.length === 1 ? '' : 's'} ({fuente.descripcion})
          {' '}· {formatoNumero(datos.totales.enviados)} correos analizados · se excluy{internos.enviados === 1 ? 'ó' : 'eron'} {formatoNumero(internos.enviados)} correo{internos.enviados === 1 ? '' : 's'} interno{internos.enviados === 1 ? '' : 's'} de RED
          {' '}y {formatoNumero(pruebas.cantidad)} campaña{pruebas.cantidad === 1 ? '' : 's'} de prueba.
          {' '}Campañas repetidas: {formatoNumero(copiasIgnoradas)} {copiasIgnoradas === 1 ? 'copia ignorada' : 'copias ignoradas'}.
          {archivos.ignorados.length > 0 && <> {formatoNumero(archivos.ignorados.length)} archivo(s) ignorado(s).</>}
          {avisos.length > 0 && <> {formatoNumero(avisos.length)} aviso(s).</>}</div>
      </div>
      <button type="button" className="mkt-enlace" aria-expanded={abierto} onClick={() => setAbierto((v) => !v)}>
        {abierto ? 'Ocultar desglose' : 'Ver desglose de exclusiones'}</button>
    </div>
    {abierto && <div className="mkt-desglose">
      <div>
        <h4>Correos internos de RED: {formatoNumero(internos.enviados)}</h4>
        {internos.enviados === 0 ? <p>Ningún envío a correos internos.</p>
          : <ul>{internos.porCampana.map((c) => <li key={c.id}>#{c.id} {c.nombre}: {formatoNumero(c.enviados)} envío(s), {formatoNumero(c.aperturasReales)} apertura(s), {formatoNumero(c.personasConClic)} con clic</li>)}</ul>}
        <p>Cuentan en "Total en Brevo"; no en "Sin internos (oficial)".</p>
      </div>
      <div>
        <h4>Campañas de prueba: {formatoNumero(pruebas.cantidad)}</h4>
        {pruebas.cantidad === 0 ? <p>Ninguna campaña coincide con los patrones de prueba.</p>
          : <ul>{pruebas.lista.map((c) => <li key={c.id}>#{c.id} {c.nombre} · {formatoNumero(c.enviados)} enviados — {c.motivo}</li>)}</ul>}
      </div>
      <div>
        <h4>Archivos</h4>
        <ul>{archivos.usados.map((u) => <li key={u.archivo}>Usado: <b>{u.archivo}</b> — campaña(s) {u.campanas.map((c) => `#${c.id} (${formatoNumero(c.filas)} filas)`).join(', ')}</li>)}
          {archivos.ignorados.map((i) => <li key={i.archivo}>Ignorado: <b>{i.archivo}</b> — {i.motivo}</li>)}
          {avisos.map((a, n) => <li key={n}>Aviso: <b>{a.archivo}</b> — {a.motivo} ({a.cantidad})</li>)}</ul>
        {fuente.nota && <p>{fuente.nota}</p>}
        {fuente.cache && <p>Se guarda {fuente.cache.minutos} min{fuente.cache.usada ? ' (esta lectura viene de lo guardado)' : ''}.</p>}
        {exclusiones.duplicadosDescartados > 0 && <p>Correos repetidos descartados: {formatoNumero(exclusiones.duplicadosDescartados)}.</p>}
      </div>
      {repetidos.length > 0 && <div>
        <h4>Campañas repetidas: {formatoNumero(copiasIgnoradas)} {copiasIgnoradas === 1 ? 'copia ignorada' : 'copias ignoradas'}</h4>
        <ul>{repetidos.map((grupo) => <li key={grupo.campana}>
          Campaña #{grupo.campana}: se usó <b>{grupo.usado.archivo}</b> ({formatoNumero(grupo.usado.filas)} filas, último evento {grupo.usado.ultimoEvento ?? 'sin fecha'});
          {' '}se ignoró {grupo.ignorados.map((copia) => `${copia.archivo} (${copia.criterio})`).join('; ')}.
        </li>)}</ul>
      </div>}
    </div>}
  </div>
}
