/**
 * Canales de marketing · Redes sociales: rutas del servidor (REDES.md, sección 5). SOLO LECTURA de Meta.
 *
 *   GET /api/marketing/redes/cuentas         → cuentas y seguidores (+ cuentas publicitarias con su moneda)
 *   GET /api/marketing/redes/publicaciones   → publicaciones hechas del mes pedido y del anterior (?mes=AAAA-MM)
 *   GET /api/marketing/redes/programadas     → programadas de Facebook (scheduled_posts)
 *   GET /api/marketing/redes/anuncios        → resultados por campaña del mes y del anterior (fase 2)
 *
 * Sin META_TOKEN responden 200 con { fuente: 'sin_token' } y la pantalla usa los datos de ejemplo.
 * Caché de 30 min en memoria por recurso y mes; si Meta falla y hay caché, se devuelven los datos guardados con aviso.
 * Si una cuenta falla, las demás siguen (aviso con el nombre de la marca). Nunca se devuelven tokens ni texto crudo.
 */
import { CUADRO_MARCAS, cuadroListo, cuentasDelCuadro } from './cuadroMarcas.js'
import { ErrorMeta, llamarMeta, llamarMetaTodo } from './meta.js'
import { anunciosCuenta, cuentaDashboard, METRICAS, mesAnterior, programadasFacebook, publicacionesFacebook, publicacionesInstagram, rangoMes } from './transformar.js'

export const RECURSOS = ['cuentas', 'publicaciones', 'programadas', 'anuncios']
export const CACHE_MS = 30 * 60 * 1000
const CABECERAS = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300' }
const SIN_CACHE = { ...CABECERAS, 'Cache-Control': 'no-store' }
const cache = new Map()
export const vaciarCacheRedes = () => cache.clear()

const responder = (status, cuerpo, cabeceras = CABECERAS) => ({ status, headers: cabeceras, body: JSON.stringify(cuerpo) })
const mesGt = (ahora) => new Date(ahora.getTime() - 6 * 3600 * 1000).toISOString().slice(0, 7)

const CAMPOS_FB = ['id', 'created_time', 'message', 'permalink_url', 'status_type', 'scheduled_publish_time', 'attachments{media_type,type}',
  'reactions.summary(total_count).limit(0)', 'comments.summary(total_count).limit(0)', 'shares', `insights.metric(${METRICAS.alcanceFacebook})`].join(',')
const CAMPOS_IG = ['id', 'timestamp', 'caption', 'media_type', 'media_product_type', 'permalink', 'like_count', 'comments_count',
  `insights.metric(${METRICAS.instagram.join(',')})`].join(',')

/** Token de la página (lo exigen las métricas de página), pedido con el token del usuario del sistema. */
async function tokenDePagina(id, op) {
  const d = await llamarMeta(`/${id}`, { fields: 'access_token' }, op)
  if (!d.access_token) throw new ErrorMeta('permiso', 'El usuario del sistema no tiene acceso a esta página.')
  return d.access_token
}

/** Las consultas de cada recurso, cuenta por cuenta. Devuelve { datos, avisos }. */
const LECTORES = {
  async cuentas(cuentas, _mes, op) {
    return porCuenta(cuentas.filter((c) => c.red !== 'ads'), async (c) => {
      const d = c.red === 'fb'
        ? await llamarMeta(`/${c.id}`, { fields: 'name,followers_count,fan_count' }, op)
        : await llamarMeta(`/${c.id}`, { fields: 'username,followers_count' }, op)
      return [cuentaDashboard(d, c, CUADRO_MARCAS[c.marca]?.nombre ?? d.name ?? d.username)]
    })
  },
  async publicaciones(cuentas, mes, op) {
    const desde = rangoMes(mesAnterior(mes)).since
    const hasta = rangoMes(mes).until
    return porCuenta(cuentas.filter((c) => c.red !== 'ads'), async (c) => {
      if (c.red === 'fb') {
        const tokenPagina = await tokenDePagina(c.id, op)
        return publicacionesFacebook(await llamarMetaTodo(`/${c.id}/published_posts`, { fields: CAMPOS_FB, since: desde, until: hasta }, { ...op, tokenPagina }), c)
      }
      return publicacionesInstagram(await llamarMetaTodo(`/${c.id}/media`, { fields: CAMPOS_IG, since: desde, until: hasta }, op), c)
    })
  },
  async programadas(cuentas, _mes, op) {
    return porCuenta(cuentas.filter((c) => c.red === 'fb'), async (c) => {
      const tokenPagina = await tokenDePagina(c.id, op)
      return programadasFacebook(await llamarMetaTodo(`/${c.id}/scheduled_posts`, { fields: 'id,message,scheduled_publish_time,created_time' }, { ...op, tokenPagina }), c)
    })
  },
  async anuncios(cuentas, mes, op) {
    const since = `${mesAnterior(mes)}-01`
    const [a, m] = mes.split('-').map(Number)
    const until = new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10)
    return porCuenta(cuentas.filter((c) => c.red === 'ads'), async (c) => {
      const [cuenta, campanas, insights] = await Promise.all([
        llamarMeta(`/act_${c.id}`, { fields: 'name,currency' }, op),
        llamarMetaTodo(`/act_${c.id}/campaigns`, { fields: 'id,name,daily_budget,lifetime_budget,effective_status' }, op),
        llamarMetaTodo(`/act_${c.id}/insights`, { level: 'campaign', time_increment: 'monthly', time_range: { since, until },
          fields: 'campaign_id,campaign_name,spend,reach,impressions,clicks,actions' }, op),
      ])
      return anunciosCuenta(insights, campanas, cuenta, c)
    })
  },
}

