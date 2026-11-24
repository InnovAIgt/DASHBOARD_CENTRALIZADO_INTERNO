/**
 * Canales de marketing · tarea diaria para que el proyecto Supabase «Dashboard Canales de marketing» (plan Free) no se
 * pause por falta de actividad (Supabase pausa los proyectos Free tras unos 7 días sin uso).
 *
 * La llama el cron de Vercel una vez al día (vercel.json → crons, solo en Production). Vercel manda el encabezado
 * `Authorization: Bearer <CRON_SECRET>`; sin esa clave exacta responde 401 y no toca Supabase.
 * Hace UNA lectura mínima (un campana_id de mkt_campana_cargo): no escribe nada y no devuelve datos.
 * Variables (solo servidor, sin VITE_): CRON_SECRET, MKT_SUPABASE_URL y MKT_SUPABASE_SECRET_KEY.
 */
import { timingSafeEqual } from 'node:crypto'
import { configuracionMkt, MKT_ESPERA_MS, TABLA_CARGO } from './mktSupabase.js'

const JSON_SIN_CACHE = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
const responder = (status, cuerpo) => ({ status, headers: JSON_SIN_CACHE, body: JSON.stringify(cuerpo) })

/** Compara la clave del encabezado con CRON_SECRET en tiempo constante. Sin CRON_SECRET, nunca pasa. */
export function cronAutorizado(headers = {}, env = process.env) {
  const secreto = String(env?.CRON_SECRET ?? '').trim()
  if (!secreto) return false
  const recibido = String(headers.authorization ?? headers.Authorization ?? '')
  const a = Buffer.from(recibido)
  const b = Buffer.from(`Bearer ${secreto}`)
  return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * @param {{method: string, headers?: object, env?: object, fetchFn?: Function, esperaMs?: number, ahora?: () => Date}} p
 * @returns {Promise<{status: number, headers: object, body: string}>}
 */
export async function responderMantener({ method, headers = {}, env = process.env, fetchFn = fetch, esperaMs = MKT_ESPERA_MS, ahora = () => new Date() }) {
  if (method !== 'GET') return responder(405, { error: 'Solo GET' })
  if (!cronAutorizado(headers, env)) return responder(401, { error: 'No autorizado' })
  let url, llave
  try { ({ url, llave } = configuracionMkt(env)) } catch (err) { return responder(500, { error: err.message }) }
  const control = new AbortController()
  const reloj = setTimeout(() => control.abort(), esperaMs)
  try {
    const r = await fetchFn(`${url}/rest/v1/${TABLA_CARGO}?select=campana_id&limit=1`, {
      method: 'GET', headers: { apikey: llave, Accept: 'application/json' }, signal: control.signal,
    })
    if (!r.ok) {
      console.error(`[MKT mantener] Supabase respondió HTTP ${r.status}`)
      return responder(502, { error: `Supabase respondió HTTP ${r.status}` })
    }
    await r.text().catch(() => '')
    return responder(200, { ok: true, revisado: ahora().toISOString() })
  } catch (err) {
    const texto = err?.name === 'AbortError' ? `Supabase no respondió en ${esperaMs / 1000} s` : 'No se pudo llamar a Supabase'
    console.error(`[MKT mantener] ${texto}`)
    return responder(502, { error: texto })
  } finally {
    clearTimeout(reloj)
  }
}
