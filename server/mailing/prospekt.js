/**
 * Canales de marketing · Mailing: lectura de los leads CALIFICADOS de Prospekt IA (solo GET, solo servidor).
 *
 * GET https://prospektia.red.com.sv/api/external/leads-calificados?limite=5000 con la llave PROSPEKT_API_KEY en el
 * encabezado X-API-Key (aparte de RED_API_KEY de Flujo de ventas, aunque pueda tener el mismo valor). No tiene páginas:
 * devuelve todo de una vez, y trae los leads DOS veces (en «leads» y en «por_pais»): aquí se juntan y se quitan los
 * repetidos por codigo_prospecto.
 *
 * fecha_creado y hora_creado vienen en UTC (descripción de la API; confirmado por Keily el 24/11/2026).
 * El correo y el teléfono se usan SOLO dentro del servidor para el cruce; nunca salen en una respuesta.
 * Los errores nunca incluyen la llave ni datos del lead. Documentación: docs/marketing/v2/MAILING.md, sección 11.
 */

export const PROSPEKT_LEADS_URL = 'https://prospektia.red.com.sv/api/external/leads-calificados'
export const PROSPEKT_LIMITE = 5000
export const PROSPEKT_ESPERA_MS = 10_000

/** Error con un motivo fijo y un mensaje sin datos privados. motivo: sin_llave · llave · caida · formato. */
export class ErrorProspekt extends Error {
  constructor(motivo, mensaje) { super(mensaje); this.motivo = motivo }
}

/** Correo para comparar: minúsculas y sin espacios. */
export const normalizarCorreo = (correo) => String(correo ?? '').replace(/\s+/g, '').toLowerCase()

/** Teléfono para comparar: solo dígitos, los últimos 8 (sin código de país). Vacío si tiene menos de 8. */
export function normalizarTelefono(telefono) {
  const digitos = String(telefono ?? '').replace(/\D/g, '')
  return digitos.length >= 8 ? digitos.slice(-8) : ''
}

/**
 * Fecha y hora de creación (UTC) → ISO. Acepta «2026-11-19» + «14:05[:09]», «19/11/2026» + hora, o una fecha ya
 * completa en fecha_creado. Sin zona → se toma como UTC. Devuelve null si no se entiende.
 */
export function fechaCreadoUtc(fecha, hora) {
  const f = String(fecha ?? '').trim()
  if (!f) return null
  let dia = null
  let resto = ''
  let m = f.match(/^(\d{4})-(\d{2})-(\d{2})(.*)$/)
  if (m) { dia = `${m[1]}-${m[2]}-${m[3]}`; resto = m[4] }
  else if ((m = f.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(.*)$/))) { dia = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; resto = m[4] }
  if (!dia) return null
  resto = resto.replace(/^[T\s]+/, '').trim()
  const h = (resto || String(hora ?? '').trim()).match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(\.\d+)?\s*(Z|[+-]\d{2}:?\d{2})?$/i)
  const texto = h
    ? `${dia}T${h[1].padStart(2, '0')}:${h[2]}:${h[3] ?? '00'}${h[5] ? (h[5].toUpperCase() === 'Z' ? 'Z' : h[5].replace(/^([+-]\d{2})(\d{2})$/, '$1:$2')) : 'Z'}`
    : `${dia}T00:00:00Z`
  const t = Date.parse(texto)
  return Number.isNaN(t) ? null : new Date(t).toISOString()
}

/** Todas las listas de registros con codigo_prospecto dentro de la respuesta (leads, por_pais como objeto o lista). */
export function registrosDe(valor, salida = [], profundidad = 0) {
  if (profundidad > 4 || valor == null || typeof valor !== 'object') return salida
  if (Array.isArray(valor)) {
    for (const v of valor) {
      if (v && typeof v === 'object' && !Array.isArray(v) && 'codigo_prospecto' in v) salida.push(v)
      else registrosDe(v, salida, profundidad + 1)
    }
    return salida
  }
  for (const v of Object.values(valor)) registrosDe(v, salida, profundidad + 1)
  return salida
}

/** Un registro de Prospekt → lead limpio (correo y teléfono normalizados, SOLO para uso interno). */
export function leadLimpio(r) {
  const etapa = Number(r.opportunity_stage)
  return {
    codigo: String(r.codigo_prospecto ?? '').trim(),
    correo: normalizarCorreo(r.email),
    telefono: normalizarTelefono(r.telefono),
    origen: String(r.validator_source ?? '').trim(),
    pais: String(r.pais ?? '').trim().toUpperCase(),
    fecha: fechaCreadoUtc(r.fecha_creado, r.hora_creado),
    asesor: String(r.asesor_nombre ?? '').replace(/\s+/g, ' ').trim(),
    status: String(r.status ?? '').trim(),
    etapa: Number.isInteger(etapa) ? etapa : null,
  }
}

/**
 * Junta leads y por_pais y quita repetidos por codigo_prospecto (gana el primero). Los registros sin código se
 * descartan y se cuentan.
 * @returns {{leads: Array<object>, registros: number, sinCodigo: number}}
 */
export function unirLeads(json) {
  const registros = registrosDe(json)
  const porCodigo = new Map()
  let sinCodigo = 0
  for (const r of registros) {
    const lead = leadLimpio(r)
    if (!lead.codigo) { sinCodigo++; continue }
    if (!porCodigo.has(lead.codigo)) porCodigo.set(lead.codigo, lead)
  }
  return { leads: [...porCodigo.values()], registros: registros.length, sinCodigo }
}

/**
 * Lee Prospekt una vez (sin caché). Lanza ErrorProspekt si falta la llave, la rechaza, no responde o responde algo
 * que no se entiende.
 */
export async function leerLeadsCalificados(opciones = {}) {
  return unirLeads(await leerProspektCrudo(opciones))
}

/**
 * La respuesta COMPLETA de leads calificados (JSON tal cual), para quien necesita más campos que Mailing (Redes:
 * nombre y gestiones). Mismos errores que leerLeadsCalificados.
 */
export async function leerProspektCrudo({ env = process.env, fetchFn = fetch, esperaMs = PROSPEKT_ESPERA_MS } = {}) {
  const llave = String(env?.PROSPEKT_API_KEY ?? '').trim()
  if (!llave) throw new ErrorProspekt('sin_llave', 'Falta configurar PROSPEKT_API_KEY en el servidor.')
  const control = new AbortController()
  const reloj = setTimeout(() => control.abort(), esperaMs)
  let r
  try {
    r = await fetchFn(`${PROSPEKT_LEADS_URL}?limite=${PROSPEKT_LIMITE}`, { method: 'GET', headers: { Accept: 'application/json', 'X-API-Key': llave }, signal: control.signal })
  } catch (err) {
    if (err?.name === 'AbortError') throw new ErrorProspekt('caida', `Prospekt no respondió en ${esperaMs / 1000} s.`)
    throw new ErrorProspekt('caida', 'No se pudo conectar con Prospekt.')
  } finally {
    clearTimeout(reloj)
  }
  if (r.status === 401 || r.status === 403) throw new ErrorProspekt('llave', 'Prospekt rechazó la llave (PROSPEKT_API_KEY).')
  if (!r.ok) throw new ErrorProspekt('caida', `Prospekt respondió con un error (HTTP ${r.status}).`)
  let json
  try { json = await r.json() } catch { throw new ErrorProspekt('formato', 'Prospekt respondió algo que no es JSON.') }
  if (!json || typeof json !== 'object') throw new ErrorProspekt('formato', 'Prospekt respondió un formato inesperado.')
  return json
}
