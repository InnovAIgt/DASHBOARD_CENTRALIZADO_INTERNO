// Canales de marketing · Redes sociales · PRESUPUESTOS MÁS EFECTIVOS (mockup_presupuestos): la tarjeta y la ventana de
// una campaña. Cálculos puros, probados con node --test. Datos del mes elegido, sin reclutamiento (/anuncios-detalle):
//   c = { id, campanaId, campana, marca, gastado, mensajes, costo, pocos, presupuestoDiario, presupuestoTotal,
//         campanaInfo: {objetivo, estado, inicio, fin}, conjuntos, anuncios, texto, publicacion, porSemana: [{desde, hasta, gastado, mensajes}] }
// «Pocos datos» = menos de 5 mensajes: se pliega y nunca se usa para recomendar.
import { conCosto, MIN_MENSAJES } from './anunciosFase2.js'
import { formatoAnuncio } from './segmentoDetalle.js'

const div = (a, b) => (b > 0 ? a / b : null)
const suma = (lista, k) => lista.reduce((n, x) => n + (Number(x[k]) || 0), 0)
/** Bajada de mensajes de una semana a otra que se considera «el anuncio se está cansando» (con gasto parecido). */
export const CAIDA_CANSANCIO = 0.3
export const GASTO_PARECIDO = 0.25

/** Estado frente a la meta: «en meta» o «N % sobre la meta» (null sin meta o con pocos datos). */
export function estadoMeta(costo, meta, pocos = false) {
  if (pocos || costo === null || costo === undefined || !meta) return null
  return costo <= meta ? { enMeta: true, texto: 'en meta' } : { enMeta: false, texto: `${Math.round(((costo - meta) / meta) * 100)} % sobre la meta` }
}

/** Resumen de la tarjeta: total invertido, mejor campaña (5+ mensajes), promedio del mes y lo de pocos datos. */
export function resumenPresupuestos(pres = []) {
  const buenas = pres.filter((p) => !p.pocos && p.costo !== null)
  const pocas = pres.filter((p) => p.pocos || p.costo === null)
  return {
    total: suma(pres, 'gastado'), campanas: pres.length,
    mejor: buenas.length ? buenas.reduce((a, b) => (b.costo < a.costo ? b : a)) : null,
    promedio: div(suma(pres, 'gastado'), suma(pres, 'mensajes')),
    pocos: { cantidad: pocas.length, gastado: suma(pocas, 'gastado') },
  }
}

/** ¿A dónde fue el dinero y qué trajo?: % de la inversión y % de los mensajes por campaña (pocos datos juntos). */
export function dineroYMensajes(pres = []) {
  const total = suma(pres, 'gastado')
  const msj = suma(pres, 'mensajes')
  const buenas = pres.filter((p) => !p.pocos).sort((a, b) => b.gastado - a.gastado)
  const pocas = pres.filter((p) => p.pocos)
  const partes = buenas.map((p) => ({ id: p.id, campana: p.campana, pctInversion: div(p.gastado * 100, total) ?? 0, pctMensajes: div(p.mensajes * 100, msj) ?? 0 }))
  if (pocas.length) partes.push({ id: 'pocos', campana: 'Pocos datos', pocos: true, pctInversion: div(suma(pocas, 'gastado') * 100, total) ?? 0, pctMensajes: div(suma(pocas, 'mensajes') * 100, msj) ?? 0 })
  return partes
}

/**
 * Frase de lectura: la campaña que más se llevó y si rindió más o menos de lo que costó; luego las demás que trajeron
 * menos de lo que costaron. nombre = cómo se escribe una campaña.
 */
export function lecturaPresupuestos(pres = [], nombre = (p) => p.campana) {
  const partes = dineroYMensajes(pres).filter((p) => !p.pocos)
  if (!partes.length) return ''
  const porId = new Map(pres.map((p) => [p.id, p]))
  const [primera, ...resto] = partes
  const rinde = (p) => (p.pctMensajes >= p.pctInversion ? 'rindió más de lo que costó' : 'trajo menos de lo que costó')
  const frases = [`«${nombre(porId.get(primera.id))}» se llevó el ${Math.round(primera.pctInversion)} % de la inversión y trajo el ${Math.round(primera.pctMensajes)} % de los mensajes: ${rinde(primera)}.`]
  for (const p of resto) if (p.pctMensajes < p.pctInversion) frases.push(`«${nombre(porId.get(p.id))}» trajo menos de lo que costó.`)
  return frases.join(' ')
}

/** Días entre dos fechas AAAA-MM-DD (incluidas). */
const dias = (a, b) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000) + 1

/**
 * Presupuesto de la campaña en el mes: diario × días activos del mes (o el total si es de por vida), gastado, % usado
 * y gasto promedio por día. null si Meta no da presupuesto.
 */
export function presupuestoDelMes(c, mes, hoy) {
  const [a, m] = String(mes).split('-').map(Number)
  const finMes = new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10)
  const corte = hoy && hoy < finMes ? hoy : finMes
  const ini = [String(c.campanaInfo?.inicio ?? '').slice(0, 10), `${mes}-01`].filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x)).sort().at(-1)
  const fin = [String(c.campanaInfo?.fin ?? '').slice(0, 10), corte].filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x)).sort()[0]
  const activos = ini && fin && fin >= ini ? dias(ini, fin) : null
  if (c.presupuestoDiario) {
    const previsto = activos ? c.presupuestoDiario * activos : null
    return { tipo: 'diario', monto: c.presupuestoDiario, dias: activos, previsto, gastado: c.gastado, usado: div(c.gastado * 100, previsto), porDia: div(c.gastado, activos) }
  }
  if (c.presupuestoTotal) return { tipo: 'total', monto: c.presupuestoTotal, dias: activos, previsto: c.presupuestoTotal, gastado: c.gastado, usado: div(c.gastado * 100, c.presupuestoTotal), porDia: div(c.gastado, activos) }
  return null
}

