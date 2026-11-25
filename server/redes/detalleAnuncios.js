/**
 * Canales de marketing · Redes sociales · ANUNCIOS FASE 2 (pedido de Ismael; REDES.md, 7.4). SOLO LECTURA de Meta.
 *
 * Detalle del mes pedido de la cuenta publicitaria (hoy solo act_2035747430056013, USD), SIN reclutamiento:
 *   edadSexo      [{marca, edad, sexo, gastado, mensajes}]               (breakdowns=age,gender)
 *   ubicaciones   [{marca, plataforma, posicion, impresiones, clics, gastado, mensajes}] (publisher_platform,platform_position)
 *   horas         [{marca, dia (0 = lunes), franja (0–11, de 2 h), gastado, mensajes}] (hourly…advertiser_time_zone, día por día)
 *   segmentos     [{id, nombre, campana, marca, publico, gastado, mensajes}] (conjuntos de anuncios y su público)
 *   presupuestos  [{id, campana, marca, presupuestoDiario, presupuestoTotal, gastado, mensajes}]
 *   formularios   [{marca, formularios}] (solo el CONTEO de las acciones «lead»; nunca el contenido: no se usa leads_retrieval)
 * Todo se pide POR ANUNCIO, para saber la marca por la página del anuncio (igual que /anuncios).
 * Las horas vienen en la zona de la cuenta (America/El_Salvador, UTC−6), la misma del dashboard.
 * Funciones puras + el lector de la ruta; probadas con respuestas inventadas.
 */
import { esReclutamiento } from './reclutamiento.js'
import { METRICAS, paginaDelAnuncio, textoDelAnuncio, tituloDe } from './transformar.js'

const ACCIONES_FORMULARIO = ['onsite_conversion.lead_grouped', 'lead']

const sumaAccion = (acciones = [], tipo) => acciones.filter((a) => a.action_type === tipo).reduce((n, a) => n + (Number(a.value) || 0), 0)
export const mensajesDe = (fila) => sumaAccion(fila.actions, METRICAS.mensajes)
/** Formularios de una fila: Meta repite el mismo envío en «lead» y en «onsite_conversion.lead_grouped»; se toma el mayor. */
export const formulariosDe = (fila) => Math.max(...ACCIONES_FORMULARIO.map((t) => sumaAccion(fila.actions, t)))

/** Día de la semana (0 = lunes) de AAAA-MM-DD. */
const diaSemana = (fecha) => (new Date(`${fecha}T12:00:00Z`).getUTCDay() + 6) % 7
/** «13:00:00 - 13:59:59» → franja de 2 horas (6). */
export const franjaDe = (texto) => { const h = Number(String(texto ?? '').slice(0, 2)); return Number.isFinite(h) ? Math.floor(h / 2) : null }

const SEXO = { male: 'hombres', female: 'mujeres', unknown: 'sin dato' }

/** Suma filas en grupos por clave (con clics: también los clics, para CTR y CPC). */
function agrupar(filas, clave, base, { clics = false } = {}) {
  const m = new Map()
  for (const f of filas) {
    const k = clave(f)
    if (k === null) continue
    const g = m.get(k) ?? { ...base(f), gastado: 0, mensajes: 0, impresiones: 0, ...(clics ? { clics: 0 } : {}) }
    if (clics) g.clics += Number(f.clicks) || 0
    g.gastado += Number(f.spend) || 0
    g.mensajes += mensajesDe(f)
    g.impresiones += Number(f.impressions) || 0
    m.set(k, g)
  }
  return [...m.values()].map((g) => ({ ...g, gastado: Math.round(g.gastado * 100) / 100 }))
}

