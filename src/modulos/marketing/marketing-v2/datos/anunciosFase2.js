// Canales de marketing · Redes sociales · ANUNCIOS (fase 2, pedido de Ismael): cálculos con DATOS REALES de Meta.
//   Ruta /api/marketing/redes/anuncios (por campaña): indicadores y tabla.
//   Ruta /api/marketing/redes/anuncios-detalle?mes= (por anuncio, sin reclutamiento): edad y sexo, plataforma y
//   ubicación, horarios (día y franja de 2 h, zona de la cuenta = UTC−6), segmentaciones (conjuntos de anuncios),
//   presupuestos y formularios (solo el conteo).
// Regla de Keily (24/11/2026): un grupo con MENOS DE 5 MENSAJES se marca «pocos datos» y nunca sale como ganador.
// Sin pantalla ni red; se prueba con node --test.
import { semaforoCosto } from './redesVista.js'
import { nombreCampana, tituloLimpio } from './redes.js'
import { textoNormal } from './palabrasTalCual.js'

export const MIN_MENSAJES = 5
export const EDADES = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+']
export const PLATAFORMA = { facebook: 'Facebook', instagram: 'Instagram', messenger: 'Messenger', audience_network: 'Audience Network', whatsapp: 'WhatsApp', threads: 'Threads' }
const RED_DE = { facebook: 'fb', instagram: 'ig' }
export const POSICION = { feed: 'Feed', story: 'Stories', facebook_stories: 'Stories', instagram_stories: 'Stories', facebook_reels: 'Reels', instagram_reels: 'Reels',
  reels: 'Reels', marketplace: 'Marketplace', video_feeds: 'Videos', instagram_explore: 'Explorar', instagram_explore_grid_home: 'Explorar', search: 'Búsqueda',
  right_hand_column: 'Columna derecha', an_classic: 'Clásico', rewarded_video: 'Video con premio', messenger_inbox: 'Bandeja', profile_feed: 'Perfil',
  instagram_profile_feed: 'Perfil', facebook_profile_feed: 'Perfil', whatsapp_status: 'Estados', unknown: 'Sin dato',
  facebook_reels_overlay: 'Reels (anuncio sobre el reel)', instream_video: 'Video in-stream', instagram_search: 'Búsqueda', notification: 'Notificaciones',
  biz_disco_feed: 'Descubrir negocios', facebook_groups_feed: 'Grupos', instagram_profile_reels: 'Reels del perfil' }

const div = (a, b) => (b > 0 ? a / b : null)
export const conCosto = (g) => ({ ...g, costo: div(g.gastado, g.mensajes), pocos: g.mensajes < MIN_MENSAJES })
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
      red: RED_DE[u.plataforma] ?? 'otra', plataforma: u.plataforma, posicion: u.posicion, impresiones: 0, clics: 0, gastado: 0, mensajes: 0 }
    g.impresiones += u.impresiones ?? 0
    g.clics += u.clics ?? 0
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

// ---------- Rediseño (mockup_redes_completo): momentos del día, recomendación, pirámide y plataformas ----------

export const DIAS_LARGOS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
/** 4 momentos del día (franjas de 2 h: 0–2 = madrugada, 3–5 = mañana, 6–8 = tarde, 9–11 = noche). */
export const MOMENTOS = [
  { k: 'madrugada', nombre: 'Madrugada', horas: '0 a 6 h', franjas: [0, 1, 2], desde: 0, hasta: 6 },
  { k: 'manana', nombre: 'Mañana', horas: '6 a 12 h', franjas: [3, 4, 5], desde: 6, hasta: 12 },
  { k: 'tarde', nombre: 'Tarde', horas: '12 a 18 h', franjas: [6, 7, 8], desde: 12, hasta: 18 },
  { k: 'noche', nombre: 'Noche', horas: '18 a 24 h', franjas: [9, 10, 11], desde: 18, hasta: 24 },
]
const momentoDe = (franja) => MOMENTOS.find((m) => m.franjas.includes(franja))

