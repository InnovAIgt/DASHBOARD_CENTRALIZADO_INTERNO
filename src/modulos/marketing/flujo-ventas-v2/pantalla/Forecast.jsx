// Flujo de ventas v2 · pestaña Forecast. Rediseño Parte 5 (DECISIONES D27), en este orden:
//   1. Gestión de seguimientos (vencidos / atender hoy / próximos + tabla, primero los más atrasados) · classifyFollowUps
//   2. Forecast (7/15/30/60 d, criterio y tabla; si no hay casos: mensaje + «Probar con 60 días» / «Ver los vencidos»)
//      con «Oportunidades abiertas por etapa» al final, como barras de color · buildForecast / resumirSlaEtapas
//   3. ¿Por qué se pierden los leads? (se movió aquí desde el Panel) · lossBreakdown
// Mismas funciones de siempre; solo cambian el orden y el dibujo.
import { useMemo, useState } from 'react'
import { ChevronRight, Eye } from 'lucide-react'
import { buildForecast, classifyFollowUps, CLOSING_KEYWORDS, daysFromToday, followUpDate, formatNumber, leadComments, PIPELINE_STAGES } from '../utils/analytics.js'
import { resumirSlaEtapas } from '../utils/sla.js'
import { COLUMNAS } from './informeDatos.js'
import { EncabezadoSeccion, EtiquetaPais } from './piezas.jsx'
import { HORIZONTES_FORECAST, PerdidasEquipo } from './SeguimientoEjecutivo.jsx'
import { NombreLead, Tabla, TablaLeads } from './Tablas.jsx'
import { DetalleLead } from './Ventanas.jsx'

