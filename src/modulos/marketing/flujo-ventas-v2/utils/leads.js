// Copiado de InnovAIgt/DashboardLeads (Dashboard-Leds/src/utils/leads.js)
import { LEAD_STATES, LOSS_REASONS, STAGE_ORDER } from '../types/lead.js'
import { isOverdue, monthValue } from './dates.js'

export const OPEN_STATES = ['activo', 'en_espera', 'detenido']

export function leadReferenceDate(lead) {
  return lead.estado === 'ganado' && lead.fechaCierreExitoso
    ? lead.fechaCierreExitoso
    : lead.fechaCreacion
}

export function leadReferenceMonth(lead) {
  return monthValue(leadReferenceDate(lead))
}

export const API_STAGE_LABELS = [
  'Asignación',
  'Reunión',
  'Demo',
  'Envío de propuesta',
  'Seguimiento',
  'Cierre',
]

export function leadDisplayId(lead) {
  return lead.clientId || String(lead.id)
}

export function buildStageFunnel(leads) {
  const apiLeads = leads.filter((lead) => Number.isFinite(lead.apiStage))

  return API_STAGE_LABELS.map((label, index) => {
    const stage = index + 1
    const currentStageLeads = apiLeads.filter((lead) => lead.apiStage === stage)
    return {
      stage,
      label,
      reached: apiLeads.filter((lead) => lead.apiStage >= stage).length,
      current: currentStageLeads.length,
      open: currentStageLeads.filter((lead) => OPEN_STATES.includes(lead.estado)).length,
      leads: currentStageLeads,
    }
  })
}

export function reportedRadioCount(texts) {
  const patterns = [
    /\b(\d{1,3})\s*(?:unidades?\s+de\s+)?radios?\b/gi,
    /\bradios?\s*(?:x|:|de|por)?\s*(\d{1,3})\b/gi,
  ]
  const quantities = []
  for (const text of texts) {
    for (const pattern of patterns) {
      pattern.lastIndex = 0
      for (const match of text.matchAll(pattern)) {
        const quantity = Number(match[1])
        if (Number.isInteger(quantity) && quantity > 0 && quantity <= 999) quantities.push(quantity)
      }
    }
  }
  return quantities.length ? Math.max(...quantities) : undefined
}

export function resumenBase(leads, filters) {
  const matchesFilter = (selection, value) => {
    if (selection == null || selection === '') return true
    return Array.isArray(selection) ? selection.includes(value) : selection === value
  }

  return leads.filter((lead) => {
    if (!matchesFilter(filters.filterEjecutivo, lead.asesor)) return false
    if (!matchesFilter(filters.filterPais, lead.pais)) return false
    if (!matchesFilter(filters.filterTipoLead, lead.tipoLead)) return false
    if (!matchesFilter(filters.filterEstado, lead.estado)) return false
    return true
  })
}

export function calculateMetrics(leads, now = new Date()) {
  const enProceso = leads.filter((lead) => OPEN_STATES.includes(lead.estado)).length
  const ganados = leads.filter((lead) => lead.estado === 'ganado').length
  const perdidos = leads.filter((lead) => lead.estado === 'perdido').length
  const invalidos = leads.filter((lead) => lead.estado === 'invalido').length
  const total = leads.length
  const reconciliationIssues = []
  const stateDifference = total - (enProceso + ganados + perdidos + invalidos)
  const lostWithoutReason = leads.filter((lead) => lead.estado === 'perdido' && !lead.motivo).length
  const reasonOutsideLost = leads.filter((lead) => lead.estado !== 'perdido' && lead.motivo).length
  const lostWithManualReason = leads.filter((lead) => lead.estado === 'perdido' && lead.motivo).length
  const reasonDifference = perdidos - lostWithManualReason
  const openWithClosedOutcome = leads.filter((lead) =>
    OPEN_STATES.includes(lead.estado) &&
    ['perdida', 'cerrada'].includes(lead.raw?.resultado_venta),
  ).length

  if (stateDifference !== 0) {
    reconciliationIssues.push({
      code: 'state_partition',
      difference: stateDifference,
      message: `El total no cuadra con la partición de estados (diferencia: ${stateDifference}).`,
    })
  }
  if (reasonDifference !== 0 || reasonOutsideLost > 0) {
    reconciliationIssues.push({
      code: 'loss_reason',
      difference: reasonDifference,
      message: `${lostWithoutReason} lead(s) perdido(s) sin motivo y ${reasonOutsideLost} motivo(s) fuera de un lead perdido.`,
    })
  }
  if (openWithClosedOutcome > 0) {
    reconciliationIssues.push({
      code: 'status_outcome_conflict',
      difference: openWithClosedOutcome,
      message: `${openWithClosedOutcome} lead(s) tienen estado abierto en el API pero un resultado de venta cerrado; se conservan como abiertos según status.`,
    })
  }

  return {
    total,
    enProceso,
    ganados,
    perdidos,
    invalidos,
    tasaCierre: total ? ganados / total : 0,
    cierresDecididos: ganados + perdidos,
    diferenciaEstados: stateDifference,
    perdidosSinMotivo: lostWithoutReason,
    resultadoEstadoConflictivo: openWithClosedOutcome,
    vencidos: leads.filter((lead) => OPEN_STATES.includes(lead.estado) && isOverdue(lead.proximaGestion, now)).length,
    reconciliationIssues,
  }
}