/** Resumen corto del público de un conjunto de anuncios (sin datos de personas: solo la configuración del anuncio). */
export function publicoDe(t = {}) {
  const intereses = [...(t.interests ?? []), ...(t.flexible_spec ?? []).flatMap((x) => x.interests ?? [])].map((i) => i.name).filter(Boolean)
  const generos = t.genders ?? []
  return {
    edad: t.age_min || t.age_max ? `${t.age_min ?? 18}–${t.age_max ?? 65}${Number(t.age_max) >= 65 ? '+' : ''}` : 'Todas',
    sexo: generos.length === 1 ? (generos[0] === 1 ? 'Hombres' : 'Mujeres') : 'Ambos',
    ubicaciones: t.publisher_platforms?.length ? t.publisher_platforms.join(', ') : 'Automáticas',
    intereses: [...new Set(intereses)],
    paises: t.geo_locations?.countries ?? [],
    // Detalle (ventana de la segmentación): lugares, idiomas, públicos personalizados y ubicaciones elegidas.
    lugares: [...(t.geo_locations?.regions ?? []), ...(t.geo_locations?.cities ?? [])].map((x) => x.name).filter(Boolean),
    idiomas: (t.locales ?? []).length,
    publicos: (t.custom_audiences ?? []).map((x) => x.name).filter(Boolean),
    posiciones: [...(t.facebook_positions ?? []).map((x) => 'Facebook ' + x), ...(t.instagram_positions ?? []).map((x) => 'Instagram ' + x)],
  }
}

/**
 * Arma el detalle con las respuestas de Meta. marcaDe: Map página/Instagram → marca. Quita el reclutamiento por el
 * nombre de la campaña.
 */
