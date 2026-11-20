/**
 * Redes sociales — limpieza de números del Excel de métricas (docs/marketing-redes/DECISIONES.md, D9).
 *
 * Marketing escribe los números a mano y de muchas formas. Esta función los convierte a número:
 *   "5,8 mil " → 5800   ·  "17,5mil" → 17500  ·  "11mil" → 11000   (mil = × 1000)
 *   "$30,00"   → 30     ·  "$10.00"  → 10     ·  "6\n"   → 6
 *   "12.400"   → 12400  (punto + exactamente 3 dígitos al final = separador de miles)
 *   vacío, "-", "–", "—" → null (SIN DATO, no es cero). Un 0 escrito sí es 0.
 * Si no se puede interpretar devuelve { valor: null, ok: false } para avisarlo como advertencia.
 */

const SIN_DATO = new Set(['', '-', '–', '—'])

/** Redondea a 2 decimales para evitar restos como 5.8 × 1000 = 5799.999… */
const redondear = (n) => Math.round(n * 100) / 100

/**
 * Interpreta la parte numérica (sin "$" ni "mil"). Reglas:
 *  - Con punto y coma a la vez, el que va al final es el decimal ("1.234,56" o "1,234.56").
 *  - Con un solo tipo de separador: si va seguido de EXACTAMENTE 3 dígitos al final, es de miles
 *    ("12.400" = 12400); si no, es decimal ("30,00" = 30, "10.00" = 10, "5,8" = 5.8).
 */
function interpretarCifra(texto) {
  if (!/^-?[\d.,]+$/.test(texto) || !/\d/.test(texto)) return null
  const ultimoPunto = texto.lastIndexOf('.')
  const ultimaComa = texto.lastIndexOf(',')
  let normal
  if (ultimoPunto >= 0 && ultimaComa >= 0) {
    const decimal = ultimoPunto > ultimaComa ? '.' : ','
    const miles = decimal === '.' ? ',' : '.'
    normal = texto.split(miles).join('').replace(decimal, '.')
  } else if (ultimoPunto >= 0 || ultimaComa >= 0) {
    const sep = ultimoPunto >= 0 ? '.' : ','
    const partes = texto.split(sep)
    const esMiles = partes.length > 1 && partes.slice(1).every((p) => p.length === 3)
    if (esMiles) normal = partes.join('')
    else if (partes.length === 2) normal = `${partes[0]}.${partes[1]}`
    else return null // "1.2.3": no se sabe qué es
  } else {
    normal = texto
  }
  const n = Number(normal)
  return Number.isFinite(n) ? n : null
}

/**
 * @param {unknown} valor celda tal como la entrega el lector (número, texto, vacío)
 * @returns {{ valor: number|null, ok: boolean }}
 */
export function limpiarNumero(valor) {
  if (valor === null || valor === undefined) return { valor: null, ok: true }
  if (typeof valor === 'number') return Number.isFinite(valor) ? { valor: redondear(valor), ok: true } : { valor: null, ok: false }
  if (typeof valor === 'boolean') return { valor: null, ok: false }

  let texto = String(valor).replace(/[\r\n\t ]/g, ' ').trim()
  if (SIN_DATO.has(texto)) return { valor: null, ok: true }

  texto = texto.replace(/\$/g, '').replace(/\s+/g, ' ').trim()
  let multiplicador = 1
  const conMil = texto.match(/^(.*?)\s*mil$/i)
  if (conMil) { multiplicador = 1000; texto = conMil[1].trim() }
  texto = texto.replace(/\s/g, '')
  if (SIN_DATO.has(texto)) return { valor: null, ok: true }

  const n = interpretarCifra(texto)
  if (n === null) return { valor: null, ok: false }
  return { valor: redondear(n * multiplicador), ok: true }
}
