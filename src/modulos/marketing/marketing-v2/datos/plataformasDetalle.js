// Canales de marketing · Redes sociales · ¿DÓNDE SE VIERON Y DÓNDE ESCRIBIERON? (mockup_plataformas): la tarjeta de
// plataformas y la ventana de una plataforma. Cálculos puros, probados con node --test. Datos del mes elegido, sin
// reclutamiento (/anuncios-detalle, consulta de ubicaciones). Entrada: lo que da plataformasDe() de anunciosFase2.js:
//   p = { k, nombre, marcas, impresiones, clics, gastado, mensajes, costo, pocos, ubicaciones: [...] }
// «Pocos datos» = menos de 5 mensajes: nunca sale como la más barata ni se usa para recomendar.
import { MIN_MENSAJES, masBarato, POSICION } from './anunciosFase2.js'

const div = (a, b) => (b > 0 ? a / b : null)
const suma = (lista, k) => lista.reduce((n, x) => n + (Number(x[k]) || 0), 0)
const y = (lista) => (lista.length > 1 ? `${lista.slice(0, -1).join(', ')} y ${lista.at(-1)}` : lista[0] ?? '')

/** Qué es cada ubicación de Meta, en pocas palabras. */
export const QUE_ES_UBICACION = {
  feed: 'Inicio, entre publicaciones', facebook_reels: 'Videos verticales', instagram_reels: 'Videos verticales', reels: 'Videos verticales',
  facebook_reels_overlay: 'Anuncio sobre un reel', instagram_profile_reels: 'Reels en el perfil', story: 'Historias de 24 h',
  facebook_stories: 'Historias de 24 h', instagram_stories: 'Historias de 24 h', marketplace: 'Sección de compra y venta',
  video_feeds: 'Sección de videos', instream_video: 'Pausas dentro de videos', search: 'Resultados de búsqueda',
  instagram_search: 'Resultados de búsqueda', instagram_explore: 'Pestaña Explorar', instagram_explore_grid_home: 'Pestaña Explorar',
  right_hand_column: 'Costado derecho en computadora', profile_feed: 'Perfil de una página o persona', facebook_profile_feed: 'Perfil de una página o persona',
  instagram_profile_feed: 'Perfil de una cuenta', facebook_groups_feed: 'Publicaciones de grupos', notification: 'Avisos de la app',
  biz_disco_feed: 'Sección para descubrir negocios', messenger_inbox: 'Bandeja de chats', whatsapp_status: 'Estados de WhatsApp',
  an_classic: 'Apps y sitios de otras empresas', rewarded_video: 'Video a cambio de un premio en apps', unknown: 'Meta no lo dice',
}

/**
 * Tarjeta: totales del mes y, por plataforma, % de impresiones, inversión y mensajes, CTR y CPC. masBarata = la de menor
 * costo por mensaje con 5+ mensajes (o null).
 */
export function resumenPlataformas(plats = []) {
  const total = { impresiones: suma(plats, 'impresiones'), clics: suma(plats, 'clics'), gastado: suma(plats, 'gastado'), mensajes: suma(plats, 'mensajes') }
  total.promedio = div(total.gastado, total.mensajes)
  const filas = plats.map((p) => ({
    ...p, ctr: div(p.clics * 100, p.impresiones), cpc: div(p.gastado, p.clics),
    pctImpresiones: div(p.impresiones * 100, total.impresiones) ?? 0, pctInversion: div(p.gastado * 100, total.gastado) ?? 0, pctMensajes: div(p.mensajes * 100, total.mensajes) ?? 0,
  }))
  return { total, filas, masBarata: masBarato(filas) }
}

/**
 * Frase de lectura: qué plataforma trae más mensajes (y si es la más barata) y cuáles se llevan más inversión de la que
 * rinden en mensajes. '' si el mes no tiene mensajes. formato = cómo se escribe el dinero.
 */
