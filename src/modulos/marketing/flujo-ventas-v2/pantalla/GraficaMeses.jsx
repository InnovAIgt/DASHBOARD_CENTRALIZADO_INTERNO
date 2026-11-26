// Flujo de ventas v2 · gráfica «Leads y unidades por mes» (rediseño Parte 3, DECISIONES D27).
// 3 barras por mes, una al lado de la otra, con UNA sola escala: azul = leads calificados (con «Todos»: azul
// calificados + gris no calificados = leads del mes, igual que antes), verde = ganados, amarillo = unidades vendidas.
// Debajo de cada mes: conversión (ganados ÷ leads) y unidades por cierre. Las cifras son las mismas filas de
// mesesResumen (byMonth) que usaba la gráfica anterior; aquí solo cambia el dibujo.
import { useEffect, useRef, useState } from 'react'
import { formatNumber, monthLabel } from '../utils/analytics.js'
import { COLORES, formatearRatio } from './comunes.jsx'
import { GRIS, topeEje } from './graficas.jsx'

const TEXTO = { azul: '#7fb0f0', verde: '#3f9c85', amarillo: '#e6b93a' }

/** Leyenda: dice exactamente qué muestra la barra azul con cada filtro. */
export function seriesBarras(calificado) {
  return calificado
    ? [{ label: 'Leads calificados', color: COLORES.azul }, { label: 'Ganados', color: COLORES.verde }, { label: 'Unidades vendidas', color: COLORES.amarillo }]
    : [{ label: 'Leads del mes: calificados', color: COLORES.azul }, { label: '+ no calificados', color: GRIS },
      { label: 'Ganados', color: COLORES.verde }, { label: 'Unidades vendidas', color: COLORES.amarillo }]
}

