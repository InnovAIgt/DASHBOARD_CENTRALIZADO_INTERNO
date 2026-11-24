// Flujo de ventas v2 · gráficas (estilo de las de Activaciones: guías suaves, línea guía punteada
// al pasar el cursor y recuadro de detalle). Las cifras vienen de pantalla/datos.js.
import { useEffect, useRef, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { formatNumber, monthLabel } from '../utils/analytics.js'
import { Bandera, CODIGO_PAIS, COLORES, formatearRatio } from './comunes.jsx'

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
  { key: 'units', label: 'Unidades vendidas', color: COLORES.amarillo },
]
/** Leyenda de la gráfica: con filtro "Calificado" no se muestra "No calificados" (D19). */
export const seriesMes = (calificado) => SERIES_MES.filter((s) => !calificado || s.key !== 'noCalificados')

// Alto fijo y ancho medido del contenedor: así los textos y las columnas tienen siempre
// el mismo tamaño, sin agrandarse cuando la pantalla es ancha (antes se escalaba con el ancho).
// D19: el total de leads va DENTRO de la columna (arriba), la etiqueta de ganados a la derecha de
// cada punto con fondo oscuro (para que no se encimen) y, debajo de cada mes, una etiqueta amarilla
// con las unidades vendidas. Conversión = ganados ÷ total (+ conversión de calificados con "Todos").
export function GraficaMensual({ filas, onMes, calificado = false }) {
  const [hover, setHover] = useState(null)
  const cajaRef = useRef(null)
  const [ancho, setAncho] = useState(720)
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
  const h = 290
  const pad = { top: 22, right: 48, bottom: 62, left: 48 }
  const anchoUtil = w - pad.left - pad.right
  const altoUtil = h - pad.top - pad.bottom
  const maxLeads = topeEje(Math.max(1, ...filas.map((f) => f.total)))
  const maxGanados = topeEje(Math.max(1, ...filas.map((f) => f.won)))
  const grupo = anchoUtil / Math.max(filas.length, 1)
  const anchoCol = Math.min(42, grupo * 0.5)
  const xCentro = (i) => pad.left + grupo * i + grupo / 2
  const yLeads = (v) => pad.top + altoUtil - (v / maxLeads) * altoUtil
  const yGanados = (v) => pad.top + altoUtil - (v / maxGanados) * altoUtil
  const base = pad.top + altoUtil
  const linea = filas.map((f, i) => `${xCentro(i)},${yGanados(f.won)}`).join(' ')

  return <div className="fv2-grafica-mes" ref={cajaRef}>
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Leads por mes, con la línea de ganados y las unidades vendidas de cada mes">
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
          {/* Total de leads dentro de la columna, arriba; si la columna es muy baja, encima de ella. */}
          <text x={xCentro(i)} y={base - yTot >= 22 ? yTot + 14 : yTot - 6} fill="#fff" fontSize="10" fontWeight="800" textAnchor="middle">{formatNumber(f.total)}</text>
          <g>
            <rect x={xCentro(i) - 40} y={base + 8} width="80" height="18" rx="9" fill="rgba(197,150,0,.14)" stroke="rgba(197,150,0,.45)" />
            <text x={xCentro(i)} y={base + 21} fill="#e0b52e" fontSize="10" fontWeight="800" textAnchor="middle">{formatNumber(f.units)} unid.</text>
          </g>
          <text x={xCentro(i)} y={h - 9} fill={COLORES.tenue} fontSize="11" fontWeight="700" textAnchor="middle">{monthLabel(f.month)}</text>
        </g>
      })}

      {hover !== null && <line x1={xCentro(hover)} y1={pad.top} x2={xCentro(hover)} y2={base} stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeDasharray="4 3" />}
      {filas.length > 1 && <polyline className="fv2-linea" pathLength="1" points={linea} fill="none" stroke={COLORES.verde} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
      {filas.map((f, i) => <circle key={f.month} cx={xCentro(i)} cy={yGanados(f.won)} r={hover === i ? 6 : 4.5} fill={COLORES.verde} stroke="#151821" strokeWidth="2" />)}
      {/* Etiqueta de ganados a la derecha de cada punto, con fondo oscuro. */}
      {filas.map((f, i) => {
        const texto = `${formatNumber(f.won)} ganado${f.won === 1 ? '' : 's'}`
        const ancho = texto.length * 6 + 12
        const x = xCentro(i) + 9 + ancho > w - 4 ? xCentro(i) - 9 - ancho : xCentro(i) + 9
        return <g key={`g-${f.month}`} pointerEvents="none">
          <rect x={x} y={yGanados(f.won) - 9} width={ancho} height="18" rx="5" fill="rgba(15,17,23,.88)" stroke="rgba(63,156,133,.45)" />
          <text x={x + 6} y={yGanados(f.won) + 4} fill="#7fd3b9" fontSize="10" fontWeight="800">{texto}</text>
        </g>
      })}

      {filas.map((f, i) => <rect key={f.month} x={pad.left + grupo * i} y="0" width={grupo} height={h} fill="transparent"
        style={onMes ? { cursor: "pointer" } : undefined} onClick={onMes ? () => onMes(f) : undefined}
        onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />)}
    </svg>
    {hover !== null && filas[hover] && <div className={`fv2-tooltip ${xCentro(hover) / w > 0.6 ? 'is-izquierda' : ''}`} style={{ left: `${(xCentro(hover) / w) * 100}%` }}>
      <div className="fv2-tooltip-titulo">{monthLabel(filas[hover].month, 'long')}</div>
      <div className="fv2-tooltip-fila"><span>Leads</span><b>{formatNumber(filas[hover].total)}</b></div>
      <div className="fv2-tooltip-fila"><span style={{ color: COLORES.azulClaro }}>■ Calificados</span><b>{formatNumber(filas[hover].qualified)}</b></div>
      {!calificado && <div className="fv2-tooltip-fila"><span>■ No calificados</span><b>{formatNumber(filas[hover].noCalificados)}</b></div>}
      <div className="fv2-tooltip-fila"><span style={{ color: COLORES.verdeClaro }}>● Ganados</span><b>{formatNumber(filas[hover].won)}</b></div>
      <div className="fv2-tooltip-fila"><span style={{ color: '#e0b52e' }}>Unidades vendidas</span><b>{formatNumber(filas[hover].units)}</b></div>
      <div className="fv2-tooltip-fila"><span>Conversión</span><b>{formatearRatio(filas[hover].conversion)}</b></div>
      {!calificado && filas[hover].calificadosD10 && <div className="fv2-tooltip-fila"><span>Conversión de calificados</span><b>{formatearRatio(filas[hover].calificadosD10.ratio)}</b></div>}
    </div>}
  </div>
}

