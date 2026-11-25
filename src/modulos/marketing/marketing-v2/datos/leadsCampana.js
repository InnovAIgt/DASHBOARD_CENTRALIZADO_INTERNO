// Canales de marketing · Redes sociales · LEADS ESTIMADOS POR CAMPAÑA (Anuncios: tabla de campañas y ventana de cada
// campaña). Cálculos puros, probados con node --test.
//
// Regla (Keily, 25/11/2026): cada lead de Redes (Prospekt) se asigna a las campañas del MISMO PAÍS que tuvieron gasto
// ESE DÍA. Si varias corrían a la vez, se reparte según los mensajes de cada una ese día (si ninguna tuvo mensajes ese
// día, según el gasto). Es una estimación: Prospekt no dice de qué campaña vino el lead.
// Guatemala no tiene cuenta publicitaria conectada: sus leads salen como «sin campaña conectada».
import { MARCAS } from './redes.js'

export const REGLA_LEADS_CAMPANA = 'Estimado: cada lead de Redes (Prospekt) se asigna a las campañas del mismo país que tuvieron gasto ese día; '
  + 'si varias corrían a la vez, se reparte según los mensajes de cada una ese día (si ninguna tuvo mensajes, según el gasto). '
  + 'Prospekt no dice de qué campaña vino el lead.'

/**
 * Campañas del detalle del mes (filas de presupuestos: una por campaña y marca, cada una con porDia) → una por campaña
 * con su país (el de la marca que más gastó) y su gasto y mensajes de cada día.
 */
export function campanasConDias(presupuestos = []) {
  const m = new Map()
  for (const p of presupuestos) {
    const g = m.get(p.campanaId) ?? { campanaId: p.campanaId, porMarca: {}, porDia: p.porDia ?? [] }
    g.porMarca[p.marca || ''] = (g.porMarca[p.marca || ''] ?? 0) + (Number(p.gastado) || 0)
    m.set(p.campanaId, g)
  }
  return [...m.values()].map((g) => {
    const marca = Object.entries(g.porMarca).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
    return { campanaId: g.campanaId, pais: MARCAS[marca]?.pais ?? '', porDia: g.porDia }
  })
}

/**
 * Reparte los leads del mes entre las campañas. leads = [{fecha (AAAA-MM-DD, UTC−6), pais}].
 * Devuelve { porCampana: Map(campanaId → leads estimados, con decimales), sinCampanaConectada: {país: n} (países sin
 * ninguna campaña conectada, como GT), sinCampanaActiva: {país: n} (días en que no corría ninguna campaña), total }.
 */
export function leadsPorCampana(campanas = [], leads = []) {
  const porCampana = new Map(campanas.map((c) => [c.campanaId, 0]))
  const conCampana = new Set(campanas.map((c) => c.pais).filter(Boolean))
  const sinCampanaConectada = {}
  const sinCampanaActiva = {}
  for (const l of leads) {
    if (!conCampana.has(l.pais)) { sinCampanaConectada[l.pais] = (sinCampanaConectada[l.pais] ?? 0) + 1; continue }
    const activas = campanas.filter((c) => c.pais === l.pais).map((c) => ({ c, d: c.porDia.find((x) => x.fecha === l.fecha) })).filter((x) => x.d && x.d.gastado > 0)
    if (!activas.length) { sinCampanaActiva[l.pais] = (sinCampanaActiva[l.pais] ?? 0) + 1; continue }
    const msj = activas.reduce((n, x) => n + (x.d.mensajes || 0), 0)
    const gasto = activas.reduce((n, x) => n + x.d.gastado, 0)
    for (const x of activas) porCampana.set(x.c.campanaId, porCampana.get(x.c.campanaId) + (msj > 0 ? (x.d.mensajes || 0) / msj : x.d.gastado / gasto))
  }
  return { porCampana, sinCampanaConectada, sinCampanaActiva, total: leads.length }
}

/** Leads estimados de una fila (campaña y marca): la parte de la campaña según el gasto de esa fila. */
export function leadsDeFila(est, campanaId, gastoFila, gastoCampana) {
  if (!est?.porCampana.has(String(campanaId))) return null
  const n = est.porCampana.get(String(campanaId))
  return gastoCampana > 0 ? n * (gastoFila / gastoCampana) : n
}

/** «1.6» con un decimal (o «0»). */
export const textoLeadsEst = (n) => (n === null || n === undefined ? '—' : n === 0 ? '0' : n.toLocaleString('es-GT', { minimumFractionDigits: 1, maximumFractionDigits: 1 }))
