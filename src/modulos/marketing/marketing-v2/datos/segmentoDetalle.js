// Canales de marketing · Redes sociales · VENTANA DE UNA SEGMENTACIÓN (mockup_detalle_segmentacion). Cálculos puros,
// probados con node --test. Datos del mes elegido, sin reclutamiento (vienen de /anuncios-detalle por conjunto):
//   seg = { campana, nombre (conjunto), marca, publico, gastado, mensajes, costo, pocos, conjunto, campanaInfo,
//           resultados: {alcance, frecuencia, impresiones, clics}, porEdadSexo, porPlataforma, porFranja, anuncios }
// «Pocos datos» = menos de 5 mensajes: se dice y nunca se usa para recomendar.
import { conCosto, MIN_MENSAJES, MOMENTOS, PLATAFORMA, POSICION } from './anunciosFase2.js'

const div = (a, b) => (b > 0 ? a / b : null)
const suma = (lista, k) => lista.reduce((n, x) => n + (Number(x[k]) || 0), 0)
export const FRECUENCIA_ALTA = 3
const SEXOS = { hombres: 'Hombres', mujeres: 'Mujeres' }
export const ESTADOS_META = { ACTIVE: 'Activo', PAUSED: 'Pausado', CAMPAIGN_PAUSED: 'Campaña pausada', ADSET_PAUSED: 'Conjunto pausado', ARCHIVED: 'Archivado',
  DELETED: 'Borrado', IN_PROCESS: 'En proceso', WITH_ISSUES: 'Con problemas', PENDING_REVIEW: 'En revisión', DISAPPROVED: 'Rechazado' }
const TIPOS = { VIDEO: 'Video', PHOTO: 'Imagen', SHARE: 'Enlace', STATUS: 'Texto', OFFER: 'Oferta', EVENT: 'Evento' }

/** Formato del anuncio: tipo de creatividad · posición donde más se vio («Video · Reels»). */
export const formatoAnuncio = (a) => [TIPOS[a.tipo] ?? (a.tipo ? String(a.tipo).toLowerCase() : null), POSICION[a.posicion] ?? null].filter(Boolean).join(' · ') || '—'

/** Leads estimados de un anuncio: los de la publicación que promociona (si es una publicación del mes). */
export const leadsDeAnuncio = (a, leadsDePub) => (a.publicacion ? leadsDePub(`fb-${a.publicacion}`) : [])

/**
 * Resultados del público: inversión y mensajes (y su parte del mes), costo vs el promedio del mes, alcance, frecuencia,
 * CTR, CPC, leads estimados (sin repetir) y costo por lead. todos = las segmentaciones del mes (mismos filtros).
 */
export function resultadosSegmento(seg, todos = [], leadsDePub = () => []) {
  const totalGasto = suma(todos, 'gastado')
  const totalMsj = suma(todos, 'mensajes')
  const promedio = div(totalGasto, totalMsj)
  const r = seg.resultados ?? {}
  const anuncios = seg.anuncios ?? []
  const impresiones = r.impresiones || suma(anuncios, 'impresiones')
  const clics = r.clics || suma(anuncios, 'clics')
  const alcance = r.alcance || null
  const leads = [...new Map(anuncios.flatMap((a) => leadsDeAnuncio(a, leadsDePub)).map((l) => [l.codigo, l])).values()]
  return {
    gastado: seg.gastado, mensajes: seg.mensajes, costo: seg.costo, pocos: seg.pocos,
    pctInversion: div(seg.gastado * 100, totalGasto), pctMensajes: div(seg.mensajes * 100, totalMsj), promedio,
    difCosto: seg.costo !== null && promedio ? ((seg.costo - promedio) / promedio) * 100 : null,
    alcance, frecuencia: r.frecuencia ?? div(impresiones, alcance), impresiones, clics,
    ctr: div(clics * 100, impresiones), cpc: div(seg.gastado, clics), leads, costoLead: div(seg.gastado, leads.length),
  }
}

