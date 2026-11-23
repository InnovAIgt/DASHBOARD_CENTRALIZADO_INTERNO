/**
 * Canales de marketing · Mailing: lista de campañas con sus totales (GET /api/marketing/mailing/campanas).
 *
 * Fuente: API de Brevo con BREVO_API_KEY (solo lectura, solo servidor). Trae las campañas enviadas (sent) y
 * programadas (queued) con globalStats en pocas llamadas (hasta 100 por página).
 * El cargo elegido a mano sale de mkt_campana_cargo (Supabase «Dashboard Canales de marketing»); si Supabase falla,
 * se sigue con el cargo sugerido por el nombre y se avisa.
 *
 * No devuelve datos personales: solo nombre, asunto, fechas y cifras de cada campaña (nunca remitente, respuesta,
 * contenido HTML ni correos de prueba). Del contenido HTML solo se usa, aquí en el servidor, el OBJETIVO que coincide
 * con las reglas (datos/objetivo.js); el contenido nunca sale del servidor. Las reglas salen de server/mailing/reglas.js.
 * Caché en memoria del servidor (10 min) y en Vercel (5 min). Si Brevo falla y hay una copia anterior, se usa esa.
 * Documentación: docs/marketing/v2/MAILING.md, secciones 6, 7 y 10.
 */
import { leerCargosManuales } from '../mktSupabase.js'
import { objetivoDeTexto, textoDeHtml } from '../../src/modulos/marketing/marketing-v2/datos/objetivo.js'
import { cargoDesdeNombre, cargoFinal, esCampanaPrueba, semaforoEntrega, tasas, totalesDesdeBrevo } from './reglas.js'

const BREVO = 'https://api.brevo.com/v3'
export const CAMPANAS_CACHE_MS = 10 * 60 * 1000
export const CAMPANAS_CACHE_HTTP = 'public, max-age=60, s-maxage=300, stale-while-revalidate=600'
export const BREVO_ESPERA_MS = 15_000
const POR_PAGINA = 100
const MAX_PAGINAS = 20

/** Error con el código HTTP que debe devolver la ruta y un mensaje sin datos privados. */
class ErrorRuta extends Error {
  constructor(status, mensaje) { super(mensaje); this.status = status }
}

/** Asunto limpio: los campos de Brevo ({{ contact.NOMBRE }}) se muestran como [NOMBRE] y sin saltos de línea. */
export function limpiarAsunto(asunto) {
  return String(asunto ?? '')
    .replace(/\{\{\s*contact\.([A-Za-z0-9_]+)\s*\}\}/g, (_m, campo) => `[${campo.toUpperCase()}]`)
    .replace(/\s+/g, ' ')
    .trim()
}

/** Una campaña de Brevo → fila del dashboard (solo campos sin datos personales). */
export function filaCampana(c, cargosManuales = new Map()) {
  const { codigo, cargo: cargoSugerido, sector } = cargoDesdeNombre(c.name)
  // Lo elegido a mano (mkt_campana_cargo): {cargo, objetivo}; también acepta solo el cargo (texto).
  const manual = cargosManuales.get(Number(c.id)) ?? null
  const cargoManual = (typeof manual === 'string' ? manual : manual?.cargo) ?? null
  const objetivoManual = typeof manual === 'object' && manual ? manual.objetivo ?? null : null
  const totales = totalesDesdeBrevo(c.statistics?.globalStats)
  return {
    id: Number(c.id),
    nombre: String(c.name ?? '').trim(),
    asunto: limpiarAsunto(c.subject),
    estado: c.status === 'sent' ? 'enviada' : 'programada',
    fecha: c.sentDate || c.scheduledAt || null,
    codigo,
    sector,
    cargoSugerido,
    cargoManual,
    objetivoManual,
    cargo: cargoFinal(cargoManual, cargoSugerido),
    esPrueba: esCampanaPrueba(c.name),
    totales,
    tasas: tasas(totales),
    semaforo: semaforoEntrega(totales.entregados, totales.enviados),
    // Objetivo encontrado en el contenido del correo (solo el nombre del objetivo; el contenido no se envía).
    objetivoContenido: objetivoDeTexto(textoDeHtml(c.htmlContent)),
  }
}

