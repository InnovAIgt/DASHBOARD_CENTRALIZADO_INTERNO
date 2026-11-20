// Flujo de ventas v2 · píldora de la próxima gestión con semáforo
// (rojo = vencida, amarillo = hoy, verde = a tiempo; gris si el lead ya está cerrado).
// La usan el Informe detallado y la ventana de detalle de etapa.
import { semaforo, textoCelda } from './informeDatos.js'

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
