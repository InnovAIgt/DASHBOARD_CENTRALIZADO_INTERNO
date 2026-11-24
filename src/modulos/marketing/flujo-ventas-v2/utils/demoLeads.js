import { mapMeetingLead } from './leads.js'

const DEMO_RECORDS = [
  { country: 'GT', advisor: 'Andrea Demo', type: 'calificado', status: 'en_proceso', stage: 5, slaDays: 2, units: 4, followUp: 3, comment: 'Cuenta de demostración revisa papelería y espera firmar contrato.' },
  { country: 'GT', advisor: 'Andrea Demo', type: 'calificado', status: 'cerrado', result: 'cerrada', stage: 6, units: 8 },
  { country: 'GT', advisor: 'Bruno Demo', type: 'calificado', status: 'en_proceso', stage: 4, slaDays: 3, units: 3, followUp: 5 },
  { country: 'GT', advisor: 'Bruno Demo', type: 'calificado', status: 'cerrado', result: 'perdida', stage: 4, loss: 'Precio' },
  { country: 'GT', advisor: 'Cecilia Demo', type: 'no_calificado', status: 'no_agendado', stage: 1 },
  { country: 'GT', advisor: 'Cecilia Demo', type: 'calificado', status: 'stage_2_overdue', stage: 2, slaDays: 5, followUp: -3 },
  { country: 'GT', advisor: 'Diego Demo', type: 'calificado', status: 'cerrado', result: 'cerrada', stage: 6, units: 12 },
  { country: 'GT', advisor: 'Diego Demo', type: 'calificado', status: 'en_proceso', stage: 3, slaDays: 1, units: 2, followUp: 4 },
  { country: 'SV', advisor: 'Elena Demo', type: 'calificado', status: 'en_proceso', stage: 5, slaDays: 4, units: 5, followUp: 6, comment: 'Cuenta de demostración solicita aprobación para cerrar.' },
  { country: 'SV', advisor: 'Elena Demo', type: 'calificado', status: 'cerrado', result: 'cerrada', stage: 6, units: 5 },
  { country: 'SV', advisor: 'Fernando Demo', type: 'calificado', status: 'cerrado', result: 'perdida', stage: 3, loss: 'No respondió' },
  { country: 'SV', advisor: 'Fernando Demo', type: 'no_calificado', status: 'pending', stage: 1 },
  { country: 'SV', advisor: 'Gabriela Demo', type: 'calificado', status: 'en_proceso', stage: 4, slaDays: 6, units: 3, followUp: 2 },
  { country: 'SV', advisor: 'Gabriela Demo', type: 'calificado', status: 'cerrado', result: 'cerrada', stage: 6, units: 3 },
  { country: 'SV', advisor: 'Hector Demo', type: 'calificado', status: 'en_proceso', stage: 2, slaDays: 0, units: 2, followUp: 1 },
  { country: 'SV', advisor: 'Hector Demo', type: 'calificado', status: 'cerrado', result: 'perdida', stage: 5, loss: 'Proveedor' },
  { country: 'GT', advisor: 'Andrea Demo', type: 'no_calificado', status: 'cerrado', result: 'cerrada', stage: 6, units: 2 },
  { country: 'SV', advisor: 'Elena Demo', type: 'no_calificado', status: 'cerrado', result: 'perdida', stage: 2, loss: 'Presupuesto' },
]

function fechaIso(hoy, dia) {
  return new Date(hoy.getFullYear(), hoy.getMonth(), dia, 12).toISOString()
}

function fechaRelativa(hoy, dias) {
  const fecha = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + dias, 12)
  return fecha.toISOString()
}

function fechaHabilesAntes(hoy, dias) {
  const fecha = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 12)
  let habiles = 0
  while (habiles < dias) {
    fecha.setDate(fecha.getDate() - 1)
    if (fecha.getDay() !== 0 && fecha.getDay() !== 6) habiles++
  }
  return fecha.toISOString()
}

export function createDemoLeads(hoy = new Date()) {
  return DEMO_RECORDS.map((registro, index) => {
    const diaCreacion = 1 + (index % hoy.getDate())
    const creado = fechaIso(hoy, diaCreacion)
    const fechaEtapa = registro.slaDays == null ? creado : fechaHabilesAntes(hoy, registro.slaDays)
    const stageFeedback = {
      '2': { fecha_reunion_iso: registro.stage === 2 ? fechaEtapa : creado, retroalimentacion: 'Reunión de demostración realizada.' },
    }

    const campoFechaEtapa = { 2: 'fecha_reunion_iso', 3: 'fecha_demo', 4: 'fecha_envio', 5: 'fecha_seguimiento', 6: 'fecha_cierre_real' }[registro.stage]
    if (registro.slaDays != null && registro.stage !== 2 && campoFechaEtapa) {
      stageFeedback[String(registro.stage)] = { [campoFechaEtapa]: fechaEtapa }
    }

    if (registro.units) {
      stageFeedback[String(registro.stage)] = {
        ...stageFeedback[String(registro.stage)],
        cantidad_equipos: registro.units,
      }
    }
    if (registro.loss) {
      stageFeedback['6'] = { motivo_no_contacto: registro.loss }
    }
    if (registro.result === 'cerrada') {
      stageFeedback['6'] = {
        ...stageFeedback['6'],
        fecha_cierre_real: fechaIso(hoy, Math.min(hoy.getDate(), diaCreacion + 1)),
        cantidad_equipos: registro.units ?? 1,
      }
    }

    const nextMeeting = registro.followUp == null
      ? undefined
      : { fecha_hora: fechaRelativa(hoy, registro.followUp), notas: registro.comment ?? 'Seguimiento de demostración pendiente.' }

    return {
      id: `DEMO-FV2-${String(index + 1).padStart(3, '0')}`,
      client_id: `DEMO-${String(index + 1).padStart(3, '0')}`,
      client_name: `Empresa de demostración ${String(index + 1).padStart(2, '0')}`,
      pais: registro.country,
      advisor_name: registro.advisor,
      tipo_lead: registro.type,
      status: registro.status,
      resultado_venta: registro.result,
      opportunity_stage: registro.stage,
      created_at: creado,
      rubro: registro.result === 'cerrada' ? 'Equipos de demostración' : undefined,
      proxima_gestion: nextMeeting,
      stage_feedback_json: stageFeedback,
    }
  }).map((row, index) => mapMeetingLead(row, index))
}
