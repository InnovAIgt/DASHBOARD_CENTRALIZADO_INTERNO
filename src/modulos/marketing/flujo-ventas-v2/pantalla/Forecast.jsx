import { useMemo, useState } from 'react'
import { Eye, Target } from 'lucide-react'
import { buildForecast, CLOSING_KEYWORDS, formatNumber } from '../utils/analytics.js'
import { resumirSlaEtapas } from '../utils/sla.js'
import { DetalleLead } from './Ventanas.jsx'
import { HORIZONTES_FORECAST } from './SeguimientoEjecutivo.jsx'
import { PaisChip } from './comunes.jsx'
import { NombreLead, Tabla, TablaLeads } from './Tablas.jsx'

const fechaHora = new Intl.DateTimeFormat('es-SV', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

function tiempoRelativo(dias) {
  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Mañana'
  return `En ${dias} días`
}

function TablaForecast({ items, onLead }) {
  return <Tabla className="fv2-tabla-ventana" columnas={['Lead', 'Ejecutivo', 'Próx. seguimiento', 'Señal de cierre', 'Comentario', 'Unidades', 'Detalle']}
    vacio={items.length ? null : 'Ninguna oportunidad cumple los criterios de forecast en los filtros activos.'}>
    {items.map(({ lead, date, days, signal, units }) => <tr key={lead.id}>
      <td><button type="button" className="fv2-enlace-lead" onClick={() => onLead(lead)}><NombreLead lead={lead} /></button></td>
      <td><span className="fv2-en-linea"><PaisChip pais={lead.pais} />{lead.asesor || 'Sin ejecutivo'}</span></td>
      <td><span className="fv2-doble"><span>{fechaHora.format(date)}</span><small>{tiempoRelativo(days)}</small></span></td>
      <td><span className="fv2-forecast-senal">{signal.label}</span></td>
      <td><span className="fv2-comentario" title={signal.comment}>{signal.comment}</span></td>
      <td className="num">{units ? formatNumber(units) : '—'}</td>
      <td><button type="button" className="fv2-btn-ficha" onClick={() => onLead(lead)}><Eye size={13} />Ver ficha</button></td>
    </tr>)}
  </Tabla>
}

function ResumenPipeline({ leads, onLead }) {
  const resumen = useMemo(() => resumirSlaEtapas(leads), [leads])
  const etapas = resumen.porEtapa.filter((etapa) => etapa.total > 0)
  return <section className="fv2-forecast-pipeline">
    <header>
      <h3>Oportunidades abiertas por etapa</h3>
      <p>Tiempo en etapa y semáforo SLA para todas las oportunidades que cumplen los filtros activos.</p>
    </header>
    <div className="fv2-forecast-etapas">
      {etapas.map((etapa) => <details className="fv2-coach-pipeline-etapa" key={etapa.etapa}>
        <summary>
          <strong>{etapa.nombre}</strong>
          <span>{formatNumber(etapa.total)} abiertas</span>
          <span className="is-rojo">{formatNumber(etapa.rojos)} rojas</span>
          <span className="is-amarillo">{formatNumber(etapa.amarillos)} amarillas</span>
          <span className="is-verde">{formatNumber(etapa.verdes)} a tiempo</span>
          <span>Promedio {etapa.promedioDias == null ? '—' : `${formatNumber(etapa.promedioDias)} días`}</span>
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
  const forecast = useMemo(() => buildForecast(leads, horizonte), [leads, horizonte])
  const ejecutivos = new Set(forecast.items.map(({ lead }) => JSON.stringify([lead.pais, lead.asesor]))).size

  return <div className="fv2-vista">
    <section className="fv2-panel fv2-forecast">
      <header className="fv2-forecast-cabeza">
        <div>
          <h2><Target size={19} aria-hidden="true" /> Forecast · proyección de ventas</h2>
          <p>Oportunidades con señal de cierre dentro del horizonte seleccionado. Hereda País, Período, Ejecutivo y Tipo de lead de los filtros superiores.</p>
        </div>
        <div className="fv2-seg-horizonte">
          <span>Horizonte</span>
          <div className="fv2-res-segmento" role="group" aria-label="Horizonte del forecast">
            {HORIZONTES_FORECAST.map((dias) => <button key={dias} type="button" aria-pressed={horizonte === dias}
              className={horizonte === dias ? 'is-activo' : ''} onClick={() => onHorizonte(dias)}>{dias} d</button>)}
          </div>
        </div>
      </header>

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

      <TablaForecast items={forecast.items} onLead={setLeadSel} />
      <ResumenPipeline leads={leads} onLead={setLeadSel} />
    </section>
    {leadSel && <DetalleLead lead={leadSel} onClose={() => setLeadSel(null)} />}
  </div>
}
