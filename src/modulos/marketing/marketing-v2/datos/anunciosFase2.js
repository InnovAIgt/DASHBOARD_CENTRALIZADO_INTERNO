// Canales de marketing · Redes sociales · ANUNCIOS (fase 2, pedido de Ismael): cálculos con DATOS REALES de Meta.
//   Ruta /api/marketing/redes/anuncios (por campaña): indicadores y tabla.
//   Ruta /api/marketing/redes/anuncios-detalle?mes= (por anuncio, sin reclutamiento): edad y sexo, plataforma y
//   ubicación, horarios (día y franja de 2 h, zona de la cuenta = UTC−6), segmentaciones (conjuntos de anuncios),
//   presupuestos y formularios (solo el conteo).
// Regla de Keily (24/11/2026): un grupo con MENOS DE 5 MENSAJES se marca «pocos datos» y nunca sale como ganador.
// Sin pantalla ni red; se prueba con node --test.
import { semaforoCosto } from './redesVista.js'

export const MIN_MENSAJES = 5
export const EDADES = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+']
const PLATAFORMA = { facebook: 'Facebook', instagram: 'Instagram', messenger: 'Messenger', audience_network: 'Audience Network', whatsapp: 'WhatsApp', threads: 'Threads' }
const RED_DE = { facebook: 'fb', instagram: 'ig' }
const POSICION = { feed: 'Feed', story: 'Stories', facebook_stories: 'Stories', instagram_stories: 'Stories', facebook_reels: 'Reels', instagram_reels: 'Reels',
  reels: 'Reels', marketplace: 'Marketplace', video_feeds: 'Videos', instagram_explore: 'Explorar', instagram_explore_grid_home: 'Explorar', search: 'Búsqueda',
  right_hand_column: 'Columna derecha', an_classic: 'Clásico', rewarded_video: 'Video con premio', messenger_inbox: 'Bandeja', profile_feed: 'Perfil',
  instagram_profile_feed: 'Perfil', facebook_profile_feed: 'Perfil', whatsapp_status: 'Estados', unknown: 'Sin dato',
  facebook_reels_overlay: 'Reels (anuncio sobre el reel)', instream_video: 'Video in-stream', instagram_search: 'Búsqueda', notification: 'Notificaciones',
  biz_disco_feed: 'Descubrir negocios', facebook_groups_feed: 'Grupos', instagram_profile_reels: 'Reels del perfil' }

const div = (a, b) => (b > 0 ? a / b : null)
const conCosto = (g) => ({ ...g, costo: div(g.gastado, g.mensajes), pocos: g.mensajes < MIN_MENSAJES })
/** El más barato entre los que tienen 5 o más mensajes (nunca uno con «pocos datos»). */
export const masBarato = (grupos = []) => grupos.filter((g) => !g.pocos && g.costo !== null).reduce((a, b) => (!a || b.costo < a.costo ? b : a), null)

/** Totales con forma real: impresiones, alcance, frecuencia, clics, CTR, CPC y costo por mensaje (una moneda). */
export function indicadoresAnuncios(anuncios = []) {
  const suma = (k) => anuncios.reduce((n, a) => n + (Number(a[k]) || 0), 0)
  const impresiones = suma('visualizaciones')
  const alcance = suma('alcance')
  const clics = suma('clics')
  const gastado = suma('gastado')
  const mensajes = suma('mensajes')
  return { impresiones, alcance, frecuencia: div(impresiones, alcance), clics, ctr: div(clics * 100, impresiones), gastado, cpc: div(gastado, clics), mensajes, costoMensaje: div(gastado, mensajes) }
}

/** Moneda principal de la selección (la de más campañas) y las campañas de esa moneda; nunca se mezclan monedas. */
export function monedaPrincipal(anuncios = []) {
  const cuenta = new Map()
  for (const a of anuncios) cuenta.set(a.moneda, (cuenta.get(a.moneda) ?? 0) + 1)
  const moneda = [...cuenta].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  return { moneda, campanas: anuncios.filter((a) => a.moneda === moneda), otras: [...cuenta.keys()].filter((m) => m !== moneda) }
}

/**
 * Filtra el detalle por marca y país (las filas «sin página» solo salen sin esos filtros) y, en ubicaciones, por red.
 * @param {object} detalle respuesta de /anuncios-detalle (una cuenta)
 */
