// Flujo de ventas v2 · gráficas (estilo de las de Activaciones: guías suaves, líneas con área
// tenue, línea guía punteada al pasar el cursor y recuadro de detalle). Mismos datos que antes.
import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { formatNumber, formatPercent, monthLabel } from '../utils/analytics.js'
import { Bandera, CODIGO_PAIS, COLORES } from './comunes.jsx'

export function Leyenda({ items }) {
  return <div className="fv2-leyenda">
    {items.map((item) => <span key={item.label} style={{ color: item.color }}>● <em>{item.label}</em></span>)}
  </div>
}

/** Barra horizontal simple (carril tenue + relleno). */
export function Medidor({ valor, max, color, alto = 7 }) {
  const ancho = max ? Math.min(100, (valor / max) * 100) : 0
  return <span className="fv2-carril" style={{ height: alto }}>
    <i className="fv2-relleno" style={{ width: `${ancho}%`, background: color }} />
  </span>
}

function topeAmable(valor) {
  return Math.max(10, Math.ceil((valor * 1.2) / 5) * 5)
}

// ---------- Tendencia mensual: leads, ganados y unidades ----------
export function TendenciaMensual({ filas, series }) {
  const [hover, setHover] = useState(null)
  const w = 640
  const h = 250
  const padX = 46
  const padY = 26
  const max = topeAmable(Math.max(1, ...filas.flatMap((fila) => series.map((s) => fila[s.key]))))
  const paso = filas.length > 1 ? (w - padX * 2) / (filas.length - 1) : 0
  const xDe = (i) => (filas.length > 1 ? padX + i * paso : w / 2)
  const yDe = (v) => h - padY - (v / max) * (h - padY * 2)
  const base = h - padY
  const principal = series[0]
  const puntos = (s) => filas.map((fila, i) => `${xDe(i)},${yDe(fila[s.key])}`).join(' ')
  const area = filas.length > 1
    ? `M${xDe(0)},${base} L${filas.map((fila, i) => `${xDe(i)},${yDe(fila[principal.key])}`).join(' L')} L${xDe(filas.length - 1)},${base} Z`
    : ''
  const anchoZona = filas.length > 1 ? paso : w - padX * 2

  return <div className="fv2-tendencia">
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label="Leads, ganados y unidades por mes">
      <defs>
        <linearGradient id="fv2AreaLeads" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={principal.color} stopOpacity="0.24" />
          <stop offset="100%" stopColor={principal.color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3, 4].map((i) => {
        const y = padY + (h - padY * 2) * (i / 4)
        return <g key={i}>
          <line x1={padX} y1={y} x2={w - padX} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          <text x={padX - 8} y={y + 4} fill={COLORES.tenue} fontSize="10" textAnchor="end">{formatNumber(Math.round(max * (1 - i / 4)))}</text>
        </g>
      })}
      {area && <path className="fv2-area" d={area} fill="url(#fv2AreaLeads)" />}
      {series.map((s, i) => <polyline
        key={s.key}
        className={s.punteada ? 'fv2-linea-punteada' : 'fv2-linea'}
        pathLength={s.punteada ? undefined : '1'}
        style={{ '--fv2-i': i }}
        points={puntos(s)}
        fill="none"
        stroke={s.color}
        strokeWidth={i === 0 ? 3 : 2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={s.punteada ? '4 3' : undefined}
      />)}
      {filas.map((fila, i) => <g key={fila.month}>
        {series.map((s) => <circle key={s.key} cx={xDe(i)} cy={yDe(fila[s.key])} r={hover === i ? 5 : 3.5} fill={s.color} stroke="#151821" strokeWidth="1.5" />)}
        <text x={xDe(i)} y={h - 6} fill={COLORES.tenue} fontSize="11" fontWeight="700" textAnchor="middle">{monthLabel(fila.month)}</text>
      </g>)}
      {hover !== null && <line x1={xDe(hover)} y1={padY} x2={xDe(hover)} y2={base} stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeDasharray="4 3" />}
      {filas.map((fila, i) => <rect
        key={fila.month}
        x={filas.length > 1 ? xDe(i) - anchoZona / 2 : padX}
        y="0"
        width={anchoZona}
        height={h}
        fill="transparent"
        onMouseEnter={() => setHover(i)}
        onMouseLeave={() => setHover(null)}
      />)}
    </svg>
    {hover !== null && filas[hover] && <div
      className={`fv2-tooltip ${xDe(hover) / w > 0.6 ? 'is-izquierda' : ''}`}
      style={{ left: `${(xDe(hover) / w) * 100}%` }}
    >
      <div className="fv2-tooltip-titulo">{monthLabel(filas[hover].month, 'long')}</div>
      {series.map((s) => <div className="fv2-tooltip-fila" key={s.key}>
        <span style={{ color: s.color }}>● {s.label}</span><b>{formatNumber(filas[hover][s.key])}</b>
      </div>)}
      <div className="fv2-tooltip-fila"><span>Calificados</span><b>{formatNumber(filas[hover].qualified)}</b></div>
      <div className="fv2-tooltip-fila"><span>Conversión</span><b>{formatPercent(filas[hover].won, filas[hover].total)}</b></div>
    </div>}
  </div>
}

