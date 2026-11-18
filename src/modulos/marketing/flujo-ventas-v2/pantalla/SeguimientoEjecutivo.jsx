// Flujo de ventas v2 · pestaña Ejecutivos: "Seguimiento, forecast y pérdidas" de cada ejecutivo.
// Es la Vista 2 ("Seguimientos y Forecast") del dashboard de leads, pero filtrada a un solo
// ejecutivo y ordenada en 3 bloques. Usa las mismas funciones copiadas de esa lógica:
//   · Seguimientos → classifyFollowUps (vencidos / hoy / próximos / sin fecha).
//   · Forecast     → buildForecast (etapa Seguimiento + comentario de cierre + fecha en el horizonte).
//   · Pérdidas     → lossBreakdown (motivo de cada lead perdido).
import { useMemo, useState } from 'react'
import { AlertTriangle, CalendarClock, ChevronDown, CircleSlash, Eye, Target } from 'lucide-react'
import { Bandera, PaisChip } from './comunes.jsx'
import { NombreLead, Tabla } from './Tablas.jsx'
import { buildForecast, classifyFollowUps, daysFromToday, followUpDate, formatNumber, leadComments, lossBreakdown } from '../utils/analytics.js'
import { formatDate } from '../utils/dates.js'
import { leadDisplayId } from '../utils/leads.js'
import { ETAPAS } from './datos.js'

export const HORIZONTES_FORECAST = [7, 15, 30, 60]
const POR_PAGINA = 5

const GRUPOS_SEGUIMIENTO = [
  { clave: 'overdue', etiqueta: 'Vencidos', tono: 'rojo', vacio: 'No tiene seguimientos vencidos.' },
  { clave: 'today', etiqueta: 'Hoy', tono: 'amarillo', vacio: 'No tiene seguimientos para hoy.' },
  { clave: 'upcoming', etiqueta: 'Próximos', tono: 'azul', vacio: 'No tiene seguimientos agendados más adelante.' },
]

const nombreLead = (lead) => lead.clientName ?? `Lead ${leadDisplayId(lead)}`
const etapaLead = (lead) => ETAPAS[(lead.apiStage ?? 1) - 1] ?? '—'
const pct = (n, total) => (total ? `${((n / total) * 100).toFixed(0)}%` : '—')

function cuando(fecha) {
  if (!fecha) return 'Sin fecha'
  const dias = daysFromToday(fecha)
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Mañana'
  if (dias === -1) return 'Ayer'
  return dias < 0 ? `Hace ${-dias} días` : `En ${dias} días`
}

/** Datos de los 3 bloques para los leads de un ejecutivo. */
export function datosSeguimiento(leads, horizonte) {
  return {
    seguimientos: classifyFollowUps(leads),
    forecast: buildForecast(leads, horizonte),
    perdidas: lossBreakdown(leads),
  }
}

/** Lista con "Ver más": muestra 5 casos y luego todos. */
function ListaCasos({ items, vacio, render }) {
  const [todos, setTodos] = useState(false)
  if (!items.length) return <p className="fv2-seg-vacio">{vacio}</p>
  const visibles = todos ? items : items.slice(0, POR_PAGINA)
  return <>
    <ul className="fv2-seg-lista">{visibles.map(render)}</ul>
    {items.length > POR_PAGINA && <button type="button" className="fv2-seg-mas" onClick={() => setTodos((v) => !v)}>
      {todos ? 'Ver menos' : `Ver los ${formatNumber(items.length)} casos`}
    </button>}
  </>
}

function Caso({ lead, meta, chip, texto, onLead }) {
  return <li>
    <button type="button" className="fv2-seg-caso" onClick={() => onLead(lead)} title="Abrir la ficha del lead">
      <span className="fv2-seg-caso-cabeza">
        <strong>{nombreLead(lead)}</strong>
        {chip}
      </span>
      <small>{meta}</small>
      {texto && <span className="fv2-seg-caso-texto">{texto}</span>}
    </button>
  </li>
}

