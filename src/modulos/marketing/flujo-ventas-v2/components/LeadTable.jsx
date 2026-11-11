// Copiado de InnovAIgt/DashboardLeads (Dashboard-Leds/src/components/LeadTable.jsx)
import { Eye } from 'lucide-react'
import { leadDisplayId } from '../utils/leads.js'
import { daysFromToday, followUpDate, formatNumber, isWon, leadComments, leadUnits, PIPELINE_STAGES, qualificationLabel } from '../utils/analytics.js'
import { formatDate } from '../utils/dates.js'
import { Badge, CountryTag, DataTable, StateBadge } from './ui.jsx'

const dateTime = new Intl.DateTimeFormat('es-SV', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

export function FollowUpDate({ lead, tone }) {
  const date = followUpDate(lead)
  if (!date) return <span className="text-muted">Sin agendar</span>
  const days = daysFromToday(date)
  const relative = days === 0 ? 'Hoy' : days < 0 ? `Hace ${-days} d` : `En ${days} d`
  return <span className="grid leading-tight">
    <span className="whitespace-nowrap text-ink">{dateTime.format(date)}</span>
    <small className={tone === 'bad' ? 'text-bad' : tone === 'warn' ? 'text-warn' : 'text-muted'}>{relative}</small>
  </span>
}

export function LeadName({ lead }) {
  return <span className="grid leading-tight">
    <span className="font-medium text-ink">{lead.clientName ?? `Lead ${leadDisplayId(lead)}`}</span>
    <small className="text-muted">{leadDisplayId(lead)}</small>
  </span>
}

const COLUMNS = (onLeadClick) => ({
  lead: {
    label: 'Lead',
    render: (lead) => onLeadClick
      ? <button type="button" className="lead-detail-trigger" onClick={() => onLeadClick(lead)} aria-label={`Abrir detalle de ${lead.clientName ?? `Lead ${leadDisplayId(lead)}`}`}>
        <LeadName lead={lead} />
      </button>
      : <LeadName lead={lead} />,
  },
  asesor: { label: 'Ejecutivo', render: (lead) => <span className="flex items-center gap-2 whitespace-nowrap"><CountryTag country={lead.pais} />{lead.asesor}</span> },
  etapa: { label: 'Etapa', render: (lead) => <span className="whitespace-nowrap">{PIPELINE_STAGES[lead.apiStage - 1] ?? '—'}</span> },
  estado: { label: 'Estado', render: (lead) => <StateBadge state={lead.estado} /> },
  calificacion: { label: 'Calificación', render: (lead) => <Badge tone={lead.tipoLead === 'calificado' ? 'info' : 'neutral'}>{qualificationLabel(lead.tipoLead)}</Badge> },
  fechaCierre: { label: 'Fecha de cierre', render: (lead) => isWon(lead) ? formatDate(lead.fechaCierreExitoso) : '—' },
  fecha: { label: 'Fecha agendada', render: (lead, tone) => <FollowUpDate lead={lead} tone={tone} /> },
  comentario: { label: 'Último comentario', render: (lead) => <span className="line-clamp-2 max-w-[22rem] text-muted" title={leadComments(lead)[0]}>{leadComments(lead)[0] ?? '—'}</span> },
  unidades: { label: 'Unidades', numeric: true, render: (lead) => (leadUnits(lead) ? formatNumber(leadUnits(lead)) : '—') },
  unidadesRadicadas: { label: 'Unidades radicadas', numeric: true, render: (lead) => isWon(lead) && leadUnits(lead) ? formatNumber(leadUnits(lead)) : '—' },
  unidadesProyectadas: { label: 'Unidades proyectadas', numeric: true, render: (lead) => (leadUnits(lead) ? formatNumber(leadUnits(lead)) : '—') },
  detalle: {
    label: 'Detalle',
    render: (lead, _tone, onLeadClick) => <button type="button" className="lead-view-detail" onClick={() => onLeadClick?.(lead)} disabled={!onLeadClick}>
      <Eye size={14} /> <span>Ver detalle</span>
    </button>,
  },
})

export function LeadTable({ leads, columns, tone, empty = 'Sin casos para la selección actual.', limit, className, onLeadClick }) {
  const shown = limit ? leads.slice(0, limit) : leads
  const columnDefinitions = COLUMNS(onLeadClick)
  const defs = columns.map((key) => columnDefinitions[key])
  return <DataTable headers={defs} empty={leads.length ? null : empty} className={className}>
    {shown.map((lead) => <tr key={lead.id} className={tone ? `row-${tone}` : ''}>
      {defs.map((def, index) => <td key={columns[index]} className={def.numeric ? 'num' : ''}>{def.render(lead, tone, onLeadClick)}</td>)}
    </tr>)}
  </DataTable>
}
