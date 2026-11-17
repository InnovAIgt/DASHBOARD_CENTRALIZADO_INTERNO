// Marketing por canales · barra de filtros estándar, "Transparencia de datos" y "Filtro de campañas".
// Los filtros solo deciden QUÉ campañas entran; el servidor recalcula los totales (?campanas=, D29).
// Un solo filtro de cargo: el del panel "Filtros", que cambia toda la página (D32).
import { useId, useState } from 'react'
import { Check } from 'lucide-react'
import { VISTAS, campanasCandidatas, fechaCorta, formatoLectura, formatoNumero, hayFiltros } from './datos.js'

export function BarraFiltros({ vista, alCambiarVista, filtros, alCambiarFiltros, cargos }) {
  const [panel, setPanel] = useState(false)
  const id = useId()
  const cambiar = (cambios) => alCambiarFiltros({ ...filtros, ...cambios })
  return <div className="mkt-fx">
    <div className="mkt-fx-bar">
      <div className="mkt-fx-grupo" role="group" aria-label="Cifras">
        <span className="mkt-fx-etiqueta">Cifras</span>
        {Object.values(VISTAS).map((v) => <button key={v.key} type="button" className={`mkt-fxb ${vista === v.key ? 'is-activa' : ''}`}
          aria-pressed={vista === v.key} onClick={() => alCambiarVista(v.key)}>{v.label}</button>)}
      </div>
      <div className="mkt-fx-periodo">
        <span className="mkt-fx-etiqueta">Período</span>
        <label className="mkt-solo-lector" htmlFor={`${id}-desde`}>Desde</label>
        <input id={`${id}-desde`} type="date" value={filtros.desde} max={filtros.hasta || undefined} onChange={(e) => cambiar({ desde: e.target.value })} />
        <span className="mkt-tenue" aria-hidden="true">—</span>
        <label className="mkt-solo-lector" htmlFor={`${id}-hasta`}>Hasta</label>
        <input id={`${id}-hasta`} type="date" value={filtros.hasta} min={filtros.desde || undefined} onChange={(e) => cambiar({ hasta: e.target.value })} />
      </div>
      <button type="button" className={`mkt-fxb ${filtros.cargo ? 'is-marcada' : ''}`} aria-expanded={panel} aria-controls={`${id}-panel`}
        onClick={() => setPanel((v) => !v)}>Filtros{filtros.cargo ? ' (1)' : ''}</button>
      <button type="button" className="mkt-fxb mkt-fx-limpiar" disabled={!hayFiltros(filtros)}
        onClick={() => alCambiarFiltros({ desde: '', hasta: '', cargo: '', quitadas: [] })}>Limpiar filtros</button>
    </div>
    {panel && <div className="mkt-fx-panel" id={`${id}-panel`}>
      <label>Cargo
        <select value={filtros.cargo} onChange={(e) => cambiar({ cargo: e.target.value, quitadas: [] })}>
          <option value="">Todos</option>
          {cargos.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
      <span className="mkt-tenue">El cargo cambia toda la página, incluido el ranking.</span>
    </div>}
  </div>
}

export function LineaResumen({ datos, vista, filtros }) {
  const t = vista === 'totalBrevo' ? datos.totales.totalBrevo : datos.totales
  const leido = datos.fuente.cache?.leidoEn ?? datos.generado
  const periodo = filtros.desde || filtros.hasta
    ? `del ${fechaCorta(filtros.desde) || 'inicio'} al ${fechaCorta(filtros.hasta) || 'hoy'}`
    : 'todo el histórico'
  return <div className="mkt-fx-resumen">
    Mostrando <strong>{formatoNumero(t.enviados)} correos</strong> de <strong>{formatoNumero(t.campanas)} campaña{t.campanas === 1 ? '' : 's'}</strong>
    {' '}· {periodo}{filtros.cargo ? ` · ${filtros.cargo}` : ''} · última lectura {formatoLectura(leido)}
  </div>
}

export function Transparencia({ datos }) {
  const [abierto, setAbierto] = useState(false)
  const { archivos, exclusiones, fuente } = datos
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
    </div>}
  </div>
}

export function FiltroCampanas({ disponibles, filtros, alCambiarFiltros }) {
  const candidatas = campanasCandidatas(disponibles, filtros)
  const elegidas = candidatas.filter((c) => !filtros.quitadas.includes(c.id))
  const alternar = (id) => alCambiarFiltros({
    ...filtros,
    quitadas: filtros.quitadas.includes(id) ? filtros.quitadas.filter((x) => x !== id) : [...filtros.quitadas, id],
  })
  return <div className="mkt-card mkt-card-compacta">
    <div className="mkt-filtro-cabeza">
      <div className="mkt-filtro-titulo">Filtro de campañas <span>— {elegidas.length} de {candidatas.length} seleccionada{candidatas.length === 1 ? '' : 's'}</span></div>
      <div className="mkt-filtro-botones">
        <button type="button" className="mkt-fxb" onClick={() => alCambiarFiltros({ ...filtros, quitadas: [] })}>Seleccionar todas</button>
        <button type="button" className="mkt-fxb" onClick={() => alCambiarFiltros({ ...filtros, quitadas: candidatas.map((c) => c.id) })}>Limpiar selección</button>
      </div>
    </div>
    {candidatas.length === 0 ? <p className="mkt-tenue">Ninguna campaña en el período o cargo elegido.</p>
      : <div className="mkt-chips" role="group" aria-label="Campañas">
        {candidatas.map((c) => {
          const activa = !filtros.quitadas.includes(c.id)
          return <button key={c.id} type="button" className={`mkt-chip ${activa ? 'is-activa' : ''}`} aria-pressed={activa} onClick={() => alternar(c.id)}>
            {activa && <Check size={13} aria-hidden="true" />}#{c.id} · {c.nombre}
          </button>
        })}
      </div>}
  </div>
}
