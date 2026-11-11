// Flujo de ventas v2 · datos que necesita la pantalla.
//
// Las fórmulas viven en ../utils (lógica copiada de InnovAIgt/DashboardLeads, sin cambios).
// Este archivo solo junta esas funciones. Los bloques marcados "Copiado de …" son las
// agrupaciones que vivían dentro de las pantallas originales (que la v2 ya no usa): se movieron
// aquí tal cual, cambiando únicamente nombres de variables cuando se indica.
// Lo único nuevo es el filtro de Período (reemplaza "Month to day" en pantalla).
import {
  applyFilters, buildForecast, byAdvisor, byCountry, byMonth, COUNTRIES, FILTER_DEFS,
  isQualified, isWon, leadComments, leadUnits, monthLabel, PIPELINE_STAGES, stageDistribution, summarize,
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

// ---------- Conteos nuevos de la v2 (paso 3.4c) ----------
// Se arman solo con campos que ya calcula la lógica copiada: `estado` (isWon) y `tipoLead`
// (isQualified). No cambian ninguna fórmula de ../utils.

/**
 * Conversión de calificados CORREGIDA (DECISIONES D10) = ganados que eran calificados ÷ calificados.
 * Diferencia con `qualifiedConversion` de summarize(): esa divide TODOS los ganados (también los
 * que venían de leads no calificados) entre los calificados, y por eso mezclaba los dos grupos.
 * Comprobación: ganadosCalificados + ganadosNoCalificados = ganados.
 */
export function conversionCalificados(leads) {
  const calificados = leads.filter(isQualified).length
  const ganados = leads.filter(isWon).length
  const ganadosCalificados = leads.filter((lead) => isWon(lead) && isQualified(lead)).length
  // No calificados = no calificado o sin clasificar (todo lo que no es "calificado").
  const ganadosNoCalificados = leads.filter((lead) => isWon(lead) && !isQualified(lead)).length
  return { calificados, ganados, ganadosCalificados, ganadosNoCalificados, ratio: calificados ? ganadosCalificados / calificados : 0 }
}

/**
 * Partes de la barra de cada ejecutivo. Algunos ganados vienen de leads no calificados, así que
 * para que las 3 partes sumen el total sin contar a nadie dos veces:
 *   ganados (todos) + calificados sin ganar + no calificados sin ganar = total de leads.
 */
export function partesEjecutivo(leads) {
  return {
    ganados: leads.filter(isWon).length,
    calificadosSinGanar: leads.filter((lead) => isQualified(lead) && !isWon(lead)).length,
    noCalificadosSinGanar: leads.filter((lead) => !isQualified(lead) && !isWon(lead)).length,
  }
}

/** Todos los ejecutivos, ordenados por ganados y luego por calificados (byAdvisor de la lógica copiada). */
export function desempenoEjecutivos(leads) {
  return byAdvisor(leads)
    .map((row) => ({ ...row, partes: partesEjecutivo(row.leads), conversion: conversionCalificados(row.leads) }))
    .sort((a, b) => b.won - a.won || b.qualified - a.qualified || a.name.localeCompare(b.name))
}

// ---------- Ventana "Detalle de leads" (al cliquear un indicador) ----------
export const INDICADORES = {
  total: { titulo: 'Total leads', descripcion: 'Todos los leads con los filtros activos.', filtro: () => true },
  calificados: { titulo: 'Calificados', descripcion: 'Solo los leads calificados.', filtro: isQualified },
  ganados: { titulo: 'Ganados', descripcion: 'Solo los leads ganados, indicando si cada uno era calificado o no.', filtro: isWon, marca: 'calificacion' },
  conversion: { titulo: 'Conversión de calificados', descripcion: 'Los leads calificados; se marcan los que ganaron (ganados calificados ÷ calificados).', filtro: isQualified, marca: 'gano' },
  unidades: { titulo: 'Unidades vendidas', descripcion: 'Los leads ganados con sus unidades.', filtro: isWon },
  porCierre: { titulo: 'Unidades por cierre', descripcion: 'Los leads ganados con sus unidades (unidades ÷ ganados).', filtro: isWon },
}

/** Fecha que se muestra en la lista: la de referencia de la lógica copiada (cierre si es ganado; si no, creación). */
export const fechaReferencia = (lead) => toDate(leadReferenceDate(lead))

export function leadsDeIndicador(clave, leads) {
  return leads
    .filter(INDICADORES[clave].filtro)
    .sort((a, b) => (fechaReferencia(b)?.getTime() ?? 0) - (fechaReferencia(a)?.getTime() ?? 0))
}

// ---------- Vista general ----------
// Copiado de views/AnalyticsView.jsx (cuerpo de AnalyticsView, líneas 56-87).
// Cambios: el resumen, los ganados y las unidades de cada grupo del embudo (antes calculados al
// dibujar, líneas 116-117 y 130) se calculan aquí. En 3.4c: `topRadicados` (top 10) se reemplazó
// por `ejecutivos` (todos, ver desempenoEjecutivos) y a meses, países y embudo se les agrega la
// conversión de calificados corregida; los meses llevan además `noCalificados` = leads − calificados
// (incluye "sin clasificar"), para que las columnas apiladas sumen los leads del mes.
export const unitsFor = (rows) => rows.reduce((totalUnits, lead) => totalUnits + leadUnits(lead), 0)

export function datosVistaGeneral(leads, showAllFunnel) {
  const months = byMonth(leads).map((month) => {
    const monthLeads = leads.filter((lead) => leadReferenceMonth(lead) === month.month)
    return { ...month, noCalificados: month.total - month.qualified, conversion: conversionCalificados(monthLeads) }
  })
  const advisors = byAdvisor(leads)
  const advisorsByCountry = COUNTRIES.map((country) => {
    const countryLeads = leads.filter((lead) => lead.pais === country)
    return {
      country,
      summary: summarize(countryLeads),
      advisors: byAdvisor(countryLeads).sort((left, right) => right.total - left.total || left.name.localeCompare(right.name)),
    }
  }).filter((group) => group.advisors.length)
  const countries = byCountry(leads).map((row) => ({
    ...row,
    conversion: conversionCalificados(leads.filter((lead) => lead.pais === row.country)),
  }))
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
    return { ...group, summary: groupSummary, units: unitsFor(wonLeads), conversion: conversionCalificados(group.leads) }
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
  const ejecutivos = desempenoEjecutivos(leads)
  return { months, advisors, advisorsByCountry, countries, monthlyFunnelGroups, monthlyCountryTables, ejecutivos }
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
  // 3.4c: + conversión de calificados corregida (no viene del original).
  return { availableMonths, own, summary, stages, maxStage, forecast, advisorCountry, conversion: conversionCalificados(own) }
}

// ---------- Ventana: detalle del mes ----------
// Copiado de components/MonthDetailModal.jsx (líneas 23-26).
export function datosMes(leads) {
  const summary = summarize(leads)
  const stages = buildStageFunnel(leads)
  const units = leads.filter((lead) => lead.estado === 'ganado')
    .reduce((total, lead) => total + leadUnits(lead), 0)
  // 3.4c: + conversión de calificados corregida (no viene del original).
  return { summary, stages, units, conversion: conversionCalificados(leads) }
}

// ---------- Ventana: detalle del lead ----------
// Copiado de components/LeadDetailModal.jsx (líneas 17-19).
export function datosLead(lead) {
  const comments = leadComments(lead)
  const stage = lead.apiStageLabel || PIPELINE_STAGES[lead.apiStage - 1] || 'Sin etapa'
  const product = typeof lead.producto === 'string' ? lead.producto : lead.raw?.rubro
  return { comments, stage, product }
}