/**
 * Por semana: inversión y mensajes; «cansancio» = de una semana a la siguiente los mensajes bajan 30 % o más con un
 * gasto parecido (±25 %). Devuelve { semanas, cansancio: {semana (1, 2…), caida} | null }.
 */
export function semanasCampana(c) {
  // Meta no devuelve las semanas sin gasto: se rellenan con 0 (bloques de 7 días desde la primera semana).
  const dadas = [...(c.porSemana ?? [])].sort((a, b) => String(a.desde).localeCompare(String(b.desde)))
  const llenas = []
  for (const w of dadas) {
    let ultima = llenas.at(-1)
    while (ultima && Date.parse(`${w.desde}T12:00:00Z`) - Date.parse(`${ultima.hasta}T12:00:00Z`) > 86_400_000) {
      const desde = new Date(Date.parse(`${ultima.hasta}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10)
      const hasta = new Date(Date.parse(`${desde}T12:00:00Z`) + 6 * 86_400_000).toISOString().slice(0, 10)
      llenas.push({ desde, hasta: hasta < w.desde ? hasta : new Date(Date.parse(`${w.desde}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10), gastado: 0, mensajes: 0 })
      ultima = llenas.at(-1)
    }
    llenas.push(w)
  }
  const semanas = llenas.map((w, i) => ({ ...w, n: i + 1 }))
  let cansancio = null
  for (let i = 1; i < semanas.length && !cansancio; i++) {
    const [a, b] = [semanas[i - 1], semanas[i]]
    if (a.mensajes < MIN_MENSAJES || !a.gastado) continue
    const caida = (a.mensajes - b.mensajes) / a.mensajes
    const gastoParecido = Math.abs(b.gastado - a.gastado) / a.gastado <= GASTO_PARECIDO
    if (caida >= CAIDA_CANSANCIO && gastoParecido) cansancio = { semana: b.n, caida: Math.round(caida * 100) }
  }
  return { semanas, cansancio }
}

/**
 * Resultado de la campaña: % de la pauta, % de los mensajes, costo vs promedio, leads estimados y costo por lead.
 * leadsEst = leads estimados de la campaña (datos/leadsCampana.js: mismo país y día, repartidos por mensajes), o null.
 */
export function resultadoCampana(c, todas = [], leadsEst = null) {
  const total = suma(todas, 'gastado')
  const msj = suma(todas, 'mensajes')
  const promedio = div(total, msj)
  return { pctInversion: div(c.gastado * 100, total), pctMensajes: div(c.mensajes * 100, msj), promedio,
    difCosto: c.costo !== null && promedio ? ((c.costo - promedio) / promedio) * 100 : null, leadsEst, costoLead: leadsEst > 0 ? c.gastado / leadsEst : null }
}

/** Comparación del costo por mensaje: esta, las otras campañas (5+), el promedio, la meta y el mes anterior. */
export function comparacionCampana(c, todas, promedio, meta, anterior, nombre) {
  return [
    { id: 'esta', nombre: 'Esta campaña', costo: c.costo, pocos: c.pocos, esta: true },
    { id: 'promedio', nombre: 'Promedio del mes', costo: promedio, gris: true },
    ...(meta ? [{ id: 'meta', nombre: 'Meta (por confirmar)', costo: meta, meta: true }] : []),
    ...todas.filter((x) => x.id !== c.id && !x.pocos && x.costo !== null).map((x) => ({ id: x.id, nombre: nombre(x), costo: x.costo })),
    ...(anterior !== null && anterior !== undefined ? [{ id: 'anterior', nombre: 'Mes pasado (esta campaña)', costo: anterior, anterior: true }] : []),
  ]
}

/**
 * Recomendación calculada (solo con 5+ mensajes): mantener o subir el presupuesto, mejor formato, renovar el anuncio.
 * Devuelve [] si no hay datos suficientes (la ventana no la muestra). textos con «**» para lo resaltado.
 */
export function recomendacionesCampana(c, todas, meta, cansancio) {
  if (c.pocos || c.costo === null) return []
  const sal = []
  const buenas = todas.filter((x) => !x.pocos && x.costo !== null)
  const mejor = buenas.length > 1 && buenas.every((x) => x.costo >= c.costo)
  if (mejor && (!meta || c.costo <= meta)) sal.push('Es la campaña que **mejor rinde**: vale la pena mantenerla o subirle el presupuesto.')
  else if (meta && c.costo <= meta) sal.push('Está **en meta**: mantener el presupuesto.')
  else if (meta && c.costo > meta) sal.push(`Está **${Math.round(((c.costo - meta) / meta) * 100)} % sobre la meta**: bajar el presupuesto o cambiar el anuncio antes de subirlo.`)
  const formatos = [...new Map((c.anuncios ?? []).map((a) => conCosto({ ...a, formato: formatoAnuncio(a) })).filter((a) => !a.pocos && a.costo !== null).map((a) => [a.formato, a])).values()]
  if (formatos.length >= 2) {
    const orden = [...formatos].sort((a, b) => a.costo - b.costo)
    const ahorro = Math.round(((orden.at(-1).costo - orden[0].costo) / orden.at(-1).costo) * 100)
    if (ahorro > 0) sal.push(`El formato **${orden[0].formato.toLowerCase()}** trae mensajes ${ahorro} % más baratos que ${orden.at(-1).formato.toLowerCase()}: darle más presupuesto.`)
  }
  if (cansancio) sal.push(`Los mensajes bajan desde la ${cansancio.semana}.ª semana con el mismo gasto: **renovar el anuncio** (nueva imagen o texto).`)
  return sal
}