// ---------- 1. ¿Por qué se perdieron sus leads? ----------
function BloquePerdidas({ perdidas, onLead }) {
  const [motivoSel, setMotivoSel] = useState(null)
  const { total, byReason } = perdidas
  const principal = byReason[0]
  const casos = motivoSel ? byReason.find((r) => r.reason === motivoSel)?.leads ?? [] : perdidas.leads
  const etiquetaDe = new Map(byReason.map((r) => [r.reason, r.label]))

  return <section className="fv2-seg-bloque">
    <h5><CircleSlash size={15} aria-hidden="true" /> ¿Por qué se perdieron sus leads?</h5>
    {!total ? <p className="fv2-seg-vacio">No tiene leads perdidos con los filtros actuales.</p> : <>
      <div className="fv2-seg-principal">
        <span>Motivo principal</span>
        <strong>{principal.label}</strong>
        <small>{formatNumber(principal.count)} de {formatNumber(total)} leads perdidos ({pct(principal.count, total)})</small>
      </div>

      <div className="fv2-seg-motivos" role="list" aria-label="Motivos de pérdida">
        {byReason.map((r, i) => {
          const activo = motivoSel === r.reason
          return <button key={r.reason} type="button" role="listitem" aria-pressed={activo}
            className={`fv2-seg-motivo ${i === 0 ? 'is-principal' : ''} ${activo ? 'is-activo' : ''}`}
            onClick={() => setMotivoSel(activo ? null : r.reason)} title={activo ? 'Quitar el filtro' : `Ver solo "${r.label}"`}>
            <span className="fv2-seg-motivo-nombre">{r.label}</span>
            <span className="fv2-seg-motivo-pista" aria-hidden="true"><i style={{ width: `${(r.count / total) * 100}%` }} /></span>
            <span className="fv2-seg-motivo-cifra"><b>{formatNumber(r.count)}</b> · {pct(r.count, total)}</span>
          </button>
        })}
      </div>

      <div className="fv2-seg-subtitulo">
        <span>{motivoSel ? `Casos: ${etiquetaDe.get(motivoSel)}` : 'Casos perdidos'}</span>
        {motivoSel && <button type="button" className="fv2-seg-mas" onClick={() => setMotivoSel(null)}>Ver todos</button>}
      </div>
      <ListaCasos key={motivoSel ?? 'todos'} items={casos} vacio="Sin casos." render={(lead) => <Caso key={lead.id} lead={lead} onLead={onLead}
        chip={<span className="fv2-seg-chip is-neutro">{etiquetaDe.get(lead.motivo || 'sin_motivo')}</span>}
        meta={`Se quedó en ${etapaLead(lead)} · creado ${formatDate(lead.fechaCreacion)}`}
        texto={leadComments(lead)[0] ?? 'Sin comentario del ejecutivo'} />} />
    </>}
  </section>
}

// ---------- 2. Seguimientos ----------
function BloqueSeguimientos({ seguimientos, onLead }) {
  const inicial = GRUPOS_SEGUIMIENTO.find((g) => seguimientos[g.clave].length)?.clave ?? 'overdue'
  const [grupo, setGrupo] = useState(inicial)
  const actual = GRUPOS_SEGUIMIENTO.find((g) => g.clave === grupo)

  return <section className="fv2-seg-bloque">
    <h5><CalendarClock size={15} aria-hidden="true" /> Seguimientos de leads abiertos</h5>
    <div className="fv2-seg-cubetas">
      {GRUPOS_SEGUIMIENTO.map((g) => <button key={g.clave} type="button" aria-pressed={grupo === g.clave}
        className={`fv2-seg-cubeta is-${g.tono} ${grupo === g.clave ? 'is-activo' : ''}`} onClick={() => setGrupo(g.clave)}>
        <b>{formatNumber(seguimientos[g.clave].length)}</b>
        <span>{g.etiqueta}</span>
      </button>)}
    </div>
    <ListaCasos key={grupo} items={seguimientos[grupo]} vacio={actual.vacio} render={(lead) => {
      const fecha = followUpDate(lead)
      return <Caso key={lead.id} lead={lead} onLead={onLead}
        chip={<span className={`fv2-seg-chip is-${actual.tono}`}>{cuando(fecha)}</span>}
        meta={`${etapaLead(lead)} · agendado para ${formatDate(fecha)}`}
        texto={lead.comentarioGestion ?? leadComments(lead)[0]} />
    }} />
    {seguimientos.unscheduled.length > 0 && <p className="fv2-seg-nota">
      <AlertTriangle size={13} aria-hidden="true" /> {formatNumber(seguimientos.unscheduled.length)} {seguimientos.unscheduled.length === 1 ? 'lead abierto no tiene' : 'leads abiertos no tienen'} fecha de seguimiento agendada.
    </p>}
  </section>
}

// ---------- 3. Forecast ----------
function BloqueForecast({ forecast, horizonte, onLead }) {
  return <section className="fv2-seg-bloque">
    <h5><Target size={15} aria-hidden="true" /> Forecast · próximos {horizonte} días</h5>
    <div className="fv2-seg-forecast">
      <div><b>{formatNumber(forecast.items.length)}</b><span>{forecast.items.length === 1 ? 'caso seguro de cerrar' : 'casos seguros de cerrar'}</span></div>
      <div><b>{formatNumber(forecast.units)}</b><span>unidades proyectadas</span></div>
    </div>
    <ListaCasos items={forecast.items} vacio={`Ningún caso cumple el criterio de forecast en los próximos ${horizonte} días.`}
      render={({ lead, date, signal, units }) => <Caso key={lead.id} lead={lead} onLead={onLead}
        chip={<span className="fv2-seg-chip is-verde">{signal.label}</span>}
        meta={`${cuando(date)} (${formatDate(date)}) · ${units ? `${formatNumber(units)} unidades` : 'sin unidades indicadas'}`}
        texto={signal.comment} />} />
  </section>
}

