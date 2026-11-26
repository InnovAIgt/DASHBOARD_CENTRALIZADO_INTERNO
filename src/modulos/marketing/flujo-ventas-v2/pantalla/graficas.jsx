// Flujo de ventas v2 · piezas de gráficas compartidas dentro de esta pantalla.
// Rediseño 2026-11 (D27): la gráfica mensual de columnas + línea de ganados (escala doble) se reemplazó por
// GraficaMeses.jsx (3 barras, una sola escala); las tarjetas por país y la «Comparativa regional» se quitaron del
// Panel. Aquí quedan solo las piezas que se siguen usando.
import { formatNumber, monthLabel } from '../utils/analytics.js'
import { COLORES } from './comunes.jsx'

export const GRIS = '#5b6170'

export function Leyenda({ items }) {
  return <div className="fv2-leyenda">
    {items.map((item) => <span key={item.label}><i style={{ background: item.color, borderRadius: item.linea ? 2 : 3, height: item.linea ? 3 : 10 }} />{item.label}</span>)}
  </div>
}

/** Tope "redondo" para un eje: 5, 10, 20, 25, 50, 100, 200, 250… */
export function topeEje(valor) {
  if (valor <= 5) return 5
  const magnitud = 10 ** Math.floor(Math.log10(valor))
  const paso = [1, 2, 2.5, 5, 10].find((c) => c * magnitud >= valor / 4) * magnitud
  return Math.ceil(valor / paso) * paso
}

/** Color de un tono (D12 / D19). Nada en rojo. */
export const COLOR_TONO = { verde: COLORES.verdeClaro, amarillo: COLORES.amarillo, azul: COLORES.azulClaro, neutro: COLORES.tenue }

// Verde claro: ganados de no calificados (barritas de ventas por mes).
export const VERDE_CLARO = '#8fd3bf'

// ---------- Ventas por mes en barritas (4.0b: ventana del ejecutivo) ----------
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