/** Mensajes y gasto por momento del día, por día de la semana y por día×momento (para el top 3). */
export function horariosAnuncios(horas = []) {
  const momentos = MOMENTOS.map((m) => {
    const q = horas.filter((h) => m.franjas.includes(h.franja))
    return conCosto({ ...m, mensajes: q.reduce((n, h) => n + h.mensajes, 0), gastado: q.reduce((n, h) => n + (h.gastado ?? 0), 0) })
  })
  const dias = DIAS_LARGOS.map((nombre, d) => {
    const q = horas.filter((h) => h.dia === d)
    return conCosto({ dia: d, nombre, mensajes: q.reduce((n, h) => n + h.mensajes, 0), gastado: q.reduce((n, h) => n + (h.gastado ?? 0), 0) })
  })
  const celdas = new Map()
  for (const h of horas) {
    const m = momentoDe(h.franja)
    if (!m) continue
    const k = `${h.dia}|${m.k}`
    const c = celdas.get(k) ?? { dia: h.dia, momento: m, mensajes: 0, gastado: 0 }
    c.mensajes += h.mensajes
    c.gastado += h.gastado ?? 0
    celdas.set(k, c)
  }
  const top = [...celdas.values()].filter((c) => c.mensajes > 0).sort((a, b) => b.mensajes - a.mensajes || a.gastado - b.gastado).slice(0, 3).map(conCosto)
  return { momentos, dias, top, total: horas.reduce((n, h) => n + h.mensajes, 0) }
}

/** «de lunes a miércoles» o «lunes, miércoles y viernes». */
export function textoDias(ds = []) {
  const o = [...ds].sort((a, b) => a - b)
  if (!o.length) return ''
  const seguidos = o.every((d, i) => i === 0 || d === o[i - 1] + 1)
  if (o.length >= 3 && seguidos) return `de ${DIAS_LARGOS[o[0]]} a ${DIAS_LARGOS[o.at(-1)]}`
  const n = o.map((d) => DIAS_LARGOS[d])
  return n.length === 1 ? `los ${n[0]}` : `${n.slice(0, -1).join(', ')} y ${n.at(-1)}`
}

/**
 * Recomendación calculada: el momento con más mensajes (5+) y, dentro de él, los días que traen al menos el promedio.
 * Devuelve { momento, dias, mensajes, costo } o null si hay pocos datos.
 */
export function recomendacionHorario(horas = []) {
  const { momentos } = horariosAnuncios(horas)
  const mejor = momentos.filter((m) => !m.pocos).sort((a, b) => b.mensajes - a.mensajes || (a.costo ?? Infinity) - (b.costo ?? Infinity))[0]
  if (!mejor) return null
  const porDia = DIAS_LARGOS.map((_, d) => {
    const q = horas.filter((h) => h.dia === d && mejor.franjas.includes(h.franja))
    return { d, mensajes: q.reduce((n, h) => n + h.mensajes, 0), gastado: q.reduce((n, h) => n + (h.gastado ?? 0), 0) }
  })
  const promedio = porDia.reduce((n, x) => n + x.mensajes, 0) / 7
  const elegidos = porDia.filter((x) => x.mensajes > 0 && x.mensajes >= promedio)
  const mensajes = elegidos.reduce((n, x) => n + x.mensajes, 0)
  const gastado = elegidos.reduce((n, x) => n + x.gastado, 0)
  return { momento: mejor, dias: elegidos.map((x) => x.d), mensajes, costo: mensajes ? gastado / mensajes : null }
}

/**
 * Pirámide de edad y sexo: por rango, mensajes, gasto, costo y «pocos datos» de hombres y de mujeres; totales arriba
 * y la frase de lectura.
 */
export function piramideEdadSexo(edadSexo = []) {
  const rangos = [...new Set([...EDADES, ...edadSexo.map((x) => x.edad)])].filter((e) => e && e !== 'Unknown')
  const grupo = (edad, sexo) => {
    const q = edadSexo.filter((x) => x.edad === edad && x.sexo === sexo)
    return conCosto({ edad: edad.replace('-', '–'), sexo, mensajes: q.reduce((n, x) => n + x.mensajes, 0), gastado: q.reduce((n, x) => n + x.gastado, 0) })
  }
  const filas = rangos.map((edad) => {
    const hombres = grupo(edad, 'hombres')
    const mujeres = grupo(edad, 'mujeres')
    const total = conCosto({ mensajes: hombres.mensajes + mujeres.mensajes, gastado: hombres.gastado + mujeres.gastado })
    return { edad: edad.replace('-', '–'), hombres, mujeres, costo: total.costo, pocos: total.pocos, mensajes: total.mensajes, gastado: total.gastado }
  }).filter((f) => f.gastado > 0 || f.mensajes > 0)
  const suma = (sexo, k) => filas.reduce((n, f) => n + f[sexo][k], 0)
  const total = suma('hombres', 'mensajes') + suma('mujeres', 'mensajes')
  const tot = (sexo) => ({ ...conCosto({ mensajes: suma(sexo, 'mensajes'), gastado: suma(sexo, 'gastado') }), pct: total ? (suma(sexo, 'mensajes') / total) * 100 : 0 })
  const grupos = filas.flatMap((f) => [f.hombres, f.mujeres])
  const barato = masBarato(grupos)
  const masMensajes = grupos.filter((g) => !g.pocos).sort((a, b) => b.mensajes - a.mensajes)[0] ?? null
  const hombres = tot('hombres')
  const mujeres = tot('mujeres')
  const partes = []
  if (total) {
    partes.push(`${Math.round(hombres.pct)} % de los mensajes vienen de hombres${grupos.filter((g) => g.sexo === 'mujeres').every((g) => g.pocos) ? '; las mujeres tienen pocos datos en todas las edades' : ` y ${Math.round(mujeres.pct)} % de mujeres`}.`)
    if (barato) partes.push(`El grupo más barato es ${barato.edad} ${barato.sexo}${masMensajes ? ` y el que más mensajes trae es ${masMensajes.edad} ${masMensajes.sexo}` : ''}.`)
  }
  return { filas, hombres, mujeres, barato, masMensajes, frase: partes.join(' '), max: Math.max(1, ...grupos.map((g) => g.mensajes)) }
}

