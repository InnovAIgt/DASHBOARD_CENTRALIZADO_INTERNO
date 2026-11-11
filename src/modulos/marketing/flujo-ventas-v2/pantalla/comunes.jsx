// Flujo de ventas v2 · piezas visuales comunes (diseño basado en el dashboard de Activaciones).
import { AlertTriangle } from 'lucide-react'
import { qualificationLabel } from '../utils/analytics.js'
import { stateLabel } from '../utils/leads.js'

export const COLORES = {
  verde: '#2f8f76',
  verdeClaro: '#3f9c85',
  amarillo: '#c59600',
  rojo: '#c43c50',
  rosa: '#d95f6e',
  azul: '#4f8fd8',
  azulClaro: '#7fb0f0',
  texto: '#e8eaf0',
  tenue: '#8b909e',
}

export const CODIGO_PAIS = { Guatemala: 'GT', 'El Salvador': 'SV' }

/** Muestra un cociente (0 a 1) igual que formatPercent de la lógica copiada: un decimal. */
export const formatearRatio = (valor) => `${((valor || 0) * 100).toFixed(1)}%`

// Banderas dibujadas igual que en el filtro de Activaciones.
export function Bandera({ pais }) {
  if (pais === 'Guatemala' || pais === 'GT') {
    return <svg className="fv2-bandera" viewBox="0 0 24 18" aria-hidden="true">
      <rect width="8" height="18" fill="#4997D0" /><rect x="8" width="8" height="18" fill="#FFFFFF" />
      <rect x="16" width="8" height="18" fill="#4997D0" /><circle cx="12" cy="9" r="2.2" fill="#88B04B" opacity="0.85" />
    </svg>
  }
  if (pais === 'El Salvador' || pais === 'SV') {
    return <svg className="fv2-bandera" viewBox="0 0 24 18" aria-hidden="true">
      <rect width="24" height="6" fill="#003893" /><rect y="6" width="24" height="6" fill="#FFFFFF" />
      <rect y="12" width="24" height="6" fill="#003893" /><circle cx="12" cy="9" r="2" fill="#EAAA00" opacity="0.85" />
    </svg>
  }
  return null
}

export function PaisChip({ pais }) {
  return <span className="fv2-pais" title={pais}><Bandera pais={pais} />{CODIGO_PAIS[pais] ?? '—'}</span>
}

/** Insignia de color: tono = azul | verde | amarillo | rojo | neutro */
export function Insignia({ tono = 'neutro', children, title }) {
  return <span className={`fv2-insignia is-${tono}`} title={title}>{children}</span>
}

const TONO_ESTADO = { activo: 'azul', en_espera: 'neutro', detenido: 'amarillo', ganado: 'verde', perdido: 'rojo', invalido: 'neutro' }
export function EstadoLead({ estado }) {
  return <Insignia tono={TONO_ESTADO[estado]}>{stateLabel(estado)}</Insignia>
}

export function Calificacion({ tipo }) {
  return <Insignia tono={tipo === 'calificado' ? 'azul' : 'neutro'}>{qualificationLabel(tipo)}</Insignia>
}

/** Píldora de conversión: verde desde 10 %, amarilla si es mayor a 0 (mismo criterio que antes). */
export function PildoraConversion({ ganados, total }) {
  const valor = total ? ganados / total : 0
  return <Insignia tono={valor >= 0.1 ? 'verde' : valor > 0 ? 'amarillo' : 'neutro'}>{formatearRatio(valor)}</Insignia>
}

export function Vacio({ titulo, texto }) {
  return <div className="fv2-vacio"><strong>{titulo}</strong>{texto && <span>{texto}</span>}</div>
}

export function AvisoError({ mensaje, onReintentar }) {
  return <div className="fv2-aviso-error" role="alert">
    <AlertTriangle size={18} />
    <div>
      <strong>No se pudieron cargar los leads</strong>
      <p>{mensaje}</p>
      <small>Revisa la conexión con Prospekt IA y vuelve a intentarlo.</small>
    </div>
    <button type="button" className="fv2-pildora" onClick={onReintentar}>Reintentar</button>
  </div>
}
