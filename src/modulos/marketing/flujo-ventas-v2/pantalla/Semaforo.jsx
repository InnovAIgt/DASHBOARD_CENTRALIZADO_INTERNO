// Flujo de ventas v2 · semáforos separados para próxima gestión y SLA de etapa.
import { semaforo, textoCelda } from './informeDatos.js'
import { evaluarSlaEtapa, SLA_DIAS_HABILES } from '../utils/sla.js'
import { formatNumber } from '../utils/analytics.js'

const fechaHora = new Intl.DateTimeFormat('es-SV', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
const hora = new Intl.DateTimeFormat('es-SV', { hour: '2-digit', minute: '2-digit' })
const dm = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
const tieneHora = (d) => d.getHours() !== 0 || d.getMinutes() !== 0

export function Semaforo({ lead, fecha }) {
  if (!fecha) return <span className="fv2-tenue">—</span>
  const s = semaforo(lead)
  const texto = s === 'vencida' ? `Vencida · ${dm(fecha)}`
    : s === 'hoy' ? `Hoy${tieneHora(fecha) ? ` · ${hora.format(fecha)}` : ''}`
      : tieneHora(fecha) ? fechaHora.format(fecha) : textoCelda({ tipo: 'fecha' }, fecha)
  return <span className={`fv2-semaforo is-${s}`} title={s === 'cerrado' ? 'Lead cerrado' : undefined}>{texto}</span>
}

export function SemaforoEtapa({ lead }) {
  const sla = evaluarSlaEtapa(lead)
  if (!sla) return <span className="fv2-tenue">—</span>
  if (sla.estado === 'cerrado') return <span className="fv2-sla-celda"><span className="fv2-sla-pildora is-cerrado">Cerrado</span></span>
  if (sla.estado === 'sin_fecha') return <span className="fv2-sla-celda"><span className="fv2-sla-pildora is-sin-fecha">Sin fecha</span></span>

  const etiqueta = sla.estado === 'rojo' ? 'Rojo' : sla.estado === 'amarillo' ? 'Amarillo' : 'Verde'
  // Rediseño 2026-11: con atraso solo se dice cuánto va tarde («Rojo · 13 d tarde»); los días en etapa siguen en el
  // texto al pasar el mouse y en su propia columna. A tiempo: «Verde · 1 d» (como antes).
  const texto = sla.diasAtraso ? `${etiqueta} · ${formatNumber(sla.diasAtraso)} d tarde` : `${etiqueta} · ${formatNumber(sla.diasEnEtapa)} d`
  return <span className="fv2-sla-celda">
    <span className={`fv2-sla-pildora is-${sla.estado}`} title={`${sla.nombreEtapa}: ${sla.diasEnEtapa} días hábiles en etapa; SLA ${SLA_DIAS_HABILES} días`}>
      {texto}
    </span>
    {sla.aproximada && <small>aprox.</small>}
  </span>
}