/** Plataformas (¿Dónde se vieron?): Facebook, Instagram, WhatsApp y Otras, cada una con sus ubicaciones. */
export function plataformasDe(ubicaciones = []) {
  const grupoDe = (p) => (p === 'facebook' ? 'facebook' : p === 'instagram' ? 'instagram' : p === 'whatsapp' ? 'whatsapp' : 'otras')
  const nombres = { facebook: 'Facebook', instagram: 'Instagram', whatsapp: 'WhatsApp', otras: 'Otras' }
  return ['facebook', 'instagram', 'whatsapp', 'otras'].map((k) => {
    const q = ubicaciones.filter((u) => grupoDe(u.plataforma) === k)
    return { k, nombre: nombres[k], marcas: [...new Set(q.map((u) => u.marca).filter(Boolean))], ...conCosto({ impresiones: q.reduce((n, u) => n + (u.impresiones ?? 0), 0), clics: q.reduce((n, u) => n + (u.clics ?? 0), 0), mensajes: q.reduce((n, u) => n + u.mensajes, 0), gastado: q.reduce((n, u) => n + u.gastado, 0) }),
      ubicaciones: ubicacionesDe(q) }
  }).filter((p) => p.impresiones > 0 || p.mensajes > 0)
}

/** Objetivo de campaña de Meta en español. */
export const OBJETIVOS = {
  OUTCOME_ENGAGEMENT: 'Interacción', OUTCOME_TRAFFIC: 'Tráfico', OUTCOME_LEADS: 'Clientes potenciales', OUTCOME_AWARENESS: 'Reconocimiento',
  OUTCOME_SALES: 'Ventas', OUTCOME_APP_PROMOTION: 'Promoción de app', MESSAGES: 'Mensajes', LINK_CLICKS: 'Clics en el enlace', POST_ENGAGEMENT: 'Interacción con la publicación',
  LEAD_GENERATION: 'Clientes potenciales', REACH: 'Alcance', BRAND_AWARENESS: 'Reconocimiento', VIDEO_VIEWS: 'Reproducciones de video', CONVERSIONS: 'Conversiones', PAGE_LIKES: 'Me gusta de la página',
}
export const objetivoTexto = (o) => (o ? OBJETIVOS[o] ?? String(o).replace(/^OUTCOME_/, '').toLowerCase().replace(/_/g, ' ') : null)

/**
 * Cómo se nombra una campaña en Anuncios (Presupuestos, Segmentaciones, tabla y ventanas): el TÍTULO es el texto
 * promocionado (de la publicación o del anuncio que más gastó); debajo, «Campaña: <nombre limpio> · <objetivo>». Sin texto
 * promocionado, el título es el nombre de la campaña. tip = el texto completo (o el nombre en Meta).
 * @returns {{titulo: string, sub: string|null, tip: string}}
 */
export function nombreConTexto({ texto, campana, objetivo }) {
  // Sin comodines de Meta («{{user_first_name}}»): no son texto; si no queda nada, se usa el nombre de la campaña.
  const limpio = String(texto ?? '').replace(/\{\{[^}]*\}\}/g, ' ').replace(/\s+/g, ' ').replace(/\s+([,.;:!?])/g, '$1').trim()
  const t = limpio.replace(/[\s,.:;!¡?¿-]/g, '') ? textoNormal(tituloLimpio(limpio)) : ''
  const obj = objetivoTexto(objetivo)
  if (t) return { titulo: t, sub: [`Campaña: ${nombreCampana(campana)}`, obj].filter(Boolean).join(' · '), tip: texto }
  return { titulo: nombreCampana(campana), sub: obj ? `Campaña · ${obj}` : null, tip: campana }
}