/** Dentro del público, por edad: mensajes de hombres, mujeres y sin dato, costo y «pocos datos». */
export function edadesSegmento(seg) {
  const filas = seg.porEdadSexo ?? []
  const edades = [...new Set(filas.map((f) => f.edad))].sort((a, b) => (a === 'Unknown') - (b === 'Unknown') || String(a).localeCompare(String(b)))
  const salida = edades.map((edad) => {
    const q = filas.filter((f) => f.edad === edad)
    const de = (sexo) => suma(q.filter((f) => f.sexo === sexo), 'mensajes')
    return conCosto({ edad: edad === 'Unknown' ? 'Sin dato' : String(edad).replace('-', '–'), hombres: de('hombres'), mujeres: de('mujeres'), sinDato: de('sin dato'),
      mensajes: suma(q, 'mensajes'), gastado: suma(q, 'gastado') })
  }).filter((f) => f.mensajes > 0 || f.gastado > 0)
  const total = suma(filas, 'mensajes')
  return { filas: salida, pctHombres: div(suma(filas.filter((f) => f.sexo === 'hombres'), 'mensajes') * 100, total), pctMujeres: div(suma(filas.filter((f) => f.sexo === 'mujeres'), 'mensajes') * 100, total) }
}

/** Por plataforma (Facebook, Instagram, WhatsApp…): mensajes, costo y «pocos datos». */
export const plataformasSegmento = (seg) => (seg.porPlataforma ?? []).map((p) => conCosto({ nombre: PLATAFORMA[p.plataforma] ?? p.plataforma, mensajes: p.mensajes, gastado: p.gastado }))
  .filter((p) => p.mensajes > 0 || p.gastado > 0).sort((a, b) => b.mensajes - a.mensajes)

/** Por momento del día (madrugada, mañana, tarde, noche; zona de la cuenta). */
export const momentosSegmento = (seg) => MOMENTOS.map((m) => {
  const q = (seg.porFranja ?? []).filter((f) => m.franjas.includes(f.franja))
  return conCosto({ k: m.k, nombre: m.nombre, horas: m.horas, desde: m.desde, hasta: m.hasta, mensajes: suma(q, 'mensajes'), gastado: suma(q, 'gastado') })
}).filter((m) => m.mensajes > 0 || m.gastado > 0).sort((a, b) => b.mensajes - a.mensajes)

/** El grupo edad×sexo que más mensajes trajo (5+), y si además fue el más barato. */
function quienRespondio(seg) {
  const grupos = (seg.porEdadSexo ?? []).filter((g) => g.edad !== 'Unknown' && SEXOS[g.sexo]).map((g) => conCosto({ ...g, edad: String(g.edad).replace('-', '–') }))
  const buenos = grupos.filter((g) => !g.pocos)
  if (!buenos.length) return null
  const mas = buenos.reduce((a, b) => (b.mensajes > a.mensajes ? b : a))
  const barato = buenos.reduce((a, b) => (b.costo < a.costo ? b : a))
  return { ...mas, tambienBarato: mas === barato }
}

/**
 * Lectura para Marketing: 3 frases calculadas (qué funcionó, qué tener en cuenta, quién respondió). textos con «**»
 * para lo que va resaltado. dinero = función que escribe la moneda.
 */
export function lecturaSegmento(seg, res, todos, dinero) {
  const buenos = todos.filter((s) => !s.pocos && s.costo !== null)
  const masEficiente = !seg.pocos && buenos.length > 1 && buenos.every((s) => s.costo >= seg.costo)
  const r = Math.round
  const funciono = seg.pocos
    ? `Pocos datos todavía: **${seg.mensajes} ${seg.mensajes === 1 ? 'mensaje' : 'mensajes'}** (menos de ${MIN_MENSAJES}); no alcanza para sacar conclusiones.`
    : `Con **${r(res.pctInversion ?? 0)} % de la inversión** trajo el **${r(res.pctMensajes ?? 0)} % de los mensajes**.${masEficiente ? ' Es el público más eficiente del mes.' : res.difCosto !== null ? ` Su costo por mensaje está ${r(Math.abs(res.difCosto))} % ${res.difCosto <= 0 ? 'por debajo' : 'por encima'} del promedio del mes.` : ''}`
  const f = res.frecuencia
  const vigilar = f === null || f === undefined
    ? 'Meta no dio la frecuencia de este público.'
    : f > FRECUENCIA_ALTA
      ? `Frecuencia **${f.toFixed(1)}**: cada persona ya lo vio más de ${FRECUENCIA_ALTA} veces y suele empezar a cansar. Conviene cambiar el anuncio.`
      : `Frecuencia **${f.toFixed(1)}**: cada persona lo vio ${f >= 1.5 ? `casi ${Math.ceil(f)} veces` : 'una vez'}. Arriba de ${FRECUENCIA_ALTA} suele empezar a cansar.`
  const q = quienRespondio(seg)
  const respondio = q
    ? `**${SEXOS[q.sexo]} de ${q.edad}** trajeron más mensajes${q.tambienBarato ? ` y a menor costo (${dinero(q.costo)})` : ` (${q.mensajes}, a ${dinero(q.costo)} c/u)`}.`
    : `Todavía ningún grupo de edad y sexo llega a ${MIN_MENSAJES} mensajes.`
  return [
    { k: 'funciono', titulo: 'Lo que funcionó', texto: funciono },
    { k: 'vigilar', titulo: 'A tener en cuenta', texto: vigilar, alerta: f > FRECUENCIA_ALTA },
    { k: 'respondio', titulo: 'Quién respondió', texto: respondio },
  ]
}

