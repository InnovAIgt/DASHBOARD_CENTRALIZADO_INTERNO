// Canales de marketing · Redes sociales · VENTANA DE DETALLE (mockup_redes_completo): al hacer clic en una tarjeta,
// fila, barra, plataforma, marca, publicación o grupo de edad se abre una ventana al centro con su detalle. Se cierra
// con X, Esc o clic afuera. Dentro se puede ir a otro detalle (por ejemplo, de la lista de leads a la ficha de un
// cliente) y volver con «‹ Volver».
//
// Un detalle es un objeto con datos (lo arman las funciones de datos/redesDetalle.js):
//   { etiqueta, titulo, chips: [texto], kpis: [{t, v, c, sub}], bloques: [{t, filas: [{l, v, n, c, sub, ir}]}],
//     tabla: {columnas: [texto], filas: [{celdas: [nodo], ir}]}, nota, acciones: [{texto, alHacer}] }
// «ir» = otro detalle que se abre al hacer clic (con «Volver»).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'

const Contexto = createContext({ abrir: () => {} })

/** Envuelve la pantalla de Redes: guarda la pila de detalles abiertos y dibuja la ventana. */
export function ProveedorDetalle({ children }) {
  const [pila, setPila] = useState([])
  const abrir = useCallback((d) => setPila(d ? [d] : []), [])
  const ir = useCallback((d) => setPila((p) => [...p, d]), [])
  const volver = useCallback(() => setPila((p) => p.slice(0, -1)), [])
  const cerrar = useCallback(() => setPila([]), [])
  const valor = useMemo(() => ({ abrir }), [abrir])
  return <Contexto.Provider value={valor}>
    {children}
    {pila.length > 0 && <VentanaDetalle d={pila.at(-1)} puedeVolver={pila.length > 1} onVolver={volver} onIr={ir} onCerrar={cerrar} />}
  </Contexto.Provider>
}

/** abrir(detalle): abre la ventana con ese detalle. */
export const useDetalle = () => useContext(Contexto).abrir

/**
 * Props para que un elemento abra un detalle con clic o con Enter/Espacio (accesible). No trae className: el elemento
 * agrega «mkv2-redes-clic» a sus propias clases.
 */
export function clicDetalle(abrir, armar) {
  return {
    role: 'button', tabIndex: 0,
    onClick: (e) => { e.stopPropagation(); abrir(armar()) },
    onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(armar()) } },
  }
}

export function VentanaDetalle({ d, puedeVolver, onVolver, onIr, onCerrar }) {
  const caja = useRef(null)
  useEffect(() => {
    const tecla = (e) => { if (e.key === 'Escape') onCerrar() }
    document.addEventListener('keydown', tecla)
    caja.current?.focus()
    return () => document.removeEventListener('keydown', tecla)
  }, [onCerrar, d])
  const maxDe = (filas) => Math.max(1, ...filas.map((f) => Number(f.n) || 0))
  return <div className="mkv2-modal-fondo" onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar() }}>
    <div className="mkv2-modal mkv2-redes-det" role="dialog" aria-modal="true" aria-labelledby="mkv2-redes-det-titulo" tabIndex={-1} ref={caja}>
      <div className="mkv2-modal-cabeza">
        <div className="mkv2-redes-det-cabeza">
          {puedeVolver && <button type="button" className="mkv2-redes-det-volver" onClick={onVolver}>‹ Volver</button>}
          {d.etiqueta && <span className="mkv2-redes-det-etiqueta">{d.etiqueta}</span>}
          <h3 id="mkv2-redes-det-titulo">{d.titulo}</h3>
          {d.chips?.length > 0 && <div className="mkv2-seg-chips is-det">{d.chips.filter(Boolean).map((c) => <span key={c} className="mkv2-seg-chip">{c}</span>)}</div>}
        </div>
        <button type="button" className="mkv2-redes-det-cerrar" onClick={onCerrar} aria-label="Cerrar"><X size={15} /></button>
      </div>
      {d.kpis?.length > 0 && <div className="mkv2-redes-det-kpis">
        {d.kpis.map((k) => <div key={k.t} className={`mkv2-redes-det-kpi ${k.ir ? 'mkv2-redes-clic' : ''}`} style={{ '--c': k.c ?? 'var(--fv2-borde-fuerte)' }}
          {...(k.ir ? { role: 'button', tabIndex: 0, onClick: () => onIr(k.ir), onKeyDown: (e) => { if (e.key === 'Enter') onIr(k.ir) } } : {})}>
          <small>{k.t}{k.ir ? ' · ver ›' : ''}</small><b>{k.v}</b>{k.sub && <em>{k.sub}</em>}
        </div>)}
      </div>}
      {d.bloques?.length > 0 && <div className="mkv2-redes-det-bloques">
        {d.bloques.map((b) => <section key={b.t} className="mkv2-redes-det-bloque">
          <h4>{b.t}</h4>
          {b.filas.length ? b.filas.map((f, i) => <div key={`${f.l}-${i}`} className={`mkv2-redes-det-fila ${f.ir ? 'mkv2-redes-clic' : ''}`}
            {...(f.ir ? { role: 'button', tabIndex: 0, onClick: () => onIr(f.ir), onKeyDown: (e) => { if (e.key === 'Enter') onIr(f.ir) } } : {})}>
            <span className="mkv2-redes-det-fila-l"><span className="mkv2-una-linea" data-tip={f.tip ?? f.l}>{f.l}</span>{f.sub && <small>{f.sub}</small>}</span>
            <b>{f.v}</b>
            {f.n !== undefined && <span className="mkv2-redes-det-barra"><i style={{ width: `${((Number(f.n) || 0) / maxDe(b.filas)) * 100}%`, background: f.c ?? 'var(--mkv2-apertura)' }} /></span>}
          </div>) : <p className="mkv2-redes-vacio is-gris">{b.vacio ?? 'Sin datos'}</p>}
        </section>)}
      </div>}
      {d.tabla && <div className="fv2-tabla-caja mkv2-redes-det-tabla"><table className="fv2-tabla mkv2-tabla">
        <thead><tr>{d.tabla.columnas.map((c, i) => <th key={c} className={i ? 'num' : ''}>{c}</th>)}</tr></thead>
        <tbody>{d.tabla.filas.length ? d.tabla.filas.map((f, i) => <tr key={i} className={f.ir ? 'mkv2-redes-clic' : ''}
          {...(f.ir ? { tabIndex: 0, onClick: () => onIr(f.ir), onKeyDown: (e) => { if (e.key === 'Enter') onIr(f.ir) } } : {})}>
          {f.celdas.map((c, j) => <td key={j} className={j ? 'num' : ''}>{c}</td>)}</tr>)
          : <tr><td colSpan={d.tabla.columnas.length} className="fv2-tabla-vacia">{d.tabla.vacio ?? 'Sin datos'}</td></tr>}</tbody>
      </table></div>}
      {d.texto && <p className="mkv2-redes-det-texto">{d.texto}</p>}
      {d.acciones?.length > 0 && <div className="mkv2-redes-det-acciones">
        {d.acciones.map((a) => <button key={a.texto} type="button" className="fv2-pildora" onClick={() => { a.alHacer(); onCerrar() }}>{a.texto}</button>)}
      </div>}
      {d.nota && <p className="mkv2-redes-det-nota">{d.nota}</p>}
    </div>
  </div>
}
