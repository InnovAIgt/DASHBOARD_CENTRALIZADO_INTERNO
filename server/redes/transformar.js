/**
 * Canales de marketing · Redes sociales: de las respuestas de Meta a la forma del dashboard (la misma de
 * src/modulos/marketing/marketing-v2/datos/redesEjemplo.js). Funciones puras, probadas con respuestas inventadas.
 *
 * Publicación: { id, cuentaId, marca, pais, red, formato, fecha (AAAA-MM-DD, hora de Guatemala), titulo, estado:
 *   'publicada', alcance, interacciones, enlace, programadaPara (fecha de programación si Meta la da, o null) }
 * Programada (Facebook): { id, cuentaId, marca, pais, red: 'fb', fecha, titulo, fuente: 'facebook' }
 * Anuncio (por campaña y mes): { id, mes, campana, marca, pais, moneda, presupuesto, presupuestoDiario, gastado,
 *   alcance, visualizaciones, clics, mensajes }
 * Nunca se guardan nombres ni datos de personas que comentan o escriben.
 */

/** Métricas de Meta que se piden (se confirman en la parte (1); si Meta cambia un nombre, se cambia solo aquí). */
export const METRICAS = {
  alcanceFacebook: 'post_impressions_unique',
  instagram: ['reach', 'total_interactions'],
  mensajes: 'onsite_conversion.messaging_conversation_started_7d',
}

const MS_GT = 6 * 3600 * 1000 // Guatemala y El Salvador: UTC−6 todo el año

/** Fecha AAAA-MM-DD en hora de Guatemala (Meta da ISO con zona o segundos Unix). */
export function fechaGt(valor) {
  const t = typeof valor === 'number' ? valor * 1000 : Date.parse(valor)
  return Number.isFinite(t) ? new Date(t - MS_GT).toISOString().slice(0, 10) : null
}

/** Primeros 60 caracteres del texto (sin saltos) como título; nunca el texto completo. */
export function tituloDe(texto) {
  const t = String(texto ?? '').replace(/\s+/g, ' ').trim()
  if (!t) return 'Sin texto'
  return t.length > 60 ? `${t.slice(0, 59).trimEnd()}…` : t
}

/** Rango del mes en segundos Unix (hora de Guatemala): { since, until }. */
export function rangoMes(mes) {
  const [a, m] = String(mes).split('-').map(Number)
  const desde = Date.UTC(a, m - 1, 1) + MS_GT
  const hasta = Date.UTC(a, m, 1) + MS_GT
  return { since: Math.floor(desde / 1000), until: Math.floor(hasta / 1000) }
}

/** Mes anterior de AAAA-MM. */
export function mesAnterior(mes) {
  const [a, m] = String(mes).split('-').map(Number)
  const d = new Date(Date.UTC(a, m - 2, 1))
  return d.toISOString().slice(0, 7)
}

const valorInsight = (insights, nombre) => {
  const fila = (insights?.data ?? []).find((x) => x.name === nombre)
  const v = fila?.values?.[0]?.value ?? fila?.total_value?.value
  return Number.isFinite(Number(v)) ? Number(v) : 0
}

function formatoFacebook(post) {
  const tipo = String(post.attachments?.data?.[0]?.media_type ?? post.attachments?.data?.[0]?.type ?? '').toLowerCase()
  if (tipo.includes('album') || tipo.includes('carousel')) return 'carrusel'
  if (tipo.includes('video') || String(post.status_type ?? '').includes('video')) return 'video'
  return 'foto'
}

function formatoInstagram(m) {
  if (m.media_product_type === 'REELS') return 'reel'
  if (m.media_type === 'CAROUSEL_ALBUM') return 'carrusel'
  if (m.media_type === 'VIDEO') return 'video'
  return 'foto'
}

