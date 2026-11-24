import { isOpen, PIPELINE_STAGES } from './analytics.js'
import { toDateFlexible } from './dates.js'

export const SLA_DIAS_HABILES = 2
export const GRACIA_AMARILLA_DIAS_HABILES = 2

const CAMPOS_FECHA_ETAPA = {
  2: ['fecha_reunion_iso', 'fecha_reunion'],
  3: ['fecha_demo'],
  4: ['fecha_envio'],
  5: ['fecha_seguimiento'],
  6: ['fecha_cierre_real'],
}

function fechaInicioEtapa(lead, etapa) {
  if (etapa === 1) return { fecha: toDateFlexible(lead.fechaCreacion), aproximada: false }

  const datosEtapa = lead.raw?.stage_feedback_json?.[String(etapa)]
  const campos = CAMPOS_FECHA_ETAPA[etapa] ?? []
  for (const campo of campos) {
    const fecha = toDateFlexible(datosEtapa?.[campo])
    if (fecha) return { fecha, aproximada: false }
  }

  if (etapa === 2) {
    const reunion = toDateFlexible(lead.fechaReunion)
    if (reunion) return { fecha: reunion, aproximada: false }
  }

  return { fecha: toDateFlexible(lead.fechaCreacion), aproximada: true }
}

export function diasHabilesEntre(inicio, fin) {
  const desde = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate())
  const hasta = new Date(fin.getFullYear(), fin.getMonth(), fin.getDate())
  if (hasta <= desde) return 0

  let dias = 0
  for (desde.setDate(desde.getDate() + 1); desde <= hasta; desde.setDate(desde.getDate() + 1)) {
    const dia = desde.getDay()
    if (dia !== 0 && dia !== 6) dias++
  }
  return dias
}

export function evaluarSlaEtapa(lead, ahora = new Date()) {
  const etapa = Number(lead.apiStage)
  if (!Number.isInteger(etapa) || etapa < 1 || etapa > PIPELINE_STAGES.length) return null
  if (!isOpen(lead)) {
    return { etapa, nombreEtapa: PIPELINE_STAGES[etapa - 1], estado: 'cerrado', diasEnEtapa: null, diasAtraso: 0, aproximada: false, fechaInicio: null }
  }

  const { fecha, aproximada } = fechaInicioEtapa(lead, etapa)
  if (!fecha) {
    return { etapa, nombreEtapa: PIPELINE_STAGES[etapa - 1], estado: 'sin_fecha', diasEnEtapa: null, diasAtraso: 0, aproximada, fechaInicio: null }
  }

  const diasEnEtapa = diasHabilesEntre(fecha, ahora)
  const diasAtraso = Math.max(0, diasEnEtapa - SLA_DIAS_HABILES)
  const estado = diasAtraso === 0
    ? 'verde'
    : diasAtraso <= GRACIA_AMARILLA_DIAS_HABILES ? 'amarillo' : 'rojo'

  return {
    etapa,
    nombreEtapa: PIPELINE_STAGES[etapa - 1],
    estado,
    diasEnEtapa,
    diasAtraso,
    aproximada,
    fechaInicio: fecha,
  }
}

export function resumirSlaEtapas(leads, ahora = new Date()) {
  const porEtapa = PIPELINE_STAGES.map((nombre, index) => ({
    etapa: index + 1,
    nombre,
    slaDias: SLA_DIAS_HABILES,
    total: 0,
    verdes: 0,
    amarillos: 0,
    rojos: 0,
    sinFecha: 0,
    totalDias: 0,
    registros: [],
  }))

  for (const lead of leads) {
    const sla = evaluarSlaEtapa(lead, ahora)
    if (!sla || sla.estado === 'cerrado') continue
    const resumen = porEtapa[sla.etapa - 1]
    resumen.total++
    resumen.registros.push({ lead, sla })
    if (sla.estado === 'sin_fecha') {
      resumen.sinFecha++
      continue
    }
    resumen[sla.estado === 'verde' ? 'verdes' : sla.estado === 'amarillo' ? 'amarillos' : 'rojos']++
    resumen.totalDias += sla.diasEnEtapa
  }

  porEtapa.forEach((etapa) => {
    const conFecha = etapa.verdes + etapa.amarillos + etapa.rojos
    etapa.vencidas = etapa.rojos + etapa.amarillos
    etapa.promedioDias = conFecha ? Math.round((etapa.totalDias / conFecha) * 10) / 10 : null
    etapa.registros.sort((a, b) => prioridadSla(a.sla) - prioridadSla(b.sla)
      || (b.sla.diasEnEtapa ?? -1) - (a.sla.diasEnEtapa ?? -1))
  })

  const verdes = porEtapa.reduce((suma, etapa) => suma + etapa.verdes, 0)
  const amarillos = porEtapa.reduce((suma, etapa) => suma + etapa.amarillos, 0)
  const rojos = porEtapa.reduce((suma, etapa) => suma + etapa.rojos, 0)
  const sinFecha = porEtapa.reduce((suma, etapa) => suma + etapa.sinFecha, 0)
  return {
    porEtapa,
    verdes,
    amarillos,
    rojos,
    sinFecha,
    vencidas: amarillos + rojos,
    total: verdes + amarillos + rojos + sinFecha,
    cumplimiento: verdes + amarillos + rojos ? verdes / (verdes + amarillos + rojos) : null,
  }
}

export function prioridadSla(sla) {
  return ({ rojo: 0, amarillo: 1, verde: 2, sin_fecha: 3, cerrado: 4 })[sla?.estado] ?? 5
}
