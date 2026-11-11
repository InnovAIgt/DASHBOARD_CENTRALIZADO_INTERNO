// Copiado de InnovAIgt/DashboardLeads (Dashboard-Leds/src/components/KpiGrid.jsx)
import { Boxes, CheckCircle2, Gauge, Package, Users } from 'lucide-react'
import { formatNumber, formatPercent } from '../utils/analytics.js'

function Kpi({ icon: Icon, label, value, detail, accent }) {
  return <article className="card kpi-card">
    <span className="kpi-accent" style={{ background: accent }} />
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-medium text-muted">{label}</span>
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-subtle text-muted"><Icon size={15} /></span>
    </div>
    <strong className="mt-2 block text-[28px] font-semibold leading-none tracking-tight text-ink tabular-nums">{value}</strong>
    <small className="mt-2 block text-xs text-muted">{detail}</small>
  </article>
}

export function KpiGrid({ summary, compact = false }) {
  return <section className={`grid gap-3 ${compact ? 'grid-cols-2 lg:grid-cols-5' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-5'}`}>
    <Kpi icon={Users} accent="#2a78d6" label="Total leads" value={formatNumber(summary.total)} detail={`${formatNumber(summary.qualified)} calificados · ${formatNumber(summary.unqualified)} no calificados`} />
    <Kpi icon={CheckCircle2} accent="#1baf7a" label="Leads radicados" value={formatNumber(summary.won)} detail={`${formatNumber(summary.open)} leads aún abiertos`} />
    <Kpi icon={Package} accent="#eb6834" label="Total unidades vendidas" value={formatNumber(summary.units)} detail="Σ unidades en leads radicados" />
    <Kpi icon={Boxes} accent="#6250d6" label="Unidades promedio por cierre" value={summary.won ? formatNumber(Math.round(summary.avgUnits)) : '—'} detail={summary.won ? `${formatNumber(summary.units)} unidades / ${formatNumber(summary.won)} cierres` : 'Sin cierres con éxito'} />
    <Kpi icon={Gauge} accent="#008300" label="Tasa de conversión" value={formatPercent(summary.won, summary.total)} detail={`Cerrados con éxito / total · ${formatPercent(summary.won, summary.qualified)} sobre calificados`} />
  </section>
}