export function armarDetalle({ ads = [], porAnuncio = [], edadSexo = [], ubicaciones = [], horas = [], conjuntos = [], campanas = [], porConjunto = [], horasConjunto = [], porSemana = [], porDia = [], marcaDe = new Map(), moneda = 'USD', zonaHoraria = null }) {
  const marcaAd = new Map(ads.map((a) => [String(a.id), marcaDe.get(paginaDelAnuncio(a)) ?? '']))
  const marca = (f) => marcaAd.get(String(f.ad_id)) ?? ''
  const adPorId = new Map(ads.map((a) => [String(a.id), a]))
  /**
   * Lo que usa la ventana de una segmentación: estado, fechas y presupuesto del conjunto; objetivo y estado de la
   * campaña; resultados del conjunto (alcance, frecuencia, clics) y, dentro del público, mensajes y gasto por edad y
   * sexo, por plataforma y por franja horaria (zona de la cuenta).
   */
  const extraDelConjunto = (idSegmento) => {
    const adsetId = idSegmento.replace(/-[^-]*$/, '')
    const s = conjuntos.find((c) => String(c.id) === adsetId) ?? {}
    const c = campanas.find((x) => String(x.id) === String(s.campaign_id)) ?? {}
    const r = porConjunto.find((x) => String(x.adset_id) === adsetId)
    const delConjunto = (lista) => lista.filter((f) => String(f.adset_id) === adsetId && !esReclutamiento(f.campaign_name))
    const centavos = (v) => (Number(v) ? Number(v) / 100 : null)
    return {
      conjunto: { id: adsetId, estado: s.effective_status ?? null, inicio: s.start_time ?? null, fin: s.end_time ?? null,
        presupuestoDiario: centavos(s.daily_budget) ?? centavos(c.daily_budget), presupuestoTotal: centavos(s.lifetime_budget) ?? centavos(c.lifetime_budget) },
      campanaInfo: { objetivo: c.objective ?? null, estado: c.effective_status ?? null, inicio: c.start_time ?? null, fin: c.stop_time ?? null },
      resultados: r ? { alcance: Number(r.reach) || 0, frecuencia: Number(r.frequency) || null, impresiones: Number(r.impressions) || 0, clics: Number(r.clicks) || 0 } : null,
      porEdadSexo: agrupar(delConjunto(edadSexo), (f) => `${f.age}|${f.gender}`, (f) => ({ edad: f.age, sexo: SEXO[f.gender] ?? f.gender })).map(({ impresiones, ...x }) => x),
      porPlataforma: agrupar(delConjunto(ubicaciones), (f) => f.publisher_platform, (f) => ({ plataforma: f.publisher_platform })),
      porFranja: agrupar(delConjunto(horasConjunto), (f) => franjaDe(f.hourly_stats_aggregated_by_advertiser_time_zone), (f) => ({ franja: franjaDe(f.hourly_stats_aggregated_by_advertiser_time_zone) }))
        .map(({ impresiones, ...x }) => x),
    }
  }
  /**
   * Anuncios de un conjunto (id de segmento = «adset-marca»): nombre, gasto y mensajes de cada uno, y el texto y la
   * publicación promocionada del que más gastó (como en la tabla de campañas).
   */
  const anunciosDelConjunto = (idSegmento) => anunciosDe((f) => `${f.adset_id}-${marca(f) || 'sin'}` === idSegmento)
  /** Anuncios (filas por anuncio) que cumplen «incluye»: con su formato, gasto, alcance, clics, mensajes y texto. */
  const anunciosDe = (incluye) => {
    const q = porAnuncio.filter((f) => !esReclutamiento(f.campaign_name) && incluye(f))
    const lista = q.map((f) => {
      const ad = adPorId.get(String(f.ad_id)) ?? {}
      const pos = ubicaciones.filter((u) => String(u.ad_id) === String(f.ad_id)).sort((a, b) => (Number(b.impressions) || 0) - (Number(a.impressions) || 0))[0]
      return { id: String(f.ad_id), nombre: ad.name ?? 'Anuncio sin nombre', titulo: ad.creative?.title ? tituloDe(ad.creative.title) : null, texto: textoDelAnuncio(ad),
        publicacion: ad.creative?.effective_object_story_id ?? null, tipo: ad.creative?.object_type ?? null, plataforma: pos?.publisher_platform ?? null, posicion: pos?.platform_position ?? null,
        gastado: Math.round((Number(f.spend) || 0) * 100) / 100, alcance: Number(f.reach) || 0, impresiones: Number(f.impressions) || 0, clics: Number(f.clicks) || 0, mensajes: mensajesDe(f) }
    })
      .sort((a, b) => b.gastado - a.gastado || b.mensajes - a.mensajes)
    const conTexto = lista.map((a) => adPorId.get(a.id)).find((ad) => textoDelAnuncio(ad) || ad?.creative?.effective_object_story_id)
    return { anuncios: lista, texto: conTexto ? textoDelAnuncio(conTexto) : null, publicacion: conTexto?.creative?.effective_object_story_id ?? null }
  }
  /**
   * Lo que usa la ventana de una campaña (Presupuestos): objetivo, estado y fechas; conjuntos y anuncios del mes; texto
   * promocionado (del anuncio que más gastó) y la inversión y los mensajes por semana del mes.
   */
  const extraDeCampana = (x) => {
    const c = campanas.find((k) => String(k.id) === x.campanaId) ?? {}
    const propia = (f) => String(f.campaign_id) === x.campanaId && (marca(f) || 'sin') === (x.marca || 'sin')
    const lista = anunciosDe(propia)
    return {
      campanaInfo: { objetivo: c.objective ?? null, estado: c.effective_status ?? null, inicio: c.start_time ?? null, fin: c.stop_time ?? null },
      conjuntos: new Set(porAnuncio.filter((f) => propia(f) && !esReclutamiento(f.campaign_name)).map((f) => String(f.adset_id))).size,
      ...lista,
      porSemana: porSemana.filter((w) => String(w.campaign_id) === x.campanaId).map((w) => ({ desde: w.date_start, hasta: w.date_stop,
        gastado: Math.round((Number(w.spend) || 0) * 100) / 100, mensajes: mensajesDe(w) })).sort((a, b) => String(a.desde).localeCompare(String(b.desde))),
      // Día por día (gasto y mensajes): para repartir los leads de Redes entre las campañas activas ese día.
      porDia: porDia.filter((w) => String(w.campaign_id) === x.campanaId).map((w) => ({ fecha: w.date_start,
        gastado: Math.round((Number(w.spend) || 0) * 100) / 100, mensajes: mensajesDe(w) })).filter((w) => w.gastado > 0 || w.mensajes > 0)
        .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha))),
    }
  }
  // Marca de una campaña (para las horas, que se piden por campaña): la de sus anuncios si todos son de la misma marca.
  const marcasCampana = new Map()
  for (const ad of ads) { if (!ad.campaign_id) continue; const k = String(ad.campaign_id); marcasCampana.set(k, new Set([...(marcasCampana.get(k) ?? []), marcaAd.get(String(ad.id)) ?? ''])) }
  const marcaFila = (f) => (f.ad_id ? marca(f) : marcasCampana.get(String(f.campaign_id))?.size === 1 ? [...marcasCampana.get(String(f.campaign_id))][0] : '')
  const util = (filas) => filas.filter((f) => !esReclutamiento(f.campaign_name))
  const conjuntoPorId = new Map(conjuntos.map((c) => [String(c.id), c]))
  const campanaPorId = new Map(campanas.map((c) => [String(c.id), c]))
  const filas = util(porAnuncio)

  // Presupuesto de una campaña: el de la campaña o, si lo tiene cada conjunto, la suma de sus conjuntos (÷ 100: centavos).
  const presupuestoCampana = (id) => {
    const c = campanaPorId.get(String(id)) ?? {}
    const sets = conjuntos.filter((s) => String(s.campaign_id) === String(id))
    const suma = (k) => sets.reduce((n, s) => n + (Number(s[k]) || 0), 0)
    const diario = Number(c.daily_budget) || suma('daily_budget')
    const total = Number(c.lifetime_budget) || suma('lifetime_budget')
    return { presupuestoDiario: diario ? diario / 100 : null, presupuestoTotal: total ? total / 100 : null }
  }

  return {
    moneda, zonaHoraria,
    edadSexo: agrupar(util(edadSexo), (f) => `${marca(f)}|${f.age}|${f.gender}`, (f) => ({ marca: marca(f), edad: f.age, sexo: SEXO[f.gender] ?? f.gender }))
      .map(({ impresiones, ...x }) => x),
    ubicaciones: agrupar(util(ubicaciones), (f) => `${marca(f)}|${f.publisher_platform}|${f.platform_position}`,
      (f) => ({ marca: marca(f), plataforma: f.publisher_platform, posicion: f.platform_position }), { clics: true }),
    horas: agrupar(util(horas), (f) => {
      const franja = franjaDe(f.hourly_stats_aggregated_by_advertiser_time_zone)
      return franja === null || !f.date_start ? null : `${marcaFila(f)}|${diaSemana(f.date_start)}|${franja}`
    }, (f) => ({ marca: marcaFila(f), dia: diaSemana(f.date_start), franja: franjaDe(f.hourly_stats_aggregated_by_advertiser_time_zone) }))
      .map(({ impresiones, ...x }) => x),
    segmentos: agrupar(filas, (f) => `${f.adset_id}|${marca(f)}`, (f) => {
      const s = conjuntoPorId.get(String(f.adset_id)) ?? {}
      return { id: `${f.adset_id}-${marca(f) || 'sin'}`, nombre: s.name ?? f.adset_name ?? 'Sin nombre', campana: f.campaign_name, marca: marca(f), publico: publicoDe(s.targeting) }
    }).map(({ impresiones, ...x }) => ({ ...x, ...anunciosDelConjunto(x.id), ...extraDelConjunto(x.id) })),
    presupuestos: agrupar(filas, (f) => `${f.campaign_id}|${marca(f)}`, (f) => ({ id: `${f.campaign_id}-${marca(f) || 'sin'}`, campana: f.campaign_name, marca: marca(f),
      campanaId: String(f.campaign_id), ...presupuestoCampana(f.campaign_id) })).map(({ impresiones, ...x }) => ({ ...x, ...extraDeCampana(x) })),
    formularios: [...filas.reduce((m, f) => m.set(marca(f), (m.get(marca(f)) ?? 0) + formulariosDe(f)), new Map())].map(([m, n]) => ({ marca: m, formularios: n })),
  }
}

