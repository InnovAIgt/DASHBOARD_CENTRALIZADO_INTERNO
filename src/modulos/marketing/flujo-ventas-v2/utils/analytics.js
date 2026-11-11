// Copiado de InnovAIgt/DashboardLeads (Dashboard-Leds/src/utils/analytics.js)
import { getFeedbackTexts, leadReferenceDate, leadReferenceMonth, lossReasonLabel, OPEN_STATES } from './leads.js'
import { toDate } from './dates.js'

export const COUNTRIES = ['Guatemala', 'El Salvador']
export const COUNTRY_CODE = { Guatemala: 'GT', 'El Salvador': 'SV' }

export const numberFormat = new Intl.NumberFormat('es-SV')
export const formatNumber = (value) => numberFormat.format(Math.round(value * 10) / 10)
export const ratio = (numerator, denominator) => (denominator ? numerator / denominator : 0)
export const formatPercent = (numerator, denominator) => `${(ratio(numerator, denominator) * 100).toFixed(1)}%`

export const monthLabel = (value, style = 'short') => (!value
  ? 'Sin fecha'
  : new Intl.DateTimeFormat('es-SV', { month: style, year: style === 'long' ? 'numeric' : '2-digit', timeZone: 'UTC' })
    .format(new Date(`${value}-01T00:00:00Z`))
    .replace(/^./, (letter) => letter.toUpperCase()))

export const qualificationLabel = (value) => (value === 'calificado' ? 'Calificado' : value === 'no_calificado' ? 'No calificado' : 'Sin clasificar')
const calendarMonths = Array.from({ length: 12 }, (_, index) => index + 1)
const monthToDayMonths = calendarMonths.map((month) => ({
  value: month,
  label: new Intl.DateTimeFormat('es-SV', { month: 'long', timeZone: 'UTC' })
    .format(new Date(Date.UTC(2020, month - 1, 1)))
    .replace(/^./, (letter) => letter.toUpperCase()),
}))
const monthToDayDays = Array.from({ length: 31 }, (_, index) => index + 1)

/** Unidades reportadas para un lead (estructuradas primero, luego texto del asesor). */
export function leadUnits(lead) {
  const displayId = lead.clientId || String(lead.id)
  if (displayId === 'LD398') return 6
  const units = lead.cantidadEquipos ?? lead.radiosVendidosReportadas ?? lead.cantidadEquiposEnComentario ?? 0
  return Number.isFinite(units) ? Math.round(units) : 0
}

export function leadComments(lead) {
  const texts = lead.raw ? getFeedbackTexts(lead.raw) : []
  return [...new Set([lead.comentarioGestion, ...texts].filter(Boolean))]
}

export const isWon = (lead) => lead.estado === 'ganado'
export const isQualified = (lead) => lead.tipoLead === 'calificado'
export const isOpen = (lead) => OPEN_STATES.includes(lead.estado)

export const FILTER_DEFS = [
  { key: 'filterPais', label: 'País', value: (lead) => lead.pais },
  { key: 'filterEjecutivo', label: 'Asesor / Ejecutivo', value: (lead) => lead.asesor },
  {
    key: 'filterMonthToDayMonth',
    label: 'Month to day · Mes',
    value: (lead) => {
      const date = toDate(leadReferenceDate(lead))
      return date ? date.getMonth() + 1 : ''
    },
    display: (value) => monthToDayMonths[value - 1]?.label ?? String(value),
    sort: (a, b) => a - b,
    options: calendarMonths,
  },
  {
    key: 'filterMonthToDayDay',
    label: 'Month to day · Día',
    value: (lead) => toDate(leadReferenceDate(lead))?.getDate() ?? '',
    display: String,
    sort: (a, b) => a - b,
    options: monthToDayDays,
  },
  {
    key: 'filterTipoLead',
    label: 'Tipo de lead',
    value: (lead) => lead.tipoLead || 'sin_clasificar',
    display: qualificationLabel,
    sort: (a, b) => ['calificado', 'no_calificado', 'sin_clasificar'].indexOf(a)
      - ['calificado', 'no_calificado', 'sin_clasificar'].indexOf(b),
  },
]

export function applyFilters(leads, filters, skipKey) {
  return leads.filter((lead) => FILTER_DEFS.every((def) => {
    if (def.key === skipKey) return true
    const selection = filters[def.key]
    return selection == null || selection.includes(def.value(lead))
  }))
}

export function summarize(leads) {
  const won = leads.filter(isWon)
  const units = won.reduce((sum, lead) => sum + leadUnits(lead), 0)
  const qualified = leads.filter(isQualified).length
  return {
    total: leads.length,
    qualified,
    unqualified: leads.filter((lead) => lead.tipoLead === 'no_calificado').length,
    won: won.length,
    units,
    avgUnits: ratio(units, won.length),
    conversion: ratio(won.length, leads.length),
    qualifiedConversion: ratio(won.length, qualified),
    open: leads.filter(isOpen).length,
  }
}

function groupBy(leads, keyOf) {
  const groups = new Map()
  for (const lead of leads) {
    const key = keyOf(lead)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(lead)
  }
  return groups
}

