// Copiado de InnovAIgt/DashboardLeads (Dashboard-Leds/src/components/MonthDetailModal.jsx)
import { useEffect, useState } from 'react'
import { CalendarDays, CheckCircle2, Package, Users, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { LeadDetailModal } from './LeadDetailModal.jsx'
import { LeadTable } from './LeadTable.jsx'
import { Badge, CountryTag } from './ui.jsx'
import { buildStageFunnel, leadDisplayId } from '../utils/leads.js'
import { formatNumber, formatPercent, leadUnits, monthLabel, summarize } from '../utils/analytics.js'

function Metric({ icon: Icon, label, value, accent }) {
  return <div className="month-detail-metric">
    <span className={`month-detail-metric-icon ${accent}`}><Icon size={17} /></span>
    <span className="month-detail-metric-copy">
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  </div>
}

export function MonthDetailModal({ month, country, leads, onClose }) {
  const [selectedLead, setSelectedLead] = useState(null)
  const summary = summarize(leads)
  const stages = buildStageFunnel(leads)
  const units = leads.filter((lead) => lead.estado === 'ganado')
    .reduce((total, lead) => total + leadUnits(lead), 0)

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return
      if (selectedLead) setSelectedLead(null)
      else onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose, selectedLead])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [])

  return <>
    {createPortal(<div className="month-detail-overlay fixed inset-0 z-50 grid place-items-center p-3 sm:p-5" role="presentation">
      <button type="button" className="absolute inset-0 bg-slate-900/45 backdrop-blur-[3px]" onClick={onClose} aria-label="Cerrar detalle del mes" />
      <section className="month-detail-modal relative flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-line bg-canvas shadow-2xl" role="dialog" aria-modal="true" aria-label={`Detalle de ${monthLabel(month, 'long')} · ${country}`}>
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line bg-surface px-5 py-4 sm:px-7">
          <div className="min-w-0">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">Detalle mensual</span>
            <h2 className="mt-1 flex flex-wrap items-center gap-2 text-xl font-semibold tracking-tight text-ink">
              {monthLabel(month, 'long')} <CountryTag country={country} /> <span className="text-muted">{country}</span>
            </h2>
            <p className="mt-1 text-xs text-muted">Cierres exitosos por fecha de cierre; los demás leads por fecha de creación. El detalle no incluye forecast.</p>
          </div>
          <button type="button" className="btn btn-ghost !p-2" onClick={onClose} aria-label="Cerrar detalle del mes"><X size={18} /></button>
        </header>

        <div className="month-detail-content grid min-h-0 gap-4 overflow-y-auto p-4 sm:p-6">
          <section className="month-detail-metrics" aria-label="Indicadores del mes">
            <Metric icon={Users} label="Total de leads" value={formatNumber(summary.total)} accent="blue" />
            <Metric icon={CheckCircle2} label="Calificados" value={formatNumber(summary.qualified)} accent="violet" />
            <Metric icon={Users} label="No calificados" value={formatNumber(summary.unqualified)} accent="orange" />
            <Metric icon={CheckCircle2} label="Radicados" value={formatNumber(summary.won)} accent="green" />
            <Metric icon={CalendarDays} label="Conversión" value={formatPercent(summary.won, summary.total)} accent="sky" />
            <Metric icon={Package} label="Unidades radicadas" value={formatNumber(units)} accent="blue" />
          </section>

          <section className="month-detail-section">
            <div className="month-detail-section-heading">
              <div>
                <h3>Avance por etapa</h3>
                <p>Leads alcanzados en cada etapa según el API.</p>
              </div>
              <Badge tone="neutral">{formatNumber(leads.length)} leads en el periodo</Badge>
            </div>
            <div className="month-detail-stages">
              {stages.map((stage) => <div className="month-detail-stage" key={stage.stage}>
                <small>Etapa {stage.stage}</small>
                <strong>{stage.label}</strong>
                <span>{formatNumber(stage.reached)} alcanzaron · {formatNumber(stage.current)} actuales</span>
              </div>)}
            </div>
          </section>

          <section className="month-detail-section">
            <div className="month-detail-section-heading">
              <div>
                <h3>Leads del mes</h3>
                <p>Selecciona un lead para abrir su ficha completa.</p>
              </div>
              <span className="text-xs text-muted"><b className="text-ink">{formatNumber(leads.length)}</b> leads</span>
            </div>
            <LeadTable
              className="month-detail-table"
              leads={[...leads].sort((a, b) => String(a.clientName ?? leadDisplayId(a)).localeCompare(String(b.clientName ?? leadDisplayId(b))))}
              columns={['lead', 'asesor', 'etapa', 'estado', 'calificacion', 'fechaCierre', 'unidadesRadicadas', 'detalle']}
              onLeadClick={setSelectedLead}
            />
          </section>
        </div>
      </section>
    </div>, document.body)}
    {selectedLead && <LeadDetailModal lead={selectedLead} onClose={() => setSelectedLead(null)} />}
  </>
}
