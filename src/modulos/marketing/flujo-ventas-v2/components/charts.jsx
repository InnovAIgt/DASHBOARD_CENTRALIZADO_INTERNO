// Copiado de InnovAIgt/DashboardLeads (Dashboard-Leds/src/components/charts.jsx)
import { useState } from 'react'
import { formatNumber, formatPercent, FUNNEL_COLORS, monthLabel } from '../utils/analytics.js'

export function Legend({ items }) {
  return <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
    {items.map((item) => <span key={item.label} className="inline-flex items-center gap-1.5">
      <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: item.color }} />{item.label}
    </span>)}
  </div>
}

function niceMax(value) {
  if (value <= 5) return 5
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const step = [1, 2, 2.5, 5, 10].find((candidate) => candidate * magnitude >= value / 4) * magnitude
  return Math.ceil(value / step) * step
}

/** Barras agrupadas por mes: leads, radicados y unidades sobre un mismo eje de conteo. */
export function MonthlyComboChart({ rows, series }) {
  const [hover, setHover] = useState(null)
  const width = 640
  const height = 260
  const pad = { top: 16, right: 8, bottom: 28, left: 36 }
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom
  const max = niceMax(Math.max(1, ...rows.flatMap((row) => series.map((item) => row[item.key]))))
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => fraction * max)
  const groupW = innerW / Math.max(rows.length, 1)
  const barW = Math.min(18, (groupW - 12) / series.length - 2)
  const y = (value) => pad.top + innerH - (value / max) * innerH

  return <div className="overflow-x-auto"><div className="relative min-w-[560px]">
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Leads, radicados y unidades por mes">
      {ticks.map((tick) => <g key={tick}>
        <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} className="stroke-grid" />
        <text x={pad.left - 6} y={y(tick) + 3} textAnchor="end" className="fill-muted text-[10px]">{formatNumber(tick)}</text>
      </g>)}
      {rows.map((row, index) => {
        const x0 = pad.left + index * groupW + (groupW - series.length * (barW + 2)) / 2
        return <g key={row.month} onMouseEnter={() => setHover(index)} onMouseLeave={() => setHover(null)}>
          <rect x={pad.left + index * groupW} y={pad.top} width={groupW} height={innerH} className={hover === index ? 'fill-hover' : 'fill-transparent'} />
          {series.map((item, seriesIndex) => {
            const value = row[item.key]
            const barH = Math.max(value ? 2 : 0, (value / max) * innerH)
            return <path
              key={item.key}
              d={roundedTopBar(x0 + seriesIndex * (barW + 2), pad.top + innerH - barH, barW, barH, Math.min(4, barW / 2))}
              fill={item.color}
              className="transition-all duration-500"
            />
          })}
          <text x={pad.left + index * groupW + groupW / 2} y={height - 8} textAnchor="middle" className="fill-muted text-[10px] capitalize">{monthLabel(row.month)}</text>
        </g>
      })}
    </svg>
    {hover !== null && rows[hover] && <div
      className="chart-tooltip"
      style={{ left: `${((pad.left + (hover + 0.5) * groupW) / width) * 100}%` }}
    >
      <strong>{monthLabel(rows[hover].month, 'long')}</strong>
      {series.map((item) => <span key={item.key}><i style={{ background: item.color }} />{item.label}<b>{formatNumber(rows[hover][item.key])}</b></span>)}
      <span className="text-muted">Conversión<b>{formatPercent(rows[hover].won, rows[hover].total)}</b></span>
    </div>}
  </div></div>
}

function roundedTopBar(x, y, w, h, r) {
  if (h <= 0) return ''
  const radius = Math.min(r, h)
  return `M${x},${y + h}V${y + radius}Q${x},${y} ${x + radius},${y}H${x + w - radius}Q${x + w},${y} ${x + w},${y + radius}V${y + h}Z`
}

/** Barras horizontales pareadas (p. ej. Total leads vs. Radicados). */
export function PairedBars({ rows, primary, secondary, onSelect, selected }) {
  const max = Math.max(1, ...rows.map((row) => row[primary.key]))
  return <div className="grid gap-2.5">
    {rows.map((row) => <button
      type="button"
      key={row.name}
      onClick={() => onSelect?.(row.name)}
      className={`group grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 rounded-lg px-2 py-1.5 text-left transition hover:bg-hover ${selected === row.name ? 'bg-hover ring-1 ring-accent/40' : ''}`}
      title={`${row.name}: ${row[primary.key]} ${primary.label.toLowerCase()} · ${row[secondary.key]} ${secondary.label.toLowerCase()}`}
    >
      <span className="truncate text-xs font-medium text-ink">{row.name}</span>
      <span className="grid gap-[3px]">
        <i className="block h-2 rounded-r transition-all duration-500" style={{ width: `${(row[primary.key] / max) * 100}%`, background: primary.color }} />
        <i className="block h-2 rounded-r transition-all duration-500" style={{ width: `${Math.max(row[secondary.key] ? 1.5 : 0, (row[secondary.key] / max) * 100)}%`, background: secondary.color }} />
      </span>
      <span className="text-right text-xs tabular-nums text-muted"><b className="text-ink">{formatNumber(row[primary.key])}</b> / {formatNumber(row[secondary.key])}</span>
    </button>)}
  </div>
}


/** Embudo visual con conversión entre etapas. */
export function Funnel({ stages, compact = false }) {
  const top = Math.max(1, stages[0]?.value ?? 1)
  return <div className={`grid ${compact ? 'gap-1.5' : 'gap-2'}`}>
    {stages.map((stage, index) => {
      const width = Math.max(100 - index * 16, Math.sqrt(stage.value / top) * 100)
      const previous = stages[index - 1]
      return <div key={stage.label}>
        {previous && <div className="flex justify-center py-0.5 text-[11px] text-muted">
          ↓ {formatPercent(stage.value, previous.value)} desde {previous.label.toLowerCase()}
        </div>}
        <div className="flex justify-center">
          <div
            className={`funnel-band ${compact ? 'h-9' : 'h-12'}`}
            style={{ width: `${width}%`, background: FUNNEL_COLORS[index] ?? FUNNEL_COLORS.at(-1) }}
            title={`${stage.label}: ${formatNumber(stage.value)}`}
          >
            <span>{stage.label}</span>
            <b className="tabular-nums">{formatNumber(stage.value)}</b>
          </div>
        </div>
      </div>
    })}
  </div>
}

/** Barra de progreso simple para comparativas. */
export function Meter({ value, max, color }) {
  return <span className="block h-1.5 overflow-hidden rounded-full bg-track">
    <i className="block h-full rounded-full transition-all duration-500" style={{ width: `${max ? Math.min(100, (value / max) * 100) : 0}%`, background: color }} />
  </span>
}