export function GraficaMeses({ filas, calificado, onMes }) {
  const [hover, setHover] = useState(null)
  const cajaRef = useRef(null)
  const [ancho, setAncho] = useState(900)
  useEffect(() => {
    const caja = cajaRef.current
    if (!caja || typeof ResizeObserver === 'undefined') return undefined
    const medir = () => setAncho(Math.max(360, Math.round(caja.clientWidth)))
    medir()
    const obs = new ResizeObserver(medir)
    obs.observe(caja)
    return () => obs.disconnect()
  }, [])

  const w = ancho
  const h = 320
  const pad = { top: 26, right: 16, bottom: 62, left: 44 }
  const anchoUtil = w - pad.left - pad.right
  const altoUtil = h - pad.top - pad.bottom
  const base = pad.top + altoUtil
  // Una sola escala para las 3 barras (D27): el tope es el valor más alto de cualquiera de ellas.
  const max = topeEje(Math.max(1, ...filas.map((f) => Math.max(f.total, f.won, f.units))))
  const y = (v) => base - (v / max) * altoUtil
  const grupo = anchoUtil / Math.max(filas.length, 1)
  const barra = Math.max(10, Math.min(44, (grupo - 40) / 3))
  const hueco = 6
  const xCentro = (i) => pad.left + grupo * i + grupo / 2
  const xBarra = (i, k) => xCentro(i) - (3 * barra + 2 * hueco) / 2 + k * (barra + hueco)

  const etiqueta = (x, valor, alto, color) => <text x={x + barra / 2} y={alto - 6} fill={color} fontSize="12" fontWeight="800" textAnchor="middle">{formatNumber(valor)}</text>

  return <div className="fv2-grafica-mes fv2n-grafica" ref={cajaRef}>
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Leads calificados, ganados y unidades vendidas por mes">
      {[0, 1, 2, 3, 4].map((i) => {
        const yy = pad.top + altoUtil * (i / 4)
        return <g key={i}>
          <line x1={pad.left} y1={yy} x2={w - pad.right} y2={yy} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
          <text x={pad.left - 8} y={yy + 4} fill={COLORES.tenue} fontSize="10" textAnchor="end">{formatNumber(max * (1 - i / 4))}</text>
        </g>
      })}

      {filas.map((f, i) => {
        const yCal = y(f.qualified)
        const yTot = y(f.total)
        const atenuado = hover !== null && hover !== i
        return <g key={f.month} opacity={atenuado ? 0.5 : 1}>
          {/* Azul: calificados (con «Todos», gris encima = no calificados; juntos = leads del mes) */}
          <rect x={xBarra(i, 0)} y={yCal} width={barra} height={Math.max(0, base - yCal)} fill={COLORES.azul} rx={calificado ? 4 : 0} />
          {!calificado && <rect x={xBarra(i, 0)} y={yTot} width={barra} height={Math.max(0, yCal - yTot)} fill={GRIS} rx="4" />}
          {etiqueta(xBarra(i, 0), f.total, yTot, TEXTO.azul)}
          <rect x={xBarra(i, 1)} y={y(f.won)} width={barra} height={Math.max(0, base - y(f.won))} fill={COLORES.verde} rx="4" />
          {etiqueta(xBarra(i, 1), f.won, y(f.won), TEXTO.verde)}
          <rect x={xBarra(i, 2)} y={y(f.units)} width={barra} height={Math.max(0, base - y(f.units))} fill={COLORES.amarillo} rx="4" />
          {etiqueta(xBarra(i, 2), f.units, y(f.units), TEXTO.amarillo)}
          <text x={xCentro(i)} y={base + 20} fill={COLORES.texto} fontSize="12" fontWeight="700" textAnchor="middle">{monthLabel(f.month, 'long')}</text>
          <text x={xCentro(i)} y={base + 38} fill={COLORES.tenue} fontSize="11" textAnchor="middle">
            Conversión <tspan fill={TEXTO.verde} fontWeight="700">{formatearRatio(f.conversion).replace('%', ' %')}</tspan> · {f.won ? `${formatNumber(Math.round(f.avgUnits))} unidades por cierre` : 'sin cierres'}
          </text>
        </g>
      })}
      <line x1={pad.left} y1={base} x2={w - pad.right} y2={base} stroke="rgba(255,255,255,0.18)" strokeWidth="1" />

      {filas.map((f, i) => <rect key={f.month} x={pad.left + grupo * i} y="0" width={grupo} height={h} fill="transparent"
        style={onMes ? { cursor: 'pointer' } : undefined} onClick={onMes ? () => onMes(f) : undefined}
        onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
        <title>{`${monthLabel(f.month, 'long')} · clic para ver el detalle del mes`}</title>
      </rect>)}
    </svg>
    {hover !== null && filas[hover] && <div className={`fv2-tooltip ${xCentro(hover) / w > 0.6 ? 'is-izquierda' : ''}`} style={{ left: `${(xCentro(hover) / w) * 100}%` }}>
      <div className="fv2-tooltip-titulo">{monthLabel(filas[hover].month, 'long')}</div>
      <div className="fv2-tooltip-fila"><span>Leads</span><b>{formatNumber(filas[hover].total)}</b></div>
      <div className="fv2-tooltip-fila"><span style={{ color: TEXTO.azul }}>■ Calificados</span><b>{formatNumber(filas[hover].qualified)}</b></div>
      {!calificado && <div className="fv2-tooltip-fila"><span>■ No calificados</span><b>{formatNumber(filas[hover].noCalificados)}</b></div>}
      <div className="fv2-tooltip-fila"><span style={{ color: TEXTO.verde }}>■ Ganados</span><b>{formatNumber(filas[hover].won)}</b></div>
      <div className="fv2-tooltip-fila"><span style={{ color: TEXTO.amarillo }}>■ Unidades vendidas</span><b>{formatNumber(filas[hover].units)}</b></div>
      <div className="fv2-tooltip-fila"><span>Conversión</span><b>{formatearRatio(filas[hover].conversion)}</b></div>
      {!calificado && filas[hover].calificadosD10 && <div className="fv2-tooltip-fila"><span>Conversión de calificados</span><b>{formatearRatio(filas[hover].calificadosD10.ratio)}</b></div>}
    </div>}
  </div>
}

/** Título con la conclusión: el mes con más ganados (si empatan, más unidades; si siguen empatados, el más reciente). */
export function tituloMeses(filas) {
  if (!filas.length) return 'Leads y unidades por mes'
  const mejor = [...filas].sort((a, b) => b.won - a.won || b.units - a.units || b.month.localeCompare(a.month))[0]
  const nombre = monthLabel(mejor.month, 'long')
  const datos = `${formatNumber(mejor.won)} ${mejor.won === 1 ? 'ganado' : 'ganados'} y ${formatNumber(mejor.units)} unidades`
  if (!mejor.won) return `Todavía no hay ganados en ${filas.length === 1 ? nombre : 'estos meses'}`
  return filas.length === 1 ? `${nombre}: ${datos}` : `${nombre} fue el mejor mes: ${datos}`
}
