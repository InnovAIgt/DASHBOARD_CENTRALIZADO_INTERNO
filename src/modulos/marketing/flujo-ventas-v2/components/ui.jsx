// Copiado de InnovAIgt/DashboardLeads (Dashboard-Leds/src/components/ui.jsx)
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { stateLabel } from '../utils/leads.js'

export function Card({ title, subtitle, action, className = '', children }) {
  return <section className={`card ${className}`}>
    {(title || action) && <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>}
    {children}
  </section>
}

const STATE_TONE = {
  activo: 'info', en_espera: 'neutral', detenido: 'warn', ganado: 'good', perdido: 'bad', invalido: 'neutral',
}

export function Badge({ tone = 'neutral', children, title }) {
  return <span className={`badge badge-${tone}`} title={title}>{children}</span>
}

export function StateBadge({ state }) {
  return <Badge tone={STATE_TONE[state]}>{stateLabel(state)}</Badge>
}

export function CountryTag({ country }) {
  const code = country === 'Guatemala' ? 'GT' : country === 'El Salvador' ? 'SV' : '—'
  return <span className={`country-tag country-${code.toLowerCase()}`} title={country}>{code}</span>
}

export function EmptyState({ title, body }) {
  return <div className="grid place-items-center gap-1 rounded-xl border border-dashed border-line px-4 py-8 text-center">
    <strong className="text-sm text-ink">{title}</strong>
    {body && <p className="text-xs text-muted">{body}</p>}
  </div>
}

export function LoadingState() {
  return <div className="card flex items-center gap-2 text-sm text-muted" role="status"><RefreshCw size={16} className="animate-spin" /> Cargando información comercial…</div>
}

export function ErrorBanner({ message, onRetry, onDemo }) {
  return <div className="flex flex-wrap items-start gap-3 rounded-xl border border-bad/30 bg-bad-soft p-4 text-sm" role="alert">
    <AlertTriangle size={18} className="mt-0.5 text-bad" />
    <div className="min-w-0 flex-1">
      <strong className="text-ink">No se pudo actualizar el dashboard</strong>
      <p className="mt-0.5 break-words text-muted">{message}</p>
      <small className="text-muted">Verifica el proxy y la variable de servidor RED_API_KEY.</small>
    </div>
    <div className="flex gap-2">
      <button className="btn btn-ghost" onClick={onRetry}>Reintentar</button>
      {onDemo && <button className="btn btn-primary" onClick={onDemo}>Usar datos de ejemplo</button>}
    </div>
  </div>
}

export function DataTable({ headers, children, empty, colSpan, className = '' }) {
  return <div className={`table-scroll ${className}`}>
    <table className="data-table">
      <thead><tr>{headers.map((header) => <th key={header.label ?? header} className={header.numeric ? 'num' : ''}>{header.label ?? header}</th>)}</tr></thead>
      <tbody>
        {children}
        {empty && <tr><td colSpan={colSpan ?? headers.length} className="py-8 text-center text-muted">{empty}</td></tr>}
      </tbody>
    </table>
  </div>
}