// ---------- Sección del equipo: "¿Por qué se pierden los leads?" (igual que la Vista 2) ----------
const POR_PAGINA_EQUIPO = 10

/** Pérdidas de cada ejecutivo: cuántos perdió y su motivo más frecuente. */
function perdidasPorEjecutivo(perdidos) {
  const grupos = new Map()
  for (const lead of perdidos) {
    if (!grupos.has(lead.asesor)) grupos.set(lead.asesor, [])
    grupos.get(lead.asesor).push(lead)
  }
  return [...grupos.entries()].map(([name, rows]) => {
    const principal = lossBreakdown(rows).byReason[0]
    return { name, country: rows[0]?.pais, total: rows.length, principal }
  }).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
}

export function PerdidasEquipo({ leads, onLead }) {
  const perdidas = useMemo(() => lossBreakdown(leads), [leads])
  const porEjecutivo = useMemo(() => perdidasPorEjecutivo(perdidas.leads), [perdidas])
  const [motivoSel, setMotivoSel] = useState(null)
  const [ejecutivoSel, setEjecutivoSel] = useState(null)
  const [pagina, setPagina] = useState(1)
  const { total, byReason } = perdidas
  const etiquetaDe = new Map(byReason.map((r) => [r.reason, r.label]))

  const casos = perdidas.leads.filter((l) => (!motivoSel || (l.motivo || 'sin_motivo') === motivoSel) && (!ejecutivoSel || l.asesor === ejecutivoSel))
  const paginas = Math.max(1, Math.ceil(casos.length / POR_PAGINA_EQUIPO))
  const actual = Math.min(pagina, paginas)
  const visibles = casos.slice((actual - 1) * POR_PAGINA_EQUIPO, actual * POR_PAGINA_EQUIPO)
  const elegir = (setter, valor) => { setter(valor); setPagina(1) }

  return <section className="fv2-panel">
    <header className="fv2-panel-cabeza">
      <div>
        <div className="fv2-panel-titulo">¿Por qué se pierden los leads?</div>
        <div className="fv2-panel-sub">{formatNumber(total)} {total === 1 ? 'caso cerrado' : 'casos cerrados'} como perdidos · distribución de motivos con los filtros actuales</div>
      </div>
    </header>

    {!total ? <p className="fv2-seg-vacio">No hay casos de pérdida con los filtros actuales.</p> : <div className="fv2-perd">
      <div className="fv2-seg-principal fv2-perd-principal">
        <span>Motivo principal</span>
        <strong>{byReason[0].label}</strong>
        <small>{formatNumber(byReason[0].count)} de {formatNumber(total)} leads perdidos ({pct(byReason[0].count, total)}). Es la causa que más está impactando los cierres perdidos.</small>
      </div>

      <div className="fv2-perd-columnas">
        <section className="fv2-seg-bloque">
          <h5>Ranking de causas <small className="fv2-perd-ayuda">qué parte de las pérdidas explica cada motivo · clic para filtrar</small></h5>
          <div className="fv2-seg-motivos">
            {byReason.map((r, i) => {
              const activo = motivoSel === r.reason
              return <button key={r.reason} type="button" aria-pressed={activo}
                className={`fv2-seg-motivo ${i === 0 ? 'is-principal' : ''} ${activo ? 'is-activo' : ''}`}
                onClick={() => elegir(setMotivoSel, activo ? null : r.reason)}>
                <span className="fv2-seg-motivo-nombre">{i + 1}. {r.label}</span>
                <span className="fv2-seg-motivo-pista" aria-hidden="true"><i style={{ width: `${(r.count / total) * 100}%` }} /></span>
                <span className="fv2-seg-motivo-cifra"><b>{formatNumber(r.count)}</b> · {pct(r.count, total)}</span>
              </button>
            })}
          </div>
        </section>

        <section className="fv2-seg-bloque">
          <h5>Pérdidas por ejecutivo <small className="fv2-perd-ayuda">clic para ver solo sus casos</small></h5>
          <div className="fv2-seg-motivos">
            {porEjecutivo.map((e) => {
              const activo = ejecutivoSel === e.name
              return <button key={e.name} type="button" aria-pressed={activo} className={`fv2-perd-ejecutivo ${activo ? 'is-activo' : ''}`}
                onClick={() => elegir(setEjecutivoSel, activo ? null : e.name)}>
                <span className="fv2-seg-motivo-nombre"><Bandera pais={e.country} /> {e.name}</span>
                <span className="fv2-perd-ejecutivo-motivo">Más por <em>{e.principal.label}</em></span>
                <span className="fv2-seg-motivo-cifra"><b>{formatNumber(e.total)}</b> perdidos</span>
              </button>
            })}
          </div>
        </section>
      </div>

      <div className="fv2-seg-subtitulo">
        <span>Detalle de casos{motivoSel ? ` · ${etiquetaDe.get(motivoSel)}` : ''}{ejecutivoSel ? ` · ${ejecutivoSel}` : ''} ({formatNumber(casos.length)})</span>
        {(motivoSel || ejecutivoSel) && <button type="button" className="fv2-seg-mas" onClick={() => { setMotivoSel(null); setEjecutivoSel(null); setPagina(1) }}>Quitar filtros</button>}
      </div>
      <Tabla columnas={['Lead', 'Ejecutivo', 'Motivo', 'Se quedó en', 'Último detalle', 'Detalle']} vacio={casos.length ? null : 'Sin casos.'}>
        {visibles.map((lead) => <tr key={lead.id}>
          <td><button type="button" className="fv2-enlace-lead" onClick={() => onLead(lead)}><NombreLead lead={lead} /></button></td>
          <td><span className="fv2-en-linea"><PaisChip pais={lead.pais} />{lead.asesor}</span></td>
          <td><span className="fv2-seg-chip is-neutro">{etiquetaDe.get(lead.motivo || 'sin_motivo')}</span></td>
          <td>{etapaLead(lead)}</td>
          <td><span className="fv2-comentario" title={leadComments(lead)[0]}>{leadComments(lead)[0] ?? '—'}</span></td>
          <td><button type="button" className="fv2-btn-ficha" onClick={() => onLead(lead)}><Eye size={13} />Ver detalle</button></td>
        </tr>)}
      </Tabla>
      {paginas > 1 && <div className="fv2-perd-paginas">
        <span>Mostrando {(actual - 1) * POR_PAGINA_EQUIPO + 1}-{Math.min(actual * POR_PAGINA_EQUIPO, casos.length)} de {formatNumber(casos.length)} casos</span>
        <div>
          <button type="button" className="fv2-pildora" disabled={actual === 1} onClick={() => setPagina(actual - 1)}>Anterior</button>
          <span>Página {actual} de {paginas}</span>
          <button type="button" className="fv2-pildora" disabled={actual === paginas} onClick={() => setPagina(actual + 1)}>Siguiente</button>
        </div>
      </div>}
    </div>}
  </section>
}

