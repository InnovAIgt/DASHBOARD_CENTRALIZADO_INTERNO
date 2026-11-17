/**
 * Marketing por canales — reglas editables en UN solo lugar.
 *
 * Si hay que agregar un patrón de campaña de prueba, un dominio interno o un país,
 * se cambia aquí y nada más. Documentación: docs/marketing-canales/DECISIONES.md
 */

/**
 * Nombres de campaña que indican una PRUEBA (no se cuentan en totales).
 * Se compara sin importar mayúsculas ni tildes y como palabra o frase completa:
 * "TEST" marca "MARKETING TEST 1" o "Gerentes - Test Entregabilidad", pero NO "TESTIMONIOS".
 * Orden: de lo más específico a lo más general (se informa el primero que coincide).
 */
export const PATRONES_CAMPANA_PRUEBA = [
  '[VALIDACIÓN]',
  '[PRUEBA]',
  '[TEST]',
  'MARKETING TEST',
  'TEST',
]

/**
 * Dominios de correo internos de RED. Se compara el dominio EXACTO o un subdominio
 * (p. ej. "ventas.red.com.gt"). "infored.com.sv" NO es interno: es otro dominio.
 */
export const DOMINIOS_INTERNOS = ['red.com.gt', 'red.com.sv', 'redintelfon.com']

/** País según la terminación del dominio del correo. Lo demás es "Desconocido" (no se adivina). */
export const PAIS_POR_TERMINACION = {
  gt: 'Guatemala',
  sv: 'El Salvador',
}
export const PAIS_DESCONOCIDO = 'Desconocido'
export const PAISES = ['Guatemala', 'El Salvador', PAIS_DESCONOCIDO]

/** Con menos entregados que esto, los porcentajes se muestran como "pocos datos". */
export const MINIMO_ENTREGADOS = 5

/**
 * Cargo al que va dirigida la campaña, tomado del NOMBRE de la campaña (D27), mientras no exista el
 * catálogo de campañas. Se compara sin mayúsculas ni tildes, como frase completa.
 * Se acepta "FINACIERO" porque así viene escrito el nombre real de la campaña #75.
 */
export const CARGOS = [
  { cargo: 'Gerente General', frases: ['GERENTE GENERAL'] },
  { cargo: 'Gerente Financiero', frases: ['GERENTE FINANCIERO', 'GERENTE FINACIERO'] },
  { cargo: 'Gerente Operativo', frases: ['GERENTE OPERATIVO'] },
]
export const SIN_CARGO = 'Sin cargo'

// ---------------------------------------------------------------------------

/** Mayúsculas y sin tildes, para comparar nombres. */
export function normalizarTexto(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .trim()
}

const escaparRegex = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const REGLAS_PRUEBA = PATRONES_CAMPANA_PRUEBA.map((patron) => ({
  patron,
  // Antes y después del patrón: inicio/fin del texto o un carácter que no sea letra ni número.
  regex: new RegExp(`(^|[^A-Z0-9])${escaparRegex(normalizarTexto(patron))}($|[^A-Z0-9])`),
}))

const REGLAS_CARGO = CARGOS.map(({ cargo, frases }) => ({
  cargo,
  regex: frases.map((f) => new RegExp(`(^|[^A-Z0-9])${escaparRegex(normalizarTexto(f))}($|[^A-Z0-9])`)),
}))

/** Cargo de la campaña según su nombre, o SIN_CARGO si no coincide con ninguno. */
export function cargoDeCampana(nombreCampana) {
  const nombre = normalizarTexto(nombreCampana)
  return REGLAS_CARGO.find((r) => r.regex.some((x) => x.test(nombre)))?.cargo ?? SIN_CARGO
}

/** Devuelve el patrón que hace que la campaña sea de prueba, o null si no lo es. */
export function patronDePrueba(nombreCampana) {
  const nombre = normalizarTexto(nombreCampana)
  return REGLAS_PRUEBA.find((r) => r.regex.test(nombre))?.patron ?? null
}

function dominioDe(correo) {
  const texto = String(correo ?? '').trim().toLowerCase()
  const arroba = texto.lastIndexOf('@')
  return arroba === -1 ? '' : texto.slice(arroba + 1)
}

/** true si el correo pertenece a un dominio interno (exacto o subdominio). */
export function esCorreoInterno(correo) {
  const dominio = dominioDe(correo)
  return DOMINIOS_INTERNOS.some((d) => dominio === d || dominio.endsWith(`.${d}`))
}

/** País del destinatario según la terminación del dominio (.gt, .sv); si no, "Desconocido". */
export function paisDeCorreo(correo) {
  const terminacion = dominioDe(correo).split('.').pop()
  return PAIS_POR_TERMINACION[terminacion] ?? PAIS_DESCONOCIDO
}
