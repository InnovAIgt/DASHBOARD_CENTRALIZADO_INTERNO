// Redes sociales · formato de números, dinero y fechas (es-SV: 80,459 · $442.50 · 17/11/2026).
const enteros = new Intl.NumberFormat('es-SV', { maximumFractionDigits: 0 })
const dosDecimales = new Intl.NumberFormat('es-SV', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/** Número entero; null → "–" (sin dato). */
export const entero = (n) => (n === null || n === undefined ? '–' : enteros.format(n))
/** Dinero con 2 decimales; null → "—" (no se puede calcular). */
export const dinero = (n) => (n === null || n === undefined || !Number.isFinite(n) ? '—' : `$${dosDecimales.format(n)}`)
/** Dinero corto: sin ".00" cuando es entero ($20 · $352.50). */
export const dineroCorto = (n) => (n === null || n === undefined ? '–' : Number.isInteger(n) ? `$${enteros.format(n)}` : dinero(n))
export const porcentaje = (r) => (r === null || r === undefined ? '—' : `${Math.round(r * 100)} %`)
/** AAAA-MM-DD → dd/mm/aaaa */
export const fechaCorta = (iso) => (iso ? iso.split('-').reverse().join('/') : 'Sin fecha')
/** AAAA-MM → "Abr" o "abr 2026" */
export const mesCorto = (mes, conAnio = false) => {
  if (!mes) return 'Sin mes'
  const [y, m] = mes.split('-').map(Number)
  const nombre = MESES[m - 1]
  return conAnio ? `${nombre} ${y}` : nombre.charAt(0).toUpperCase() + nombre.slice(1)
}
export const mesLargo = (mes) => {
  if (!mes) return 'Sin mes'
  const [y, m] = mes.split('-').map(Number)
  return `${MESES_LARGOS[m - 1]} ${y}`
}
export const plural = (n, uno, varios) => `${entero(n)} ${n === 1 ? uno : varios}`
