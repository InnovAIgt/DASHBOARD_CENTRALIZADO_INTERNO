/**
 * Canales de marketing · Mailing: GUARDAR cargo y objetivo de una campaña (sub-pestaña «Cargo y objetivo»).
 * Ruta /api/marketing/mailing/cargo. Sin inicio de sesión, protegido con una CLAVE DE MARKETING (decisión de Keily,
 * 23/11/2026; docs/marketing/v2/DECISIONES.md):
 *   POST {accion: 'entrar', clave, nombre}   → valida la clave EN EL SERVIDOR y devuelve un permiso firmado (8 h);
 *   POST {accion: 'guardar', permiso, campana_id, cargo, objetivo} → guarda (lo elegido a mano gana);
 *   DELETE {permiso, campana_id}             → «Volver a lo sugerido» (borra solo la fila de esa campaña).
 * Candados:
 *  - MKT_CLAVE_EDICION solo en el servidor (sin VITE_); si falta, la ruta responde 503 y la pantalla no deja guardar.
 *  - La clave se compara en tiempo constante y nunca se devuelve ni se registra; el permiso no la contiene.
 *  - 5 claves incorrectas en 15 minutos desde la misma dirección → bloqueo de 15 minutos (429); cada fallo espera 1 s.
 *    En Vercel el conteo es por instancia del servidor (no es global).
 *  - Solo escribe en mkt_campana_cargo (proyecto «Dashboard Canales de marketing»). Nunca Cumplimiento ni Brevo
 *    (a Brevo solo se le LEE la lista de campañas si el servidor no la tiene, para rechazar campañas inexistentes).
 */
import { createHmac, createHash, timingSafeEqual } from 'node:crypto'
import { borrarCargoDeCampana, guardarCargoDeCampana, leerCargoDeCampana } from '../mktSupabase.js'
import { idsCampanasConocidas, vaciarCacheCampanas } from './campanas.js'
import { CARGOS } from './reglas.js'

export const PERMISO_MS = 8 * 60 * 60 * 1000
export const MAX_FALLOS = 5
export const VENTANA_FALLOS_MS = 15 * 60 * 1000
export const ESPERA_FALLO_MS = 1000
export const MAX_OBJETIVO = 120
export const MAX_NOMBRE = 60

const fallos = new Map() // dirección → { veces, desde, bloqueadoHasta }
/** Solo para pruebas. */
export function vaciarIntentos() { fallos.clear() }

const respuesta = (status, datos) => ({ status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, body: JSON.stringify(datos) })
const resumen = (t) => createHash('sha256').update(String(t ?? ''), 'utf8').digest()
/** Comparación en tiempo constante (no se puede adivinar la clave midiendo cuánto tarda). */
export const claveCorrecta = (dada, real) => Boolean(real) && timingSafeEqual(resumen(dada), resumen(real))

const firma = (texto, clave) => createHmac('sha256', `mkv2-permiso|${clave}`).update(texto).digest('base64url')
/** Permiso firmado con la clave del servidor: {nombre, vence}. No contiene la clave. */
export function firmarPermiso(nombre, clave, ahora = Date.now()) {
  const datos = Buffer.from(JSON.stringify({ n: nombre, v: ahora + PERMISO_MS }), 'utf8').toString('base64url')
  return `${datos}.${firma(datos, clave)}`
}
/** Nombre del permiso si es válido y no venció; si no, null. */
export function leerPermiso(permiso, clave, ahora = Date.now()) {
  const [datos, sello] = String(permiso ?? '').split('.')
  if (!datos || !sello || !clave) return null
  const esperado = firma(datos, clave)
  if (esperado.length !== sello.length || !timingSafeEqual(Buffer.from(esperado), Buffer.from(sello))) return null
  try {
    const { n, v } = JSON.parse(Buffer.from(datos, 'base64url').toString('utf8'))
    return typeof n === 'string' && Number(v) > ahora ? n : null
  } catch { return null }
}