// ---------- Tarjetas por país (arriba de los indicadores) ----------
// D19: todo con la lógica del dashboard de leads (byCountry() = summarize() por país):
// dona = Conversión = ganados ÷ total de leads; datos = Total leads, Ganados, Unidades y Unid. por cierre.
// Cada dato de la tarjeta se puede cliquear: abre el "Detalle de leads" de ese dato, solo con los
// leads de ese país.
function DatoPais({ etiqueta, children, onClick, title }) {
  return <button type="button" className="fv2-pais-dato" onClick={onClick} title={title ?? `Ver el detalle de ${etiqueta.toLowerCase()}`}>
    <span>{etiqueta}</span>{children}
    <VerDetalle />
  </button>
}

/** Color de un tono (D12 / D19). Nada en rojo. */
export const COLOR_TONO = { verde: COLORES.verdeClaro, amarillo: COLORES.amarillo, azul: COLORES.azulClaro, neutro: COLORES.tenue }

/** Dona de conversión (ganados ÷ total), como la del mockup aprobado. */
export function Dona({ ratio, color, tamano = 92, grosor = 9, children }) {
  const r = (tamano - grosor) / 2
  const c = 2 * Math.PI * r
  const lleno = Math.max(0, Math.min(1, ratio || 0))
  return <span className="fv2-res-dona" style={{ width: tamano, height: tamano }}>
    <svg viewBox={`0 0 ${tamano} ${tamano}`} aria-hidden="true">
      <circle cx={tamano / 2} cy={tamano / 2} r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth={grosor} />
      <circle cx={tamano / 2} cy={tamano / 2} r={r} fill="none" stroke={color} strokeWidth={grosor} strokeLinecap="round"
        strokeDasharray={`${c * lleno} ${c}`} transform={`rotate(-90 ${tamano / 2} ${tamano / 2})`} />
    </svg>
    <span className="fv2-res-dona-centro">{children}</span>
  </span>
}

