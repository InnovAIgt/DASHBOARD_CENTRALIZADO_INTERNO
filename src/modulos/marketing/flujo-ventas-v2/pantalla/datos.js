// Flujo de ventas v2 · datos que necesita la pantalla.
//
// Las fórmulas viven en ../utils (lógica copiada de InnovAIgt/DashboardLeads, sin cambios).
// Este archivo solo junta esas funciones. Los bloques marcados "Copiado de …" son las
// agrupaciones que vivían dentro de las pantallas originales (que la v2 ya no usa): se movieron
// aquí tal cual, cambiando únicamente nombres de variables cuando se indica.
// Lo único nuevo es el filtro de Período (reemplaza "Month to day" en pantalla).
import {
  applyFilters, buildForecast, byAdvisor, byCountry, byMonth, COUNTRIES, FILTER_DEFS,
  isOpen, isQualified, isWon, leadComments, leadUnits, PIPELINE_STAGES, stageDistribution, summarize,
} from '../utils/analytics.js'
import { buildStageFunnel, leadReferenceDate, leadReferenceMonth } from '../utils/leads.js'
import { isOverdue, toDate } from '../utils/dates.js'

/**
 * Regla de colores de los datos (DECISIONES D12). Límites PROVISIONALES hasta que el ingeniero
 * los defina: % de paso < bajo → amarillo (atención) · ≥ bueno → verde · en medio → gris.
 */
export const LIMITES_PASO = { bajo: 0.6, bueno: 0.75 }
export const tonoPaso = (ratio) => (ratio == null ? 'neutro' : ratio >= LIMITES_PASO.bueno ? 'verde' : ratio < LIMITES_PASO.bajo ? 'amarillo' : 'neutro')

/**
 * Color del círculo de conversión de calificados en las tarjetas de ejecutivos (DECISIONES D14).
 * PROVISIONAL hasta que el ingeniero defina la meta: ≥ 20 % verde · 10–20 % azul · < 10 % amarillo.
 */
export const LIMITES_CONVERSION = { bajo: 0.1, bueno: 0.2 }
export const tonoConversion = (ratio) => (ratio >= LIMITES_CONVERSION.bueno ? 'verde' : ratio < LIMITES_CONVERSION.bajo ? 'amarillo' : 'azul')

/** Filtros por defecto (paso 4.0): Tipo de lead = Calificado (+ Período = mes actual hasta hoy). */
export const FILTROS_POR_DEFECTO = { filterTipoLead: ['calificado'] }

export const PAISES = COUNTRIES
/** Sin límite de período (todo el historial). */
export const PERIODO_VACIO = { desde: '', hasta: '' }

const aFechaISO = (fecha) => `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`

/** Período por defecto (requisito R11): del día 1 del mes actual hasta hoy. */
export function periodoPorDefecto(hoy = new Date()) {
  return { desde: aFechaISO(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), hasta: aFechaISO(hoy) }
}

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