async function pedirBrevo(ruta, { llave, fetchFn, esperaMs }) {
  const control = new AbortController()
  const reloj = setTimeout(() => control.abort(), esperaMs)
  try {
    const r = await fetchFn(BREVO + ruta, { headers: { 'api-key': llave, Accept: 'application/json' }, signal: control.signal })
    if (r.status === 401 || r.status === 403) throw new ErrorRuta(502, 'Brevo rechazó la llave de lectura.')
    if (r.status === 429) throw new ErrorRuta(503, 'Brevo pidió esperar (demasiadas consultas). Intenta en unos minutos.')
    if (!r.ok) throw new ErrorRuta(502, `Brevo respondió con un error (HTTP ${r.status}).`)
    return await r.json()
  } catch (err) {
    if (err instanceof ErrorRuta) throw err
    if (err?.name === 'AbortError') throw new ErrorRuta(504, 'Brevo no respondió a tiempo.')
    throw new ErrorRuta(502, 'No se pudo conectar con Brevo.')
  } finally {
    clearTimeout(reloj)
  }
}

/** Todas las campañas de un estado (sent o queued), página por página. */
async function campanasPorEstado(estado, opciones) {
  const lista = []
  for (let pagina = 0; pagina < MAX_PAGINAS; pagina++) {
    const j = await pedirBrevo(`/emailCampaigns?type=classic&status=${estado}&limit=${POR_PAGINA}&offset=${pagina * POR_PAGINA}&sort=desc&statistics=globalStats`, opciones)
    const campanas = Array.isArray(j?.campaigns) ? j.campaigns : []
    lista.push(...campanas)
    if (campanas.length < POR_PAGINA || lista.length >= Number(j?.count ?? 0)) break
  }
  return lista
}

/** Lee Brevo (y los cargos manuales) y arma la respuesta. Sin caché. */
export async function cargarCampanas({ env = process.env, fetchFn = fetch, esperaMs = BREVO_ESPERA_MS, leerCargos = leerCargosManuales } = {}) {
  const llave = String(env?.BREVO_API_KEY ?? '').trim()
  if (!llave) throw new ErrorRuta(503, 'Falta configurar BREVO_API_KEY en el servidor.')
  const opciones = { llave, fetchFn, esperaMs }
  const [enviadas, programadas] = await Promise.all([campanasPorEstado('sent', opciones), campanasPorEstado('queued', opciones)])

  const avisos = []
  let cargos = new Map()
  try {
    cargos = await leerCargos({ env, fetchFn })
  } catch (err) {
    console.warn('[Mailing] no se pudieron leer los cargos elegidos a mano:', err?.message || 'error desconocido')
    avisos.push('No se pudieron leer los cargos elegidos a mano; se muestra el cargo sugerido por el nombre.')
  }

  const campanas = [...programadas, ...enviadas].map((c) => filaCampana(c, cargos))
  return { actualizado: new Date().toISOString(), campanas, avisos }
}

// Caché en memoria (por instancia del servidor).
let copia = null // { datos, vence }

/** Solo para pruebas. */
export function vaciarCacheCampanas() { copia = null }

function respuesta(status, datos, cache = 'no-store') {
  return { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cache }, body: JSON.stringify(datos) }
}

/**
 * Atiende GET /api/marketing/mailing/campanas.
 * @param {{method: string, env?: object, fetchFn?: Function, leerCargos?: Function, ahora?: number}} p
 */
export async function responderCampanas({ method, env = process.env, fetchFn = fetch, leerCargos, ahora = Date.now() }) {
  if (method !== 'GET') return { ...respuesta(405, { error: 'Método no permitido. Usa GET.' }), headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', Allow: 'GET' } }
  if (copia && copia.vence > ahora) return respuesta(200, copia.datos, CAMPANAS_CACHE_HTTP)
  try {
    const datos = await cargarCampanas({ env, fetchFn, ...(leerCargos ? { leerCargos } : {}) })
    copia = { datos, vence: ahora + CAMPANAS_CACHE_MS }
    return respuesta(200, datos, CAMPANAS_CACHE_HTTP)
  } catch (err) {
    const status = err instanceof ErrorRuta ? err.status : 500
    const mensaje = err instanceof ErrorRuta ? err.message : 'Error inesperado al leer las campañas.'
    console.warn('[Mailing] campañas:', mensaje)
    if (copia) return respuesta(200, { ...copia.datos, avisos: [...copia.datos.avisos, `Datos guardados de antes: ${mensaje}`] }, 'no-store')
    return respuesta(status, { error: mensaje })
  }
}
