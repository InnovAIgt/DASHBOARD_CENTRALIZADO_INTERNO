// Flujo de ventas v2 · tablas (estilo de las tablas de Activaciones).
import { Eye } from 'lucide-react'
import { daysFromToday, followUpDate, formatNumber, isWon, leadComments, leadUnits, PIPELINE_STAGES } from '../utils/analytics.js'
import { formatDate } from '../utils/dates.js'
import { leadDisplayId } from '../utils/leads.js'
import { Calificacion, EstadoLead, PaisChip } from './comunes.jsx'

export function Tabla({ columnas, vacio, children, className = '' }) {
  return <div className={`fv2-tabla-caja ${className}`}>
    <table className="fv2-tabla">
      <thead><tr>{columnas.map((c) => <th key={c.label ?? c} className={c.num ? 'num' : ''}>{c.label ?? c}</th>)}</tr></thead>
      <tbody>
        {children}
        {vacio && <tr><td colSpan={columnas.length} className="fv2-tabla-vacia">{vacio}</td></tr>}
      </tbody>
    </table>
  </div>
}

// ---------- Tabla de leads (ventanas de detalle) ----------
// Mismas columnas y valores que la tabla de leads anterior; cambian textos y diseño.
const fechaHora = new Intl.DateTimeFormat('es-SV', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

function FechaAgendada({ lead }) {
  const date = followUpDate(lead)
  if (!date) return <span className="fv2-tenue">Sin agendar</span>
  const days = daysFromToday(date)
  const relativo = days === 0 ? 'Hoy' : days < 0 ? `Hace ${-days} d` : `En ${days} d`
  return <span className="fv2-doble"><span>{fechaHora.format(date)}</span><small>{relativo}</small></span>
}

export function NombreLead({ lead }) {
  return <span className="fv2-doble">
    <span className="fv2-fuerte">{lead.clientName ?? `Lead ${leadDisplayId(lead)}`}</span>
    <small>{leadDisplayId(lead)}</small>
  </span>
}

const COLUMNAS_LEADS = (onLead) => ({
  lead: { label: 'Cliente', render: (lead) => (onLead ? <button type="button" className="fv2-enlace-lead" onClick={() => onLead(lead)}><NombreLead lead={lead} /></button> : <NombreLead lead={lead} />) },
  asesor: { label: 'Ejecutivo', render: (lead) => <span className="fv2-en-linea"><PaisChip pais={lead.pais} />{lead.asesor}</span> },
  etapa: { label: 'Etapa', render: (lead) => PIPELINE_STAGES[lead.apiStage - 1] ?? '—' },
  estado: { label: 'Estado', render: (lead) => <EstadoLead estado={lead.estado} /> },
  calificacion: { label: 'Calificación', render: (lead) => <Calificacion tipo={lead.tipoLead} /> },
  fechaCierre: { label: 'Fecha de cierre', render: (lead) => (isWon(lead) ? formatDate(lead.fechaCierreExitoso) : '—') },
  fecha: { label: 'Fecha agendada', render: (lead) => <FechaAgendada lead={lead} /> },
  comentario: { label: 'Último comentario', render: (lead) => <span className="fv2-comentario" title={leadComments(lead)[0]}>{leadComments(lead)[0] ?? '—'}</span> },
  unidadesGanadas: { label: 'Unidades vendidas', num: true, render: (lead) => (isWon(lead) && leadUnits(lead) ? formatNumber(leadUnits(lead)) : '—') },
  unidadesProyectadas: { label: 'Unidades proyectadas', num: true, render: (lead) => (leadUnits(lead) ? formatNumber(leadUnits(lead)) : '—') },
  detalle: { label: 'Detalle', render: (lead) => <button type="button" className="fv2-btn-ficha" onClick={() => onLead?.(lead)} disabled={!onLead}><Eye size={13} />Ver ficha</button> },
})

export function TablaLeads({ leads, columnas, vacio = 'Sin leads para la selección actual.', onLead, className }) {
  const defs = COLUMNAS_LEADS(onLead)
  const usadas = columnas.map((key) => defs[key])
  return <Tabla columnas={usadas} vacio={leads.length ? null : vacio} className={className}>
    {leads.map((lead) => <tr key={lead.id}>
      {usadas.map((def, i) => <td key={columnas[i]} className={def.num ? 'num' : ''}>{def.render(lead)}</td>)}
    </tr>)}
  </Tabla>
}