export function byMonth(leads) {
  return [...groupBy(leads, (lead) => leadReferenceMonth(lead) || '').entries()]
    .filter(([month]) => month)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, rows]) => ({ month, ...summarize(rows) }))
}

export function byAdvisor(leads) {
  return [...groupBy(leads, (lead) => lead.asesor).entries()]
    .map(([name, rows]) => ({ name, country: mostCommon(rows.map((lead) => lead.pais)), leads: rows, ...summarize(rows) }))
}

export function lossBreakdown(leads) {
  const lost = leads.filter((lead) => lead.estado === 'perdido')
  const byReason = [...groupBy(lost, (lead) => lead.motivo || 'sin_motivo').entries()]
    .map(([reason, rows]) => ({ reason, label: lossReasonLabel(reason), count: rows.length, leads: rows }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
  return { total: lost.length, byReason, leads: lost }
}

export function byCountry(leads) {
  const groups = groupBy(leads, (lead) => lead.pais)
  return COUNTRIES.map((country) => ({ country, ...summarize(groups.get(country) ?? []) }))
}

export function byCountryMonth(leads) {
  return COUNTRIES.map((country) => {
    const rows = leads.filter((lead) => lead.pais === country)
    return { country, total: summarize(rows), months: byMonth(rows) }
  }).filter((group) => group.months.length)
}

function mostCommon(values) {
  const counts = groupBy(values.map((value) => ({ value })), (item) => item.value)
  return [...counts.entries()].sort((a, b) => b[1].length - a[1].length)[0]?.[0] ?? ''
}

// ---------- Seguimientos ----------

const dayKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export function followUpDate(lead) {
  return toDate(lead.proximaGestion ?? lead.fechaSeguimiento)
}

export function classifyFollowUps(leads, now = new Date()) {
  const today = dayKey(now)
  const result = { overdue: [], today: [], upcoming: [], unscheduled: [] }
  for (const lead of leads.filter(isOpen)) {
    const date = followUpDate(lead)
    if (!date) { result.unscheduled.push(lead); continue }
    const key = dayKey(date)
    if (key < today) result.overdue.push(lead)
    else if (key === today) result.today.push(lead)
    else result.upcoming.push(lead)
  }
  const byDate = (a, b) => followUpDate(a) - followUpDate(b)
  result.overdue.sort(byDate)
  result.today.sort(byDate)
  result.upcoming.sort(byDate)
  return result
}

export function daysFromToday(date, now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.round((target - start) / 86400000)
}

// ---------- Forecast ----------

export const CLOSING_KEYWORDS = [
  { label: 'Papelería / documentos', pattern: /papeler|documentaci|documentos|expediente/i },
  { label: 'Intención de cierre', pattern: /pienso cerrar|cerrar[aá]?\s+(el|esta|este|la|en|para)|listo para cerrar|cierre (el|para|en|esta|este)/i },
  { label: 'Firma / contrato', pattern: /\bfirm(?:a|ar|ado|ada|aron|ando|ó)\b|\bcontrat(?:o|ar|ado|ada|aci[oó]n)\b|\borden de compra\b|\bOC\b/i },
  { label: 'Aprobación', pattern: /aprobad|aprobaci|autoriz|visto bueno/i },
]

export function closingSignal(lead) {
  const comment = lead.comentarioGestion
  if (!comment) return null
  const match = CLOSING_KEYWORDS.find((keyword) => keyword.pattern.test(comment))
  return match ? { label: match.label, comment } : null
}

/**
 * Casos que el ejecutivo considera seguros: abiertos, en etapa de Seguimiento (5),
 * con comentario de cierre y próxima gestión agendada entre hoy y el horizonte.
 * fcExcluir conserva su función de excluir, pero fcIncluir no omite estos criterios.
 */
export function buildForecast(leads, horizonDays = 30, now = new Date()) {
  const items = []
  for (const lead of leads.filter(isOpen)) {
    if (lead.fcExcluir) continue
    const date = followUpDate(lead)
    const days = date ? daysFromToday(date, now) : null
    const inRange = days !== null && days >= 0 && days <= horizonDays
    const signal = closingSignal(lead)
    if (lead.apiStage === 5 && signal && inRange) {
      items.push({ lead, date, days, signal, units: leadUnits(lead) })
    }
  }
  items.sort((a, b) => (a.date ?? 0) - (b.date ?? 0))
  return { items, units: items.reduce((sum, item) => sum + item.units, 0) }
}

// ---------- Etapas ----------

export const FUNNEL_COLORS = [
  'linear-gradient(115deg, #1d4ed8 0%, #38bdf8 100%)',
  'linear-gradient(115deg, #0891b2 0%, #2dd4bf 100%)',
  'linear-gradient(115deg, #16a34a 0%, #84cc16 100%)',
]

export const PIPELINE_STAGES = ['Asignación', 'Reunión', 'Demo', 'Envío de propuesta', 'Seguimiento', 'Cierre']

export function stageDistribution(leads) {
  return PIPELINE_STAGES.map((label, index) => {
    const rows = leads.filter((lead) => lead.apiStage === index + 1)
    return { stage: index + 1, label, count: rows.length, open: rows.filter(isOpen).length }
  })
}
