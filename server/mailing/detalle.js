/**
 * Canales de marketing · Mailing: detalle por correo (GET /api/marketing/mailing/detalle).
 *
 * Una fila por correo y campaña, armada con los eventos de mkt_brevo_eventos (historial importado y webhook) y las
 * reglas de server/mailing/reglas.js: estado final, CORREGIR / MANTENER, motivo técnico, indicación, apertura, clic y
 * origen. Alimenta «Correos por corregir» y «Detalle por correo».
 *
 * DECISIÓN DE KEILY (23/11/2026): los correos se muestran SIN inicio de sesión, en todos los ambientes
 * (docs/marketing/v2/DECISIONES.md). Interruptor de servidor MKT_MOSTRAR_CORREOS: si NO existe o vale «si», se
 * muestran; con «no» la ruta devuelve solo el número de filas, sin correos.
 *
 * Nunca devuelve el texto original del motivo (puede traer correos), ni IP, ni enlaces. Nunca se guarda en la caché
 * de Vercel (no-store) y pide no indexarse.
 */
import { cruzarFilas, indiceCumplimiento } from '../clientes/cruce.js'
import { leerEventos } from '../mktSupabase.js'
import { estadoApertura, estadoClic, estadoFinal, ESTADOS, statusCorreo } from './reglas.js'
import { leerParametroCampanas } from './resumen.js'

export const DETALLE_CACHE_MS = 2 * 60 * 1000
const MAX_COPIAS = 30

/** ¿Se muestran los correos? Por defecto sí; solo «no» (o «false» / «0») los oculta. */
export function mostrarCorreos(env = process.env) {
  const v = String(env?.MKT_MOSTRAR_CORREOS ?? 'si').trim().toLowerCase()
  return !['no', 'false', '0'].includes(v)
}

/** Qué hacer con la dirección (MAILING.md 4.2 y 4.3; tabla aprobada por Keily el 23/11/2026). */
export function indicacion({ estado, status, motivoTecnico, categoria }) {
  if (estado !== 'rebote_temporal' && estado !== 'rebote_permanente') return 'Sin acción'
  if (status === 'CORREGIR') {
    return motivoTecnico === 'Dominio sin registros MX'
      ? 'Verificar el dominio y confirmar la dirección'
      : 'Pedir o confirmar la dirección correcta (es revisión, no prueba de que no exista)'
  }
  switch (categoria) {
    case 'Conectividad': return 'Reintentar después'
    case 'Capacidad de buzón': return 'Pedir que libere espacio y reintentar'
    case 'Autenticación':
    case 'Restricción de servidor': return 'Revisar autenticación y permisos SMTP'
    case 'Bloqueo de recepción':
    case 'Restricción de seguridad':
    case 'Bloqueo de seguridad': return 'Revisar reputación, autenticación y filtros del destinatario'
    case 'Restricción de entrega': return 'Revisar la política o ruta del servidor de destino'
    default: return 'Revisar en el próximo envío'
  }
}

const ISO = (t) => (Number.isFinite(t) ? new Date(t).toISOString() : null)

/** Una fila del detalle a partir de los eventos de UN correo en UNA campaña. */
export function filaDetalle(eventos) {
  const final = estadoFinal(eventos)
  const s = statusCorreo(final)
  const tipos = new Set(eventos.map((e) => e.evento))
  const origenes = new Set(eventos.map((e) => (e.origen === 'historial' ? 'historial' : 'webhook')))
  const tiempos = (filtro) => eventos.filter(filtro).map((e) => Date.parse(e.fecha_evento)).filter(Number.isFinite)
  const rebote = final.estado === 'rebote_temporal' ? 'soft_bounce' : final.estado === 'rebote_permanente' ? 'hard_bounce' : null
  const envio = eventos.map((e) => Date.parse(e.fecha_envio)).filter(Number.isFinite)
  return {
    correo: eventos[0].correo,
    campana_id: Number(eventos[0].campana_id),
    estado: final.estado,
    estadoTexto: ESTADOS[final.estado],
    status: s.status,
    motivoTecnico: s.motivoTecnico,
    categoria: s.categoria,
    indicacion: indicacion({ estado: final.estado, ...s }),
    apertura: estadoApertura({ conFecha: tipos.has('opened'), automaticas: tipos.has('apple_mpp') ? 1 : 0 }),
    clic: estadoClic(tipos.has('click') ? 1 : 0),
    baja: tipos.has('unsubscribe'),
    spam: tipos.has('spam'),
    origen: origenes.size > 1 ? 'ambos' : [...origenes][0],
    fechaEnvio: envio.length ? ISO(Math.min(...envio)) : null,
    fechaRebote: rebote ? ISO(Math.max(...tiempos((e) => e.evento === rebote))) : null,
    ultimoEvento: ISO(Math.max(...tiempos(() => true))),
  }
}

