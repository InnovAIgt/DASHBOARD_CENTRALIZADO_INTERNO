/**
 * Canales de marketing · recibe los avisos (webhooks de marketing) de Brevo y los guarda.
 *
 *   POST /api/marketing/brevo-webhook
 *
 * Brevo llama a esta ruta cada vez que pasa algo con un correo de una campaña (entregado, abierto,
 * clic, rebote temporal, rebote permanente, spam, baja…). Cada evento se guarda en la tabla
 * mkt_brevo_eventos del proyecto Supabase «Dashboard Canales de marketing» (server/mktSupabase.js).
 *
 * Seguridad:
 *  - La clave secreta va en la variable de servidor BREVO_WEBHOOK_SECRET (sin VITE_). Brevo la manda
 *    en el encabezado x-webhook-token o como usuario:clave dentro de la dirección (Basic auth).
 *  - Sin la clave correcta se responde 401 y no se guarda nada.
 *  - Nunca se escriben correos ni la clave en la respuesta ni en el registro: solo conteos.
 *
 * Reintentos de Brevo (documentación oficial): si la ruta no responde, Brevo reintenta 4 veces
 * (10 min, 1 h, 2 h y 8 h); un 4xx distinto de 429 o un 5xx hacen que Brevo descarte el aviso.
 * Por eso, cuando el fallo es nuestro (variables faltantes, Supabase caído o en pausa) se responde
 * 429: es el único código de error con el que Brevo vuelve a intentar.
 *
 * La usan api/marketing/brevo-webhook.js (Vercel) y server.ts (local / Docker).
 * Documentación: docs/marketing/v2/MAILING.md, secciones 10.1 y 10.2.
 */
import { createHash, timingSafeEqual } from 'node:crypto'
import { guardarEventos } from './mktSupabase.js'

/** Tamaño máximo aceptado de un aviso (Brevo manda lotes de hasta 500 eventos). */
export const WEBHOOK_MAX_BYTES = 1_000_000

/** Clave recibida: encabezado x-webhook-token o contraseña de Basic auth (usuario:clave@ en la dirección). */
export function claveRecibida(headers = {}) {
  const token = headers['x-webhook-token']
  if (typeof token === 'string' && token.trim()) return token.trim()
  const auth = headers.authorization
  if (typeof auth === 'string' && /^basic\s+/i.test(auth)) {
    try {
      const texto = Buffer.from(auth.replace(/^basic\s+/i, '').trim(), 'base64').toString('utf8')
      const i = texto.indexOf(':')
      if (i >= 0 && texto.slice(i + 1)) return texto.slice(i + 1)
    } catch { /* clave ausente */ }
  }
  return ''
}

/** Compara las claves sin dar pistas por el tiempo de respuesta. */
export function claveCorrecta(recibida, esperada) {
  if (!recibida || !esperada) return false
  const a = createHash('sha256').update(String(recibida)).digest()
  const b = createHash('sha256').update(String(esperada)).digest()
  return timingSafeEqual(a, b)
}

