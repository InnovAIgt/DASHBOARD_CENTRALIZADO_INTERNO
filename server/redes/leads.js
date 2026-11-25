/**
 * Canales de marketing · Redes sociales · LEADS DE REDES (Prospekt, SOLO LECTURA; REDES.md, 7.6).
 *
 *   GET /api/marketing/redes/leads → calificados con origen «PostIAlo Redes Sociales» (sin LDTEST), con nombre,
 *   teléfono, correo, asesor, etapa y gestiones, y el TOTAL de no calificados (sin repartir: Prospekt no dice su canal).
 *
 * Decisión de Keily (24/11/2026, DECISIONES.md): la pantalla muestra los datos completos del cliente, sin clave ni
 * login. Pendiente confirmar con Eduardo antes de activarlo en producción (PENDIENTES).
 * Nunca se escriben datos de clientes en los registros (logs) ni en los mensajes de error. Caché de 10 min (2 min si
 * hubo aviso); si Prospekt falla y hay copia, se devuelve con aviso. Fechas: Prospekt da UTC; se pasan a UTC−6.
 */
import { ErrorProspekt, fechaCreadoUtc, leerProspektCrudo, registrosDe } from '../mailing/prospekt.js'

export const ORIGEN_REDES = 'postialo redes sociales'
export const URL_NO_CALIFICADOS = 'https://prospektia.red.com.sv/api/audit/leads-no-calificados'
export const CACHE_LEADS_MS = 10 * 60 * 1000
const CACHE_AVISO_MS = 2 * 60 * 1000
const MS_GT = 6 * 3600 * 1000
const CABECERAS = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
const responder = (status, cuerpo) => ({ status, headers: CABECERAS, body: JSON.stringify(cuerpo) })
let cache = null
export const vaciarCacheLeadsRedes = () => { cache = null }

const texto = (v) => String(v ?? '').replace(/\s+/g, ' ').trim()
const esPrueba = (r) => /ldtest/i.test(`${r.codigo_prospecto ?? ''} ${r.nombre_prospecto ?? ''}`)

/** Un registro de Prospekt → lead de Redes para la pantalla (fecha y hora en UTC−6). */
export function leadRedes(r) {
  const utc = fechaCreadoUtc(r.fecha_creado, r.hora_creado)
  const gt = utc ? new Date(Date.parse(utc) - MS_GT).toISOString() : null
  const etapa = Number(r.opportunity_stage)
  const correo = texto(r.email)
  return {
    codigo: texto(r.codigo_prospecto),
    nombre: texto(r.nombre_prospecto),
    telefono: texto(r.telefono),
    correo: correo.includes('@') ? correo : '',
    pais: texto(r.pais).toUpperCase(),
    asesor: texto(r.asesor_nombre),
    etapa: Number.isInteger(etapa) ? etapa : null,
    status: texto(r.status),
    fechaUtc: utc,
    fecha: gt ? gt.slice(0, 10) : null,
    hora: gt ? gt.slice(11, 16) : null,
    gestiones: (Array.isArray(r.gestiones) ? r.gestiones : []).map((g) => ({
      fecha: texto(g.fecha_gestion ?? g.created_at), tipo: texto(g.tipo), etapa: Number(g.etapa_numero) || null,
      notas: texto(g.notas), proxima: texto(g.proxima_fecha), proximaNotas: texto(g.proxima_notas), por: texto(g.display_user ?? g.registrado_por),
    })).sort((a, b) => b.fecha.localeCompare(a.fecha)),
  }
}

/** Leads de Redes de la respuesta de Prospekt: sin repetidos (por código), solo origen Redes, sin pruebas (LDTEST). */
export function leadsDeRedes(json) {
  const porCodigo = new Map()
  for (const r of registrosDe(json)) {
    const codigo = texto(r.codigo_prospecto)
    if (!codigo || porCodigo.has(codigo)) continue
    porCodigo.set(codigo, r)
  }
  return [...porCodigo.values()].filter((r) => texto(r.validator_source).toLowerCase() === ORIGEN_REDES && !esPrueba(r)).map(leadRedes).filter((l) => l.fecha)
}

/** Total de no calificados (una consulta con limit=1). null si no se pudo leer. */
async function totalNoCalificados({ env, fetchFn }) {
  const control = new AbortController()
  const reloj = setTimeout(() => control.abort(), 10_000)
  try {
    const r = await fetchFn(`${URL_NO_CALIFICADOS}?limit=1&offset=0`, { method: 'GET', headers: { Accept: 'application/json', 'X-API-Key': String(env.PROSPEKT_API_KEY ?? '').trim() }, signal: control.signal })
    if (!r.ok) return null
    const d = await r.json()
    return Number.isFinite(Number(d?.total)) ? Number(d.total) : null
  } catch {
    return null
  } finally {
    clearTimeout(reloj)
  }
}

/** @param {{method: string, env?: object, fetchFn?: Function, ahora?: () => Date}} p */
export async function responderLeadsRedes({ method, env = process.env, fetchFn = fetch, ahora = () => new Date() }) {
  if (method !== 'GET') return responder(405, { error: 'Solo GET' })
  if (!String(env?.PROSPEKT_API_KEY ?? '').trim()) return responder(200, { fuente: 'sin_llave', aviso: 'Falta configurar PROSPEKT_API_KEY en el servidor.', leads: [], noCalificados: null })
  const vida = cache?.cuerpo?.avisos?.length ? CACHE_AVISO_MS : CACHE_LEADS_MS
  if (cache && ahora().getTime() - cache.en < vida) return responder(200, cache.cuerpo)
  try {
    const [json, noCalificados] = await Promise.all([leerProspektCrudo({ env, fetchFn }), totalNoCalificados({ env, fetchFn })])
    const avisos = noCalificados === null ? ['No se pudo leer el total de no calificados de Prospekt.'] : []
    const cuerpo = { fuente: 'prospekt', actualizado: ahora().toISOString(), leads: leadsDeRedes(json), noCalificados: noCalificados === null ? null : { total: noCalificados }, avisos }
    cache = { en: ahora().getTime(), cuerpo }
    return responder(200, cuerpo)
  } catch (err) {
    const mensaje = err instanceof ErrorProspekt ? err.message : 'No se pudieron leer los leads de Prospekt.'
    console.error(`[Redes leads] ${err instanceof ErrorProspekt ? err.motivo : 'otro'}: ${mensaje}`)
    if (cache) {
      const hora = new Date(cache.en - MS_GT).toISOString().slice(11, 16)
      return responder(200, { ...cache.cuerpo, avisos: [...(cache.cuerpo.avisos ?? []), `${mensaje} Se muestran los datos guardados de las ${hora}.`] })
    }
    return responder(502, { fuente: 'error', error: mensaje, leads: [], noCalificados: null })
  }
}