export function parseLead(value, index) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`El registro ${index + 1} no es un objeto válido.`)
  }
  const id = value.id ?? value.identificador
  if (id === undefined || id === null || String(id).trim() === '') {
    throw new Error(`El registro ${index + 1} no contiene id o identificador.`)
  }
  if (!LEAD_STATES.includes(value.estado)) throw new Error(`El lead ${id} tiene un estado desconocido.`)
  const etapa = value.etapa
  const maxEtapa = value.maxEtapa ?? etapa
  if (!STAGE_ORDER.includes(etapa)) throw new Error(`El lead ${id} tiene una etapa desconocida.`)
  if (!STAGE_ORDER.includes(maxEtapa)) throw new Error(`El lead ${id} tiene una marca maxEtapa desconocida.`)
  if (value.motivo != null && !LOSS_REASONS.includes(value.motivo)) {
    throw new Error(`El lead ${id} contiene un motivo fuera del catálogo permitido.`)
  }
  for (const field of ['asesor', 'pais']) {
    if (value[field] != null && typeof value[field] !== 'string') {
      throw new Error(`El campo ${field} del lead ${id} debe ser texto.`)
    }
  }
  for (const field of ['comentarioGestion', 'comentarioReunion', 'apiStageLabel', 'clientId', 'clientName']) {
    if (value[field] != null && typeof value[field] !== 'string') {
      throw new Error(`El campo ${field} del lead ${id} debe ser texto.`)
    }
  }
  if (value.calificado != null && typeof value.calificado !== 'boolean') {
    throw new Error(`El campo calificado del lead ${id} debe ser booleano.`)
  }
  for (const field of ['calificacionConocida', 'maxEtapaConocida']) {
    if (value[field] != null && typeof value[field] !== 'boolean') {
      throw new Error(`El campo ${field} del lead ${id} debe ser booleano.`)
    }
  }
  if (value.cantidadEquipos != null && (!Number.isInteger(value.cantidadEquipos) || value.cantidadEquipos < 1 || value.cantidadEquipos > 999)) {
    throw new Error(`El campo cantidadEquipos del lead ${id} debe ser un entero entre 1 y 999.`)
  }
  if (value.cantidadEquiposEnComentario != null
    && (!Number.isInteger(value.cantidadEquiposEnComentario) || value.cantidadEquiposEnComentario < 1 || value.cantidadEquiposEnComentario > 999)) {
    throw new Error(`El campo cantidadEquiposEnComentario del lead ${id} debe ser un entero entre 1 y 999.`)
  }
  if (value.radiosVendidosReportadas != null
    && (!Number.isInteger(value.radiosVendidosReportadas) || value.radiosVendidosReportadas < 1 || value.radiosVendidosReportadas > 999)) {
    throw new Error(`El campo radiosVendidosReportadas del lead ${id} debe ser un entero entre 1 y 999.`)
  }

  const optionalBoolean = (field) => {
    const candidate = value[field]
    if (candidate == null) return undefined
    if (typeof candidate !== 'boolean') throw new Error(`El campo ${field} del lead ${id} debe ser booleano.`)
    return candidate
  }
  const optionalDate = (field) => {
    const candidate = value[field]
    if (candidate == null || candidate === '') return undefined
    if (typeof candidate !== 'string' && typeof candidate !== 'number') {
      throw new Error(`El campo ${field} del lead ${id} debe ser una fecha válida.`)
    }
    if (typeof candidate === 'string') {
      const dateOnly = normalizeDateOnly(candidate)
      if (dateOnly) return dateOnly
      if (/^\d{4}-\d{2}-\d{2}$/.test(candidate) || /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(candidate)) {
        throw new Error(`El campo ${field} del lead ${id} contiene una fecha inválida.`)
      }
    }
    const date = new Date(candidate)
    if (Number.isNaN(date.getTime())) throw new Error(`El campo ${field} del lead ${id} contiene una fecha inválida.`)
    return date.toISOString()
  }

  return {
    id: String(id),
    asesor: typeof value.asesor === 'string' && value.asesor.trim() ? value.asesor.trim() : 'Sin asignar',
    pais: typeof value.pais === 'string' && value.pais.trim() ? value.pais.trim() : 'No disponible',
    estado: value.estado,
    etapa,
    maxEtapa,
    maxEtapaConocida: typeof value.maxEtapaConocida === 'boolean'
      ? value.maxEtapaConocida
      : value.maxEtapa != null,
    calificado: typeof value.calificado === 'boolean' ? value.calificado : false,
    calificacionConocida: typeof value.calificacionConocida === 'boolean'
      ? value.calificacionConocida
      : typeof value.calificado === 'boolean',
    tipoLead: value.tipoLead,
    motivo: value.motivo ?? undefined,
    fechaCreacion: optionalDate('fechaCreacion'),
    fechaCierreExitoso: optionalDate('fechaCierreExitoso'),
    proximaGestion: optionalDate('proximaGestion'),
    fechaSeguimiento: optionalDate('fechaSeguimiento'),
    comentarioGestion: value.comentarioGestion?.trim() || undefined,
    comentarioReunion: value.comentarioReunion?.trim() || undefined,
    fechaReunion: optionalDate('fechaReunion'),
    fcFecha: optionalDate('fcFecha'),
    fcIncluir: optionalBoolean('fcIncluir'),
    fcExcluir: optionalBoolean('fcExcluir'),
    fcIntentar: optionalBoolean('fcIntentar'),
    cantidadEquipos: value.cantidadEquipos,
    cantidadEquiposEnComentario: value.cantidadEquiposEnComentario,
    radiosVendidosReportadas: value.radiosVendidosReportadas,
    producto: value.producto,
    clientId: value.clientId?.trim() || undefined,
    clientName: value.clientName?.trim() || undefined,
    raw: value.raw,
    apiStage: value.apiStage,
    apiStageLabel: value.apiStageLabel,
  }
}

