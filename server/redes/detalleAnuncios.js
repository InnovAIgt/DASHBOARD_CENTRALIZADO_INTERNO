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
      return franja === null || !f.date_start ? null : `${marca(f)}|${diaSemana(f.date_start)}|${franja}`
    }, (f) => ({ marca: marca(f), dia: diaSemana(f.date_start), franja: franjaDe(f.hourly_stats_aggregated_by_advertiser_time_zone) }))
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

/** Lee el detalle de UNA cuenta publicitaria para el mes. llamar(ruta, parámetros, opciones) = llamarMetaTodo. */
export async function leerDetalle({ cuentaId, mes, hoy, llamar, llamarUno, op, marcaDe }) {
  const act = `/act_${String(cuentaId).replace(/^act_/, '')}`
  const time_range = rangoDias(mes, hoy)
  if (time_range.until < time_range.since) return armarDetalle({ marcaDe })
  const insights = (extra, maxPaginas = 10) => llamar(`${act}/insights`, { level: 'ad', time_range, limit: 500, fields: CAMPOS_FILA, ...extra }, { ...op, maxPaginas })
  const [cuenta, ads, porAnuncio, edadSexo, ubicaciones, horas, conjuntos, campanas] = await Promise.all([
    llamarUno(act, { fields: 'currency,timezone_name' }, op),
    llamar(`${act}/ads`, { fields: 'id,creative{actor_id,object_story_spec{page_id,instagram_user_id},effective_object_story_id,instagram_user_id}' }, op),
    insights({}),
    insights({ breakdowns: 'age,gender' }),
    insights({ breakdowns: 'publisher_platform,platform_position' }),
    insights({ breakdowns: 'hourly_stats_aggregated_by_advertiser_time_zone', time_increment: 1 }, 30),
    llamar(`${act}/adsets`, { fields: 'id,name,campaign_id,daily_budget,lifetime_budget,targeting{age_min,age_max,genders,publisher_platforms,flexible_spec,interests,geo_locations}' }, op),
    llamar(`${act}/campaigns`, { fields: 'id,name,daily_budget,lifetime_budget' }, op),
  ])
  return armarDetalle({ ads, porAnuncio, edadSexo, ubicaciones, horas, conjuntos, campanas, marcaDe,
    moneda: String(cuenta.currency ?? '').toUpperCase() || 'SIN_MONEDA', zonaHoraria: cuenta.timezone_name ?? null })
}
