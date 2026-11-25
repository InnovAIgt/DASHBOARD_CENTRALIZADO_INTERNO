/**
 * Canales de marketing · Redes sociales: cliente de la API de Meta (Graph API), SOLO LECTURA (docs/marketing/v2/REDES.md).
 *
 * Solo servidor. Variables (sin VITE_): META_TOKEN (usuario del sistema de solo lectura), META_APP_SECRET (firma
 * appsecret_proof de cada consulta) y META_API_VERSION (opcional). Solo hace GET; nunca escribe en Meta.
 * Los mensajes de error nunca incluyen el token, la firma ni el texto crudo de Meta.
 */
import { createHmac } from 'node:crypto'

/** Versión de la API si no se fija META_API_VERSION (probada en la parte (1) de REDES.md, 24/11/2026). */
export const VERSION_META = 'v25.0'
export const META_ESPERA_MS = 12_000
export const MAX_PAGINAS = 10

/** Error de Meta ya clasificado: tipo = token | permiso | limite | sin_token | otro. */
export class ErrorMeta extends Error {
  constructor(tipo, mensaje, codigo = null) {
    super(mensaje)
    this.name = 'ErrorMeta'
    this.tipo = tipo
    this.codigo = codigo
  }
}

const CODIGOS_LIMITE = new Set([4, 17, 32, 613, 80001, 80002, 80004, 80005, 80006, 80008, 80014])

/** Convierte el error que devuelve Meta en un ErrorMeta con un mensaje claro (sin el texto crudo). */
export function clasificarError(error = {}, status = 0) {
  const codigo = Number(error.code)
  if (codigo === 190 || status === 401) return new ErrorMeta('token', 'El acceso a Meta venció o no es válido: hay que generar un token nuevo.', codigo || status)
  if (CODIGOS_LIMITE.has(codigo) || status === 429) return new ErrorMeta('limite', 'Meta limitó las consultas por un rato: se reintenta más tarde.', codigo || status)
  if (codigo === 10 || (codigo >= 200 && codigo < 300) || codigo === 3 || status === 403) {
    const permiso = String(error.message ?? '').match(/\b(pages_[a-z_]+|instagram_[a-z_]+|ads_[a-z_]+|read_insights|business_management)\b/)?.[1]
    return new ErrorMeta('permiso', permiso ? `Falta el permiso ${permiso} en el token de Meta.` : 'Al token de Meta le falta un permiso para esta consulta.', codigo || status)
  }
  return new ErrorMeta('otro', `Meta respondió con un error${codigo ? ` (código ${codigo})` : status ? ` (HTTP ${status})` : ''}.`, codigo || status || null)
}

/** Token, firma y versión. Sin META_TOKEN lanza ErrorMeta «sin_token» (la pantalla usa los datos de ejemplo). */
export function configuracionMeta(env = process.env, tokenPagina = null) {
  // tokenPagina: token de una página (se pide con el del usuario del sistema; las métricas de página lo exigen).
  const token = String(tokenPagina ?? env?.META_TOKEN ?? '').trim()
  if (!token) throw new ErrorMeta('sin_token', 'Todavía no hay token de Meta (META_TOKEN).')
  const secreto = String(env?.META_APP_SECRET ?? '').trim()
  const version = String(env?.META_API_VERSION ?? '').trim() || VERSION_META
  if (!/^v\d+\.\d+$/.test(version)) throw new ErrorMeta('otro', 'META_API_VERSION no tiene la forma vNN.N.')
  const prueba = secreto ? createHmac('sha256', secreto).update(token).digest('hex') : null
  return { token, prueba, version }
}

/**
 * GET a la Graph API. ruta = «/{id}/published_posts», parametros = { fields, since, … }.
 * Devuelve el JSON de Meta; si Meta responde con error, lanza ErrorMeta.
 */
export async function llamarMeta(ruta, parametros = {}, opciones = {}) {
  const esperas = opciones.esperasReintento ?? ESPERAS_REINTENTO
  for (let intento = 0; ; intento++) {
    // Con un límite de tiempo (opciones.hasta, en ms), cada intento solo usa lo que queda.
    const queda = opciones.hasta ? opciones.hasta - Date.now() : Infinity
    if (queda <= 500) throw new ErrorMeta('otro', 'Meta tardó demasiado: se acabó el tiempo de esta consulta.')
    try {
      return await llamarMetaUnaVez(ruta, parametros, { ...opciones, esperaMs: Math.min(opciones.esperaMs ?? META_ESPERA_MS, queda) })
    } catch (err) {
      // Reintento con espera (1 s, 3 s) cuando Meta da un error pasajero (códigos 1, 2, 4, 17) o tarda demasiado.
      const pasajero = err instanceof ErrorMeta && (CODIGOS_REINTENTO.has(Number(err.codigo)) || err.espera)
      const espera = esperas[intento]
      if (!pasajero || espera === undefined || (opciones.hasta && Date.now() + espera + 500 > opciones.hasta)) throw err
      await new Promise((listo) => setTimeout(listo, espera))
    }
  }
}

/** Errores pasajeros de Meta que se reintentan: 1 (error desconocido), 2 (servicio no disponible), 4 y 17 (límite). */
export const CODIGOS_REINTENTO = new Set([1, 2, 4, 17])
export const ESPERAS_REINTENTO = [1000, 3000]

async function llamarMetaUnaVez(ruta, parametros = {}, { env = process.env, fetchFn = fetch, esperaMs = META_ESPERA_MS, tokenPagina = null } = {}) {
  if (!String(env?.META_TOKEN ?? '').trim()) throw new ErrorMeta('sin_token', 'Todavía no hay token de Meta (META_TOKEN).')
  const { token, prueba, version } = configuracionMeta(env, tokenPagina)
  const url = new URL(`https://graph.facebook.com/${version}${ruta.startsWith('/') ? ruta : `/${ruta}`}`)
  for (const [k, v] of Object.entries(parametros)) if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v))
  url.searchParams.set('access_token', token)
  if (prueba) url.searchParams.set('appsecret_proof', prueba)
  const control = new AbortController()
  const reloj = setTimeout(() => control.abort(), esperaMs)
  try {
    const r = await fetchFn(url.href, { method: 'GET', headers: { Accept: 'application/json' }, signal: control.signal })
    const datos = await r.json().catch(() => null)
    if (!r.ok || datos?.error) throw clasificarError(datos?.error ?? {}, r.status)
    return datos ?? {}
  } catch (err) {
    if (err instanceof ErrorMeta) throw err
    if (err?.name === 'AbortError') throw Object.assign(new ErrorMeta('otro', `Meta no respondió en ${esperaMs / 1000} s.`), { espera: true })
    throw new ErrorMeta('otro', 'No se pudo llamar a Meta.')
  } finally {
    clearTimeout(reloj)
  }
}

/** Todas las páginas de una lista de Meta (data + paging.cursors.after), hasta MAX_PAGINAS (u opciones.maxPaginas). */
export async function llamarMetaTodo(ruta, parametros = {}, opciones = {}) {
  const filas = []
  let despues = null
  for (let i = 0; i < (opciones.maxPaginas ?? MAX_PAGINAS); i++) {
    const datos = await llamarMeta(ruta, { limit: 100, ...parametros, ...(despues ? { after: despues } : {}) }, opciones)
    filas.push(...(Array.isArray(datos.data) ? datos.data : []))
    despues = datos.paging?.next ? datos.paging?.cursors?.after ?? null : null
    if (!despues) break
  }
  return filas
}