/** Todas las filas del detalle (una por correo y campaña), ordenadas por campaña y correo. */
export function armarDetalle(eventos = []) {
  const grupos = new Map()
  for (const e of eventos) {
    const clave = `${e.campana_id}|${e.correo}`
    const lista = grupos.get(clave)
    if (lista) lista.push(e)
    else grupos.set(clave, [e])
  }
  return [...grupos.values()].map(filaDetalle)
    .sort((a, b) => b.campana_id - a.campana_id || a.correo.localeCompare(b.correo))
}

const copias = new Map()
/** Solo para pruebas. */
export function vaciarCacheDetalle() { copias.clear() }

function respuesta(status, datos, extra = {}) {
  return {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', ...extra },
    body: JSON.stringify(datos),
  }
}

/**
 * Atiende GET /api/marketing/mailing/detalle (?campanas=12,13 opcional).
 * @param {{method: string, query?: {campanas?: string}, env?: object, fetchFn?: Function, leer?: Function, ahora?: number}} p
 */
export async function responderDetalle({ method, query = {}, env = process.env, fetchFn = fetch, leer = leerEventos, indice = indiceCumplimiento, ahora = Date.now() }) {
  if (method !== 'GET') return respuesta(405, { error: 'Método no permitido. Usa GET.' }, { Allow: 'GET' })
  let campanas
  try {
    campanas = leerParametroCampanas(query.campanas)
  } catch (err) {
    return respuesta(err.status ?? 400, { error: err.message })
  }
  const clave = campanas ? campanas.join(',') : '*'
  let filas
  const copia = copias.get(clave)
  if (copia && copia.vence > ahora) filas = copia.filas
  else {
    try {
      filas = armarDetalle(await leer({ campanas, env, fetchFn }))
      if (copias.size >= MAX_COPIAS) copias.delete(copias.keys().next().value)
      copias.set(clave, { filas, vence: ahora + DETALLE_CACHE_MS })
    } catch (err) {
      const mensaje = String(err?.message || '')
      console.warn('[Mailing] detalle:', mensaje.replace(/[^\s@]+@[^\s@]+/g, '[correo]'))
      if (/faltan las variables|no es una dirección|debe ser https/.test(mensaje)) return respuesta(503, { error: 'Falta configurar la conexión con Supabase en el servidor.' })
      if (/no respondió/.test(mensaje)) return respuesta(504, { error: 'Supabase no respondió a tiempo.' })
      return respuesta(502, { error: 'No se pudo leer el detalle por correo.' })
    }
  }
  const base = { actualizado: new Date(ahora).toISOString(), campanasConsultadas: campanas, total: filas.length }
  if (!mostrarCorreos(env)) return respuesta(200, { ...base, mostrarCorreos: false, filas: [], aviso: 'Los correos están ocultos (MKT_MOSTRAR_CORREOS = no).' })

  // Cruce con Cumplimiento de Clientes (SOLO LECTURA). Si falla, el detalle sigue sin Cliente/Ejecutivo y avisa.
  let cruce = 'ok'
  let avisoCruce = null
  try {
    filas = cruzarFilas(filas, await indice({ env }))
  } catch (err) {
    const mensaje = String(err?.message || '')
    const sinConfigurar = /CC_DB_PASSWORD/.test(mensaje)
    cruce = sinConfigurar ? 'sin_configurar' : 'error'
    avisoCruce = sinConfigurar ? 'Falta configurar CC_DB_PASSWORD en el servidor.' : 'No se pudo leer Cumplimiento de Clientes; Cliente y Ejecutivo quedan sin llenar.'
    console.warn('[Mailing] cruce con Cumplimiento:', avisoCruce)
    filas = filas.map((f) => ({ ...f, clientes: null, posibles: null }))
  }
  return respuesta(200, { ...base, mostrarCorreos: true, cruce, avisoCruce, filas })
}
