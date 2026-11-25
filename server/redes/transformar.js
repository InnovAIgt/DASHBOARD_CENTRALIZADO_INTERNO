/**
 * Canales de marketing · Redes sociales: de las respuestas de Meta a la forma del dashboard (la misma de
 * src/modulos/marketing/marketing-v2/datos/redesEjemplo.js). Funciones puras, probadas con respuestas inventadas.
 *
 * Publicación: { id, cuentaId, marca, pais, red, formato, fecha (AAAA-MM-DD, hora de Guatemala), hora (0–23, hora
 *   de Guatemala), titulo, estado: 'publicada', alcance, vistas, clics, reacciones, interacciones, enlace,
 *   programadaPara (fecha de programación si Meta la da, o null) }
 * Programada (Facebook): { id, cuentaId, marca, pais, red: 'fb', fecha, titulo, fuente: 'facebook' }
 * Cuenta: { id, marca, pais, red, nombre, seguidores, metricas: { 'AAAA-MM': { alcanceDiario, vistas, interacciones,
 *   cuentasInteraccion, seguidores } } }
 * Anuncio (por campaña y mes): { id, mes, campana, marca, pais, moneda, presupuesto, presupuestoDiario, gastado,
 *   alcance, visualizaciones, clics, mensajes }
 * Nunca se guardan nombres ni datos de personas que comentan o escriben.
 *
 * Fechas: Meta las da en UTC; todo se pasa a UTC−6 (Guatemala y El Salvador) ANTES de agrupar por día, semana o mes.
 */

/** Métricas de Meta v25 que se piden (probadas el 24/11/2026, REDES.md 2.1 y 7.2). Si Meta cambia un nombre, solo aquí. */
export const METRICAS = {
  // Publicación de Facebook: alcance, vistas, clics y reacciones (period lifetime).
  facebookPost: ['post_total_media_view_unique', 'post_media_view', 'post_clicks', 'post_reactions_by_type_total'],
  // Página de Facebook, por día: alcance (personas únicas del día), vistas, interacciones y seguidores (total del día).
  facebookPagina: ['page_total_media_view_unique', 'page_media_view', 'page_post_engagements', 'page_follows'],
  // Publicación de Instagram.
  instagram: ['reach', 'views', 'total_interactions'],
  // Cuenta de Instagram: reach por día (time_series) y el resto como total del tramo (total_value).
  instagramCuentaDiaria: 'reach',
  instagramCuentaTotal: ['views', 'total_interactions', 'accounts_engaged'],
  mensajes: 'onsite_conversion.messaging_conversation_started_7d',
}

const MS_GT = 6 * 3600 * 1000 // Guatemala y El Salvador: UTC−6 todo el año
const DIA = 86_400_000

/** Fecha AAAA-MM-DD en hora de Guatemala (Meta da ISO con zona o segundos Unix). */
export function fechaGt(valor) {
  const t = typeof valor === 'number' ? valor * 1000 : Date.parse(valor)
  return Number.isFinite(t) ? new Date(t - MS_GT).toISOString().slice(0, 10) : null
}

/** Hora (0–23) en hora de Guatemala. */
export function horaGt(valor) {
  const t = typeof valor === 'number' ? valor * 1000 : Date.parse(valor)
  return Number.isFinite(t) ? new Date(t - MS_GT).getUTCHours() : null
}