/** Publicaciones de una página de Facebook (published_posts con insights anidados). */
export function publicacionesFacebook(posts = [], cuenta) {
  return posts.map((p) => {
    const interacciones = (Number(p.reactions?.summary?.total_count) || 0) + (Number(p.comments?.summary?.total_count) || 0) + (Number(p.shares?.count) || 0)
    return {
      id: `fb-${p.id}`, cuentaId: `${cuenta.marca}-fb`, marca: cuenta.marca, pais: cuenta.pais, red: 'fb', formato: formatoFacebook(p),
      fecha: fechaGt(p.created_time), titulo: tituloDe(p.message), estado: 'publicada',
      alcance: valorInsight(p.insights, METRICAS.alcanceFacebook), interacciones, enlace: p.permalink_url ?? null,
      programadaPara: p.scheduled_publish_time ? fechaGt(p.scheduled_publish_time) : null,
    }
  }).filter((p) => p.fecha)
}

/** Publicaciones de una cuenta de Instagram (media con insights anidados). Las historias no se cuentan. */
export function publicacionesInstagram(media = [], cuenta) {
  return media.filter((m) => m.media_product_type !== 'STORY').map((m) => {
    const total = valorInsight(m.insights, 'total_interactions')
    return {
      id: `ig-${m.id}`, cuentaId: `${cuenta.marca}-ig`, marca: cuenta.marca, pais: cuenta.pais, red: 'ig', formato: formatoInstagram(m),
      fecha: fechaGt(m.timestamp), titulo: tituloDe(m.caption), estado: 'publicada',
      alcance: valorInsight(m.insights, 'reach'), interacciones: total || (Number(m.like_count) || 0) + (Number(m.comments_count) || 0),
      enlace: m.permalink ?? null, programadaPara: null,
    }
  }).filter((p) => p.fecha)
}

/** Programadas de una página de Facebook (scheduled_posts). */
export function programadasFacebook(posts = [], cuenta) {
  return posts.map((p) => ({
    id: `fbp-${p.id}`, cuentaId: `${cuenta.marca}-fb`, marca: cuenta.marca, pais: cuenta.pais, red: 'fb',
    fecha: fechaGt(p.scheduled_publish_time), titulo: tituloDe(p.message), fuente: 'facebook',
  })).filter((p) => p.fecha)
}

/** Seguidores de una cuenta (página de Facebook o Instagram). */
export function cuentaDashboard(datos = {}, cuenta, nombre) {
  return { id: `${cuenta.marca}-${cuenta.red}`, marca: cuenta.marca, pais: cuenta.pais, red: cuenta.red, nombre,
    seguidores: Number(datos.followers_count ?? datos.fan_count) || 0 }
}

/**
 * Anuncios de una cuenta publicitaria: resultados por campaña y mes (insights con time_increment=monthly) + presupuesto
 * de la campaña. Los presupuestos de Meta vienen en centavos (÷ 100). La moneda es la de la cuenta (nunca se mezcla).
 */
export function anunciosCuenta(insights = [], campanas = [], cuentaAds = {}, cuenta) {
  const porId = new Map(campanas.map((c) => [String(c.id), c]))
  const moneda = String(cuentaAds.currency ?? '').toUpperCase() || 'SIN_MONEDA'
  return insights.map((f) => {
    const c = porId.get(String(f.campaign_id)) ?? {}
    const mensajes = (f.actions ?? []).filter((a) => a.action_type === METRICAS.mensajes).reduce((n, a) => n + (Number(a.value) || 0), 0)
    return {
      id: `ad-${f.campaign_id}-${String(f.date_start).slice(0, 7)}`, mes: String(f.date_start).slice(0, 7), campana: f.campaign_name ?? c.name ?? 'Sin nombre',
      marca: cuenta.marca, pais: cuenta.pais, moneda,
      presupuesto: c.lifetime_budget ? Number(c.lifetime_budget) / 100 : null,
      presupuestoDiario: c.daily_budget ? Number(c.daily_budget) / 100 : null,
      gastado: Number(f.spend) || 0, alcance: Number(f.reach) || 0, visualizaciones: Number(f.impressions) || 0,
      clics: Number(f.clicks) || 0, mensajes,
    }
  })
}