/** Pista "Ver detalle ›" para que se note que el dato se puede cliquear. */
function VerDetalle() {
  return <em className="fv2-ver-detalle">Ver detalle<ChevronRight size={12} aria-hidden="true" /></em>
}

/**
 * @param paises      filas de byCountry (summarize por país)
 * @param calificado  true si el filtro Tipo de lead es "Calificado" (cambia solo la nota al pie)
 * @param tono        función ratio → 'verde' | 'amarillo' | 'neutro' (rangos de la Conversión, D19)
 */
export function TarjetasPais({ paises, calificado, tono, onAbrir }) {
  return <section className="fv2-paises" aria-label="Resultados por país">
    {paises.map((fila) => {
      const abrir = (clave) => () => onAbrir?.(clave, fila.country)
      const color = COLOR_TONO[tono(fila.conversion)]
      return <article key={fila.country} className="fv2-pais-tarjeta fv2-res-pais">
        <button type="button" className="fv2-res-pais-dona" onClick={abrir('conversionTotal')}
          title={`Conversión de ${fila.country}: ${formatNumber(fila.won)} ganados ÷ ${formatNumber(fila.total)} leads = ${formatearRatio(fila.conversion)} · clic para ver el detalle`}
          aria-label={`Ver el detalle de la conversión de ${fila.country}`}>
          <Dona ratio={fila.conversion} color={color}>
            <strong style={{ color }}>{formatearRatio(fila.conversion)}</strong>
            <small>conversión</small>
          </Dona>
        </button>
        <div className="fv2-res-pais-cuerpo">
          <div className="fv2-pais-nombre"><Bandera pais={fila.country} />{fila.country.toUpperCase()} ({CODIGO_PAIS[fila.country]})</div>
          <div className="fv2-pais-datos">
            <DatoPais etiqueta="Total leads" onClick={abrir('total')} title={`${formatNumber(fila.total)} leads en ${fila.country} · clic para ver el detalle`}><b>{formatNumber(fila.total)}</b></DatoPais>
            <DatoPais etiqueta="Ganados" onClick={abrir('ganados')} title={`${formatNumber(fila.won)} ganados (= "Radicados" en el dashboard de leads) · clic para ver el detalle`}><b style={{ color: COLORES.verdeClaro }}>{formatNumber(fila.won)}</b></DatoPais>
            <DatoPais etiqueta="Unidades" onClick={abrir('unidades')} title={`${formatNumber(fila.units)} unidades vendidas en leads ganados · clic para ver el detalle`}><b style={{ color: COLORES.amarillo }}>{formatNumber(fila.units)}</b></DatoPais>
            <DatoPais etiqueta="Unid. por cierre" onClick={abrir('porCierre')} title={fila.won ? `${formatNumber(fila.units)} unidades ÷ ${formatNumber(fila.won)} ganados` : 'Sin ganados'}><b>{fila.won ? formatNumber(Math.round(fila.avgUnits)) : '—'}</b></DatoPais>
          </div>
          <Medidor valor={fila.conversion} max={1} color={color} alto={6} />
          <p className="fv2-res-nota">{calificado ? 'Solo leads calificados (filtro) · con "Todos" se ven también los no calificados' : 'Todos los tipos de lead · conversión = ganados ÷ total de leads'}</p>
        </div>
      </article>
    })}
  </section>
}

const METRICAS_REGIONALES = [
  { key: 'total', label: 'Leads', indicador: 'total', color: COLORES.azulClaro, formato: formatNumber },
  { key: 'qualified', label: 'Calificados', indicador: 'calificados', color: COLORES.azul, formato: formatNumber },
  { key: 'won', label: 'Ganados', indicador: 'ganados', color: COLORES.verdeClaro, formato: formatNumber },
  { key: 'units', label: 'Unidades', indicador: 'unidades', color: COLORES.amarillo, formato: formatNumber },
  { key: 'conversion', label: 'Conversión', indicador: 'conversionTotal', color: COLORES.verde, formato: formatearRatio, maximo: 1 },
]