// ---------- Comparativa por país ----------
const METRICAS_PAIS = [
  { key: 'total', label: 'Leads' },
  { key: 'qualified', label: 'Calificados' },
  { key: 'won', label: 'Ganados' },
  { key: 'units', label: 'Unidades' },
]

export function ComparativaPaises({ paises }) {
  return <div className="fv2-paises">
    {paises.map((fila) => {
      const conversion = fila.total ? fila.won / fila.total : 0
      return <article key={fila.country} className="fv2-pais-tarjeta">
        <header>
          <div>
            <div className="fv2-pais-nombre"><Bandera pais={fila.country} />{fila.country.toUpperCase()} ({CODIGO_PAIS[fila.country]})</div>
            <small>{formatNumber(fila.total)} leads · {fila.won ? formatNumber(Math.round(fila.avgUnits)) : '—'} u/cierre</small>
          </div>
          <div className="fv2-pais-pct">
            <strong>{formatPercent(fila.won, fila.total)}</strong>
            <small>conversión</small>
          </div>
        </header>
        <Medidor valor={conversion} max={1} color={COLORES.verde} alto={6} />
        <div className="fv2-pais-metricas">
          {METRICAS_PAIS.map((m) => {
            const max = Math.max(1, ...paises.map((p) => p[m.key]))
            return <div key={m.key} className="fv2-pais-metrica">
              <span>{m.label}</span>
              <Medidor valor={fila[m.key]} max={max} color={fila.country === 'Guatemala' ? COLORES.azul : COLORES.amarillo} />
              <b>{formatNumber(fila[m.key])}</b>
            </div>
          })}
        </div>
      </article>
    })}
  </div>
}

// ---------- Top ejecutivos: total de leads vs. ganados ----------
export function TopEjecutivos({ filas, onSeleccionar }) {
  const max = Math.max(1, ...filas.map((fila) => fila.total))
  return <div className="fv2-ranking">
    {filas.map((fila, i) => <button type="button" key={fila.name} className="fv2-ranking-fila" onClick={() => onSeleccionar(fila.name)} title={`Ver detalle de ${fila.name}`}>
      <span className="fv2-ranking-pos">{i + 1}</span>
      <span className="fv2-ranking-nombre">{fila.name}</span>
      <span className="fv2-ranking-barras">
        <i className="fv2-barra-h" style={{ width: `${(fila.total / max) * 100}%`, background: COLORES.azul, '--fv2-i': i }} />
        <i className="fv2-barra-h" style={{ width: `${Math.max(fila.won ? 1.5 : 0, (fila.won / max) * 100)}%`, background: COLORES.verde, '--fv2-i': i }} />
      </span>
      <span className="fv2-ranking-cifras"><b>{formatNumber(fila.won)}</b> / {formatNumber(fila.total)}</span>
      <ChevronRight size={14} className="fv2-ranking-flecha" />
    </button>)}
  </div>
}

// ---------- Embudo por mes: Leads → Calificados → Ganados ----------
export function EmbudoMes({ grupo }) {
  const s = grupo.summary
  const pasos = [
    { label: 'Leads', valor: s.total, color: COLORES.azul },
    { label: 'Calificados', valor: s.qualified, color: COLORES.azulClaro, desde: s.total },
    { label: 'Ganados', valor: s.won, color: COLORES.verde, desde: s.qualified },
  ]
  return <article className={`fv2-embudo ${grupo.key === 'all' ? 'is-total' : ''}`}>
    <header>
      <strong>{grupo.label}</strong>
      <span>{formatNumber(s.total)} leads</span>
    </header>
    <div className="fv2-embudo-pasos">
      {pasos.map((p) => <div key={p.label} className="fv2-embudo-paso">
        <div className="fv2-embudo-texto">
          <span>{p.label}</span>
          <b>{formatNumber(p.valor)}</b>
          {p.desde !== undefined && <small>{formatPercent(p.valor, p.desde)}</small>}
        </div>
        <Medidor valor={p.valor} max={Math.max(1, s.total)} color={p.color} alto={8} />
      </div>)}
    </div>
    <footer>
      <span>Ganados <b>{formatNumber(s.won)}</b></span>
      <span>Unidades <b>{formatNumber(grupo.units)}</b></span>
      <span>{grupo.key === 'all' ? 'Conversión total' : 'Conversión del mes'} <b>{formatPercent(s.won, s.total)}</b></span>
    </footer>
  </article>
}
