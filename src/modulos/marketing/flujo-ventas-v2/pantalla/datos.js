// Flujo de ventas v2 · datos que necesita la pantalla.
//
// Las fórmulas viven en ../utils (lógica copiada de InnovAIgt/DashboardLeads, sin cambios).
// Este archivo solo junta esas funciones. Los bloques marcados "Copiado de …" son las
// agrupaciones que vivían dentro de las pantallas originales (que la v2 ya no usa): se movieron
// aquí tal cual, cambiando únicamente nombres de variables cuando se indica.
// Lo único nuevo es el filtro de Período (reemplaza "Month to day" en pantalla).
import {
  applyFilters, buildForecast, byAdvisor, byCountry, byMonth, COUNTRIES, FILTER_DEFS,
  leadComments, leadUnits, monthLabel, PIPELINE_STAGES, stageDistribution, summarize,
} from '../utils/analytics.js'
import { buildStageFunnel, leadReferenceDate, leadReferenceMonth } from '../utils/leads.js'
import { toDate } from '../utils/dates.js'

export const PAISES = COUNTRIES
export const PERIODO_VACIO = { desde: '', hasta: '' }

// Filtros que van dentro del panel "Filtros" (columnas con buscador y casillas).
export const FILTROS_DEL_PANEL = FILTER_DEFS.filter((def) => ['filterEjecutivo', 'filterTipoLead'].includes(def.key))

// ---------- Período (nuevo) ----------
// Usa la misma fecha de referencia que la lógica copiada (leadReferenceDate): fecha de cierre
// si el lead es ganado; si no, fecha de creación. "Hasta" incluye el día completo.
export function filtrarPorPeriodo(leads, desde, hasta) {
  if (!desde && !hasta) return leads
  const inicio = desde ? toDate(desde) : null
  const finExclusivo = hasta ? toDate(hasta) : null
  if (finExclusivo) finExclusivo.setDate(finExclusivo.getDate() + 1)
  return leads.filter((lead) => {
    const fecha = toDate(leadReferenceDate(lead))
    if (!fecha) return false
    if (inicio && fecha < inicio) return false
    if (finExclusivo && fecha >= finExclusivo) return false
    return true
  })
}

/** Filtros de la lógica copiada (applyFilters) + Período. skipKey igual que en applyFilters. */
export function aplicarFiltros(leads, filters, periodo, skipKey) {
  return filtrarPorPeriodo(applyFilters(leads, filters, skipKey), periodo.desde, periodo.hasta)
}

export function hayFiltrosActivos(filters, periodo) {
  return FILTER_DEFS.some((def) => filters[def.key] != null) || Boolean(periodo.desde || periodo.hasta)
}

// ---------- Opciones y conteos de cada filtro ----------
// Copiado de components/FilterBar.jsx (MultiSelect: `counts` y `options`).
export function opcionesDeFiltro(def, leads) {
  const display = def.display ?? String
  if (def.options) return def.options
  const all = new Set(leads.map(def.value).filter((value) => value !== undefined && value !== null && value !== ''))
  return [...all].sort(def.sort ?? ((a, b) => String(display(a)).localeCompare(String(display(b)))))
}

export function conteosDeFiltro(def, leads, filters, periodo) {
  const map = new Map()
  for (const lead of aplicarFiltros(leads, filters, periodo, def.key)) {
    const value = def.value(lead)
    if (value === undefined || value === null || value === '') continue
    map.set(value, (map.get(value) ?? 0) + 1)
  }
  return map
}

// ---------- Vista general ----------
// Copiado de views/AnalyticsView.jsx (cuerpo de AnalyticsView, líneas 56-87).
// Cambios: `topRadicados` se llama `topGanados`; el resumen, los ganados y las unidades de cada
// grupo del embudo (antes calculados al dibujar, líneas 116-117 y 130) se calculan aquí.
export const unitsFor = (rows) => rows.reduce((totalUnits, lead) => totalUnits + leadUnits(lead), 0)

export function datosVistaGeneral(leads, showAllFunnel) {
  const months = byMonth(leads)
  const advisors = byAdvisor(leads)
  const advisorsByCountry = COUNTRIES.map((country) => {
    const countryLeads = leads.filter((lead) => lead.pais === country)
    return {
      country,
      summary: summarize(countryLeads),
      advisors: byAdvisor(countryLeads).sort((left, right) => right.total - left.total || left.name.localeCompare(right.name)),
    }
  }).filter((group) => group.advisors.length)
  const countries = byCountry(leads)
  const monthlyFunnelGroups = [
    ...(showAllFunnel ? [{ key: 'all', label: 'Todos', leads }] : []),
    ...months.map(({ month }) => ({
      key: month,
      label: monthLabel(month, 'long'),
      leads: leads.filter((lead) => leadReferenceMonth(lead) === month),
    })),
  ].map((group) => {
    const groupSummary = summarize(group.leads)
    const wonLeads = group.leads.filter((lead) => lead.estado === 'ganado')
    return { ...group, summary: groupSummary, units: unitsFor(wonLeads) }
  })
  const monthlyCountryTables = COUNTRIES.map((country) => {
    const countryLeads = leads.filter((lead) => lead.pais === country)
    const countryMonths = byMonth(countryLeads).map((month) => {
      const monthLeads = countryLeads.filter((lead) => leadReferenceMonth(lead) === month.month)
      return { ...month, leads: monthLeads }
    })
    const countrySummary = summarize(countryLeads)
    return { country, months: countryMonths, summary: countrySummary }
  })
  const topGanados = [...advisors].sort((a, b) => b.won - a.won || b.total - a.total).slice(0, 10)
  return { months, advisors, advisorsByCountry, countries, monthlyFunnelGroups, monthlyCountryTables, topGanados }
}

// ---------- Ventana: detalle del ejecutivo ----------
// Copiado de components/AdvisorDrawer.jsx (líneas 27-38).
export function datosAsesor({ name, country, leads, selectedMonth, selectedType }) {
  const advisorLeads = leads.filter((lead) => lead.asesor === name && (!country || lead.pais === country))
  const availableMonths = [...new Set(advisorLeads.map(leadReferenceMonth).filter(Boolean))].sort((a, b) => b.localeCompare(a))
  const own = advisorLeads.filter((lead) =>
    (!selectedMonth || leadReferenceMonth(lead) === selectedMonth)
    && (!selectedType || (lead.tipoLead ?? 'sin_clasificar') === selectedType),
  )
  const summary = summarize(own)
  const stages = stageDistribution(own)
  const maxStage = Math.max(1, ...stages.map((stage) => stage.count))
  const forecast = buildForecast(own)
  const advisorCountry = country ?? advisorLeads[0]?.pais
  return { availableMonths, own, summary, stages, maxStage, forecast, advisorCountry }
}

// ---------- Ventana: detalle del mes ----------
// Copiado de components/MonthDetailModal.jsx (líneas 23-26).
export function datosMes(leads) {
  const summary = summarize(leads)
  const stages = buildStageFunnel(leads)
  const units = leads.filter((lead) => lead.estado === 'ganado')
    .reduce((total, lead) => total + leadUnits(lead), 0)
  return { summary, stages, units }
}

// ---------- Ventana: detalle del lead ----------
// Copiado de components/LeadDetailModal.jsx (líneas 17-19).
export function datosLead(lead) {
  const comments = leadComments(lead)
  const stage = lead.apiStageLabel || PIPELINE_STAGES[lead.apiStage - 1] || 'Sin etapa'
  const product = typeof lead.producto === 'string' ? lead.producto : lead.raw?.rubro
  return { comments, stage, product }
}