export function lecturaPlataformas(plats = [], formato = (v) => String(v)) {
  const { filas, masBarata } = resumenPlataformas(plats)
  const conMsj = filas.filter((p) => p.mensajes > 0).sort((a, b) => b.mensajes - a.mensajes)
  if (!conMsj.length) return ''
  const top = conMsj[0]
  const deDiez = Math.round(top.pctMensajes / 10)
  const frases = [`${top.nombre} trae ${deDiez >= 10 ? 'todos los mensajes' : deDiez >= 1 ? `${deDiez} de cada 10 mensajes` : `el ${Math.round(top.pctMensajes)} % de los mensajes`}${masBarata?.k === top.k ? ' y es la plataforma más barata' : ''}.`]
  if (masBarata && masBarata.k !== top.k) frases.push(`La más barata es ${masBarata.nombre}: ${formato(masBarata.costo)} por mensaje.`)
  for (const p of filas) {
    const [inv, msj] = [Math.round(p.pctInversion), Math.round(p.pctMensajes)]
    if (inv > msj) frases.push(`${p.nombre} se lleva el ${inv} % de la inversión pero ${msj ? `solo trae el ${msj} %` : 'no trae ninguno'} de los mensajes.`)
  }
  return frases.join(' ')
}

/** Resultado de una plataforma frente al mes: % de la pauta, de las impresiones y de los mensajes; costo vs promedio. */
export function resultadoPlataforma(p, plats = []) {
  const { total, filas } = resumenPlataformas(plats)
  const f = filas.find((x) => x.k === p.k) ?? resumenPlataformas([p]).filas[0]
  return { ...f, promedio: total.promedio, difCosto: !f.pocos && f.costo !== null && total.promedio ? ((f.costo - total.promedio) / total.promedio) * 100 : null }
}

/** Ubicaciones de una plataforma: nombre corto, qué es, impresiones, CTR, mensajes y costo; más mensajes primero. */
export function ubicacionesPlataforma(p) {
  return [...(p.ubicaciones ?? [])].map((u) => ({
    ...u, lugar: p.k === 'otras' ? u.nombre : POSICION[u.posicion] ?? String(u.posicion ?? '').replace(/_/g, ' '),
    queEs: QUE_ES_UBICACION[u.posicion] ?? null, ctr: div(u.clics * 100, u.impresiones),
  })).sort((a, b) => b.mensajes - a.mensajes || b.impresiones - a.impresiones)
}

/**
 * Recomendación calculada para una plataforma: qué ubicación priorizar (la más barata con 5+ mensajes), cuáles también
 * están en meta y cuáles gastaron y casi no traen mensajes. [] si ninguna ubicación tiene 5+ mensajes (no se muestra).
 */
export function recomendacionPlataforma(p, meta, formato = (v) => String(v)) {
  const ubic = ubicacionesPlataforma(p)
  const mejor = masBarato(ubic)
  if (!mejor) return []
  const sal = [`**${mejor.lugar}** es la ubicación más barata (${formato(mejor.costo)} por mensaje): priorizarla en la próxima pauta.`]
  for (const u of ubic) {
    if (u === mejor || u.pocos || u.costo === null) continue
    if (meta && u.costo <= meta) sal.push(`**${u.lugar}** también está en meta (${formato(u.costo)}): mantenerla.`)
    else if (meta) sal.push(`**${u.lugar}** trae mensajes pero ${Math.round(((u.costo - meta) / meta) * 100)} % sobre la meta: bajarle la inversión si se eligen ubicaciones a mano.`)
  }
  const flojas = ubic.filter((u) => u.gastado > 0 && u.mensajes < MIN_MENSAJES).map((u) => u.lugar)
  if (flojas.length) sal.push(`${y([...new Set(flojas)])} casi no ${flojas.length > 1 ? 'traen' : 'trae'} mensajes (menos de ${MIN_MENSAJES}): se ${flojas.length > 1 ? 'pueden' : 'puede'} **quitar** si se eligen ubicaciones a mano.`)
  return sal
}