export const LARGO_TITULO = 150
/** Inicio del texto (sin saltos, hasta 150 caracteres) como título; la pantalla lo corta a 2 líneas y lo muestra entero al pasar el mouse. */
export function tituloDe(texto) {
  const t = String(texto ?? '').replace(/\s+/g, ' ').trim()
  if (!t) return 'Sin texto'
  return t.length > LARGO_TITULO ? `${t.slice(0, LARGO_TITULO - 1).trimEnd()}…` : t
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

/** Tramos de hasta `dias` días entre since y until (segundos Unix); Meta limita el rango de algunas métricas. */
export function tramos(since, until, dias = 30) {
  const salida = []
  for (let d = since; d < until; d += dias * 86_400) salida.push({ since: d, until: Math.min(d + dias * 86_400, until) })
  return salida
}

/** Valor de una métrica en los insights anidados; si Meta la da con varios períodos, se prefiere «lifetime». */
export const valorInsight = (insights, nombre) => {
  const filas = (insights?.data ?? []).filter((x) => x.name === nombre)
  const fila = filas.find((x) => x.period === 'lifetime') ?? filas[0]
  const v = fila?.values?.[0]?.value ?? fila?.total_value?.value
  return sumaValor(v)
}

/** Un valor de Meta puede ser número o un objeto por tipo (p. ej. reacciones por tipo): se suma. */
const sumaValor = (v) => {
  if (v && typeof v === 'object') return Object.values(v).reduce((n, x) => n + (Number(x) || 0), 0)
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

/**
 * Publicaciones de una página de Facebook (published_posts con insights anidados). Interacciones = reacciones +
 * compartidos (+ comentarios si Meta los diera): el conteo de comentarios pide pages_read_user_content, que el token
 * no tiene (REDES.md, 7.2).
 */
export function publicacionesFacebook(posts = [], cuenta) {
  return posts.map((p) => {
    const [alcance, vistas, clics, reaccionesInsight] = METRICAS.facebookPost.map((m) => valorInsight(p.insights, m))
    const reacciones = reaccionesInsight || Number(p.reactions?.summary?.total_count) || 0
    const interacciones = reacciones + (Number(p.comments?.summary?.total_count) || 0) + (Number(p.shares?.count) || 0)
    return {
      id: `fb-${p.id}`, cuentaId: `${cuenta.marca}-fb`, marca: cuenta.marca, pais: cuenta.pais, red: 'fb', formato: formatoFacebook(p),
      fecha: fechaGt(p.created_time), hora: horaGt(p.created_time), titulo: tituloDe(p.message), estado: 'publicada',
      alcance, vistas, clics, reacciones, interacciones, enlace: p.permalink_url ?? null,
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
      fecha: fechaGt(m.timestamp), hora: horaGt(m.timestamp), titulo: tituloDe(m.caption), estado: 'publicada',
      alcance: valorInsight(m.insights, 'reach'), vistas: valorInsight(m.insights, 'views'), clics: null, reacciones: Number(m.like_count) || 0,
      interacciones: total || (Number(m.like_count) || 0) + (Number(m.comments_count) || 0),
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

const metricaVacia = () => ({ alcanceDiario: 0, vistas: 0, interacciones: 0, cuentasInteraccion: null, seguidores: null })

/**
 * Día al que corresponde un valor diario de Meta. Meta marca el FIN del día (end_time); el día es el anterior.
 * Las métricas diarias de página las calcula Meta por su propio día (no se pueden pasar a UTC−6 hora por hora).
 */
const diaDeValor = (endTime) => {
  const t = Date.parse(endTime)
  return Number.isFinite(t) ? new Date(t - DIA).toISOString().slice(0, 10) : null
}

/**
 * Métricas de una página de Facebook por mes (insights con period=day). alcanceDiario = suma del alcance de cada día
 * (una persona puede contarse más de una vez); seguidores = último valor del mes (page_follows), no la suma.
 */
export function metricasPagina(insights = [], meses = []) {
  const salida = Object.fromEntries(meses.map((m) => [m, metricaVacia()]))
  const ultimo = {}
  for (const fila of insights) {
    for (const v of fila.values ?? []) {
      const dia = diaDeValor(v.end_time)
      const mes = dia?.slice(0, 7)
      if (!salida[mes]) continue
      const n = sumaValor(v.value)
      if (fila.name === 'page_total_media_view_unique') salida[mes].alcanceDiario += n
      else if (fila.name === 'page_media_view') salida[mes].vistas += n
      else if (fila.name === 'page_post_engagements') salida[mes].interacciones += n
      else if (fila.name === 'page_follows' && (!ultimo[mes] || dia >= ultimo[mes])) { ultimo[mes] = dia; salida[mes].seguidores = n }
    }
  }
  return salida
}

/**
 * Alcance de cada día { 'AAAA-MM-DD': n } de una métrica diaria de Meta (page_total_media_view_unique o reach de
 * Instagram con time_series). Sirve para comparar el MISMO PERÍODO del mes anterior con el mismo cálculo.
 */
export function alcancePorDia(insights = [], nombre) {
  const salida = {}
  for (const fila of insights) {
    if (fila.name !== nombre) continue
    for (const v of fila.values ?? []) { const dia = diaDeValor(v.end_time); if (dia) salida[dia] = (salida[dia] ?? 0) + sumaValor(v.value) }
  }
  return salida
}

/**
 * Métricas de una cuenta de Instagram de UN mes: reach diario (time_series, se suma como «alcance diario») y los
 * totales del tramo (total_value) de views, total_interactions y accounts_engaged (si el mes va en 2 tramos, se suman).
 */
export function metricasInstagram(diario = [], totales = []) {
  const m = metricaVacia()
  for (const fila of diario) if (fila.name === METRICAS.instagramCuentaDiaria) for (const v of fila.values ?? []) m.alcanceDiario += sumaValor(v.value)
  for (const tramo of totales) {
    for (const fila of tramo) {
      const n = sumaValor(fila.total_value?.value)
      if (fila.name === 'views') m.vistas += n
      else if (fila.name === 'total_interactions') m.interacciones += n
      else if (fila.name === 'accounts_engaged') m.cuentasInteraccion = (m.cuentasInteraccion ?? 0) + n
    }
  }
  return m
}

/** Seguidores de una cuenta (página de Facebook o Instagram) y sus métricas por mes. */
export function cuentaDashboard(datos = {}, cuenta, nombre, metricas = {}) {
  return { id: `${cuenta.marca}-${cuenta.red}`, marca: cuenta.marca, pais: cuenta.pais, red: cuenta.red, nombre,
    seguidores: Number(datos.followers_count ?? datos.fan_count) || 0, metricas }
}

/** Estados de anuncio que se piden: todos menos DELETED (Meta no lo acepta en este filtro: error 100, 24/11/2026). */
export const ESTADOS_ANUNCIO = ['ACTIVE', 'PAUSED', 'PENDING_REVIEW', 'DISAPPROVED', 'PREAPPROVED', 'PENDING_BILLING_INFO',
  'CAMPAIGN_PAUSED', 'ARCHIVED', 'ADSET_PAUSED', 'IN_PROCESS', 'WITH_ISSUES']

/** Página (o Instagram) que publica un anuncio, según su creatividad. */
export function paginaDelAnuncio(ad = {}) {
  const c = ad.creative ?? {}
  const pagina = c.object_story_spec?.page_id ?? c.actor_id ?? (c.effective_object_story_id ? String(c.effective_object_story_id).split('_')[0] : null)
  return pagina ? String(pagina) : c.object_story_spec?.instagram_user_id ?? c.instagram_user_id ?? null
}

/**
 * Anuncios de una cuenta publicitaria REPARTIDOS POR LA PÁGINA DEL ANUNCIO (decisión de Keily, 24/11/2026): insights
 * por anuncio y mes (level=ad, time_increment=monthly) → una fila por campaña, marca y mes. La marca sale de la página
 * (o del Instagram) de la creatividad; si no es una de las 3 marcas o no se sabe, la fila queda «sin página» (marca '').
 * Cada fila dice si la campaña es de reclutamiento (server/redes/reclutamiento.js). Los presupuestos de Meta vienen en
 * centavos (÷ 100). El alcance es la suma por anuncio (una persona puede contarse en varios anuncios).
 */
export function anunciosPorPagina({ insights = [], ads = [], campanas = [], cuentaAds = {}, marcaDe = new Map(), paisDe = {}, esReclutamiento = () => false }) {
  const moneda = String(cuentaAds.currency ?? '').toUpperCase() || 'SIN_MONEDA'
  const campanaPorId = new Map(campanas.map((c) => [String(c.id), c]))
  const marcaPorAnuncio = new Map(ads.map((a) => [String(a.id), marcaDe.get(paginaDelAnuncio(a)) ?? '']))
  const filas = new Map()
  for (const f of insights) {
    const mes = String(f.date_start).slice(0, 7)
    const marca = marcaPorAnuncio.get(String(f.ad_id)) ?? ''
    const clave = `${f.campaign_id}|${marca}|${mes}`
    let fila = filas.get(clave)
    if (!fila) {
      const c = campanaPorId.get(String(f.campaign_id)) ?? {}
      const campana = f.campaign_name ?? c.name ?? 'Sin nombre'
      fila = {
        id: `ad-${f.campaign_id}-${marca || 'sin'}-${mes}`, mes, campana, marca, pais: paisDe[marca] ?? '', moneda,
        presupuesto: c.lifetime_budget ? Number(c.lifetime_budget) / 100 : null,
        presupuestoDiario: c.daily_budget ? Number(c.daily_budget) / 100 : null,
        gastado: 0, alcance: 0, visualizaciones: 0, clics: 0, mensajes: 0, reclutamiento: esReclutamiento(campana),
      }
      filas.set(clave, fila)
    }
    fila.gastado += Number(f.spend) || 0
    fila.alcance += Number(f.reach) || 0
    fila.visualizaciones += Number(f.impressions) || 0
    fila.clics += Number(f.clicks) || 0
    fila.mensajes += (f.actions ?? []).filter((a) => a.action_type === METRICAS.mensajes).reduce((n, a) => n + (Number(a.value) || 0), 0)
  }
  return [...filas.values()].map((x) => ({ ...x, gastado: Math.round(x.gastado * 100) / 100 }))
}
