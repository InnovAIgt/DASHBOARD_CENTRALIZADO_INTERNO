/**
 * Canales de marketing · Mailing: resumen de los eventos del webhook (GET /api/marketing/mailing/resumen).
 *
 * Fuente: tabla mkt_brevo_eventos (Supabase «Dashboard Canales de marketing»), solo campañas enviadas desde que se
 * activó el webhook. Agrupa por destinatario DENTRO del servidor y devuelve SOLO CONTEOS: nunca correos.
 * Mientras no haya inicio de sesión real del portal, esta es la única vista del detalle por correo.
 *
 *   ?campanas=12,13   (opcional) solo esas campañas; sin parámetro, todas las que tengan eventos.
 *
 * Reglas (server/mailing/reglas.js, docs/marketing/v2/MAILING.md secciones 3 a 5):
 *  - estado final: último evento entre entrega y rebotes; empate o sin eventos de entrega → Sin confirmación;
 *  - CORREGIR / MANTENER con el motivo del rebote final;
 *  - apertura registrada = destinatarios con evento «opened»; clic = con evento «click».
 *  - «proxy_open» se cuenta aparte: Brevo no explica qué es (por confirmar con la campaña de prueba).
 * Caché en memoria de 2 min por consulta. Si Supabase falla y hay una copia anterior, se usa con aviso.
 */
import { leerEventos } from '../mktSupabase.js'
import { estadoFinal, statusCorreo } from './reglas.js'

export const RESUMEN_CACHE_MS = 2 * 60 * 1000
export const RESUMEN_CACHE_HTTP = 'public, max-age=30, s-maxage=120'
export const MAX_CAMPANAS_CONSULTA = 200
const MAX_COPIAS = 50
// apple_mpp: aperturas automáticas de Apple por persona, solo del historial importado (CSV de Brevo).
const EVENTOS_CONOCIDOS = new Set(['delivered', 'soft_bounce', 'hard_bounce', 'opened', 'click', 'spam', 'unsubscribe', 'proxy_open', 'apple_mpp'])

class ErrorRuta extends Error {
  constructor(status, mensaje) { super(mensaje); this.status = status }
}

/** «12,13» → [12, 13]; vacío → null (todas); inválido → error 400. */
export function leerParametroCampanas(texto) {
  const valor = String(texto ?? '').trim()
  if (!valor) return null
  const partes = valor.split(',').map((p) => p.trim()).filter(Boolean)
  if (!partes.length || partes.some((p) => !/^\d{1,12}$/.test(p) || Number(p) <= 0)) throw new ErrorRuta(400, 'El parámetro «campanas» debe ser una lista de números separados por coma.')
  const ids = [...new Set(partes.map(Number))].sort((a, b) => a - b)
  if (ids.length > MAX_CAMPANAS_CONSULTA) throw new ErrorRuta(400, `Máximo ${MAX_CAMPANAS_CONSULTA} campañas por consulta.`)
  return ids
}

function sumar(objeto, clave, n = 1) {
  objeto[clave] = (objeto[clave] ?? 0) + n
}

/** Resumen de UNA campaña a partir de sus eventos (sin correos en el resultado). */
export function resumirCampana(eventos) {
  const porDestinatario = new Map()
  for (const e of eventos) {
    const lista = porDestinatario.get(e.correo)
    if (lista) lista.push(e)
    else porDestinatario.set(e.correo, [e])
  }
  const r = {
    eventos: eventos.length,
    destinatarios: porDestinatario.size,
    estados: { entregado: 0, rebote_temporal: 0, rebote_permanente: 0, sin_confirmacion: 0 },
    empates: 0,
    sinEventosDeEntrega: 0,
    status: { CORREGIR: 0, MANTENER: 0 },
    motivosCorregir: {},
    motivosMantener: {},
    aperturaRegistrada: 0,
    aperturaAutomatica: 0,
    proxyOpen: 0,
    clic: 0,
    spam: 0,
    bajas: 0,
    otrosEventos: {},
    origen: { historial: 0, webhook: 0 },
    primerEvento: null,
    ultimoEvento: null,
  }
  for (const lista of porDestinatario.values()) {
    const final = estadoFinal(lista)
    r.estados[final.estado] += 1
    if (final.empate) r.empates += 1
    if (final.sinEventos) r.sinEventosDeEntrega += 1
    const s = statusCorreo(final)
    r.status[s.status] += 1
    if (s.motivoTecnico) sumar(s.status === 'CORREGIR' ? r.motivosCorregir : r.motivosMantener, s.motivoTecnico)
    const tipos = new Set(lista.map((e) => e.evento))
    // Sección 5: con fecha de apertura gana REGISTRADA; sin ella pero con Apple MPP, AUTOMÁTICA.
    if (tipos.has('opened')) r.aperturaRegistrada += 1
    else if (tipos.has('apple_mpp')) r.aperturaAutomatica += 1
    if (tipos.has('proxy_open')) r.proxyOpen += 1
    if (tipos.has('click')) r.clic += 1
    if (tipos.has('spam')) r.spam += 1
    if (tipos.has('unsubscribe')) r.bajas += 1
  }
  for (const e of eventos) {
    if (!EVENTOS_CONOCIDOS.has(e.evento)) sumar(r.otrosEventos, e.evento)
    r.origen[e.origen === 'historial' ? 'historial' : 'webhook'] += 1
    const t = Date.parse(e.fecha_evento)
    if (Number.isNaN(t)) continue
    if (!r.primerEvento || t < Date.parse(r.primerEvento)) r.primerEvento = new Date(t).toISOString()
    if (!r.ultimoEvento || t > Date.parse(r.ultimoEvento)) r.ultimoEvento = new Date(t).toISOString()
  }
  return r
}

