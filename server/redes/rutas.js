/**
 * Canales de marketing · Redes sociales: rutas del servidor (REDES.md, sección 5). SOLO LECTURA de Meta.
 *
 *   GET /api/marketing/redes/cuentas         → cuentas, seguidores y métricas de cuenta del mes y del anterior
 *   GET /api/marketing/redes/publicaciones   → publicaciones hechas del mes pedido y del anterior (?mes=AAAA-MM)
 *   GET /api/marketing/redes/programadas     → programadas de Facebook (scheduled_posts)
 *   GET /api/marketing/redes/anuncios        → resultados por campaña del mes y del anterior (fase 2)
 *
 * Sin META_TOKEN responden 200 con { fuente: 'sin_token' } y la pantalla usa los datos de ejemplo.
 * Caché de 30 min en memoria por recurso y mes; si Meta falla y hay caché, se devuelven los datos guardados con aviso.
 * Si una cuenta falla, las demás siguen (aviso con el nombre de la marca). Nunca se devuelven tokens ni texto crudo.
 */
import { CUADRO_MARCAS, cuadroListo, cuentasDelCuadro, marcaPorCuenta } from './cuadroMarcas.js'
import { ErrorMeta, llamarMeta, llamarMetaTodo } from './meta.js'
import { esReclutamiento } from './reclutamiento.js'
import { leerDetalle } from './detalleAnuncios.js'
import { ESTADOS_ANUNCIO } from './transformar.js'
import { alcancePorDia, anunciosPorPagina, cuentaDashboard, paginaDelAnuncio, METRICAS, mesAnterior, metricasInstagram, metricasPagina, programadasFacebook, publicacionesFacebook, publicacionesInstagram, rangoMes, tramos } from './transformar.js'

export const RECURSOS = ['cuentas', 'publicaciones', 'programadas', 'anuncios', 'anuncios-detalle']
export const CACHE_MS = 30 * 60 * 1000
/** Si alguna cuenta falló (respuesta con avisos), la copia dura poco: se vuelve a intentar pronto. */
export const CACHE_CON_AVISOS_MS = 2 * 60 * 1000
const CABECERAS = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300' }
const SIN_CACHE = { ...CABECERAS, 'Cache-Control': 'no-store' }
const cache = new Map()
export const vaciarCacheRedes = () => cache.clear()

const responder = (status, cuerpo, cabeceras = CABECERAS) => ({ status, headers: cabeceras, body: JSON.stringify(cuerpo) })
const mesGt = (ahora) => new Date(ahora.getTime() - 6 * 3600 * 1000).toISOString().slice(0, 7)

