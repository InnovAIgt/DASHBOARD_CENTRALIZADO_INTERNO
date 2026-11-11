// Flujo de ventas v2 · gráficas (estilo de las de Activaciones: guías suaves, línea guía punteada
// al pasar el cursor y recuadro de detalle). Las cifras vienen de pantalla/datos.js.
import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { formatNumber, formatPercent, monthLabel } from '../utils/analytics.js'
import { Bandera, CODIGO_PAIS, COLORES, formatearRatio, PaisChip } from './comunes.jsx'

export const GRIS = '#5b6170'

export function Leyenda({ items }) {
  return <div className="fv2-leyenda">
    {items.map((item) => <span key={item.label}><i style={{ background: item.color, borderRadius: item.linea ? 2 : 3, height: item.linea ? 3 : 10 }} />{item.label}</span>)}
  </div>
}

/** Barra horizontal simple (carril tenue + relleno). */
export function Medidor({ valor, max, color, alto = 7 }) {
  const ancho = max ? Math.min(100, (valor / max) * 100) : 0
  return <span className="fv2-carril" style={{ height: alto }}>
    <i className="fv2-relleno" style={{ width: `${ancho}%`, background: color }} />
  </span>
}

/** Píldora de conversión de calificados: verde desde 10 %, amarilla si es mayor a 0. */
export function PildoraCalificados({ ratio }) {
  const tono = ratio >= 0.1 ? 'verde' : ratio > 0 ? 'amarillo' : 'neutro'
  return <span className={`fv2-insignia is-${tono}`} title="Conversión de calificados: ganados calificados ÷ calificados">{formatearRatio(ratio)}</span>
}

/** Tope "redondo" para un eje: 5, 10, 20, 25, 50, 100, 200, 250… */
function topeEje(valor) {
  if (valor <= 5) return 5
  const magnitud = 10 ** Math.floor(Math.log10(valor))
  const paso = [1, 2, 2.5, 5, 10].find((c) => c * magnitud >= valor / 4) * magnitud
  return Math.ceil(valor / paso) * paso
}

// ---------- Gráfica por mes: columnas apiladas + línea de ganados con escala propia ----------
export const SERIES_MES = [
  { key: 'qualified', label: 'Calificados', color: COLORES.azul },
  { key: 'noCalificados', label: 'No calificados', color: GRIS },
  { key: 'won', label: 'Ganados (escala derecha)', color: COLORES.verde, linea: true },
]

