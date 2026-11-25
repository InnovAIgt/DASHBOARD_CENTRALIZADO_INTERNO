// Canales de marketing · Redes sociales · LEADS DE REDES (Prospekt, solo lectura; REDES.md, 7.6).
// Sin pantalla ni red; se prueba con node --test. Datos de /api/marketing/redes/leads:
//   lead = { codigo, nombre, telefono, correo, pais ('GT'|'SV'), asesor, etapa (1–6), status, fechaUtc (ISO),
//            fecha (AAAA-MM-DD, UTC−6), hora ('HH:MM', UTC−6), gestiones: [{fecha, tipo, etapa, notas, proxima, proximaNotas, por}] }
//
//   EXACTO: calificados con origen «PostIAlo Redes Sociales» por país y mes (el servidor ya filtra el origen y LDTEST).
//   ESTIMADO por publicación: cada lead UNA sola vez, a la publicación más reciente de SU país en los 7 días
//   anteriores; si ese día hubo varias publicaciones del país, comparten la fila (grupo del día).
//   Marca del lead: Guatemala tiene una sola marca (RED GT); en El Salvador, la de su publicación estimada si el
//   grupo es de una sola marca; si no se puede saber, queda «sin marca».
import { MARCAS } from './redes.js'

export const ETAPA_CERRADO = 6
export const DIAS_ESTIMADO = 7
export const SIN_DATO_PROSPEKT = 'Prospekt no lo envía'
/** Prospekt no distingue ganados de perdidos (status «cerrado» y etapa 6 en ambos casos; PENDIENTES). */
export const TEXTO_CERRADOS = 'Cerrados (ganados o perdidos)'
export const etiquetaEtapa = (n) => (Number.isInteger(n) ? (n === ETAPA_CERRADO ? 'Etapa 6 · cerrado (ganado o perdido)' : `Etapa ${n}`) : 'Sin etapa')

/**
 * Costo por lead: la pauta es SOLO de la cuenta USD (El Salvador), así que se divide entre los leads de SV. Con el
 * filtro en Guatemala (o RED GT) no hay pauta: «sin pauta».
 * @returns {{sinPauta: boolean, leadsSV: number, costo: number|null}}
 */
export function costoPorLead({ gasto = 0, leads = [], filtros = {} }) {
  if (filtros.pais === 'GT' || filtros.marca === 'gt') return { sinPauta: true, leadsSV: 0, costo: null }
  const leadsSV = leads.filter((l) => l.pais === 'SV').length
  return { sinPauta: false, leadsSV, costo: leadsSV ? gasto / leadsSV : null }
}

const MS_GT = 6 * 3600 * 1000
/** Instante (ms) de una publicación: fecha y hora ya en UTC−6. */
const instantePub = (p) => Date.parse(`${p.fecha}T${String(p.hora ?? 0).padStart(2, '0')}:00:00Z`) + MS_GT

export const esCerrado = (l) => l.etapa === ETAPA_CERRADO || String(l.status).toLowerCase() === 'cerrado'
export const enProceso = (l) => !esCerrado(l) && Number.isInteger(l.etapa) && l.etapa >= 2

/**
 * Publicación estimada de cada lead y su marca. publicaciones = las publicadas (Meta) con fecha, hora, pais, marca.
 * @returns lead + { estimada: {clave, fecha, pais, ids, marcas} | null, marca }
 */
export function estimarLeads(leads = [], publicaciones = []) {
  const pubs = publicaciones.filter((p) => p.estado === 'publicada' || !p.estado).map((p) => ({ ...p, t: instantePub(p) })).filter((p) => Number.isFinite(p.t))
  return leads.map((l) => {
    const t = Date.parse(l.fechaUtc)
    const previas = Number.isFinite(t) ? pubs.filter((p) => p.pais === l.pais && p.t <= t && p.t >= t - DIAS_ESTIMADO * 86_400_000) : []
    let estimada = null
    if (previas.length) {
      const dia = previas.reduce((a, b) => (b.t > a.t ? b : a)).fecha
      const grupo = previas.filter((p) => p.fecha === dia)
      estimada = { clave: `${l.pais}|${dia}`, fecha: dia, pais: l.pais, ids: grupo.map((p) => p.id), marcas: [...new Set(grupo.map((p) => p.marca))] }
    }
    const marca = l.pais === 'GT' ? 'gt' : estimada?.marcas.length === 1 ? estimada.marcas[0] : ''
    return { ...l, estimada, marca }
  })
}

/** Leads del mes con los filtros de la barra (país y marca; la red no aplica a los leads). */
export function leadsDelMes(leads = [], mes, filtros = {}) {
  return leads.filter((l) => String(l.fecha).startsWith(mes) && (!filtros.pais || l.pais === filtros.pais) && (!filtros.marca || l.marca === filtros.marca))
}

/** Conteos del mes: total, por país, en proceso, cerrados y por etapa. */
export function resumenLeadsRedes(leads = []) {
  const porEtapa = {}
  for (const l of leads) { const k = Number.isInteger(l.etapa) ? l.etapa : 0; porEtapa[k] = (porEtapa[k] ?? 0) + 1 }
  return {
    total: leads.length,
    porPais: { GT: leads.filter((l) => l.pais === 'GT').length, SV: leads.filter((l) => l.pais === 'SV').length },
    enProceso: leads.filter(enProceso).length,
    cerrados: leads.filter(esCerrado).length,
    conEstimada: leads.filter((l) => l.estimada).length,
    porEtapa,
  }
}

/** Leads por marca para la tabla del Resumen: { gt, sv, dr, sinMarca: {GT, SV} }. */
export function leadsPorMarca(leads = []) {
  const salida = Object.fromEntries(Object.keys(MARCAS).map((m) => [m, 0]))
  salida.sinMarca = { GT: 0, SV: 0 }
  for (const l of leads) { if (l.marca && salida[l.marca] !== undefined) salida[l.marca]++; else salida.sinMarca[l.pais] = (salida.sinMarca[l.pais] ?? 0) + 1 }
  return salida
}

/** Leads estimados por publicación: una fila por país y día (las publicaciones del mismo día comparten fila). */
export function leadsPorPublicacion(leads = []) {
  const m = new Map()
  for (const l of leads) {
    if (!l.estimada) continue
    const g = m.get(l.estimada.clave) ?? { ...l.estimada, ids: [], marcas: [], leads: 0, cerrados: 0, codigos: [] }
    g.ids = [...new Set([...g.ids, ...l.estimada.ids])]
    g.marcas = [...new Set([...g.marcas, ...l.estimada.marcas])]
    g.leads++
    if (esCerrado(l)) g.cerrados++
    g.codigos.push(l.codigo)
    m.set(l.estimada.clave, g)
  }
  return [...m.values()].sort((a, b) => b.leads - a.leads || b.fecha.localeCompare(a.fecha))
}

/** Leads estimados de UNA publicación (por su id): los de su grupo del día. */
export const leadsDePublicacion = (leads = [], id) => leads.filter((l) => l.estimada?.ids.includes(id))
