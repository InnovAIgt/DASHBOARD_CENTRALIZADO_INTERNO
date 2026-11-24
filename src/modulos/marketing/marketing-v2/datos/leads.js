// Canales de marketing · Mailing · Leads de Prospekt (calificados) atribuidos a campañas.
// Las filas vienen de /api/marketing/mailing/leads (server/mailing/leads.js), SIN correo ni teléfono del lead.
// Aquí solo se filtran con los mismos filtros de Mailing y se cuentan (MAILING.md, sección 11).
import { diaGuatemala, porcentaje } from './calculos.js'

export const TIPOS_ATRIBUCION = {
  exacta: { label: 'Exacta', tip: 'El correo del lead está entre los destinatarios de la campaña (hasta 30 días antes del lead).' },
  estimada: { label: 'Estimada', tip: 'Origen «PostIAlo Mailing» sin coincidencia por correo: la última campaña enviada en los 7 días previos.' },
  sin_campana: { label: 'Sin campaña', tip: 'Sin coincidencia por correo ni origen «PostIAlo Mailing» con una campaña en los 7 días previos.' },
}
export const MOTIVO_EXACTA = { clic: 'con clic', apertura: 'con apertura', envio: 'recibió el correo', origen: 'por origen' }
export const STATUS_LEAD = { cerrado: 'Cerrado', en_proceso: 'En proceso', stage_2_overdue: 'Etapa 2 vencida' }
export const ETAPA_CERRADO = 6
export const CRUCE_ASESOR = {
  exacta: 'Mismo nombre en Cumplimiento',
  posible: 'Posible: el nombre del asesor está dentro del nombre de un solo ejecutivo',
  sin_cruce: 'Sin cruce con Cumplimiento',
}
export const SIN_CRUCE = 'Asesor sin cruce'
export const TEXTO_NO_CALIFICADOS = 'No calificados: pendiente — Prospekt no envía origen ni correo'

const normalizarTexto = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/**
 * ¿Es un lead de Mailing? (Keily, 24/11/2026): tiene campaña asignada (exacta o estimada) o su origen es
 * «PostIAlo Mailing». Los demás orígenes (Redes, Web, PBX, Manual…) no se cuentan en Mailing, salvo con el interruptor
 * «Ver leads de todos los orígenes».
 */
export const esLeadMailing = (x) => x.atribucion === 'exacta' || x.atribucion === 'estimada' || normalizarTexto(x.origen).replace(/\s+/g, ' ') === 'postialo mailing'

/** Nota de la tarjeta: «Leads de correo: X. Solo N de M leads de Prospekt traen correo». */
export const notaLeads = ({ deCorreo, conCorreo, total }) => `Leads de correo: ${deCorreo.toLocaleString('es-GT')}. Solo ${conCorreo.toLocaleString('es-GT')} de ${total.toLocaleString('es-GT')} leads de Prospekt traen correo`

/**
 * Mismos filtros de Mailing:
 * - País: el país del lead. Período: día de creación del lead (hora de Guatemala).
 * - Campaña, cargo, asunto (o campañas de prueba): si alguno está puesto, solo los leads asignados a alguna de las
 *   campañas que quedan (los «sin campaña» salen). Sin esos filtros, se ven todos.
 * - Buscar empresa / cliente: código del lead, asesor o ejecutivo.
 * @param {object[]} filas  filas del servidor
 * @param {object} f  filtros de Mailing
 * @param {object[]} campanas  campañas que quedan con los filtros (filtrarCampanas)
 */
export function filtrarLeads(filas = [], f = {}, campanas = []) {
  const porCampana = Boolean(f.campana || f.cargo || f.asunto)
  const ids = new Set(campanas.map((c) => Number(c.id)))
  const buscar = normalizarTexto(f.cliente)
  return filas.filter((x) => {
    if (f.pais && x.pais !== f.pais) return false
    if (f.desde || f.hasta) {
      const dia = diaGuatemala(x.fecha)
      if (!dia) return false
      if (f.desde && dia < f.desde) return false
      if (f.hasta && dia > f.hasta) return false
    }
    if (porCampana && !(x.campanas ?? []).some((id) => ids.has(Number(id)))) return false
    if (buscar && !normalizarTexto(`${x.codigo} ${x.asesor ?? ''} ${x.ejecutivo ?? ''}`).includes(buscar)) return false
    return true
  })
}

/** Conteos de la tarjeta «Leads». */
export function resumenLeads(filas = []) {
  const contar = (p) => filas.filter(p).length
  return {
    total: filas.length,
    exactas: contar((x) => x.atribucion === 'exacta'),
    estimadas: contar((x) => x.atribucion === 'estimada'),
    sinCampana: contar((x) => x.atribucion === 'sin_campana'),
    cerrados: contar((x) => x.etapa === ETAPA_CERRADO),
    conCorreo: contar((x) => x.tieneCorreo),
  }
}