/** Rango del mes en fechas de la cuenta (AAAA-MM-DD), sin pasar de hoy. */
export function rangoDias(mes, hoy) {
  const [a, m] = String(mes).split('-').map(Number)
  const fin = new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10)
  return { since: `${mes}-01`, until: hoy && hoy < fin ? hoy : fin }
}

const CAMPOS_FILA = 'ad_id,adset_id,adset_name,campaign_id,campaign_name,spend,impressions,reach,clicks,actions'

/** Límite total del detalle (la función de Vercel corta a los 60 s) y de la consulta de horarios. */
export const LIMITE_DETALLE_MS = 45_000
export const LIMITE_HORAS_MS = 20_000
export const CACHE_CONSULTA_MS = 30 * 60 * 1000
/** Mes ya cerrado: la copia de cada consulta dura 24 h. */
export const CACHE_CONSULTA_CERRADO_MS = 24 * 3600 * 1000
/** De cuántas consultas a la vez se piden (no todas en paralelo: Meta responde código 2 con consultas pesadas juntas). */
export const CONSULTAS_A_LA_VEZ = 2

/** Qué recuadros dependen de cada consulta: si una falla, solo esos muestran el error. */
export const RECUADROS = {
  porAnuncio: ['presupuestos', 'segmentos', 'formularios'],
  // Solo para la ventana de una segmentación: si fallan, la ventana dice «sin datos» en esa parte.
  porConjunto: [],
  porSemana: [],
  // Leads por campaña (estimados): si falla, la tabla y la ventana dicen «sin dato» en esa columna.
  porDia: ['leadsCampana'],
  horasConjunto: [],
  conjuntos: ['presupuestos', 'segmentos'],
  campanas: ['presupuestos'],
  edadSexo: ['edadSexo'],
  ubicaciones: ['ubicaciones'],
  horas: ['horas'],
}