/** Resumen en una línea (siempre visible) + los 3 bloques al desplegar. */
export function SeguimientoEjecutivo({ leads, horizonte, onLead }) {
  const [abierto, setAbierto] = useState(false)
  const datos = useMemo(() => datosSeguimiento(leads, horizonte), [leads, horizonte])
  const { seguimientos, forecast, perdidas } = datos
  const principal = perdidas.byReason[0]

  return <section className={`fv2-seg ${abierto ? 'is-abierto' : ''}`}>
    <button type="button" className="fv2-seg-barra" aria-expanded={abierto} onClick={() => setAbierto((v) => !v)}>
      <span className="fv2-seg-barra-titulo">Seguimiento, forecast y pérdidas</span>
      <span className="fv2-seg-resumen">
        <span className={seguimientos.overdue.length ? 'is-rojo' : ''}><b>{formatNumber(seguimientos.overdue.length)}</b> vencidos</span>
        <span><b>{formatNumber(seguimientos.today.length)}</b> para hoy</span>
        <span><b>{formatNumber(seguimientos.upcoming.length)}</b> próximos</span>
        <span className="fv2-seg-separador" aria-hidden="true" />
        <span className={forecast.items.length ? 'is-verde' : ''}><b>{formatNumber(forecast.items.length)}</b> en forecast · {formatNumber(forecast.units)} unid.</span>
        <span className="fv2-seg-separador" aria-hidden="true" />
        <span><b>{formatNumber(perdidas.total)}</b> perdidos{principal ? <> · más por <em>{principal.label}</em></> : ''}</span>
      </span>
      <span className="fv2-seg-barra-accion">{abierto ? 'Ocultar' : 'Ver detalle'} <ChevronDown size={15} aria-hidden="true" /></span>
    </button>

    {abierto && <div className="fv2-seg-cuerpo">
      <BloquePerdidas perdidas={perdidas} onLead={onLead} />
      <BloqueSeguimientos seguimientos={seguimientos} onLead={onLead} />
      <BloqueForecast forecast={forecast} horizonte={horizonte} onLead={onLead} />
    </div>}
  </section>
}
