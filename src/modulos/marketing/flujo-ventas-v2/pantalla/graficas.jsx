// Flujo de ventas v2 · gráficas (estilo de las de Activaciones: guías suaves, línea guía punteada
// al pasar el cursor y recuadro de detalle). Las cifras vienen de pantalla/datos.js.
import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { formatNumber, monthLabel } from '../utils/analytics.js'
import { Bandera, CODIGO_PAIS, COLORES, formatearRatio, PaisChip } from './comunes.jsx'
import { tonoPaso } from './datos.js'

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

/** Píldora de conversión de calificados: azul (información neutral, regla de colores D12). */
export function PildoraCalificados({ ratio }) {
  return <span className="fv2-insignia is-azul" title="Conversión de calificados: ganados calificados ÷ calificados">{formatearRatio(ratio)}</span>
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
      <Medidor valor={fila.conversion.ratio} max={1} color={COLORES.azul} alto={6} />
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
// 4.0: el verde se divide en dos (calificados / no calificados), píldora roja de seguimientos
// vencidos (solo si hay) y los ejecutivos sin leads en el período o país aparecen al final en 0.
export const VERDE_CLARO = '#8fd3bf'
export const LEYENDA_EJECUTIVOS = [
  { label: 'Ganados de calificados', color: COLORES.verde },
  { label: 'Ganados de no calificados', color: VERDE_CLARO },
  { label: 'Calificados sin ganar', color: COLORES.azul },
  { label: 'No calificados sin ganar', color: GRIS },
]

export function DesempenoEjecutivos({ filas, onSeleccionar, onVencidos }) {
  // Los ejecutivos sin leads van ocultos y se despliegan con un botón, para no alargar la gráfica.
  const [verCero, setVerCero] = useState(false)
  const max = Math.max(1, ...filas.map((f) => f.total))
  const enCero = filas.filter((f) => f.sinLeads).length
  const visibles = verCero ? filas : filas.filter((f) => !f.sinLeads)
  return <div className="fv2-desempeno">
    <div className="fv2-desempeno-cabeza"><span>Ejecutivo</span><span>Leads por resultado</span><span>Leads</span><span>Conv. calif.</span><span>Vencidos</span></div>
    {enCero > 0 && enCero === filas.length && !verCero && <p className="fv2-nota">Ningún ejecutivo tiene leads con los filtros actuales.</p>}
    {visibles.map((fila, i) => {
      const partes = [
        { valor: fila.partes.ganadosCalificados, color: COLORES.verde, label: 'Ganados de calificados' },
        { valor: fila.partes.ganadosNoCalificados, color: VERDE_CLARO, label: 'Ganados de no calificados' },
        { valor: fila.partes.calificadosSinGanar, color: COLORES.azul, label: 'Calificados sin ganar' },
        { valor: fila.partes.noCalificadosSinGanar, color: GRIS, label: 'No calificados sin ganar' },
      ]
      const ancho = Math.max((fila.total / max) * 100, fila.total ? 4 : 0)
      const detalle = partes.map((p) => `${p.label}: ${formatNumber(p.valor)}`).join('\n')
      if (fila.sinLeads) {
        return <div key={fila.name} className="fv2-desempeno-fila is-cero" title={`${fila.name}: sin leads con los filtros actuales`}>
          <span className="fv2-desempeno-nombre"><strong>{fila.name}</strong><span className="fv2-en-linea"><PaisChip pais={fila.country} /> sin leads en el período</span></span>
          <span className="fv2-desempeno-pista"><span className="fv2-desempeno-barra is-vacia" /></span>
          <span className="fv2-desempeno-total">0</span>
          <span className="fv2-desempeno-conv"><span className="fv2-insignia is-neutro">—</span></span>
          <span className="fv2-desempeno-venc" />
          <span />
        </div>
      }
      return <div key={fila.name} className="fv2-desempeno-fila" role="button" tabIndex={0}
        onClick={() => onSeleccionar(fila.name, fila.country)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSeleccionar(fila.name, fila.country) } }}
        title={`Ver detalle de ${fila.name}\n${detalle}`}>
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
        <span className="fv2-desempeno-venc">
          {fila.vencidos.length > 0 && <button type="button" className="fv2-pildora-vencidos"
            onClick={(e) => { e.stopPropagation(); onVencidos(fila) }}
            title={`Ver los ${fila.vencidos.length} seguimientos vencidos de ${fila.name}`}>
            {formatNumber(fila.vencidos.length)} vencidos
          </button>}
        </span>
        <ChevronRight size={14} className="fv2-desempeno-flecha" />
      </div>
    })}
    {enCero > 0 && <button type="button" className="fv2-ver-cero" aria-expanded={verCero} onClick={() => setVerCero((v) => !v)}>
      <ChevronDown size={14} className={verCero ? 'is-abierto' : ''} />
      {verCero
        ? `Ocultar ${enCero} ${enCero === 1 ? 'ejecutivo' : 'ejecutivos'} sin leads`
        : `Ver ${enCero} ${enCero === 1 ? 'ejecutivo' : 'ejecutivos'} sin leads en el período`}
    </button>}
  </div>
}

// ---------- Embudo de ventas por etapa (6 cuadritos, estilo rastreo de pedido) ----------
// Reemplaza al "Embudo por mes" (4.0). Etapa real estimada: ver embudoEtapas en datos.js (D13).
// Colores (D12): % de paso con tonoPaso; la etapa con la mayor caída va en amarillo.
export function EmbudoEtapas({ embudo, onEtapa }) {
  const { etapas, mayorCaida } = embudo
  return <div className="fv2-rastreo">
    <div className="fv2-rastreo-linea" aria-hidden="true" />
    <div className="fv2-rastreo-etapas">
      {etapas.map((e) => {
        const caida = e.stage === mayorCaida
        const tono = e.entrada == null ? 'azul' : caida ? 'amarillo' : tonoPaso(e.entrada)
        return <button type="button" key={e.stage} className={`fv2-etapa-cuadrito ${caida ? 'is-caida' : ''}`} onClick={() => onEtapa(e.stage)} title={`Ver el detalle de ${e.label}`}>
          <span className={`fv2-etapa-circulo is-${tono}`}>{e.stage}</span>
          <span className="fv2-etapa-caja">
            <strong className="fv2-etapa-titulo">{e.label}</strong>
            <span className="fv2-etapa-numero">{formatNumber(e.llegaron)}</span>
            {e.entrada == null
              ? <span className="fv2-insignia is-neutro">inicio</span>
              : <span className={`fv2-insignia is-${caida ? 'amarillo' : tonoPaso(e.entrada)}`} title="% que llegó desde la etapa anterior">pasó {formatearRatio(e.entrada)}</span>}
            <small>{formatNumber(e.hoy)} {e.hoy === 1 ? 'está' : 'están'} hoy aquí</small>
            {e.mejor && <span className="fv2-etapa-mejor" title="Mayor % de paso a la siguiente etapa (mínimo 5 leads)">Mejor: {e.mejor.name} ({formatearRatio(e.mejor.ratio)})</span>}
          </span>
        </button>
      })}
    </div>
  </div>
}
