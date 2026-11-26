// Flujo de ventas v2 · piezas de diseño nuevas (rediseño 2026-11, Parte 0).
// Son SOLO de esta pantalla: Canales de marketing usa Bandera, Insignia y COLORES de comunes.jsx y la hoja
// flujo-ventas-v2.css; por eso estas piezas son nuevas y sus estilos van aparte, en piezas.css (prefijo fv2n-).
// No calculan nada: reciben los números ya calculados.
import { ChevronRight } from 'lucide-react'
import './piezas.css'

const CODIGO = { Guatemala: 'GT', 'El Salvador': 'SV', GT: 'GT', SV: 'SV' }

/** Etiqueta de país en texto (sin banderas emoji, que en Windows salen como letras): GT azul, SV amarilla. */
export function EtiquetaPais({ pais }) {
  const codigo = CODIGO[pais]
  if (!codigo) return null
  return <span className={`fv2n-pais is-${codigo.toLowerCase()}`} title={pais === codigo ? undefined : pais}>{codigo}</span>
}

/** Encabezado de sección: el título dice la conclusión y debajo va una línea corta de explicación. */
export function EncabezadoSeccion({ titulo, explicacion, children, id }) {
  return <header className="fv2n-sec" id={id}>
    <div className="fv2n-sec-textos">
      <h2 className="fv2n-sec-titulo">{titulo}</h2>
      {explicacion && <p className="fv2n-sec-explicacion">{explicacion}</p>}
    </div>
    {children && <div className="fv2n-sec-acciones">{children}</div>}
  </header>
}

/**
 * Tarjeta de un número grande. Toda la tarjeta abre su detalle (onAbrir).
 * @param desglose  [{ pais, valor }] → «GT 18 · SV 20»
 * @param nota      texto corto debajo del número
 * @param extra     { texto, title, onAbrir } línea pequeña adicional, con su propio clic
 */
export function TarjetaNumero({ etiqueta, valor, color, desglose, nota, extra, title, onAbrir }) {
  return <article className="fv2n-numero">
    <button type="button" className="fv2n-numero-principal" onClick={onAbrir} title={title} aria-label={`Ver el detalle de ${etiqueta.toLowerCase()}`}>
      <span className="fv2n-numero-etiqueta">{etiqueta}</span>
      <b className="fv2n-numero-valor" style={color ? { color } : undefined}>{valor}</b>
      {desglose?.length > 0 && <span className="fv2n-numero-desglose">
        {desglose.map((d, i) => <span key={d.pais}>{i > 0 && <i aria-hidden="true">·</i>}<EtiquetaPais pais={d.pais} /> {d.valor}</span>)}
      </span>}
      {nota && <small className="fv2n-numero-nota">{nota}</small>}
    </button>
    {extra && <button type="button" className="fv2n-numero-extra" onClick={extra.onAbrir} title={extra.title}>{extra.texto}</button>}
  </article>
}

/** Fila de tarjetas de números: 6 en una línea en pantallas de 1366 px o más. */
export function FilaNumeros({ children, etiqueta }) {
  return <section className="fv2n-numeros" aria-label={etiqueta}>{children}</section>
}

/** Tarjeta de acción («Qué atender hoy»): número, texto y botón que lleva a su sección. tono: rojo | amarillo | verde. */
export function TarjetaAccion({ tono, numero, children, boton, onIr }) {
  return <article className={`fv2n-accion is-${tono}`}>
    <b className="fv2n-accion-numero">{numero}</b>
    <p className="fv2n-accion-texto">{children}</p>
    {boton && <button type="button" className="fv2n-boton" onClick={onIr}>{boton}<ChevronRight size={14} aria-hidden="true" /></button>}
  </article>
}
