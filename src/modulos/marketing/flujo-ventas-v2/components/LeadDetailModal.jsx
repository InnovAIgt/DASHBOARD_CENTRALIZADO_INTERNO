// Copiado de InnovAIgt/DashboardLeads (Dashboard-Leds/src/components/LeadDetailModal.jsx)
import { createPortal } from 'react-dom'
import { CalendarClock, Package, UserRound, X } from 'lucide-react'
import { formatNumber, isWon, leadComments, leadUnits, PIPELINE_STAGES } from '../utils/analytics.js'
import { formatDate } from '../utils/dates.js'
import { leadDisplayId, stateLabel } from '../utils/leads.js'
import { Badge, CountryTag } from './ui.jsx'

function DetailItem({ label, value }) {
  return <div className="lead-detail-item">
    <span>{label}</span>
    <strong>{value || '—'}</strong>
  </div>
}

export function LeadDetailModal({ lead, onClose }) {
  const comments = leadComments(lead)
  const stage = lead.apiStageLabel || PIPELINE_STAGES[lead.apiStage - 1] || 'Sin etapa'
  const product = typeof lead.producto === 'string' ? lead.producto : lead.raw?.rubro

  return createPortal(<div className="lead-detail-overlay fixed inset-0 z-[60] grid place-items-center p-4 sm:p-6" role="presentation">
    <button type="button" className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={onClose} aria-label="Cerrar detalle del lead" />
    <section className="lead-detail-modal relative flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-line bg-canvas shadow-2xl" role="dialog" aria-modal="true" aria-label={`Detalle del lead ${lead.clientName ?? leadDisplayId(lead)}`}>
      <header className="flex items-start justify-between gap-4 border-b border-line bg-surface px-5 py-4 sm:px-7">
        <div className="min-w-0">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">Detalle del lead</span>
          <h2 className="mt-1 truncate text-xl font-semibold tracking-tight text-ink">{lead.clientName ?? `Lead ${leadDisplayId(lead)}`}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span>{leadDisplayId(lead)}</span>
            <span aria-hidden="true">·</span>
            <CountryTag country={lead.pais} />
            <span>{lead.asesor}</span>
          </div>
        </div>
        <button type="button" className="btn btn-ghost !p-2" onClick={onClose} aria-label="Cerrar detalle del lead"><X size={18} /></button>
      </header>

      <div className="lead-detail-content grid gap-4 overflow-y-auto p-5 sm:grid-cols-2 sm:p-7">
        <section className="lead-detail-summary sm:col-span-2">
          <div>
            <span>Unidades radicadas de este lead</span>
            <strong>{isWon(lead) ? formatNumber(leadUnits(lead)) : '—'}</strong>
          </div>
          <Badge tone={lead.estado === 'ganado' ? 'good' : lead.estado === 'perdido' ? 'bad' : 'info'}>{stateLabel(lead.estado)}</Badge>
        </section>

        <section className="lead-detail-section">
          <h3><UserRound size={16} /> Información comercial</h3>
          <DetailItem label="Ejecutivo" value={lead.asesor} />
          <DetailItem label="País" value={lead.pais} />
          <DetailItem label="Etapa actual" value={stage} />
          <DetailItem label="Calificación" value={lead.tipoLead === 'calificado' ? 'Calificado' : lead.tipoLead === 'no_calificado' ? 'No calificado' : 'Sin clasificar'} />
          <DetailItem label="Producto / rubro" value={product} />
        </section>

        <section className="lead-detail-section">
          <h3><CalendarClock size={16} /> Fechas y seguimiento</h3>
          <DetailItem label="Creado" value={formatDate(lead.fechaCreacion)} />
          {isWon(lead) && <DetailItem label="Cierre exitoso" value={formatDate(lead.fechaCierreExitoso)} />}
          <DetailItem label="Próxima gestión" value={formatDate(lead.proximaGestion)} />
          <DetailItem label="Fecha de reunión" value={formatDate(lead.fechaReunion)} />
          <DetailItem label="Fecha estimada de forecast" value={formatDate(lead.fcFecha)} />
          <DetailItem label="Incluir en forecast" value={lead.fcIncluir || lead.fcIntentar ? 'Sí' : lead.fcExcluir ? 'No' : 'Sin indicar'} />
        </section>

        <section className="lead-detail-section sm:col-span-2">
          <h3><Package size={16} /> Comentarios y contexto</h3>
          {lead.comentarioReunion && <div className="lead-detail-comment"><strong>Reunión</strong><p>{lead.comentarioReunion}</p></div>}
          {comments.length
            ? comments.map((comment, index) => <div className="lead-detail-comment" key={`${index}-${comment}`}><strong>{index === 0 && lead.comentarioGestion === comment ? 'Última gestión' : 'Comentario'}</strong><p>{comment}</p></div>)
            : !lead.comentarioReunion && <p className="text-sm text-muted">No hay comentarios disponibles para este lead.</p>}
          {lead.motivo && <div className="lead-detail-comment"><strong>Motivo de pérdida</strong><p>{lead.motivo}</p></div>}
        </section>
      </div>
    </section>
  </div>, document.body)
}
