// Redes sociales · piezas pequeñas. Copiadas (no importadas) de Marketing por canales
// (canales/pantalla/comunes.jsx: Explicacion, Bandera) y del Flujo de ventas (Insignia, Vacio),
// con prefijo rds- para no depender de otros módulos.
import { useId, useState } from 'react'
import { Info } from 'lucide-react'
import { ESTADOS } from '../logica/calculos.js'
import { entero } from '../logica/formato.js'

/** Ícono ⓘ con la explicación del cálculo (al pasar el mouse, con teclado o al tocar). */
export function Explicacion({ texto, etiqueta = 'Cómo se calcula' }) {
  const [abierta, setAbierta] = useState(false)
  const id = useId()
  if (!texto) return null
  return <span className="rds-info" onMouseEnter={() => setAbierta(true)} onMouseLeave={() => setAbierta(false)}>
    <button type="button" aria-label={etiqueta} aria-describedby={abierta ? id : undefined}
      onClick={(e) => { e.stopPropagation(); setAbierta((v) => !v) }} onFocus={() => setAbierta(true)} onBlur={() => setAbierta(false)}>
      <Info size={13} aria-hidden="true" />
    </button>
    {abierta && <span role="tooltip" id={id} className="rds-info-texto">{texto}</span>}
  </span>
}

/** Pastilla de estado de la publicación. */
export function Estado({ estado }) {
  const e = ESTADOS[estado]
  return <span className={`rds-estado is-${e?.tono ?? 'neutro'}`}>{e?.etiqueta ?? estado}</span>
}

/**
 * No calificados de una fila: "–" si la fila no tiene leads o calificados cargados; con ⚠ amarillo si es
 * negativo (calificados > leads, dato a revisar). Se usa igual en ventanas, ficha e Informe.
 */
export function NoCalificados({ valor }) {
  if (valor === null || valor === undefined) return <span title="La fila no tiene leads o calificados cargados">–</span>
  if (valor < 0) return <span className="is-amarillo" title="Calificados mayor que leads: dato a revisar">⚠ {entero(valor)}</span>
  return <>{entero(valor)}</>
}

/** Etiqueta gris "pocos datos" (menos de 5 datos). */
export const PocosDatos = () => <span className="rds-pocos" title="Menos de 5 datos: el número puede cambiar mucho con pocos casos más.">pocos datos</span>

export function Red({ red }) {
  return <span className={`rds-red is-${red === 'Facebook' ? 'fb' : red === 'Instagram' ? 'ig' : 'sin'}`}>{red}</span>
}

export function Bandera({ pais }) {
  if (pais === 'GT') {
    return <svg className="rds-bandera" viewBox="0 0 24 18" aria-hidden="true">
      <rect width="8" height="18" fill="#4997D0" /><rect x="8" width="8" height="18" fill="#FFFFFF" />
      <rect x="16" width="8" height="18" fill="#4997D0" /><circle cx="12" cy="9" r="2.2" fill="#88B04B" opacity="0.85" />
    </svg>
  }
  if (pais === 'SV') {
    return <svg className="rds-bandera" viewBox="0 0 24 18" aria-hidden="true">
      <rect width="24" height="6" fill="#003893" /><rect y="6" width="24" height="6" fill="#FFFFFF" />
      <rect y="12" width="24" height="6" fill="#003893" /><circle cx="12" cy="9" r="2" fill="#EAAA00" opacity="0.85" />
    </svg>
  }
  return null
}

export function Panel({ titulo, subtitulo, accion, explicacion, className = '', children }) {
  return <section className={`rds-panel ${className}`}>
    <header className="rds-panel-cabeza">
      <div>
        <h2 className="rds-panel-titulo">{titulo} <Explicacion texto={explicacion} /></h2>
        {subtitulo && <p className="rds-panel-sub">{subtitulo}</p>}
      </div>
      {accion}
    </header>
    {children}
  </section>
}

export function Vacio({ titulo, texto }) {
  return <div className="rds-vacio"><strong>{titulo}</strong>{texto && <span>{texto}</span>}</div>
}

/** Número que se puede cliquear para ver su detalle. */
export function Cifra({ children, onClick, titulo, className = '' }) {
  if (!onClick) return <span className={className}>{children}</span>
  return <button type="button" className={`rds-cifra ${className}`} onClick={(e) => { e.stopPropagation(); onClick() }} title={titulo ?? 'Ver el detalle'}>{children}</button>
}