export function GraficaMensual({ filas }) {
  const [hover, setHover] = useState(null)
  const w = 720
  const h = 280
  const pad = { top: 22, right: 48, bottom: 30, left: 48 }
  const anchoUtil = w - pad.left - pad.right
  const altoUtil = h - pad.top - pad.bottom
  const maxLeads = topeEje(Math.max(1, ...filas.map((f) => f.total)))
  const maxGanados = topeEje(Math.max(1, ...filas.map((f) => f.won)))
  const grupo = anchoUtil / Math.max(filas.length, 1)
  const anchoCol = Math.min(46, grupo * 0.56)
  const xCentro = (i) => pad.left + grupo * i + grupo / 2
  const yLeads = (v) => pad.top + altoUtil - (v / maxLeads) * altoUtil
  const yGanados = (v) => pad.top + altoUtil - (v / maxGanados) * altoUtil
  const base = pad.top + altoUtil
  const linea = filas.map((f, i) => `${xCentro(i)},${yGanados(f.won)}`).join(' ')

  return <div className="fv2-grafica-mes">
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Leads calificados y no calificados por mes, con la línea de ganados">
      {[0, 1, 2, 3, 4].map((i) => {
        const y = pad.top + altoUtil * (i / 4)
        return <g key={i}>
          <line x1={pad.left} y1={y} x2={w - pad.right} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          <text x={pad.left - 8} y={y + 4} fill={COLORES.tenue} fontSize="10" textAnchor="end">{formatNumber(maxLeads * (1 - i / 4))}</text>
          <text x={w - pad.right + 8} y={y + 4} fill={COLORES.verdeClaro} fontSize="10" textAnchor="start">{formatNumber(maxGanados * (1 - i / 4))}</text>
        </g>
      })}
      <text x={pad.left - 8} y={12} fill={COLORES.tenue} fontSize="9" fontWeight="700" textAnchor="end">LEADS</text>
      <text x={w - pad.right + 8} y={12} fill={COLORES.verdeClaro} fontSize="9" fontWeight="700" textAnchor="start">GANADOS</text>

      {filas.map((f, i) => {
        const x = xCentro(i) - anchoCol / 2
        const yCal = yLeads(f.qualified)
        const yTot = yLeads(f.total)
        return <g key={f.month} className="fv2-columna" style={{ '--fv2-i': i }} opacity={hover === null || hover === i ? 1 : 0.55}>
          <rect x={x} y={yCal} width={anchoCol} height={Math.max(0, base - yCal)} fill={COLORES.azul} />
          <rect x={x} y={yTot} width={anchoCol} height={Math.max(0, yCal - yTot)} fill={GRIS} rx="4" />
          <text x={xCentro(i)} y={yTot - 6} fill={COLORES.texto} fontSize="10" fontWeight="700" textAnchor="middle">{formatNumber(f.total)}</text>
          <text x={xCentro(i)} y={h - 9} fill={COLORES.tenue} fontSize="11" fontWeight="700" textAnchor="middle">{monthLabel(f.month)}</text>
        </g>
      })}

      {hover !== null && <line x1={xCentro(hover)} y1={pad.top} x2={xCentro(hover)} y2={base} stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeDasharray="4 3" />}
      {filas.length > 1 && <polyline className="fv2-linea" pathLength="1" points={linea} fill="none" stroke={COLORES.verde} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
      {filas.map((f, i) => <circle key={f.month} cx={xCentro(i)} cy={yGanados(f.won)} r={hover === i ? 6 : 4.5} fill={COLORES.verde} stroke="#151821" strokeWidth="2" />)}

      {filas.map((f, i) => <rect key={f.month} x={pad.left + grupo * i} y="0" width={grupo} height={h} fill="transparent"
        onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />)}
    </svg>
    {hover !== null && filas[hover] && <div className={`fv2-tooltip ${xCentro(hover) / w > 0.6 ? 'is-izquierda' : ''}`} style={{ left: `${(xCentro(hover) / w) * 100}%` }}>
      <div className="fv2-tooltip-titulo">{monthLabel(filas[hover].month, 'long')}</div>
      <div className="fv2-tooltip-fila"><span>Leads</span><b>{formatNumber(filas[hover].total)}</b></div>
      <div className="fv2-tooltip-fila"><span style={{ color: COLORES.azulClaro }}>■ Calificados</span><b>{formatNumber(filas[hover].qualified)}</b></div>
      <div className="fv2-tooltip-fila"><span>■ No calificados</span><b>{formatNumber(filas[hover].noCalificados)}</b></div>
      <div className="fv2-tooltip-fila"><span style={{ color: COLORES.verdeClaro }}>● Ganados</span><b>{formatNumber(filas[hover].won)}</b></div>
      <div className="fv2-tooltip-fila"><span>Unidades</span><b>{formatNumber(filas[hover].units)}</b></div>
      <div className="fv2-tooltip-fila"><span>Conversión de calificados</span><b>{formatearRatio(filas[hover].conversion.ratio)}</b></div>
    </div>}
  </div>
}

// ---------- Tarjetas por país (arriba de los indicadores) ----------
// total, calificados, ganados y unidades por cierre: byCountry() = summarize() por país.
// Conversión de calificados: corregida (conversionCalificados, D10).
export function TarjetasPais({ paises }) {
  return <section className="fv2-paises" aria-label="Resultados por país">
    {paises.map((fila) => <article key={fila.country} className="fv2-pais-tarjeta">
      <header>
        <div className="fv2-pais-nombre"><Bandera pais={fila.country} />{fila.country.toUpperCase()} ({CODIGO_PAIS[fila.country]})</div>
        <div className="fv2-pais-pct">
          <strong>{formatearRatio(fila.conversion.ratio)}</strong>
          <small>Conversión de calificados</small>
        </div>
      </header>
      <Medidor valor={fila.conversion.ratio} max={1} color={COLORES.verde} alto={6} />
      <div className="fv2-pais-datos">
        <div><span>Total leads</span><b>{formatNumber(fila.total)}</b></div>
        <div><span>Calificados</span><b style={{ color: COLORES.azulClaro }}>{formatNumber(fila.qualified)}</b></div>
        <div><span>Ganados</span><b style={{ color: COLORES.verdeClaro }}>{formatNumber(fila.won)}</b></div>
        <div><span>Unidades por cierre</span><b>{fila.won ? formatNumber(Math.round(fila.avgUnits)) : '—'}</b></div>
      </div>
    </article>)}
  </section>
}

// ---------- Desempeño por ejecutivo (barras del embudo del Flujo de ventas viejo) ----------
export const LEYENDA_EJECUTIVOS = [
  { label: 'Ganados', color: COLORES.verde },
  { label: 'Calificados sin ganar', color: COLORES.azul },
  { label: 'No calificados sin ganar', color: GRIS },
]

export function DesempenoEjecutivos({ filas, onSeleccionar }) {
  const max = Math.max(1, ...filas.map((f) => f.total))
  return <div className="fv2-desempeno">
    <div className="fv2-desempeno-cabeza"><span>Ejecutivo</span><span>Leads por resultado</span><span>Leads</span><span>Conv. calif.</span></div>
    {filas.map((fila, i) => {
      const partes = [
        { valor: fila.partes.ganados, color: COLORES.verde, label: 'Ganados' },
        { valor: fila.partes.calificadosSinGanar, color: COLORES.azul, label: 'Calificados sin ganar' },
        { valor: fila.partes.noCalificadosSinGanar, color: GRIS, label: 'No calificados sin ganar' },
      ]
      const ancho = Math.max((fila.total / max) * 100, fila.total ? 4 : 0)
      return <button type="button" key={fila.name} className="fv2-desempeno-fila" onClick={() => onSeleccionar(fila.name, fila.country)} title={`Ver detalle de ${fila.name}`}>
        <span className="fv2-desempeno-nombre">
          <strong>{fila.name}</strong>
          <PaisChip pais={fila.country} />
        </span>
        <span className="fv2-desempeno-pista">
          <span className="fv2-desempeno-barra fv2-barra-h" style={{ width: `${ancho}%`, '--fv2-i': i }}>
            {partes.map((p) => p.valor > 0 && <i key={p.label} style={{ flexGrow: p.valor, background: p.color }} title={`${p.label}: ${formatNumber(p.valor)}`}>
              {p.valor / max >= 0.06 ? formatNumber(p.valor) : ''}
            </i>)}
          </span>
        </span>
        <span className="fv2-desempeno-total">{formatNumber(fila.total)}</span>
        <span className="fv2-desempeno-conv"><PildoraCalificados ratio={fila.conversion.ratio} /></span>
        <ChevronRight size={14} className="fv2-desempeno-flecha" />
      </button>
    })}
  </div>
}

// ---------- Embudo por mes: Leads → Calificados → Ganados ----------
// El % de "Ganados" es la conversión de calificados corregida (ganados calificados ÷ calificados).
export function EmbudoMes({ grupo }) {
  const s = grupo.summary
  const pasos = [
    { label: 'Leads', valor: s.total, color: COLORES.azul },
    { label: 'Calificados', valor: s.qualified, color: COLORES.azulClaro, pct: formatPercent(s.qualified, s.total) },
    { label: 'Ganados', valor: s.won, color: COLORES.verde, pct: formatearRatio(grupo.conversion.ratio), ayuda: 'Conversión de calificados: ganados calificados ÷ calificados' },
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
          {p.pct && <small title={p.ayuda}>{p.pct}</small>}
        </div>
        <Medidor valor={p.valor} max={Math.max(1, s.total)} color={p.color} alto={8} />
      </div>)}
    </div>
    <footer>
      <span>Ganados <b>{formatNumber(s.won)}</b></span>
      <span>Unidades <b>{formatNumber(grupo.units)}</b></span>
      <span>{grupo.key === 'all' ? 'Conversión general' : 'Conversión general del mes'} <b>{formatPercent(s.won, s.total)}</b></span>
    </footer>
  </article>
}
