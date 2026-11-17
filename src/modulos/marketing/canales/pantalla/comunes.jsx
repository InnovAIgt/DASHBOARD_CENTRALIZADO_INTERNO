// Marketing por canales · piezas pequeñas compartidas (explicación ⓘ, semáforo, "pocos datos").
import { useId, useState } from 'react'
import { Info } from 'lucide-react'
import { TEXTO_TONO } from './datos.js'

/** Ícono ⓘ con la explicación del cálculo (al pasar el mouse, con teclado o al tocar). */
export function Explicacion({ texto, etiqueta = 'Cómo se calcula' }) {
  const [abierta, setAbierta] = useState(false)
  const id = useId()
  if (!texto) return null
  return <span className="mkt-info" onMouseEnter={() => setAbierta(true)} onMouseLeave={() => setAbierta(false)}>
    <button type="button" aria-label={etiqueta} aria-describedby={abierta ? id : undefined}
      onClick={(e) => { e.stopPropagation(); setAbierta((v) => !v) }} onFocus={() => setAbierta(true)} onBlur={() => setAbierta(false)}>
      <Info size={13} aria-hidden="true" />
    </button>
    {abierta && <span role="tooltip" id={id} className="mkt-info-texto">{texto}</span>}
  </span>
}

/** Pastilla del semáforo: verde / amarillo / rojo / pocos datos. */
export function Tono({ tono, texto }) {
  return <span className={`mkt-tono is-${tono}`}>{texto ?? TEXTO_TONO[tono]}</span>
}

/** Porcentaje o la etiqueta gris "pocos datos". */
export function Porcentaje({ valor, pocos, formato }) {
  if (pocos) return <span className="mkt-tono is-pocos">pocos datos</span>
  return <>{formato(valor)}</>
}

/** Recuadro de aviso: 'atencion' (amarillo) o 'neutro' (gris). */
export function Aviso({ tipo = 'neutro', titulo, children }) {
  return <div className={`mkt-aviso is-${tipo}`} role={tipo === 'atencion' ? 'alert' : 'status'}>
    {titulo && <strong>{titulo}</strong>}
    <div>{children}</div>
  </div>
}