const fechaHora = new Intl.DateTimeFormat('es-SV', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
const ID_SEGUIMIENTOS = 'fv2-forecast-seguimientos'
const plural = (n, uno, varios) => `${formatNumber(n)} ${n === 1 ? uno : varios}`

function tiempoRelativo(dias) {
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Mañana'
  if (dias === -1) return 'Ayer'
  return dias < 0 ? `Hace ${-dias} días` : `En ${dias} días`
}

// ---------- 1. Gestión de seguimientos ----------
const GRUPOS = [
  { key: 'overdue', etiqueta: 'Seguimientos vencidos', nota: 'Fecha agendada antes de hoy', tono: 'rojo' },
  { key: 'today', etiqueta: 'Atender hoy', nota: 'Agendados para hoy', tono: 'amarillo' },
  { key: 'upcoming', etiqueta: 'Próximos seguimientos', nota: 'Desde mañana en adelante', tono: 'azul' },
]
// Etiquetas cortas del último comentario: rubro · medio de seguimiento · respuesta del cliente (campos que ya
// muestra el Detalle de leads). El texto completo va al pasar el mouse.
const valorDe = Object.fromEntries(['rubro', 'medioSeguimiento', 'respuestaCliente'].map((k) => [k, COLUMNAS.find((c) => c.key === k).valor]))
const etiquetas = (lead) => ['rubro', 'medioSeguimiento', 'respuestaCliente'].map((k) => valorDe[k](lead)).filter(Boolean)

function Comentario({ lead }) {
  const texto = lead.comentarioGestion ?? leadComments(lead)[0]
  const tags = etiquetas(lead)
  if (!tags.length) return texto ? <span className="fv2-comentario" title={texto}>{texto}</span> : <span className="fv2-tenue">—</span>
  return <span className="fv2n-tags" title={texto ?? undefined}>{tags.map((t) => <span key={t}>{t}</span>)}</span>
}

function GestionSeguimientos({ seguimientos, grupo, onGrupo, onLead }) {
  const { overdue, today, upcoming, unscheduled } = seguimientos
  const filas = grupo === 'todos' ? [...overdue, ...today, ...upcoming] : seguimientos[grupo]
  const titulo = overdue.length || today.length
    ? `${plural(overdue.length, 'seguimiento está vencido', 'seguimientos están vencidos')} · ${today.length === 1 ? '1 hay que atenderlo hoy' : `${formatNumber(today.length)} hay que atenderlos hoy`}`
    : 'Ningún seguimiento vencido ni para hoy'
  return <section className="fv2-panel fv2n-bloque" id={ID_SEGUIMIENTOS}>
    <EncabezadoSeccion titulo={titulo}
      explicacion={<>Leads abiertos con próxima gestión agendada, primero los más atrasados{unscheduled.length ? <> · <b className="fv2n-texto-amarillo">{plural(unscheduled.length, 'lead abierto sin fecha agendada', 'leads abiertos sin fecha agendada')}</b></> : ''}. Clic en una tarjeta para ver solo ese grupo.</>} />
    <div className="fv2n-acciones">
      {GRUPOS.map((g) => <button type="button" key={g.key} aria-pressed={grupo === g.key}
        className={`fv2n-accion fv2n-seg-tarjeta is-${g.tono} ${grupo === g.key ? 'is-activa' : ''}`} onClick={() => onGrupo(grupo === g.key ? 'todos' : g.key)}>
        <span className="fv2n-seg-etiqueta">{g.etiqueta}</span>
        <b className="fv2n-accion-numero">{formatNumber(seguimientos[g.key].length)}</b>
        <span className="fv2n-accion-texto">{g.nota}{grupo === g.key ? ' · clic para ver todos' : ''}</span>
      </button>)}
    </div>
    <Tabla columnas={['Lead', 'Ejecutivo', 'Etapa', 'Fecha agendada', 'Último comentario', 'Detalle']} vacio={filas.length ? null : 'No hay seguimientos en este grupo.'}>
      {filas.map((lead) => {
        const fecha = followUpDate(lead)
        const dias = fecha ? daysFromToday(fecha) : null
        return <tr key={lead.id} className={`fv2n-seg-fila is-${dias == null ? 'sin' : dias < 0 ? 'rojo' : dias === 0 ? 'amarillo' : 'azul'}`}>
          <td><button type="button" className="fv2-enlace-lead" onClick={() => onLead(lead)}><NombreLead lead={lead} /></button></td>
          <td><span className="fv2-en-linea"><EtiquetaPais pais={lead.pais} /> {lead.asesor || 'Sin ejecutivo'}</span></td>
          <td>{PIPELINE_STAGES[lead.apiStage - 1] ?? '—'}</td>
          <td><span className="fv2-doble"><span>{fecha ? fechaHora.format(fecha) : '—'}</span>{dias != null && <small className={dias < 0 ? 'fv2n-texto-rojo' : ''}>{tiempoRelativo(dias)}</small>}</span></td>
          <td><Comentario lead={lead} /></td>
          <td><button type="button" className="fv2-btn-ficha" onClick={() => onLead(lead)}><Eye size={13} />Ver ficha</button></td>
        </tr>
      })}
    </Tabla>
  </section>
}

// ---------- 2. Forecast ----------
function TablaForecast({ items, onLead }) {
  return <Tabla className="fv2-tabla-ventana" columnas={['Lead', 'Ejecutivo', 'Próx. seguimiento', 'Señal de cierre', 'Comentario', 'Unidades', 'Detalle']} vacio={null}>
    {items.map(({ lead, date, days, signal, units }) => <tr key={lead.id}>
      <td><button type="button" className="fv2-enlace-lead" onClick={() => onLead(lead)}><NombreLead lead={lead} /></button></td>
      <td><span className="fv2-en-linea"><EtiquetaPais pais={lead.pais} /> {lead.asesor || 'Sin ejecutivo'}</span></td>
      <td><span className="fv2-doble"><span>{fechaHora.format(date)}</span><small>{tiempoRelativo(days)}</small></span></td>
      <td><span className="fv2-forecast-senal">{signal.label}</span></td>
      <td><span className="fv2-comentario" title={signal.comment}>{signal.comment}</span></td>
      <td className="num">{units ? formatNumber(units) : '—'}</td>
      <td><button type="button" className="fv2-btn-ficha" onClick={() => onLead(lead)}><Eye size={13} />Ver ficha</button></td>
    </tr>)}
  </Tabla>
}

/** «Oportunidades abiertas por etapa»: una barra de color por etapa (rojo / ámbar / a tiempo / sin fecha). Clic: sus leads. */
function ResumenPipeline({ leads, onLead }) {
  const resumen = useMemo(() => resumirSlaEtapas(leads), [leads])
  const etapas = resumen.porEtapa.filter((etapa) => etapa.total > 0)
  const max = Math.max(1, ...etapas.map((e) => e.total))
  return <section className="fv2-forecast-pipeline fv2n-pipeline">
    <header>
      <h3>Oportunidades abiertas por etapa</h3>
      <p>Cuántas oportunidades abiertas hay en cada etapa, su semáforo de 2 días hábiles y el promedio de días. Clic en una etapa para ver sus leads.</p>
    </header>
    <div className="fv2-forecast-etapas">
      {etapas.map((etapa) => <details className="fv2-coach-pipeline-etapa fv2n-pipeline-etapa" key={etapa.etapa}>
        <summary>
          <strong>{etapa.nombre}</strong>
          <span className="fv2n-pipeline-pista" style={{ '--ancho': `${(etapa.total / max) * 100}%` }} aria-hidden="true">
            {etapa.rojos > 0 && <i className="is-rojo" style={{ flexGrow: etapa.rojos }} />}
            {etapa.amarillos > 0 && <i className="is-amarillo" style={{ flexGrow: etapa.amarillos }} />}
            {etapa.verdes > 0 && <i className="is-verde" style={{ flexGrow: etapa.verdes }} />}
            {etapa.sinFecha > 0 && <i className="is-gris" style={{ flexGrow: etapa.sinFecha }} />}
          </span>
          <span className="fv2n-pipeline-cifras">
            <b>{plural(etapa.total, 'abierta', 'abiertas')}</b>
            <span className="is-rojo">{formatNumber(etapa.rojos)} rojas</span>
            <span className="is-amarillo">{formatNumber(etapa.amarillos)} ámbar</span>
            <span className="is-verde">{formatNumber(etapa.verdes)} a tiempo</span>
            {etapa.sinFecha > 0 && <span>{formatNumber(etapa.sinFecha)} sin fecha</span>}
            <span>Promedio {etapa.promedioDias == null ? '—' : `${formatNumber(etapa.promedioDias)} días`}</span>
          </span>
          <ChevronRight size={14} className="fv2n-pipeline-flecha" aria-hidden="true" />
        </summary>
        <TablaLeads className="fv2-tabla-ventana" leads={etapa.registros.map(({ lead }) => lead)}
          columnas={['lead', 'etapa', 'diasEtapa', 'slaEtapa', 'fecha', 'comentario', 'unidadesProyectadas', 'detalle']} onLead={onLead} />
      </details>)}
      {!resumen.total && <p className="fv2-coach-alertas-vacio">No hay oportunidades abiertas en los filtros actuales.</p>}
    </div>
  </section>
}

export function Forecast({ leads, horizonte, onHorizonte }) {
  const [leadSel, setLeadSel] = useState(null)
  const [grupo, setGrupo] = useState('todos')
  const seguimientos = useMemo(() => classifyFollowUps(leads), [leads])
  const forecast = useMemo(() => buildForecast(leads, horizonte), [leads, horizonte])
  const ejecutivos = new Set(forecast.items.map(({ lead }) => JSON.stringify([lead.pais, lead.asesor]))).size
  const verVencidos = () => {
    setGrupo('overdue')
    document.getElementById(ID_SEGUIMIENTOS)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const tituloForecast = forecast.items.length
    ? `${plural(forecast.items.length, 'caso', 'casos')} con señal de cierre en los próximos ${horizonte} días · ${plural(forecast.units, 'unidad', 'unidades')}`
    : `Ningún caso con señal de cierre en los próximos ${horizonte} días`

  return <div className="fv2-vista">
    <GestionSeguimientos seguimientos={seguimientos} grupo={grupo} onGrupo={setGrupo} onLead={setLeadSel} />

    <section className="fv2-panel fv2-forecast fv2n-bloque">
      <EncabezadoSeccion titulo={tituloForecast}
        explicacion="Forecast · proyección de ventas: oportunidades con señal de cierre dentro del horizonte elegido. Sigue los filtros de arriba (País, Período, Ejecutivo y Tipo de lead).">
        <div className="fv2-seg-horizonte">
          <span>Horizonte</span>
          <div className="fv2-res-segmento" role="group" aria-label="Horizonte del forecast">
            {HORIZONTES_FORECAST.map((dias) => <button key={dias} type="button" aria-pressed={horizonte === dias}
              className={horizonte === dias ? 'is-activo' : ''} onClick={() => onHorizonte(dias)}>{dias} d</button>)}
          </div>
        </div>
      </EncabezadoSeccion>

      <div className="fv2-forecast-resumen">
        <article><span>Casos en forecast</span><strong>{formatNumber(forecast.items.length)}</strong></article>
        <article><span>Ejecutivos con forecast</span><strong>{formatNumber(ejecutivos)}</strong></article>
        <article><span>Unidades proyectadas</span><strong>{formatNumber(forecast.units)}</strong></article>
        <section className="fv2-forecast-criterios">
          <strong>Criterio de inclusión · próximos {horizonte} días</strong>
          <ul>
            <li>Lead abierto en etapa Seguimiento, no excluido del forecast.</li>
            <li>Próxima gestión entre hoy y el horizonte seleccionado.</li>
            <li>Comentario con una señal de posible cierre.</li>
          </ul>
          <div>{CLOSING_KEYWORDS.map(({ label }) => <span key={label}>{label}</span>)}</div>
        </section>
      </div>

      {forecast.items.length
        ? <TablaForecast items={forecast.items} onLead={setLeadSel} />
        : <div className="fv2n-vacio-forecast">
          <p>Ningún caso cumple el criterio en los próximos {horizonte} días con los filtros actuales.</p>
          <div>
            {horizonte !== 60 && <button type="button" className="fv2n-boton" onClick={() => onHorizonte(60)}>Probar con 60 días</button>}
            <button type="button" className="fv2n-boton" onClick={verVencidos}>Ver los vencidos ({formatNumber(seguimientos.overdue.length)})</button>
          </div>
        </div>}

      <ResumenPipeline leads={leads} onLead={setLeadSel} />
    </section>

    <PerdidasEquipo leads={leads} onLead={setLeadSel} />

    {leadSel && <DetalleLead lead={leadSel} onClose={() => setLeadSel(null)} />}
  </div>
}