const limpiarTexto = (t, max) => String(t ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
const esperar = (ms) => new Promise((r) => { setTimeout(r, ms) })

/**
 * Atiende la ruta. ip = dirección de quien llama (para el límite de intentos).
 * @param {{method: string, body?: object, ip?: string, env?: object, fetchFn?: Function, ahora?: number, esperaFallo?: number,
 *   conocidas?: Function, leer?: Function, guardar?: Function, borrar?: Function}} p
 */
export async function responderCargo({
  method, body = {}, ip = 'desconocida', env = process.env, fetchFn = fetch, ahora = Date.now(), esperaFallo = ESPERA_FALLO_MS,
  conocidas = idsCampanasConocidas, leer = leerCargoDeCampana, guardar = guardarCargoDeCampana, borrar = borrarCargoDeCampana,
}) {
  if (method !== 'POST' && method !== 'DELETE') return { ...respuesta(405, { error: 'Método no permitido.' }), headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', Allow: 'POST, DELETE' } }
  const clave = String(env?.MKT_CLAVE_EDICION ?? '').trim()
  if (!clave) return respuesta(503, { error: 'La edición no está habilitada: falta configurar la clave de Marketing en el servidor.' })
  const b = body && typeof body === 'object' ? body : {}

  // --- Entrar: validar la clave (con límite de intentos) ---
  if (method === 'POST' && b.accion === 'entrar') {
    const f = fallos.get(ip)
    if (f?.bloqueadoHasta > ahora) return respuesta(429, { error: 'Demasiados intentos con clave incorrecta. Espera 15 minutos.' })
    const nombre = limpiarTexto(b.nombre, MAX_NOMBRE)
    if (!nombre) return respuesta(400, { error: 'Escribe tu nombre.' })
    if (!claveCorrecta(b.clave, clave)) {
      const actual = f && ahora - f.desde < VENTANA_FALLOS_MS ? f : { veces: 0, desde: ahora, bloqueadoHasta: 0 }
      actual.veces += 1
      if (actual.veces >= MAX_FALLOS) actual.bloqueadoHasta = ahora + VENTANA_FALLOS_MS
      fallos.set(ip, actual)
      if (esperaFallo) await esperar(esperaFallo)
      return respuesta(401, { error: 'Clave incorrecta.' })
    }
    fallos.delete(ip)
    return respuesta(200, { permiso: firmarPermiso(nombre, clave, ahora), nombre, vence: new Date(ahora + PERMISO_MS).toISOString() })
  }

  // --- Guardar o volver a lo sugerido: piden un permiso válido ---
  const nombre = leerPermiso(b.permiso, clave, ahora)
  if (!nombre) return respuesta(401, { error: 'Falta la clave de Marketing o el permiso venció. Vuelve a escribir la clave.' })
  const id = Number(b.campana_id)
  if (!Number.isInteger(id) || id <= 0) return respuesta(400, { error: 'Campaña inválida.' })
  try {
    const ids = await conocidas({ env, fetchFn, ahora })
    if (!ids.has(id)) return respuesta(404, { error: `La campaña #${id} no existe en Brevo.` })
  } catch {
    return respuesta(502, { error: 'No se pudo comprobar la lista de campañas. Intenta de nuevo.' })
  }

  try {
    if (method === 'DELETE') {
      const borradas = await borrar(id, { env, fetchFn })
      vaciarCacheCampanas()
      return respuesta(200, { ok: true, campana_id: id, borradas })
    }
    if (b.accion !== 'guardar') return respuesta(400, { error: 'Acción desconocida.' })
    const cargo = b.cargo === null || b.cargo === undefined || b.cargo === '' || b.cargo === 'Sin clasificar' ? null : String(b.cargo)
    if (cargo !== null && !CARGOS.includes(cargo)) return respuesta(400, { error: 'Cargo inválido: usa GG, GF o GO.' })
    const objetivo = limpiarTexto(b.objetivo, MAX_OBJETIVO) || null
    if (!cargo && !objetivo) return respuesta(400, { error: 'Elige un cargo o un objetivo (o usa «Volver a lo sugerido»).' })
    // Las fechas solo cambian si cambió ese dato. asignado_en no puede quedar vacío (la tabla lo exige: fecha de la
    // fila); objetivo_asignado_en queda vacío si no hay objetivo.
    const antes = await leer(id, { env, fetchFn })
    const ahoraIso = new Date(ahora).toISOString()
    const fila = {
      campana_id: id, cargo, objetivo, asignado_por: nombre,
      asignado_en: cargo !== (antes?.cargo ?? null) || !antes?.asignado_en ? ahoraIso : antes.asignado_en,
      objetivo_asignado_en: !objetivo ? null : objetivo !== (antes?.objetivo ?? null) || !antes?.objetivo_asignado_en ? ahoraIso : antes.objetivo_asignado_en,
    }
    const guardado = await guardar(fila, { env, fetchFn })
    vaciarCacheCampanas()
    return respuesta(200, { ok: true, campana_id: id, manual: guardado })
  } catch (err) {
    console.warn('[Mailing] guardar cargo y objetivo:', String(err?.message || 'error').slice(0, 120))
    return respuesta(502, { error: 'No se pudo guardar en Supabase. Intenta de nuevo.' })
  }
}