/** Lee los eventos y arma el resumen por campaña. Sin caché. */
export async function cargarResumen({ campanas = null, env = process.env, fetchFn = fetch, leer = leerEventos } = {}) {
  let eventos
  try {
    eventos = await leer({ campanas, env, fetchFn })
  } catch (err) {
    const mensaje = String(err?.message || '')
    if (/faltan las variables|no es una dirección|debe ser https/.test(mensaje)) throw new ErrorRuta(503, 'Falta configurar la conexión con Supabase en el servidor.')
    if (/no respondió/.test(mensaje)) throw new ErrorRuta(504, 'Supabase no respondió a tiempo.')
    throw new ErrorRuta(502, 'No se pudieron leer los eventos del webhook.')
  }
  const porCampana = new Map()
  for (const e of eventos) {
    const id = Number(e.campana_id)
    const lista = porCampana.get(id)
    if (lista) lista.push(e)
    else porCampana.set(id, [e])
  }
  const resumen = {}
  for (const [id, lista] of [...porCampana.entries()].sort((a, b) => a[0] - b[0])) resumen[id] = resumirCampana(lista)
  const hayDatos = eventos.length > 0
  return {
    actualizado: new Date().toISOString(),
    hayDatos,
    mensaje: hayDatos ? null : 'Sin datos del webhook todavía.',
    campanasConsultadas: campanas,
    campanas: resumen,
    avisos: [],
  }
}

const copias = new Map() // clave de consulta → { datos, vence }

/** Solo para pruebas. */
export function vaciarCacheResumen() { copias.clear() }

function respuesta(status, datos, cache = 'no-store', extra = {}) {
  return { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cache, ...extra }, body: JSON.stringify(datos) }
}

/**
 * Atiende GET /api/marketing/mailing/resumen.
 * @param {{method: string, query?: {campanas?: string}, env?: object, fetchFn?: Function, leer?: Function, ahora?: number}} p
 */
export async function responderResumen({ method, query = {}, env = process.env, fetchFn = fetch, leer, ahora = Date.now() }) {
  if (method !== 'GET') return respuesta(405, { error: 'Método no permitido. Usa GET.' }, 'no-store', { Allow: 'GET' })
  let campanas
  try {
    campanas = leerParametroCampanas(query.campanas)
  } catch (err) {
    return respuesta(err.status ?? 400, { error: err.message })
  }
  const clave = campanas ? campanas.join(',') : '*'
  const copia = copias.get(clave)
  if (copia && copia.vence > ahora) return respuesta(200, copia.datos, RESUMEN_CACHE_HTTP)
  try {
    const datos = await cargarResumen({ campanas, env, fetchFn, ...(leer ? { leer } : {}) })
    if (copias.size >= MAX_COPIAS) copias.delete(copias.keys().next().value)
    copias.set(clave, { datos, vence: ahora + RESUMEN_CACHE_MS })
    return respuesta(200, datos, RESUMEN_CACHE_HTTP)
  } catch (err) {
    const status = err instanceof ErrorRuta ? err.status : 500
    const mensaje = err instanceof ErrorRuta ? err.message : 'Error inesperado al resumir los eventos.'
    console.warn('[Mailing] resumen:', mensaje)
    if (copia) return respuesta(200, { ...copia.datos, avisos: [...copia.datos.avisos, `Datos guardados de antes: ${mensaje}`] })
    return respuesta(status, { error: mensaje })
  }
}
