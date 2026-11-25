/**
 * Canales de marketing · Redes sociales · ANUNCIOS FASE 2 (pedido de Ismael; REDES.md, 7.4). SOLO LECTURA de Meta.
 *
 * Detalle del mes pedido de la cuenta publicitaria (hoy solo act_2035747430056013, USD), SIN reclutamiento:
 *   edadSexo      [{marca, edad, sexo, gastado, mensajes}]               (breakdowns=age,gender)
 *   ubicaciones   [{marca, plataforma, posicion, impresiones, gastado, mensajes}] (publisher_platform,platform_position)
 *   horas         [{marca, dia (0 = lunes), franja (0–11, de 2 h), gastado, mensajes}] (hourly…advertiser_time_zone, día por día)
 *   segmentos     [{id, nombre, campana, marca, publico, gastado, mensajes}] (conjuntos de anuncios y su público)
 *   presupuestos  [{id, campana, marca, presupuestoDiario, presupuestoTotal, gastado, mensajes}]
 *   formularios   [{marca, formularios}] (solo el CONTEO de las acciones «lead»; nunca el contenido: no se usa leads_retrieval)
 * Todo se pide POR ANUNCIO, para saber la marca por la página del anuncio (igual que /anuncios).
 * Las horas vienen en la zona de la cuenta (America/El_Salvador, UTC−6), la misma del dashboard.
 * Funciones puras + el lector de la ruta; probadas con respuestas inventadas.
 */
import { esReclutamiento } from './reclutamiento.js'
import { METRICAS, paginaDelAnuncio } from './transformar.js'

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

/** Suma filas en grupos por clave. */
function agrupar(filas, clave, base) {
  const m = new Map()
  for (const f of filas) {
    const k = clave(f)
    if (k === null) continue
    const g = m.get(k) ?? { ...base(f), gastado: 0, mensajes: 0, impresiones: 0 }
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
  }
}

/**
 * Arma el detalle con las respuestas de Meta. marcaDe: Map página/Instagram → marca. Quita el reclutamiento por el
 * nombre de la campaña.
 */
export function armarDetalle({ ads = [], porAnuncio = [], edadSexo = [], ubicaciones = [], horas = [], conjuntos = [], campanas = [], marcaDe = new Map(), moneda = 'USD', zonaHoraria = null }) {
  const marcaAd = new Map(ads.map((a) => [String(a.id), marcaDe.get(paginaDelAnuncio(a)) ?? '']))
  const marca = (f) => marcaAd.get(String(f.ad_id)) ?? ''
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
      (f) => ({ marca: marca(f), plataforma: f.publisher_platform, posicion: f.platform_position })),
    horas: agrupar(util(horas), (f) => {
      const franja = franjaDe(f.hourly_stats_aggregated_by_advertiser_time_zone)
      return franja === null || !f.date_start ? null : `${marcaFila(f)}|${diaSemana(f.date_start)}|${franja}`
    }, (f) => ({ marca: marcaFila(f), dia: diaSemana(f.date_start), franja: franjaDe(f.hourly_stats_aggregated_by_advertiser_time_zone) }))
      .map(({ impresiones, ...x }) => x),
    segmentos: agrupar(filas, (f) => `${f.adset_id}|${marca(f)}`, (f) => {
      const s = conjuntoPorId.get(String(f.adset_id)) ?? {}
      return { id: `${f.adset_id}-${marca(f) || 'sin'}`, nombre: s.name ?? f.adset_name ?? 'Sin nombre', campana: f.campaign_name, marca: marca(f), publico: publicoDe(s.targeting) }
    }).map(({ impresiones, ...x }) => x),
    presupuestos: agrupar(filas, (f) => `${f.campaign_id}|${marca(f)}`, (f) => ({ id: `${f.campaign_id}-${marca(f) || 'sin'}`, campana: f.campaign_name, marca: marca(f),
      ...presupuestoCampana(f.campaign_id) })).map(({ impresiones, ...x }) => x),
    formularios: [...filas.reduce((m, f) => m.set(marca(f), (m.get(marca(f)) ?? 0) + formulariosDe(f)), new Map())].map(([m, n]) => ({ marca: m, formularios: n })),
  }
}

/** Rango del mes en fechas de la cuenta (AAAA-MM-DD), sin pasar de hoy. */
export function rangoDias(mes, hoy) {
  const [a, m] = String(mes).split('-').map(Number)
  const fin = new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10)
  return { since: `${mes}-01`, until: hoy && hoy < fin ? hoy : fin }
}

const CAMPOS_FILA = 'ad_id,adset_id,adset_name,campaign_id,campaign_name,spend,impressions,actions'

/** Límite total del detalle (la función de Vercel corta a los 60 s) y de la consulta de horarios. */
export const LIMITE_DETALLE_MS = 45_000
export const LIMITE_HORAS_MS = 20_000
export const CACHE_CONSULTA_MS = 30 * 60 * 1000
/** De cuántas consultas a la vez se piden (no todas en paralelo: Meta responde código 2 con consultas pesadas juntas). */
export const CONSULTAS_A_LA_VEZ = 2

/** Qué recuadros dependen de cada consulta: si una falla, solo esos muestran el error. */
export const RECUADROS = {
  porAnuncio: ['presupuestos', 'segmentos', 'formularios'],
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
    ads: () => llamar(`${act}/ads`, { fields: 'id,campaign_id,creative{actor_id,object_story_spec{page_id,instagram_user_id},effective_object_story_id,instagram_user_id}' }, opT),
    porAnuncio: () => insights({}),
    campanas: () => llamar(`${act}/campaigns`, { fields: 'id,name,daily_budget,lifetime_budget' }, opT),
    conjuntos: () => llamar(`${act}/adsets`, { fields: 'id,name,campaign_id,daily_budget,lifetime_budget,targeting{age_min,age_max,genders,publisher_platforms,flexible_spec,interests,geo_locations}' }, opT),
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
    if (copia && ahora() - copia.en < CACHE_CONSULTA_MS) return { ok: true, valor: copia.valor }
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
      conjuntos: datos.conjuntos ?? [], campanas: datos.campanas ?? [], marcaDe, moneda: String(cuenta.currency ?? '').toUpperCase() || 'USD', zonaHoraria: cuenta.timezone_name ?? null }),
    errores,
    guardados: [...new Set(guardados.flatMap((k) => RECUADROS[k] ?? []))],
    // Sin la lista de anuncios no se sabe la marca de cada fila: todo sale «sin marca» (aviso para la pantalla).
    sinMarcas: Boolean(fallas.ads),
  }
}