export function extractLeadRows(payload) {
  if (Array.isArray(payload)) return payload
  if (payload && typeof payload === 'object') {
    for (const key of ['leads', 'reuniones', 'data', 'items', 'results']) {
      const nested = payload[key]
      if (Array.isArray(nested)) return nested
      if (nested && typeof nested === 'object') return extractLeadRows(nested)
    }
  }
  throw new Error('La API respondió con un formato inesperado: se esperaba una lista de leads.')
}

export function parseLeads(payload) {
  const leads = extractLeadRows(payload).map(parseLead)
  const ids = new Set()
  for (const lead of leads) {
    if (ids.has(lead.id)) throw new Error(`La API devolvió el identificador duplicado ${lead.id}.`)
    ids.add(lead.id)
  }
  return leads
}

function meetingState(row) {
  if (row.status === 'cerrado') {
    if (row.resultado_venta === 'perdida') return 'perdido'
    if (row.resultado_venta === 'cerrada') return 'ganado'
    return 'invalido'
  }
  if (row.status === 'no_agendado' || row.status === 'pending') return 'en_espera'
  if (row.status === 'stage_2_overdue') return 'detenido'
  if (row.status === 'en_proceso') return 'activo'
  console.warn(`El lead ${row.id ?? '(sin id)'} tiene un estado de API no reconocido: "${row.status}". Se trata como 'en_espera'.`)
  return 'en_espera'
}