/** Corre la lectura de cada cuenta por separado: si una falla, las demás siguen. */
async function porCuenta(cuentas, leer) {
  const resultados = await Promise.allSettled(cuentas.map(leer))
  const datos = []
  const avisos = []
  const errores = []
  resultados.forEach((r, i) => {
    if (r.status === 'fulfilled') datos.push(...r.value)
    else {
      const c = cuentas[i]
      errores.push(r.reason)
      avisos.push(`${CUADRO_MARCAS[c.marca]?.nombre ?? c.marca} (${c.red === 'fb' ? 'Facebook' : c.red === 'ig' ? 'Instagram' : 'anuncios'}): ${r.reason?.message ?? 'no se pudo leer'}`)
    }
  })
  // Si fallaron TODAS y por el mismo motivo grave (token, permiso, límite), se informa como error de la ruta.
  if (cuentas.length && errores.length === cuentas.length) throw errores.find((e) => e?.tipo === 'token') ?? errores.find((e) => e?.tipo === 'limite') ?? errores[0]
  return { datos, avisos }
}

const CLAVE_DATOS = { cuentas: 'cuentas', publicaciones: 'publicaciones', programadas: 'programadas', anuncios: 'anuncios' }

/**
 * @param {{recurso: string, method: string, query?: {mes?: string}, env?: object, fetchFn?: Function, ahora?: () => Date, cuadro?: object}} p
 */
export async function responderRedes({ recurso, method, query = {}, env = process.env, fetchFn = fetch, ahora = () => new Date(), cuadro = CUADRO_MARCAS }) {
  if (method !== 'GET') return responder(405, { error: 'Solo GET' }, SIN_CACHE)
  if (!RECURSOS.includes(recurso)) return responder(404, { error: 'Recurso desconocido' }, SIN_CACHE)
  const mes = query.mes ? String(query.mes) : mesGt(ahora())
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) return responder(400, { error: 'mes debe tener la forma AAAA-MM' }, SIN_CACHE)
  if (!String(env?.META_TOKEN ?? '').trim()) {
    return responder(200, { fuente: 'sin_token', aviso: 'Todavía no hay token de Meta: se muestran datos de ejemplo.' }, SIN_CACHE)
  }
  if (!cuadroListo(cuadro)) return responder(503, { error: 'Falta el cuadro de cuentas de Meta (server/redes/cuadroMarcas.js, parte 1 de REDES.md).' }, SIN_CACHE)

  const clave = `${recurso}|${mes}`
  const guardado = cache.get(clave)
  if (guardado && ahora().getTime() - guardado.en < CACHE_MS) return responder(200, guardado.cuerpo)
  try {
    const { datos, avisos } = await LECTORES[recurso](cuentasDelCuadro(cuadro), mes, { env, fetchFn })
    const cuerpo = { fuente: 'meta', actualizado: ahora().toISOString(), hoy: new Date(ahora().getTime() - 6 * 3600 * 1000).toISOString().slice(0, 10),
      meses: recurso === 'cuentas' || recurso === 'programadas' ? [mes] : [mes, mesAnterior(mes)], avisos, [CLAVE_DATOS[recurso]]: datos }
    cache.set(clave, { en: ahora().getTime(), cuerpo })
    return responder(200, cuerpo)
  } catch (err) {
    const e = err instanceof ErrorMeta ? err : new ErrorMeta('otro', 'No se pudieron leer los datos de Meta.')
    console.error(`[Redes ${recurso}] ${e.tipo}: ${e.message}`)
    if (guardado) {
      const hora = new Date(guardado.en - 6 * 3600 * 1000).toISOString().slice(11, 16)
      return responder(200, { ...guardado.cuerpo, avisos: [...(guardado.cuerpo.avisos ?? []), `${e.message} Se muestran los datos guardados de las ${hora}.`] })
    }
    const status = e.tipo === 'limite' ? 429 : e.tipo === 'token' || e.tipo === 'permiso' ? 502 : 502
    return responder(status, { error: e.message, tipo: e.tipo }, SIN_CACHE)
  }
}