/** Fecha de Brevo (segundos o milisegundos desde 1970, UTC) → ISO; null si no sirve. */
function fechaIso(valor) {
  const n = Number(valor)
  if (!Number.isFinite(n) || n <= 0) return null
  const d = new Date(n > 1e12 ? n : n * 1000)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

/** Huella única (cifrada) de un evento: evento|campaña|correo|fecha. Evita guardar dos veces el mismo. */
export function huellaDe({ evento, campana_id, correo, fecha_evento }) {
  return createHash('sha256').update(`${evento}|${campana_id}|${correo}|${fecha_evento}`).digest('hex')
}

/** Marca que se guarda en lugar de un enlace de baja (su token podría dar de baja a otra persona). */
export const ENLACE_DE_BAJA = 'ENLACE_DE_BAJA'

/** ¿Es un enlace para darse de baja? (Brevo y textos comunes en español e inglés) */
export function esEnlaceBaja(url) {
  return /unsubscri|unsub\b|\/unsub\/|optout|opt-out|desuscri|darse-de-baja|darse_de_baja|\/baja\b|cancelar-suscripcion|preferences?\/?$/i.test(String(url ?? ''))
}

/**
 * Destino del clic, limpio: solo dominio + ruta, SIN lo que va después de «?» ni de «#» (ahí suelen ir datos de la
 * persona o códigos de seguimiento). Los enlaces de baja se guardan como ENLACE_DE_BAJA. Si no es una URL, null.
 */
export function limpiarUrl(url) {
  const texto = String(url ?? '').trim()
  if (!texto) return null
  if (esEnlaceBaja(texto)) return ENLACE_DE_BAJA
  try {
    const u = new URL(texto)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    const base = `${u.protocol}//${u.host}${u.pathname === '/' ? '' : u.pathname}`
    // Excepción aprobada por Keily (23/11/2026): en YouTube se conserva SOLO el parámetro v (el ID del video), que no
    // es un dato de la persona. youtu.be ya lleva el ID en la ruta.
    // Solo los caracteres válidos de un ID de YouTube (Brevo a veces agrega un «=» al final del enlace).
    const video = /(^|\.)youtube\.com$/i.test(u.hostname) ? (u.searchParams.get('v') ?? '').match(/^[A-Za-z0-9_-]+/)?.[0] : null
    return video ? `${base}?v=${video}` : base
  } catch {
    return null
  }
}

/**
 * Convierte un evento de Brevo en una fila de mkt_brevo_eventos, o null si no es de una campaña
 * (sin campaña, sin correo o sin fecha; por ejemplo contact_updated o list_addition).
 * El nombre del evento NO se limita: si Brevo manda uno nuevo, se guarda igual y se filtra después.
 * En los clics se guarda el destino LIMPIO (limpiarUrl; decisión de Keily, 23/11/2026, columna url del SQL 003).
 * No se guardan la IP de envío, segmentos ni listas.
 */
export function filaDeEvento(e) {
  if (!e || typeof e !== 'object' || Array.isArray(e)) return null
  const evento = typeof e.event === 'string' ? e.event.trim().toLowerCase() : ''
  const campana = Number(e.camp_id)
  const correo = typeof e.email === 'string' ? e.email.trim().toLowerCase() : ''
  const fecha_evento = fechaIso(e.ts_event ?? e.ts)
  if (!evento || !Number.isSafeInteger(campana) || campana <= 0 || !correo.includes('@') || !fecha_evento) return null
  const fila = {
    evento,
    campana_id: campana,
    correo,
    fecha_evento,
    fecha_envio: fechaIso(e.ts_sent),
    motivo: typeof e.reason === 'string' && e.reason.trim() ? e.reason.trim() : null,
  }
  // La huella no incluye la URL: un reintento del mismo clic sigue siendo el mismo evento.
  return { huella: huellaDe(fila), ...fila, url: evento === 'click' ? limpiarUrl(e.URL ?? e.url ?? e.link) : null }
}

function respuesta(status, datos, extra = {}) {
  return {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra },
    body: JSON.stringify(datos),
  }
}

/** Fallo nuestro: 429 para que Brevo vuelva a intentar más tarde. */
function reintentar(error) {
  return respuesta(429, { error }, { 'Retry-After': '600' })
}

/**
 * Atiende un aviso de Brevo.
 * @param {{method: string, headers?: object, body?: unknown, env?: object, guardar?: Function}} p
 *   headers: con nombres en minúsculas (como los dan Express y Vercel).
 *   body: el JSON ya leído (objeto o lista) o el texto sin leer.
 *   guardar: (filas, {env}) => Promise<{guardados: number}>; por defecto, guardarEventos de mktSupabase.js.
 * @returns {Promise<{status: number, headers: Record<string,string>, body: string}>}
 */
export async function procesarWebhookBrevo({ method, headers = {}, body, env = process.env, guardar = guardarEventos }) {
  if (method !== 'POST') return respuesta(405, { error: 'Método no permitido. Usa POST.' }, { Allow: 'POST' })

  const esperada = String(env?.BREVO_WEBHOOK_SECRET ?? '').trim()
  if (!esperada) {
    console.warn('[Brevo webhook] falta la variable BREVO_WEBHOOK_SECRET; Brevo reintentará.')
    return reintentar('El servidor no está configurado.')
  }
  if (!claveCorrecta(claveRecibida(headers), esperada)) {
    console.warn('[Brevo webhook] intento rechazado: clave ausente o incorrecta.')
    return respuesta(401, { error: 'No autorizado.' })
  }

  if (Number(headers['content-length']) > WEBHOOK_MAX_BYTES) return respuesta(413, { error: 'Aviso demasiado grande.' })

  let datos = body
  if (typeof datos === 'string' || Buffer.isBuffer(datos)) {
    if (Buffer.byteLength(datos) > WEBHOOK_MAX_BYTES) return respuesta(413, { error: 'Aviso demasiado grande.' })
    try { datos = JSON.parse(String(datos)) } catch { datos = undefined }
  }
  if (!datos || typeof datos !== 'object') return respuesta(400, { error: 'Se esperaba un evento o una lista de eventos en JSON.' })

  const eventos = Array.isArray(datos) ? datos : [datos]
  const unicas = new Map()
  for (const e of eventos) {
    const fila = filaDeEvento(e)
    if (fila && !unicas.has(fila.huella)) unicas.set(fila.huella, fila)
  }
  const filas = [...unicas.values()]
  const resumen = { recibidos: eventos.length, guardados: 0, ignorados: eventos.length - filas.length }
  if (!filas.length) return respuesta(200, resumen)

  try {
    const { guardados } = await guardar(filas, { env })
    resumen.guardados = guardados
    resumen.ignorados = eventos.length - guardados
    return respuesta(200, resumen)
  } catch (err) {
    console.warn('[Brevo webhook] no se pudo guardar; Brevo reintentará:', err?.message || 'error desconocido')
    return reintentar('No se pudo guardar el aviso; se reintentará.')
  }
}