/** ¿Los filtros son distintos a los de por defecto (todos los países, Calificado, mes actual hasta hoy)? */
export function hayFiltrosActivos(filters, periodo, defecto = periodoPorDefecto()) {
  const distinto = (def) => JSON.stringify(filters[def.key] ?? null) !== JSON.stringify(FILTROS_POR_DEFECTO[def.key] ?? null)
  return FILTER_DEFS.some(distinto) || periodo.desde !== defecto.desde || periodo.hasta !== defecto.hasta
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
 * Partes de la barra de cada ejecutivo (4.0: el verde se divide en dos). Para que las 4 partes
 * sumen el total sin contar a nadie dos veces:
 *   ganados de calificados + ganados de no calificados + calificados sin ganar
 *   + no calificados sin ganar = total de leads.
 */
export function partesEjecutivo(leads) {
  return {
    ganadosCalificados: leads.filter((lead) => isWon(lead) && isQualified(lead)).length,
    ganadosNoCalificados: leads.filter((lead) => isWon(lead) && !isQualified(lead)).length,
    calificadosSinGanar: leads.filter((lead) => isQualified(lead) && !isWon(lead)).length,
    noCalificadosSinGanar: leads.filter((lead) => !isQualified(lead) && !isWon(lead)).length,
  }
}

/**
 * Seguimientos vencidos: leads abiertos cuya próxima gestión ya pasó. Misma regla que "vencidos"
 * de calculateMetrics (lógica copiada): OPEN_STATES + isOverdue(proximaGestion).
 */
export const esVencido = (lead) => isOpen(lead) && isOverdue(lead.proximaGestion)

/**
 * Ejecutivos que deben aparecer en "Desempeño por ejecutivo" (4.0): todos los que tienen leads en
 * el país elegido, sin importar el período ni el tipo de lead. Si se eligieron ejecutivos en el
 * panel Filtros, solo esos. País de cada uno = el más frecuente en sus leads.
 */
export function listaEjecutivos(todosLosLeads, filters) {
  const paises = new Map()
  for (const lead of todosLosLeads) {
    if (filters.filterPais != null && !filters.filterPais.includes(lead.pais)) continue
    if (filters.filterEjecutivo != null && !filters.filterEjecutivo.includes(lead.asesor)) continue
    if (!lead.asesor) continue
    const conteo = paises.get(lead.asesor) ?? new Map()
    conteo.set(lead.pais, (conteo.get(lead.pais) ?? 0) + 1)
    paises.set(lead.asesor, conteo)
  }
  return [...paises.entries()].map(([name, conteo]) => ({ name, country: [...conteo.entries()].sort((a, b) => b[1] - a[1])[0][0] }))
}

/**
 * Todos los ejecutivos (byAdvisor de la lógica copiada), ordenados por ganados y luego por
 * calificados. Los de `base` que no tengan leads con los filtros actuales se agregan al final con 0.
 */
export function desempenoEjecutivos(leads, base = []) {
  const conLeads = byAdvisor(leads)
    .map((row) => ({ ...row, partes: partesEjecutivo(row.leads), conversion: conversionCalificados(row.leads), vencidos: row.leads.filter(esVencido) }))
    .sort((a, b) => b.won - a.won || b.qualified - a.qualified || a.name.localeCompare(b.name))
  const nombres = new Set(conLeads.map((row) => row.name))
  const enCero = base
    .filter((e) => !nombres.has(e.name))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((e) => ({ ...e, leads: [], total: 0, won: 0, qualified: 0, partes: partesEjecutivo([]), conversion: conversionCalificados([]), vencidos: [], sinLeads: true }))
  return [...conLeads, ...enCero]
}

// ---------- Embudo de 6 etapas (4.0, reemplaza "Embudo por mes") ----------
// ETAPA REAL ESTIMADA (DECISIONES D13). En la API todos los leads perdidos quedan en la etapa 6
// (Cierre) sin importar dónde se perdieron, así que la etapa actual (buildStageFunnel de la lógica
// copiada) no sirve para ver dónde se caen. Se estima la etapa alcanzada así:
//   ganados → 6 · abiertos → su etapa actual (opportunity_stage) ·
//   perdidos → la última etapa 2 a 5 con datos registrados en stage_feedback_json (si no hay, 1).
// Un lead que se saltó una etapa (p. ej. no requería demo) cuenta como que pasó por ella.
export const ETAPAS = PIPELINE_STAGES
const tieneDatosEtapa = (lead, n) => {
  const v = lead.raw?.stage_feedback_json?.[String(n)]
  return (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length > 0) || (typeof v === 'string' && v.trim() !== '')
}
export function etapaAlcanzada(lead) {
  if (isWon(lead)) return 6
  if (lead.estado !== 'perdido') return Number.isFinite(lead.apiStage) ? lead.apiStage : 1
  let maxima = 1
  for (let n = 2; n <= 5; n++) if (tieneDatosEtapa(lead, n)) maxima = n
  return maxima
}
/** ¿El lead llegó a la etapa k? */
export const llego = (lead, k) => etapaAlcanzada(lead) >= k
/** ¿Pasó de la etapa k a la siguiente? En la etapa 6 (Cierre), "pasar" = ganarse. */
export const paso = (lead, k) => (k >= 6 ? isWon(lead) : etapaAlcanzada(lead) >= k + 1)
/** Leads que están HOY en la etapa k: abiertos con esa etapa actual. */
export const estaHoy = (lead, k) => isOpen(lead) && lead.apiStage === k

/** Por ejecutivo en una etapa: llegaron, pasaron y % de paso (salida). < 5 leads = "pocos datos". */
export function ejecutivosEnEtapa(leads, k, minimo = 5) {
  const grupos = new Map()
  for (const lead of leads) {
    if (!llego(lead, k)) continue
    const g = grupos.get(lead.asesor) ?? { name: lead.asesor, paises: new Map(), llegaron: 0, pasaron: 0 }
    g.llegaron++
    if (paso(lead, k)) g.pasaron++
    g.paises.set(lead.pais, (g.paises.get(lead.pais) ?? 0) + 1)
    grupos.set(lead.asesor, g)
  }
  const filas = [...grupos.values()].map((g) => ({
    name: g.name,
    country: [...g.paises.entries()].sort((a, b) => b[1] - a[1])[0]?.[0],
    llegaron: g.llegaron,
    pasaron: g.pasaron,
    ratio: g.llegaron ? g.pasaron / g.llegaron : 0,
    pocos: g.llegaron < minimo,
  }))
  const orden = (a, b) => b.ratio - a.ratio || b.llegaron - a.llegaron || String(a.name).localeCompare(String(b.name))
  return [...filas.filter((f) => !f.pocos).sort(orden), ...filas.filter((f) => f.pocos).sort((a, b) => b.llegaron - a.llegaron || orden(a, b))]
}

/**
 * Embudo de las 6 etapas. Por etapa: llegaron, % de entrada (desde la anterior), pasaron y % de
 * salida (a la siguiente), cuántos están hoy y cuántos de ellos con gestión vencida, y el mejor
 * ejecutivo (mayor % de salida con al menos 5 leads que llegaron; empate → más leads).
 * La "mayor caída" es la etapa 2 a 6 con el menor % de entrada.
 */
export function embudoEtapas(leads) {
  const etapas = ETAPAS.map((label, i) => {
    const k = i + 1
    const llegaron = leads.filter((l) => llego(l, k)).length
    const pasaron = leads.filter((l) => llego(l, k) && paso(l, k)).length
    const hoy = leads.filter((l) => estaHoy(l, k))
    const mejor = ejecutivosEnEtapa(leads, k).find((f) => !f.pocos) ?? null
    return { stage: k, label, llegaron, pasaron, salida: llegaron ? pasaron / llegaron : null, hoy: hoy.length, hoyVencidos: hoy.filter(esVencido).length, mejor }
  })
  etapas.forEach((e, i) => { e.entrada = i === 0 ? null : etapas[i - 1].llegaron ? e.llegaron / etapas[i - 1].llegaron : null })
  const candidatas = etapas.filter((e) => e.entrada != null)
  const mayorCaida = candidatas.length ? candidatas.reduce((min, e) => (e.entrada < min.entrada ? e : min)).stage : null
  return { etapas, mayorCaida }
}

/**
 * Punto débil de un ejecutivo (4.0b): la etapa 2 a 6 con el menor % de entrada, contando solo
 * las etapas cuya etapa anterior tuvo al menos 5 leads (misma regla que "Mejor"). Se compara con
 * el % de entrada del equipo en esa misma etapa. null si ninguna etapa tiene datos suficientes.
 */
export function puntoDebil(embudoPropio, embudoEquipo, minimo = 5) {
  const candidatas = embudoPropio.etapas.filter((e, i) => i > 0 && e.entrada != null && embudoPropio.etapas[i - 1].llegaron >= minimo)
  if (!candidatas.length) return null
  const peor = candidatas.reduce((min, e) => (e.entrada < min.entrada ? e : min))
  return { stage: peor.stage, label: peor.label, ratio: peor.entrada, equipo: embudoEquipo.etapas[peor.stage - 1]?.entrada ?? null }
}

/** Por mes del período (más reciente primero): llegaron, pasaron y % de paso en la etapa k. */
export function mesesEnEtapa(leads, k) {
  const meses = [...new Set(leads.map(leadReferenceMonth).filter(Boolean))].sort((a, b) => b.localeCompare(a))
  return meses.map((month) => {
    const delMes = leads.filter((l) => leadReferenceMonth(l) === month && llego(l, k))
    const pasaron = delMes.filter((l) => paso(l, k)).length
    return { month, llegaron: delMes.length, pasaron, ratio: delMes.length ? pasaron / delMes.length : null }
  })
}

// ---------- Pestaña "Ejecutivos": tarjetas (4.0b) ----------
export const iniciales = (nombre = '') => nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '—'

/** Meses del período (los de los leads filtrados), del más antiguo al más reciente. */
export const mesesDelPeriodo = (leads) => [...new Set(leads.map(leadReferenceMonth).filter(Boolean))].sort()

/** Ventas por mes de un grupo de leads: ganados de calificados y de no calificados en cada mes. */
export function ventasPorMes(leads, meses) {
  return meses.map((month) => {
    const delMes = leads.filter((l) => leadReferenceMonth(l) === month)
    const c = conversionCalificados(delMes)
    return { month, leads: delMes, ganadosCalificados: c.ganadosCalificados, ganadosNoCalificados: c.ganadosNoCalificados, total: c.ganados }
  })
}

/**
 * Tarjetas de la pestaña Ejecutivos. Usa desempenoEjecutivos (lista completa del país, los de 0
 * al final). Orden: ganados de calificados ("ventas" de la tarjeta), luego todos los ganados,
 * luego calificados. Posición #N solo para quien tiene leads. Equipo = suma de todos.
 * Comprobación: Σ ventas + Σ "+X no calificados" = Ganados del Resumen.
 */
export function tarjetasEjecutivos(leads, base = []) {
  const meses = mesesDelPeriodo(leads)
  const filas = desempenoEjecutivos(leads, base)
  const conLeads = filas.filter((f) => !f.sinLeads)
    .sort((a, b) => b.conversion.ganadosCalificados - a.conversion.ganadosCalificados || b.won - a.won || b.qualified - a.qualified || a.name.localeCompare(b.name))
  const enCero = filas.filter((f) => f.sinLeads)
  const tarjetas = [...conLeads, ...enCero].map((f, i) => ({
    ...f,
    posicion: f.sinLeads ? null : i + 1,
    iniciales: iniciales(f.name),
    units: f.units ?? 0,
    meses: ventasPorMes(f.leads, meses),
  }))
  const equipo = conversionCalificados(leads)
  return {
    tarjetas,
    meses,
    equipo: {
      ventas: equipo.ganadosCalificados,
      calificados: equipo.calificados,
      ratio: equipo.ratio,
      unidades: summarize(leads).units,
      vencidos: leads.filter(esVencido).length,
    },
  }
}

// ---------- Ventana "Detalle de leads" (al cliquear un indicador) ----------
export const INDICADORES = {
  total: { titulo: 'Total leads', descripcion: 'Todos los leads con los filtros activos.', filtro: () => true },
  calificados: { titulo: 'Calificados', descripcion: 'Solo los leads calificados.', filtro: isQualified },
  ganados: { titulo: 'Ganados', descripcion: 'Solo los leads ganados, indicando si cada uno era calificado o no.', filtro: isWon, marca: 'calificacion' },
  conversion: { titulo: 'Conversión de calificados', descripcion: 'Los leads calificados; se marcan los que ganaron (ganados calificados ÷ calificados).', filtro: isQualified, marca: 'gano' },
  unidades: { titulo: 'Unidades vendidas', descripcion: 'Los leads ganados con sus unidades.', filtro: isWon },
  porCierre: { titulo: 'Unidades por cierre', descripcion: 'Los leads ganados con sus unidades (unidades ÷ ganados).', filtro: isWon },
  vencidos: { titulo: 'Seguimientos vencidos', descripcion: 'Leads abiertos cuya próxima gestión ya pasó.', filtro: esVencido },
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
// En 4.0: se quitó `monthlyFunnelGroups` (el "Embudo por mes" se reemplazó por embudoEtapas).
// En 4.0b: se quitaron `advisors`, `advisorsByCountry`, `monthlyCountryTables` y `ejecutivos`
// (sus secciones pasaron a la pestaña Ejecutivos, que usa tarjetasEjecutivos).
export function datosVistaGeneral(leads) {
  const months = byMonth(leads).map((month) => {
    const monthLeads = leads.filter((lead) => leadReferenceMonth(lead) === month.month)
    return { ...month, noCalificados: month.total - month.qualified, conversion: conversionCalificados(monthLeads) }
  })
  const countries = byCountry(leads).map((row) => ({
    ...row,
    conversion: conversionCalificados(leads.filter((lead) => lead.pais === row.country)),
  }))
  const embudo = embudoEtapas(leads)
  return { months, countries, embudo }
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