/** Comparado con los otros públicos del mes: este, los demás con 5+ mensajes, el promedio y la meta. */
export function comparacionSegmento(seg, todos, promedio, meta, nombre) {
  return [
    { id: 'este', nombre: 'Este público', costo: seg.costo, pocos: seg.pocos, este: true },
    ...todos.filter((s) => s.id !== seg.id && !s.pocos && s.costo !== null).map((s) => ({ id: s.id, nombre: nombre(s), costo: s.costo, pocos: false })),
    { id: 'promedio', nombre: 'Promedio del mes', costo: promedio, pocos: false, gris: true },
    ...(meta ? [{ id: 'meta', nombre: 'Meta (por confirmar)', costo: meta, pocos: false, meta: true }] : []),
  ]
}

/**
 * Recomendación para la próxima pauta: solo con datos suficientes (5+ mensajes). Devuelve [] si no hay nada que decir
 * (la ventana entonces no la muestra). textos con «**» para lo resaltado.
 */
export function recomendacionesSegmento(seg, res) {
  const sal = []
  const edades = edadesSegmento(seg).filas
  const buenasEdades = edades.filter((e) => !e.pocos && e.edad !== 'Sin dato' && e.costo !== null)
  if (buenasEdades.length >= 2) {
    const mejor = buenasEdades.reduce((a, b) => (b.costo < a.costo ? b : a))
    sal.push(`Repetir este público (**${seg.publico?.edad ?? 'mismas edades'}**) y probar acotarlo a **${mejor.edad}**, que fue la edad más barata.`)
  }
  const anuncios = (seg.anuncios ?? []).map((a) => conCosto({ ...a, formato: formatoAnuncio(a) })).filter((a) => !a.pocos && a.costo !== null)
  const formatos = [...new Map(anuncios.map((a) => [a.formato, a])).values()]
  if (formatos.length >= 2) {
    const orden = [...formatos].sort((a, b) => a.costo - b.costo)
    const [mejor, otro] = [orden[0], orden.at(-1)]
    const ahorro = Math.round(((otro.costo - mejor.costo) / otro.costo) * 100)
    if (ahorro > 0) sal.push(`Darle más presupuesto al formato **${mejor.formato.toLowerCase()}**: trajo mensajes ${ahorro} % más baratos que ${otro.formato.toLowerCase()}.`)
  }
  const momentos = momentosSegmento(seg).filter((m) => !m.pocos && m.costo !== null)
  if (momentos.length >= 2) {
    const mejor = momentos.reduce((a, b) => (b.mensajes > a.mensajes || (b.mensajes === a.mensajes && b.costo < a.costo) ? b : a))
    sal.push(`Concentrar la pauta en la **${mejor.nombre.toLowerCase()} (${mejor.desde} a ${mejor.hasta} h)**, cuando más escribieron.`)
  }
  const f = res.frecuencia
  if (sal.length && f) sal.push(f > FRECUENCIA_ALTA ? `La frecuencia ya pasó de **${FRECUENCIA_ALTA}** (${f.toFixed(1)}): cambiar el anuncio o ampliar el público.` : `Vigilar la frecuencia: si pasa de **${FRECUENCIA_ALTA}**, cambiar el anuncio.`)
  return sal
}

/** Fechas «30 oct – 24 nov · 26 días» (hora de la cuenta: se usa la fecha que da Meta). */
export function textoFechas(inicio, fin, hoy) {
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const d = (t) => (t ? String(t).slice(0, 10) : null)
  const i = d(inicio)
  if (!i) return null
  const f = d(fin) ?? hoy ?? null
  const corto = (x) => `${Number(x.slice(8, 10))} ${MESES[Number(x.slice(5, 7)) - 1]}`
  const dias = f ? Math.round((Date.parse(`${f}T12:00:00Z`) - Date.parse(`${i}T12:00:00Z`)) / 86_400_000) + 1 : null
  return `${corto(i)} – ${f ? corto(f) : 'sin fin'}${dias ? ` · ${dias} días` : ''}`
}