/** Conteo por etapa (1 a 6) y «sin etapa». */
export function porEtapa(filas = []) {
  const m = new Map()
  for (const x of filas) { const k = x.etapa ?? null; m.set(k, (m.get(k) ?? 0) + 1) }
  return [...m].map(([etapa, n]) => ({ etapa, n })).sort((a, b) => (a.etapa ?? 99) - (b.etapa ?? 99))
}

/** Clave de la campaña o grupo de un lead («77» o «77,78,79»). */
const claveDe = (x) => (x.campanas ?? []).join(',')

/**
 * Leads por campaña o grupo para «Comparar campañas»: los de una sola campaña en la fila de esa campaña; los de un
 * grupo (varias campañas el mismo día) en una fila de grupo aparte, sin repartirlos (decisión de Keily, 24/11/2026).
 * Conversión = leads ÷ clics (clics de Brevo de la campaña, o la suma de las del grupo).
 * @returns {Map<string, {clave, campanas: number[], grupo: string|null, exactas, estimadas, leads, cerrados, clics, conversion}>}
 */
export function leadsPorCampana(filas = [], campanas = []) {
  const clicsDe = new Map(campanas.map((c) => [Number(c.id), Number(c.totales?.clics) || 0]))
  const m = new Map()
  for (const x of filas) {
    if (x.atribucion === 'sin_campana' || !(x.campanas ?? []).length) continue
    const clave = claveDe(x)
    if (!m.has(clave)) m.set(clave, { clave, campanas: x.campanas.map(Number), grupo: x.campanas.length > 1 ? x.grupo : null, exactas: 0, estimadas: 0, leads: 0, cerrados: 0 })
    const g = m.get(clave)
    g.leads += 1
    if (x.atribucion === 'exacta') g.exactas += 1
    else g.estimadas += 1
    if (x.etapa === ETAPA_CERRADO) g.cerrados += 1
  }
  for (const g of m.values()) {
    g.clics = g.campanas.reduce((n, id) => n + (clicsDe.get(id) ?? 0), 0)
    g.conversion = g.clics ? porcentaje(g.leads, g.clics) : null
  }
  return m
}

/**
 * Leads atribuidos (exactos + estimados) por ejecutivo y país. El ejecutivo sale del cruce del asesor de Prospekt con
 * Cumplimiento; sin cruce, «Asesor sin cruce». Una fila por ejecutivo + país y un subtotal por país.
 */
export function leadsPorEjecutivo(filas = []) {
  const atribuidos = filas.filter((x) => x.atribucion !== 'sin_campana')
  const m = new Map()
  for (const x of atribuidos) {
    const ejecutivo = x.ejecutivo || SIN_CRUCE
    const pais = x.pais || '—'
    const clave = `${ejecutivo}|${pais}`
    if (!m.has(clave)) m.set(clave, { ejecutivo, pais, sinCruce: !x.ejecutivo, posible: false, asesores: new Set(), leads: 0, exactas: 0, estimadas: 0, cerrados: 0 })
    const g = m.get(clave)
    g.leads += 1
    if (x.atribucion === 'exacta') g.exactas += 1
    else g.estimadas += 1
    if (x.etapa === ETAPA_CERRADO) g.cerrados += 1
    if (x.cruceEjecutivo === 'posible') g.posible = true
    if (x.asesor) g.asesores.add(x.asesor)
  }
  const lista = [...m.values()].map((g) => ({ ...g, asesores: [...g.asesores].sort((a, b) => a.localeCompare(b, 'es')) }))
    .sort((a, b) => a.sinCruce - b.sinCruce || a.pais.localeCompare(b.pais) || b.leads - a.leads || a.ejecutivo.localeCompare(b.ejecutivo, 'es'))
  const paises = [...new Set(atribuidos.map((x) => x.pais || '—'))].sort()
  const territorios = paises.map((pais) => {
    const propios = atribuidos.filter((x) => (x.pais || '—') === pais)
    return { pais, leads: propios.length, exactas: propios.filter((x) => x.atribucion === 'exacta').length, estimadas: propios.filter((x) => x.atribucion === 'estimada').length, cerrados: propios.filter((x) => x.etapa === ETAPA_CERRADO).length }
  })
  return { filas: lista, territorios, cruce: conteoCruce(filas) }
}

/** Cuántos leads (todos) cruzan su asesor con un ejecutivo: exacta, posible o sin cruce. */
export function conteoCruce(filas = []) {
  const c = { exacta: 0, posible: 0, sin_cruce: 0 }
  for (const x of filas) c[x.cruceEjecutivo in c ? x.cruceEjecutivo : 'sin_cruce'] += 1
  return c
}

/** Texto de la campaña asignada a un lead: «#77 · Nombre», el grupo («19 nov (77–79)») o «—». */
export function textoCampanaLead(x, nombres = {}) {
  const ids = x.campanas ?? []
  if (!ids.length) return '—'
  if (ids.length > 1) return x.grupo ?? ids.map((id) => `#${id}`).join(', ')
  const c = nombres[ids[0]]
  return c?.nombre ? `#${ids[0]} · ${c.nombre}` : `#${ids[0]}`
}
