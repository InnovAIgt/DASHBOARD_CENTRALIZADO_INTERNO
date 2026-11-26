/**
 * Canales de marketing · Redes sociales: conversión de la pauta a US$ (decisión de Keily, 25/11/2026; DECISIONES.md).
 *
 * La cuenta publicitaria de Guatemala gasta en quetzales (GTQ) y la de El Salvador en dólares (USD). Para sumar las dos,
 * todo lo de GTQ se convierte a US$ al leerlo de Meta. Cada fila guarda también su monto original (gastadoOriginal y
 * monedaOriginal) para mostrar «Q … · US$ …».
 *
 * Tipo de cambio: variable de servidor TIPO_CAMBIO_GTQ_USD (quetzales por 1 US$, sin VITE_). Si no está o no es un
 * número válido, se usa el valor por defecto: 7.64 (referencia Banguat del 4/11/2026), POR CONFIRMAR con Isma o
 * Contabilidad (PENDIENTES.md).
 */
export const TIPO_CAMBIO_POR_DEFECTO = { GTQ: 7.64 }
export const VARIABLE_TIPO_CAMBIO = { GTQ: 'TIPO_CAMBIO_GTQ_USD' }

/** Unidades de la moneda por 1 US$ (USD = 1). null si la moneda no se conoce (no se convierte y se avisa). */
export function tipoCambio(moneda, env = process.env) {
  const m = String(moneda ?? '').toUpperCase()
  if (m === 'USD') return 1
  if (!TIPO_CAMBIO_POR_DEFECTO[m]) return null
  const v = Number(String(env?.[VARIABLE_TIPO_CAMBIO[m]] ?? '').replace(',', '.'))
  return Number.isFinite(v) && v > 0 ? v : TIPO_CAMBIO_POR_DEFECTO[m]
}

const redondear = (n) => Math.round(n * 100) / 100

/**
 * Filas crudas de Meta (insights, campañas, conjuntos) con el dinero pasado a US$: «spend» se divide entre el tipo de
 * cambio; los presupuestos (daily_budget, lifetime_budget, en centavos de la moneda) también. Con tc = 1 no cambia nada.
 */
export function filasEnUsd(filas = [], tc = 1) {
  if (!tc || tc === 1) return filas
  return filas.map((f) => {
    const x = { ...f }
    if (f.spend !== undefined) x.spend = String((Number(f.spend) || 0) / tc)
    for (const k of ['daily_budget', 'lifetime_budget']) if (f[k] !== undefined && f[k] !== null && f[k] !== '') x[k] = String(Math.round((Number(f[k]) || 0) / tc))
    return x
  })
}

/** A una fila ya en US$ le agrega el monto original (gastadoOriginal, monedaOriginal) si vino de otra moneda. */
export const conOriginal = (fila, moneda, tc) => (tc && tc !== 1 ? { ...fila, monedaOriginal: moneda, gastadoOriginal: redondear((Number(fila.gastado) || 0) * tc) } : fila)