/** Comparación regional con las mismas métricas de los leads filtrados del panel. */
export function ComparativaRegional({ paises, onAbrir, calificado, paisFiltro }) {
  const paisesVisibles = paisFiltro ? paises.filter((pais) => pais.country === paisFiltro) : paises
  return <section className="fv2-panel fv2-res-regional" aria-label="Comparativa regional">
    <header className="fv2-panel-cabeza">
      <div>
        <div className="fv2-panel-titulo">{paisFiltro ? 'Resultados regionales' : 'Comparativa regional'}</div>
        <div className="fv2-panel-sub">{paisFiltro ? `${paisFiltro} · resultados del período y filtros seleccionados.` : 'Guatemala vs. El Salvador · resultados del período y filtros seleccionados.'}</div>
      </div>
      <span className="fv2-res-nota">{calificado ? 'Solo leads calificados' : 'Todos los tipos de lead'}</span>
    </header>
    <div className="fv2-res-regional-metricas">
      {METRICAS_REGIONALES.map((metrica) => {
        const max = metrica.maximo ?? Math.max(1, ...paisesVisibles.map((pais) => pais[metrica.key]))
        return <article className="fv2-res-regional-metrica" key={metrica.key}>
          <h4>{metrica.label}</h4>
          <div className="fv2-res-regional-paises">
            {paisesVisibles.map((pais) => {
              const valor = pais[metrica.key]
              const ancho = max ? Math.min(100, (valor / max) * 100) : 0
              return <button type="button" className="fv2-res-regional-fila" key={pais.country}
                onClick={() => onAbrir(metrica.indicador, pais.country)}
                title={`Ver ${metrica.label.toLowerCase()} de ${pais.country}: ${metrica.formato(valor)}`}
                aria-label={`Ver ${metrica.label.toLowerCase()} de ${pais.country}: ${metrica.formato(valor)}`}>
                <span className="fv2-res-regional-pais"><Bandera pais={pais.country} /><b>{CODIGO_PAIS[pais.country]}</b></span>
                <span className="fv2-res-regional-pista" aria-hidden="true"><i style={{ width: `${ancho}%`, background: metrica.color }} /></span>
                <strong>{metrica.formato(valor)}</strong>
              </button>
            })}
          </div>
        </article>
      })}
    </div>
    <p className="fv2-res-nota">Cada barra se escala dentro de su indicador; selecciona una cifra para abrir el detalle de ese país.</p>
  </section>
}

// Verde claro: ganados de no calificados (barritas de ventas por mes).
export const VERDE_CLARO = '#8fd3bf'

// ---------- Ventas por mes en barritas (4.0b: tarjetas y ventana del ejecutivo) ----------
// Verde fuerte = ganados de calificados · verde claro = ganados de no calificados.
export function BarritasMes({ meses, onMes, apagado }) {
  const max = Math.max(1, ...meses.map((m) => m.total))
  return <div className="fv2-barritas">
    {meses.map((m) => <button type="button" key={m.month} className="fv2-barrita" disabled={apagado || !onMes}
      onClick={(e) => { e.stopPropagation(); onMes?.(m) }}
      title={`${monthLabel(m.month, 'long')}: ${formatNumber(m.ganadosCalificados)} de calificados · ${formatNumber(m.ganadosNoCalificados)} de no calificados${onMes && !apagado ? ' · clic para ver el detalle del mes' : ''}`}>
      <b>{formatNumber(m.total)}</b>
      <span className="fv2-barrita-pista">
        {m.ganadosNoCalificados > 0 && <i style={{ height: `${(m.ganadosNoCalificados / max) * 100}%`, background: VERDE_CLARO }} />}
        {m.ganadosCalificados > 0 && <i style={{ height: `${(m.ganadosCalificados / max) * 100}%`, background: COLORES.verde }} />}
        {m.total === 0 && <i className="is-cero" />}
      </span>
      <small>{monthLabel(m.month)}</small>
    </button>)}
  </div>
}