export function filtrarDetalle(detalle, filtros = {}, paisDe = {}) {
  if (!detalle) return null
  const pasa = (x) => (!filtros.marca || x.marca === filtros.marca) && (!filtros.pais || paisDe[x.marca] === filtros.pais)
  const f = (lista) => (lista ?? []).filter(pasa)
  return { ...detalle, edadSexo: f(detalle.edadSexo), horas: f(detalle.horas), segmentos: f(detalle.segmentos), presupuestos: f(detalle.presupuestos), formularios: f(detalle.formularios),
    ubicaciones: f(detalle.ubicaciones).filter((u) => !filtros.red || RED_DE[u.plataforma] === filtros.red) }
}

/** Edad y sexo: por rango de edad, mensajes de hombres y mujeres, gasto, costo por mensaje y «pocos datos». */
export function edadesDe(edadSexo = []) {
  const rangos = [...new Set([...EDADES, ...edadSexo.map((x) => x.edad)])].filter((e) => e && e !== 'Unknown')
  return rangos.map((edad) => {
    const q = edadSexo.filter((x) => x.edad === edad)
    const m = (s) => q.filter((x) => x.sexo === s).reduce((n, x) => n + x.mensajes, 0)
    return conCosto({ edad: edad.replace('-', '–'), hombres: m('hombres'), mujeres: m('mujeres'), sinDato: m('sin dato'),
      gastado: q.reduce((n, x) => n + x.gastado, 0), mensajes: q.reduce((n, x) => n + x.mensajes, 0) })
  }).filter((e) => e.gastado > 0 || e.mensajes > 0)
}

/** Plataforma y ubicación: agrupadas, con impresiones, mensajes, costo por mensaje y «pocos datos». */
export function ubicacionesDe(ubicaciones = []) {
  const m = new Map()
  for (const u of ubicaciones) {
    const clave = `${u.plataforma}|${u.posicion}`
    const g = m.get(clave) ?? { clave, nombre: `${PLATAFORMA[u.plataforma] ?? u.plataforma} · ${POSICION[u.posicion] ?? String(u.posicion ?? '').replace(/_/g, ' ')}`,
      red: RED_DE[u.plataforma] ?? 'otra', impresiones: 0, gastado: 0, mensajes: 0 }
    g.impresiones += u.impresiones ?? 0
    g.gastado += u.gastado
    g.mensajes += u.mensajes
    m.set(clave, g)
  }
  return [...m.values()].map(conCosto).sort((a, b) => b.impresiones - a.impresiones)
}

/** Horarios: matriz 7 días (lunes primero) × 12 franjas de 2 h con mensajes; el mejor solo si tiene 5+ mensajes. */
export function horasDe(horas = []) {
  const matriz = Array.from({ length: 7 }, () => Array(12).fill(0))
  for (const h of horas) if (h.dia >= 0 && h.dia < 7 && h.franja >= 0 && h.franja < 12) matriz[h.dia][h.franja] += h.mensajes
  let mejor = null
  matriz.forEach((fila, d) => fila.forEach((v, b) => { if (v >= MIN_MENSAJES && (!mejor || v > mejor.mensajes)) mejor = { dia: d, franja: b, mensajes: v } }))
  return { matriz, mejor, total: matriz.flat().reduce((n, v) => n + v, 0) }
}

/** Segmentaciones: conjuntos con su público y costo por mensaje; ganadores primero, «pocos datos» al final. */
export const segmentosDe = (segmentos = [], moneda) => segmentos.map((s) => ({ ...conCosto(s), semaforo: semaforoCosto(div(s.gastado, s.mensajes), moneda) }))
  .sort((a, b) => (a.pocos - b.pocos) || ((a.costo ?? Infinity) - (b.costo ?? Infinity)))

/** Texto corto del público de un conjunto. */
export const textoPublico = (p = {}) => [p.edad && `Edad ${p.edad}`, p.sexo, p.ubicaciones === 'Automáticas' ? 'ubicaciones automáticas' : p.ubicaciones,
  p.paises?.length ? p.paises.join(', ') : null, p.intereses?.length ? `intereses: ${p.intereses.slice(0, 3).join(', ')}${p.intereses.length > 3 ? ` (+${p.intereses.length - 3})` : ''}` : null]
  .filter(Boolean).join(' · ')

/** Presupuestos: cada campaña con su presupuesto (diario o total), gasto, mensajes, costo, semáforo y «pocos datos». */
export const presupuestosDe = (presupuestos = [], moneda) => presupuestos.map((p) => {
  const g = conCosto(p)
  return { ...g, moneda, semaforo: g.pocos ? null : semaforoCosto(g.costo, moneda) }
})

/** Formularios (solo el conteo de Meta) de las filas filtradas. */
export const formulariosDe = (formularios = []) => formularios.reduce((n, f) => n + (Number(f.formularios) || 0), 0)