// Caché por consulta (cuenta, mes y consulta): lo que sí cargó se reusa; si una consulta falla, se usa su copia anterior.
const cacheConsultas = new Map()
export const vaciarCacheDetalle = () => cacheConsultas.clear()

/** Corre las tareas de a «n» a la vez (en orden). */
async function deAPocas(tareas, n) {
  const salida = {}
  for (let i = 0; i < tareas.length; i += n) {
    const grupo = tareas.slice(i, i + n)
    const r = await Promise.all(grupo.map(async ([k, f]) => [k, await f()]))
    for (const [k, v] of r) salida[k] = v
  }
  return salida
}

/**
 * Lee el detalle de UNA cuenta publicitaria para el mes. llamar(ruta, parámetros, opciones) = llamarMetaTodo;
 * llamarUno = llamarMeta. Consultas de a 2, con caché propia y límite de tiempo; si una falla, el detalle sale igual y
 * `errores` dice qué recuadros no cargaron (y `guardados`, cuáles salen de una copia anterior).
 */
export async function leerDetalle({ cuentaId, mes, hoy, llamar, llamarUno, op, marcaDe, ahora = () => Date.now(), limiteMs = LIMITE_DETALLE_MS }) {
  const act = `/act_${String(cuentaId).replace(/^act_/, '')}`
  const time_range = rangoDias(mes, hoy)
  if (time_range.until < time_range.since) return { ...armarDetalle({ marcaDe }), errores: {}, guardados: [] }
  const hasta = ahora() + limiteMs
  const opT = { ...op, hasta }
  const insights = (extra, o = {}) => llamar(`${act}/insights`, { level: 'ad', time_range, limit: 500, fields: CAMPOS_FILA, ...extra }, { ...opT, ...o })
  const consultas = {
    cuenta: () => llamarUno(act, { fields: 'currency,timezone_name' }, opT),
    ads: () => llamar(`${act}/ads`, { fields: 'id,name,campaign_id,creative{actor_id,title,body,object_type,object_story_spec{page_id,instagram_user_id,link_data{message},video_data{message}},effective_object_story_id,instagram_user_id}' }, opT),
    porAnuncio: () => insights({}),
    campanas: () => llamar(`${act}/campaigns`, { fields: 'id,name,objective,effective_status,start_time,stop_time,daily_budget,lifetime_budget' }, opT),
    conjuntos: () => llamar(`${act}/adsets`, { fields: 'id,name,campaign_id,effective_status,start_time,end_time,daily_budget,lifetime_budget,targeting{age_min,age_max,genders,publisher_platforms,facebook_positions,instagram_positions,flexible_spec,interests,locales,custom_audiences,geo_locations{countries,regions,cities}}' }, opT),
    // Por conjunto: alcance y frecuencia reales del público (no se pueden sumar por anuncio) y mensajes por hora del mes.
    porConjunto: () => llamar(`${act}/insights`, { level: 'adset', time_range, limit: 500, fields: 'adset_id,campaign_name,spend,reach,frequency,impressions,clicks,actions' }, opT),
    // Por campaña y semana del mes (1–7, 8–14…): para ver si los mensajes bajan con el mismo gasto.
    porSemana: () => llamar(`${act}/insights`, { level: 'campaign', time_range, limit: 500, time_increment: 7, fields: 'campaign_id,campaign_name,spend,actions' }, opT),
    // Por campaña y día: gasto y mensajes de cada día (para repartir los leads de Redes entre campañas activas).
    porDia: () => llamar(`${act}/insights`, { level: 'campaign', time_range, limit: 500, time_increment: 1, fields: 'campaign_id,campaign_name,spend,actions' }, opT),
    horasConjunto: () => llamar(`${act}/insights`, { level: 'adset', time_range, limit: 500, breakdowns: 'hourly_stats_aggregated_by_advertiser_time_zone',
      fields: 'adset_id,campaign_name,spend,actions' }, { ...opT, maxPaginas: 10 }),
    edadSexo: () => insights({ breakdowns: 'age,gender' }),
    ubicaciones: () => insights({ breakdowns: 'publisher_platform,platform_position' }),
    // Horarios: por CAMPAÑA (menos filas que por anuncio) y día por día (para el día de la semana), con su propio límite.
    horas: () => llamar(`${act}/insights`, { level: 'campaign', time_range, limit: 500, time_increment: 1, breakdowns: 'hourly_stats_aggregated_by_advertiser_time_zone',
      fields: 'campaign_id,campaign_name,spend,actions' }, { ...opT, maxPaginas: 30, hasta: Math.min(hasta, ahora() + LIMITE_HORAS_MS) }),
  }
  const datos = {}
  const fallas = {}
  const guardados = []
  const tareas = Object.entries(consultas).map(([k, f]) => [k, async () => {
    const clave = `${act}|${mes}|${k}`
    const copia = cacheConsultas.get(clave)
    // Mes cerrado (antes del mes de «hoy»): 24 h; mes actual: 30 min.
    if (copia && ahora() - copia.en < (mes < String(hoy).slice(0, 7) ? CACHE_CONSULTA_CERRADO_MS : CACHE_CONSULTA_MS)) return { ok: true, valor: copia.valor }
    try {
      const valor = await f()
      cacheConsultas.set(clave, { en: ahora(), valor })
      return { ok: true, valor }
    } catch (err) {
      if (copia) { guardados.push(k); return { ok: true, valor: copia.valor } }
      return { ok: false, error: err?.message ?? 'No se pudo leer de Meta.' }
    }
  }])
  const r = await deAPocas(tareas, CONSULTAS_A_LA_VEZ)
  for (const [k, v] of Object.entries(r)) { if (v.ok) datos[k] = v.valor; else fallas[k] = v.error }

  const errores = {}
  for (const [consulta, msg] of Object.entries(fallas)) for (const recuadro of RECUADROS[consulta] ?? []) errores[recuadro] ??= msg
  const cuenta = datos.cuenta ?? {}
  return {
    ...armarDetalle({ ads: datos.ads ?? [], porAnuncio: datos.porAnuncio ?? [], edadSexo: datos.edadSexo ?? [], ubicaciones: datos.ubicaciones ?? [], horas: datos.horas ?? [],
      porConjunto: datos.porConjunto ?? [], horasConjunto: datos.horasConjunto ?? [], porSemana: datos.porSemana ?? [], porDia: datos.porDia ?? [],
      conjuntos: datos.conjuntos ?? [], campanas: datos.campanas ?? [], marcaDe, moneda: String(cuenta.currency ?? '').toUpperCase() || 'USD', zonaHoraria: cuenta.timezone_name ?? null }),
    errores,
    guardados: [...new Set(guardados.flatMap((k) => RECUADROS[k] ?? []))],
    // Sin la lista de anuncios no se sabe la marca de cada fila: todo sale «sin marca» (aviso para la pantalla).
    sinMarcas: Boolean(fallas.ads),
  }
}