function meetingStage(row) {
  const stage = Number(row.opportunity_stage)
  if (stage === 1 || stage === 2 || stage === 3) return 'contacto_inicial'
  if (stage === 4) return 'propuesta_enviada'
  if (stage === 5) return 'propuesta_enviada'
  if (stage === 6) return 'contratacion'
  throw new Error(`El lead ${row.id ?? '(sin id)'} tiene una etapa API no reconocida.`)
}

function lossReason(category) {
  if (typeof category !== 'string' || !category.trim()) return undefined
  const normalized = String(category ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .trim()

  if (/no respond|no contesta|no responde|sin contacto|no esta|no estaba/.test(normalized)) return 'no_respondio'
  if (/proveedor|tomaron otro/.test(normalized)) return 'proveedor'
  if (/precio|costo/.test(normalized)) return 'precio'
  if (/presupuesto|no tiene presupuesto/.test(normalized)) return 'presupuesto'
  if (/no interesa|no interes|no quiere|no desea|no interesado/.test(normalized)) return 'no_interesado'
  if (/ya no|no necesita|sin requerimiento|no hay requerimiento|no solicito/.test(normalized)) return 'ya_no_necesita'
  if (/incompat|no compatible/.test(normalized)) return 'incompatibilidad'
  if (/cobertura/.test(normalized)) return 'cobertura'
  if (/condicion comercial/.test(normalized)) return 'condiciones_comerciales'
  if (/plazo|contractual/.test(normalized)) return 'plazo_contractual'
  if (/decision interna/.test(normalized)) return 'decision_interna'
  if (/sin categoria|sin especificar/.test(normalized)) return undefined
  if (/no califica|no aplica|no valida|equivocado|numero extrano/.test(normalized)) return 'no_valida'
  if (/fraude|estafa/.test(normalized)) return 'fraude'
  if (/modalidad/.test(normalized)) return 'modalidad_no_compatible'
  if (/^otro$/.test(normalized)) return 'otro'
  return 'otro'
}

function meetingLossReason(row) {
  const closureReason = row.stage_feedback_json?.['6']?.razon_cierre
  if (typeof closureReason === 'string') {
    const separator = closureReason.indexOf(':')
    if (separator > 0) {
      const prefix = closureReason.slice(0, separator).trim()
      const mappedPrefix = lossReason(prefix)
      if (mappedPrefix !== 'otro' || /^otro$/i.test(prefix)) return mappedPrefix
    }
  }
  return lossReason(row.stage_feedback_json?.['6']?.motivo_no_contacto)
}

export function getFeedbackTexts(row, currentStageOnly = false) {
  const texts = []
  if (!currentStageOnly && typeof row.advisor_feedback === 'string' && row.advisor_feedback.trim()) {
    texts.push(row.advisor_feedback.trim())
  }

  const stageFeedback = row.stage_feedback_json
  if (stageFeedback && typeof stageFeedback === 'object' && !Array.isArray(stageFeedback)) {
    const currentStage = Number(row.opportunity_stage)
    const stages = Object.entries(stageFeedback)
      .filter(([stage]) => !currentStageOnly || Number(stage) === currentStage)
      .map(([, value]) => value)
    for (const stage of stages) {
      if (!stage || typeof stage !== 'object' || Array.isArray(stage)) continue
      for (const [key, value] of Object.entries(stage)) {
        if (typeof value === 'string' && value.trim() && /feedback|retroalimentacion|comentario|notas|notes|respuesta_cliente|productos_ofrecidos/i.test(key)) {
          texts.push(value.trim())
        }
        if (key === 'proxima_gestion' && value && typeof value === 'object' && typeof value.notas === 'string' && value.notas.trim()) {
          texts.push(value.notas.trim())
        }
      }
    }
  }

  return [...new Set(texts)]
}

function latestNextManagement(row) {
  const stageFeedback = row.stage_feedback_json
  if (!stageFeedback || typeof stageFeedback !== 'object' || Array.isArray(stageFeedback)) return undefined

  const candidates = Object.entries(stageFeedback).flatMap(([stage, value]) => {
    const item = value?.proxima_gestion
    if (!item || typeof item !== 'object' || Array.isArray(item)) return []
    const date = item.fecha_hora
    if ((typeof date !== 'string' && typeof date !== 'number') || Number.isNaN(new Date(date).getTime())) return []
    const createdAt = item.created_at
    return [{
      date: new Date(date).toISOString(),
      comment: typeof item.notas === 'string' ? item.notas.trim() : '',
      stage: Number(stage) || 0,
      createdAt: createdAt && !Number.isNaN(new Date(createdAt).getTime())
        ? new Date(createdAt).getTime()
        : 0,
    }]
  })

  return candidates.sort((a, b) => b.createdAt - a.createdAt || b.stage - a.stage)[0]
}

function normalizeDateOnly(value) {
  if (typeof value !== 'string') return undefined
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    ?? value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!match) return undefined

  const [, first, second, third] = match
  const slashDate = value.includes('/')
  const year = Number(slashDate ? third : first)
  const month = Number(second)
  const day = Number(slashDate ? first : third)
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return undefined
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function validOptionalDate(value) {
  if ((typeof value !== 'string' && typeof value !== 'number') || value === '') return undefined
  if (typeof value === 'string') {
    const normalized = normalizeDateOnly(value)
    if (normalized) return normalized
    if (/^\d{4}-\d{2}-\d{2}$/.test(value) || /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) return undefined
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

function meetingFeedback(row) {
  const stages = row.stage_feedback_json
  const stage = stages && typeof stages === 'object' && !Array.isArray(stages) ? stages['2'] : undefined
  return stage && typeof stage === 'object' && !Array.isArray(stage) ? stage : undefined
}

function meetingDate(row) {
  if (row.start_time) return row.start_time

  const feedback = meetingFeedback(row)
  const isoDate = feedback?.fecha_reunion_iso
  const normalizedIsoDate = normalizeDateOnly(isoDate)
  if (normalizedIsoDate) return normalizedIsoDate
  if (typeof isoDate === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(isoDate) && !Number.isNaN(new Date(isoDate).getTime())) {
    return new Date(isoDate).toISOString()
  }
  return normalizeDateOnly(feedback?.fecha_reunion)
}

function meetingComment(row) {
  const feedback = meetingFeedback(row)
  for (const field of ['retroalimentacion', 'notes']) {
    const comment = feedback?.[field]
    if (typeof comment === 'string' && comment.trim()) return comment.trim()
  }
  return undefined
}

function parseEquipmentCount(texts) {
  const patterns = [
    /\b(\d{1,3})\s*(?:unidades?\s+de\s+)?(?:radios?|equipos?|terminales?)\b/gi,
    /\b(?:radios?|equipos?|terminales?)\s*(?:x|:|de|por)?\s*(\d{1,3})\b/gi,
  ]
  const quantities = []
  for (const text of texts) {
    for (const pattern of patterns) {
      pattern.lastIndex = 0
      for (const match of text.matchAll(pattern)) {
        const quantity = Number(match[1])
        if (Number.isInteger(quantity) && quantity > 0 && quantity <= 999) quantities.push(quantity)
      }
    }
  }
  return quantities.length ? quantities[quantities.length - 1] : undefined
}

function structuredEquipmentCount(row, currentStageOnly = false) {
  const stages = row.stage_feedback_json
  if (!stages || typeof stages !== 'object' || Array.isArray(stages)) return undefined

  const stageEntries = Object.entries(stages)
    .filter(([stage]) => !currentStageOnly || Number(stage) === Number(row.opportunity_stage))
    .sort(([left], [right]) => Number(right) - Number(left))
  for (const [, feedback] of stageEntries) {
    if (!feedback || typeof feedback !== 'object' || Array.isArray(feedback)) continue
    for (const field of ['cantidad_equipos', 'equipos', 'cantidad_oferta']) {
      const candidate = feedback[field]
      const parsed = typeof candidate === 'number'
        ? candidate
        : typeof candidate === 'string' && /^\s*\d{1,3}\s*$/.test(candidate)
          ? Number(candidate)
          : undefined
      if (Number.isInteger(parsed) && parsed > 0 && parsed <= 999) return parsed
    }
  }
  return undefined
}

export function mapMeetingLead(row, index) {
  const estado = meetingState(row)
  const etapa = meetingStage(row)
  const country = row.pais ?? row.country
  const pais = country === 'GT' ? 'Guatemala' : country === 'SV' ? 'El Salvador' : country
  const management = latestNextManagement(row)
  const directManagement = row.proximaGestion ?? row.proxima_gestion
  const directDate = directManagement && typeof directManagement === 'object'
    ? directManagement.fecha_hora
    : directManagement
  const directComment = directManagement && typeof directManagement === 'object' && typeof directManagement.notas === 'string'
    ? directManagement.notas
    : ''
  const feedbackTexts = getFeedbackTexts(row)
  const currentStageTexts = getFeedbackTexts(row, true)
  const apiStageLabel = typeof row.opportunity_stage_label === 'string'
    ? row.opportunity_stage_label.trim()
    : API_STAGE_LABELS[Number(row.opportunity_stage) - 1] ?? ''
  return parseLead({
    id: row.id,
    asesor: row.asesor ?? row.advisor_name,
    pais,
    estado,
    etapa,
    maxEtapa: etapa,
    maxEtapaConocida: false,
    calificado: row.tipo_lead === 'calificado' || row.calificado === true,
    calificacionConocida: ['calificado', 'no_calificado'].includes(row.tipo_lead)
      || typeof row.calificado === 'boolean',
    tipoLead: ['calificado', 'no_calificado'].includes(row.tipo_lead)
      ? row.tipo_lead
      : typeof row.calificado === 'boolean'
        ? row.calificado ? 'calificado' : 'no_calificado'
        : undefined,
    fechaCreacion: row.created_at,
    fechaCierreExitoso: estado === 'ganado'
      ? validOptionalDate(row.stage_feedback_json?.['6']?.fecha_cierre_real)
      : undefined,
    motivo: estado === 'perdido' ? meetingLossReason(row) : undefined,
    proximaGestion: directDate ?? management?.date,
    fechaSeguimiento: normalizeDateOnly(row.stage_feedback_json?.['5']?.fecha_seguimiento),
    comentarioGestion: directComment || management?.comment,
    fechaReunion: meetingDate(row),
    comentarioReunion: meetingComment(row),
    apiStage: Number(row.opportunity_stage),
    apiStageLabel,
    cantidadEquipos: structuredEquipmentCount(row, true)
      ?? structuredEquipmentCount(row),
    cantidadEquiposEnComentario: parseEquipmentCount(currentStageTexts),
    radiosVendidosReportadas: estado === 'ganado' ? reportedRadioCount(feedbackTexts) : undefined,
    clientId: typeof row.client_id === 'string' ? row.client_id : undefined,
    clientName: typeof row.client_name === 'string' ? row.client_name : undefined,
    producto: estado === 'ganado' ? row.rubro || undefined : undefined,
    raw: row,
  }, index)
}

export function stageLabel(stage) {
  return {
    contacto_inicial: 'Contacto inicial',
    propuesta_enviada: 'Propuesta enviada',
    documentacion: 'Documentación',
    contratacion: 'Contratación',
  }[stage] ?? stage
}

export function stateLabel(state) {
  return {
    activo: 'Activo',
    en_espera: 'En espera',
    detenido: 'Detenido',
    ganado: 'Ganado',
    perdido: 'Perdido',
    invalido: 'Inválido',
  }[state] ?? state
}

export function lossReasonLabel(reason) {
  return {
    no_respondio: 'No respondió',
    proveedor: 'Proveedor',
    precio: 'Precio',
    presupuesto: 'Presupuesto',
    no_interesado: 'No interesado',
    ya_no_necesita: 'Ya no lo necesita',
    incompatibilidad: 'Incompatibilidad',
    cobertura: 'Cobertura',
    condiciones_comerciales: 'Condiciones comerciales',
    plazo_contractual: 'Plazo contractual',
    decision_interna: 'Decisión interna',
    no_valida: 'No válido',
    fraude: 'Fraude',
    modalidad_no_compatible: 'Modalidad no compatible',
    otro: 'Otro',
    sin_motivo: 'Sin categoría informativa',
  }[reason] ?? reason.replaceAll('_', ' ').replace(/^\w/, (letter) => letter.toUpperCase())
}
