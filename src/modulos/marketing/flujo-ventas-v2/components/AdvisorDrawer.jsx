// Copiado de InnovAIgt/DashboardLeads (Dashboard-Leds/src/components/AdvisorDrawer.jsx)
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, CheckCircle2, Package, Percent, TrendingUp, Users, UserRoundCheck, X } from 'lucide-react'
import { buildForecast, formatNumber, formatPercent, monthLabel, stageDistribution, summarize } from '../utils/analytics.js'
import { Funnel, Meter } from './charts.jsx'
import { LeadTable } from './LeadTable.jsx'
import { CountryTag } from './ui.jsx'
import { LeadDetailModal } from './LeadDetailModal.jsx'
import { leadReferenceMonth } from '../utils/leads.js'

export function AdvisorDrawer({ name, country, leads, month, onClose }) {
  const [selectedLead, setSelectedLead] = useState(null)
  const [selectedMonth, setSelectedMonth] = useState(month ?? '')
  const [selectedType, setSelectedType] = useState('')

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return
      if (selectedLead) setSelectedLead(null)
      else onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose, selectedLead])

  const advisorLeads = leads.filter((lead) => lead.asesor === name && (!country || lead.pais === country))
  const availableMonths = [...new Set(advisorLeads.map(leadReferenceMonth).filter(Boolean))].sort((a, b) => b.localeCompare(a))
  const own = advisorLeads.filter((lead) =>
    (!selectedMonth || leadReferenceMonth(lead) === selectedMonth)
    && (!selectedType || (lead.tipoLead ?? 'sin_clasificar') === selectedType),
  )
  const summary = summarize(own)
  const executiveUnits = summary.units
  const stages = stageDistribution(own)
  const maxStage = Math.max(1, ...stages.map((stage) => stage.count))
  const forecast = buildForecast(own)
  const advisorCountry = country ?? advisorLeads[0]?.pais
  const advisorKpis = [
    { label: 'Leads', value: formatNumber(summary.total), icon: Users, tone: 'blue' },
    { label: 'Calificados', value: formatNumber(summary.qualified), icon: UserRoundCheck, tone: 'violet' },
    { label: 'Radicados', value: formatNumber(summary.won), icon: CheckCircle2, tone: 'green' },
    { label: 'Unidades radicadas', value: formatNumber(summary.units), icon: Package, tone: 'orange' },
    { label: 'Conversión', value: formatPercent(summary.won, summary.total), icon: Percent, tone: 'sky' },
  ]

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [])

  return <>
    {createPortal(<div className="advisor-modal-overlay fixed inset-0 z-40 grid place-items-center p-3 sm:p-5" role="presentation">
    <button type="button" className="drawer-backdrop absolute inset-0 bg-slate-900/45 backdrop-blur-[3px]" onClick={onClose} aria-label="Cerrar detalle del ejecutivo" />
    <section className="advisor-modal relative flex w-full flex-col overflow-hidden rounded-2xl border border-line bg-canvas shadow-2xl" role="dialog" aria-modal="true" aria-label={`Detalle de ${name}`}>
      <header className="advisor-modal-header shrink-0 border-b border-line bg-surface px-4 py-3 sm:px-6 sm:py-4">
        <div className="advisor-title">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">Detalle del ejecutivo</span>
          <h2 className="mt-1 flex flex-wrap items-center gap-2 text-lg font-semibold tracking-tight text-ink sm:text-xl">{name} {advisorCountry && <CountryTag country={advisorCountry} />}</h2>
        </div>
        <button type="button" className="btn btn-ghost advisor-close !p-2" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        <div className="advisor-filters" aria-label="Filtros del ejecutivo">
          <span className="advisor-filter-heading">Filtros del ejecutivo</span>
          <label>
            <span><CalendarDays size={13} />Mes</span>
            <select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
              <option value="">Todos los meses</option>
              {availableMonths.map((value) => <option value={value} key={value}>{monthLabel(value, 'long')}</option>)}
            </select>
          </label>
          <label>
            <span>Tipo de lead</span>
            <select value={selectedType} onChange={(event) => setSelectedType(event.target.value)}>
              <option value="">Todos</option>
              <option value="calificado">Calificado</option>
              <option value="no_calificado">No calificado</option>
            </select>
          </label>
        </div>
      </header>

      <div className="advisor-modal-content grid min-h-0 flex-1 content-start gap-3 overflow-y-auto p-3 sm:gap-3 sm:p-4">
        <section className="advisor-metrics" aria-label="Indicadores principales del ejecutivo">
          {advisorKpis.map(({ label, value, icon: Icon, tone }) => <article className={`advisor-kpi advisor-kpi-${tone}`} key={label}>
            <span className="advisor-kpi-icon"><Icon size={17} strokeWidth={2} /></span>
            <strong>{value}</strong>
            <small>{label}</small>
          </article>)}
        </section>

        <section className="card advisor-detail-card advisor-funnel-card">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(16rem,.9fr)]">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-ink">Embudo de conversión</h3>
              <Funnel compact stages={[
                { label: 'Total leads', value: summary.total },
                { label: 'Calificados', value: summary.qualified },
                { label: 'Radicados', value: summary.won },
              ]} />
            </div>
            <div className="advisor-executive-units">
              <div>
                <span className="advisor-executive-units-label">Unidades en leads radicados</span>
                <strong>{formatNumber(executiveUnits)} <small>unidades</small></strong>
                <p>Solo unidades de los {formatNumber(summary.won)} leads radicados de {name}.</p>
              </div>
              <Package size={24} aria-hidden="true" />
            </div>
          </div>
        </section>

        <section className="card advisor-table-card advisor-followups-card">
          <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-ink">Seguimientos por lead</h3>
              <p className="mt-0.5 text-xs text-muted">Selecciona un lead o usa “Ver detalle” para consultar su etapa y actividad.</p>
            </div>
            <span className="text-xs text-muted"><b className="text-ink">{formatNumber(own.length)}</b> leads en esta selección</span>
          </header>
          <LeadTable className="advisor-table-scroll advisor-followups-scroll" leads={[...own].sort((a, b) => b.apiStage - a.apiStage)} columns={['lead', 'etapa', 'calificacion', 'estado', 'fecha', 'comentario', 'unidadesRadicadas', 'detalle']} onLeadClick={setSelectedLead} />
        </section>

        <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]">
          <section className="card advisor-stage-card">
            <header className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-ink">Etapas</h3>
              <span className="text-[11px] text-muted">Distribución actual</span>
            </header>
            <div className="advisor-stage-list">
              {stages.map((stage) => <div key={stage.stage} className="advisor-stage-row">
                <span className="advisor-stage-number">{stage.stage}</span>
                <span className="advisor-stage-name">{stage.label}</span>
                <Meter value={stage.count} max={maxStage} color="#2a78d6" />
                <span className="advisor-stage-count">{stage.count}<small> · {stage.open} abiertos</small></span>
              </div>)}
            </div>
          </section>

          <section className="card advisor-table-card">
            <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-ink"><TrendingUp size={15} className="text-good" />Forecast actual</h3>
              <span className="text-xs text-muted"><b className="text-ink">{forecast.items.length}</b> casos · <b className="text-ink">{formatNumber(forecast.units)}</b> unidades proyectadas</span>
            </header>
            <LeadTable className="advisor-table-scroll" leads={forecast.items.map((item) => item.lead)} columns={['lead', 'fecha', 'comentario', 'unidadesProyectadas', 'detalle']} empty="Sin casos que cumplan el criterio de forecast (próximos 30 días)." onLeadClick={setSelectedLead} />
          </section>
        </div>

      </div>
    </section>
  </div>, document.body)}
    {selectedLead && <LeadDetailModal lead={selectedLead} onClose={() => setSelectedLead(null)} />}
  </>
}