const CAMPOS_FB = ['id', 'created_time', 'message', 'permalink_url', 'status_type', 'scheduled_publish_time', 'attachments{media_type,type}',
  // Sin reactions/comments.summary: piden pages_read_user_content (24/11/2026). Las reacciones salen de las estadísticas.
  'shares', `insights.metric(${METRICAS.facebookPost.join(',')})`].join(',')
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
  // Seguidores + métricas de cuenta del mes y del anterior (REDES.md, 2.1). Rango hasta «ahora» como máximo.
  async cuentas(cuentas, mes, op) {
    const meses = [mes, mesAnterior(mes)]
    const ahoraS = Math.floor(op.ahoraMs / 1000)
    const rango = (m) => { const r = rangoMes(m); return { since: r.since, until: Math.min(r.until, ahoraS) } }
    return porCuenta(cuentas.filter((c) => c.red !== 'ads'), async (c) => {
      const nombre = (d) => CUADRO_MARCAS[c.marca]?.nombre ?? d.name ?? d.username
      if (c.red === 'fb') {
        const tokenPagina = await tokenDePagina(c.id, op)
        const opPagina = { ...op, tokenPagina }
        const { since } = rango(meses[1])
        const { until } = rango(mes)
        const [d, ins] = await Promise.all([
          llamarMeta(`/${c.id}`, { fields: 'name,followers_count,fan_count' }, opPagina),
          until > since ? llamarMeta(`/${c.id}/insights`, { metric: METRICAS.facebookPagina.join(','), period: 'day', since, until }, opPagina) : { data: [] },
        ])
        const metricas = metricasPagina(ins.data ?? [], meses)
        const cuenta = cuentaDashboard(d, c, nombre(d), metricas)
        cuenta.alcancePorDia = alcancePorDia(ins.data ?? [], 'page_total_media_view_unique')
        // Seguidores de Facebook: último valor de page_follows del mes; si Meta no lo da, followers_count.
        cuenta.seguidores = metricas[mes]?.seguidores ?? cuenta.seguidores
        return [cuenta]
      }
      const d = await llamarMeta(`/${c.id}`, { fields: 'username,followers_count' }, op)
      const metricas = {}
      const porDia = {}
      for (const m of meses) {
        const r = rango(m)
        if (r.until <= r.since) { metricas[m] = metricasInstagram([], []); continue }
        const partes = tramos(r.since, r.until)
        const diario = await Promise.all(partes.map((t) => llamarMeta(`/${c.id}/insights`, { metric: METRICAS.instagramCuentaDiaria, period: 'day', metric_type: 'time_series', ...t }, op)))
        const totales = await Promise.all(partes.map((t) => llamarMeta(`/${c.id}/insights`, { metric: METRICAS.instagramCuentaTotal.join(','), period: 'day', metric_type: 'total_value', ...t }, op)))
        metricas[m] = metricasInstagram(diario.flatMap((x) => x.data ?? []), totales.map((x) => x.data ?? []))
        metricas[m].seguidores = m === mes ? Number(d.followers_count) || 0 : null
        Object.assign(porDia, alcancePorDia(diario.flatMap((x) => x.data ?? []), METRICAS.instagramCuentaDiaria))
      }
      return [{ ...cuentaDashboard(d, c, nombre(d), metricas), alcancePorDia: porDia }]
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
    const cuadro = op.cuadro ?? CUADRO_MARCAS
    const marcaDe = marcaPorCuenta(cuadro)
    const paisDe = Object.fromEntries(Object.entries(cuadro).map(([k, v]) => [k, v.pais]))
    // Una cuenta publicitaria aparece una sola vez aunque esté anotada en varias marcas.
    const unicas = [...new Map(cuentas.filter((c) => c.red === 'ads').map((c) => [c.id, c])).values()]
    // Marcas con al menos un anuncio en las cuentas conectadas (de cualquier mes): para decir «no tiene anuncios».
    const marcasConAnuncios = new Set()
    const r = await porCuenta(unicas, async (c) => {
      const [cuenta, campanas, ads, insights] = await Promise.all([
        llamarMeta(`/act_${c.id}`, { fields: 'name,currency' }, op),
        llamarMetaTodo(`/act_${c.id}/campaigns`, { fields: 'id,name,objective,daily_budget,lifetime_budget,effective_status' }, op),
        // Incluye anuncios archivados y borrados, para saber la página de todo lo que gastó.
        llamarMetaTodo(`/act_${c.id}/ads`, { fields: 'id,campaign_id,creative{actor_id,body,object_story_spec{page_id,instagram_user_id,link_data{message},video_data{message}},effective_object_story_id,instagram_user_id}',
          effective_status: ESTADOS_ANUNCIO }, op),
        llamarMetaTodo(`/act_${c.id}/insights`, { level: 'ad', time_increment: 'monthly', time_range: { since, until }, limit: 500,
          fields: 'ad_id,campaign_id,campaign_name,spend,reach,impressions,clicks,actions' }, op),
      ])
      for (const ad of ads) { const m = marcaDe.get(paginaDelAnuncio(ad)); if (m) marcasConAnuncios.add(m) }
      return anunciosPorPagina({ insights, ads, campanas, cuentaAds: cuenta, marcaDe, paisDe, esReclutamiento })
    })
    return { ...r, extra: { marcasConAnuncios: [...marcasConAnuncios].sort() } }
  },
  // Fase 2 de Anuncios (REDES.md, 7.4): solo el mes pedido, sin reclutamiento, por página del anuncio.
  async 'anuncios-detalle'(cuentas, mes, op) {
    const marcaDe = marcaPorCuenta(op.cuadro ?? CUADRO_MARCAS)
    const hoy = new Date(op.ahoraMs - 6 * 3600 * 1000).toISOString().slice(0, 10)
    const unicas = [...new Map(cuentas.filter((c) => c.red === 'ads').map((c) => [c.id, c])).values()]
    const llamar = (ruta, p, o) => llamarMetaTodo(ruta, ruta.endsWith('/ads') ? { ...p, effective_status: ESTADOS_ANUNCIO } : p, o)
    return porCuenta(unicas, async (c) => [await leerDetalle({ cuentaId: c.id, mes, hoy, llamar, llamarUno: llamarMeta, op, marcaDe })])
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

const CLAVE_DATOS = { cuentas: 'cuentas', publicaciones: 'publicaciones', programadas: 'programadas', anuncios: 'anuncios', 'anuncios-detalle': 'detalle' }

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
  const vida = guardado?.cuerpo?.avisos?.length ? CACHE_CON_AVISOS_MS : CACHE_MS
  if (guardado && ahora().getTime() - guardado.en < vida) return responder(200, guardado.cuerpo)
  try {
    const { datos, avisos, extra = {} } = await LECTORES[recurso](cuentasDelCuadro(cuadro), mes, { env, fetchFn, ahoraMs: ahora().getTime(), cuadro })
    const cuerpo = { fuente: 'meta', actualizado: ahora().toISOString(), hoy: new Date(ahora().getTime() - 6 * 3600 * 1000).toISOString().slice(0, 10),
      meses: recurso === 'programadas' || recurso === 'anuncios-detalle' ? [mes] : [mes, mesAnterior(mes)], avisos, [CLAVE_DATOS[recurso]]: datos, ...extra }
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
