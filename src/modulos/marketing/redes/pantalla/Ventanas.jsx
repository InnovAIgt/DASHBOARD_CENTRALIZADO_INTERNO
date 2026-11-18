// Redes sociales · ventanas de detalle (patrón copiado del Flujo de ventas: portal, fondo, Escape).
//  - DetalleFilas: lista de filas detrás de cualquier número que se cliquea.
//  - FichaPublicacion: todos los datos de una fila (publicación y red), sus advertencias y su link real.
import { useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, ExternalLink, X } from 'lucide-react'
import { ESTADOS, totales } from '../logica/calculos.js'
import { dinero, dineroCorto, entero, fechaCorta } from '../logica/formato.js'
import { Estado, NoCalificados, Red } from './comunes.jsx'
import { redDelLinkTexto } from './links.js'

/** Escape cierra solo la ventana de arriba; mientras hay una ventana, la página no se desplaza. */
function useEscape(onCerrar, capa) {
  useEffect(() => {
    const alEscape = (e) => {
      if (e.key !== 'Escape') return
      const capas = [...document.querySelectorAll('.rds-ventana')].map((v) => Number(v.dataset.capa))
      if (capa >= Math.max(...capas)) onCerrar()
    }
    document.addEventListener('keydown', alEscape)
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', alEscape); document.body.style.overflow = anterior }
  }, [onCerrar, capa])
}

function Ventana({ capa = 1, etiqueta, ancho = 'normal', onCerrar, children }) {
  useEscape(onCerrar, capa)
  return createPortal(<div className="rds-ventana" data-capa={capa} style={{ zIndex: 1000 + capa }} role="presentation">
    <button type="button" className="rds-ventana-fondo" onClick={onCerrar} aria-label="Cerrar ventana" />
    <section className={`rds-ventana-caja is-${ancho}`} role="dialog" aria-modal="true" aria-label={etiqueta}>{children}</section>
  </div>, document.body)
}

function Cabeza({ eyebrow, titulo, subtitulo, onCerrar }) {
  return <header className="rds-ventana-cabeza">
    <div>
      <div className="rds-eyebrow">{eyebrow}</div>
      <h2>{titulo}</h2>
      {subtitulo && <div className="rds-ventana-sub">{subtitulo}</div>}
    </div>
    <button type="button" className="rds-cerrar" onClick={onCerrar} aria-label="Cerrar"><X size={18} /></button>
  </header>
}

const Dato = ({ etiqueta, valor, tono }) => <div className={`rds-dato ${tono ? `is-${tono}` : ''}`}><span>{etiqueta}</span><strong>{valor}</strong></div>

/** Lista de filas (al cliquear un número). */
export function DetalleFilas({ titulo, subtitulo, filas, publicaciones, onFila, onCerrar }) {
  const t = useMemo(() => totales(filas, publicaciones), [filas, publicaciones])
  const ordenadas = useMemo(() => [...filas].sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? '') || a.red.localeCompare(b.red)), [filas])
  return <Ventana etiqueta={titulo} ancho="ancho" onCerrar={onCerrar}>
    <Cabeza eyebrow="Detalle" titulo={titulo} subtitulo={subtitulo} onCerrar={onCerrar} />
    <div className="rds-ventana-cuerpo">
      <div className="rds-datos is-6">
        <Dato etiqueta="Publicaciones" valor={`${entero(t.publicaciones)} · ${entero(t.filas)} filas`} />
        <Dato etiqueta="Leads" valor={entero(t.leads)} />
        <Dato etiqueta="Calificados" valor={entero(t.calificados)} tono="azul" />
        <Dato etiqueta="No calificados" valor={`${t.noCalificados < 0 ? '⚠ ' : ''}${entero(t.noCalificados)}`} tono={t.noCalificados < 0 ? 'amarillo' : undefined} />
        <Dato etiqueta="Cierres · unid." valor={`${entero(t.cierres)} · ${entero(t.unidades)}`} tono="verde" />
        <Dato etiqueta="Pauta" valor={dinero(t.pauta)} tono="amarillo" />
      </div>
      <div className="rds-tabla-caja is-ventana">
        <table className="rds-tabla">
          <thead><tr><th>Fecha</th><th>Marca</th><th>Red</th><th>Publicación</th><th className="num">Pauta</th><th className="num">Leads</th><th className="num">Calif.</th><th className="num">No calif.</th><th className="num">Cierres</th><th>Estado</th></tr></thead>
          <tbody>
            {ordenadas.map((f) => <tr key={f.id} className="is-clic" onClick={() => onFila(f)}>
              <td>{fechaCorta(f.fecha)}</td>
              <td>{f.marca}</td>
              <td><Red red={f.red} /></td>
              <td className="rds-publicacion">{f.campana || '(sin nombre)'}{f.advertencias.length > 0 && <span className="rds-aviso-icono" title={f.advertencias.map((a) => a.mensaje).join('\n')}> ⚠</span>}</td>
              <td className="num">{dineroCorto(f.pauta)}</td>
              <td className="num">{entero(f.leads)}</td>
              <td className="num is-azul">{entero(f.calificados)}</td>
              <td className="num rds-tenue"><NoCalificados valor={f.noCalificados} /></td>
              <td className="num is-verde">{entero(f.cierres)}</td>
              <td><Estado estado={f.estadoFila} /></td>
            </tr>)}
            {!ordenadas.length && <tr><td colSpan={10} className="rds-tabla-vacia">Sin filas para mostrar.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="rds-nota">Clic en una fila para ver la ficha de la publicación.</p>
    </div>
  </Ventana>
}

/** Ficha de una publicación en una red (clic en una fila). */
export function FichaPublicacion({ fila, filas, onFila, onCerrar }) {
  const otras = filas.filter((f) => f.publicacionId === fila.publicacionId && f.id !== fila.id)
  const redLink = redDelLinkTexto(fila.link)
  return <Ventana capa={2} etiqueta={`Ficha de ${fila.campana}`} onCerrar={onCerrar}>
    <Cabeza eyebrow="Ficha de la publicación" titulo={fila.campana || '(sin nombre)'}
      subtitulo={<span className="rds-en-linea">{fila.marca} · <Red red={fila.red} /> · {fechaCorta(fila.fecha)} · <Estado estado={fila.estadoFila} />
        {fila.estadoFila !== fila.estado && <span className="rds-estado-pub">la publicación cuenta como "{ESTADOS[fila.estado].etiqueta}" (otra de sus redes tiene sus resultados)</span>}</span>}
      onCerrar={onCerrar} />
    <div className="rds-ventana-cuerpo">
      <div className="rds-datos is-4">
        <Dato etiqueta="Pauta" valor={dineroCorto(fila.pauta)} tono="amarillo" />
        <Dato etiqueta="Alcance" valor={entero(fila.alcance)} />
        <Dato etiqueta="Leads / calif." valor={<>{entero(fila.leads)} / <span className="is-azul">{entero(fila.calificados)}</span></>} />
        <Dato etiqueta="Cierres · unid." valor={`${entero(fila.cierres)} · ${entero(fila.unidades)}`} tono="verde" />
      </div>

      {fila.advertencias.map((a, i) => <div key={i} className="rds-advertencia"><AlertTriangle size={16} aria-hidden="true" /><span><b>Dato a revisar:</b> {a.mensaje}</span></div>)}

      <div className="rds-dos-columnas">
        <section className="rds-bloque">
          <h3>Resultados</h3>
          <Dato etiqueta="Visualizaciones" valor={entero(fila.visualizaciones)} />
          <Dato etiqueta="Clics" valor={entero(fila.clics)} />
          <Dato etiqueta="Interacciones" valor={entero(fila.interacciones)} />
          <Dato etiqueta="Comentarios · compartidos" valor={`${entero(fila.comentarios)} · ${entero(fila.compartidos)}`} />
          <Dato etiqueta="No calificados (leads − calificados)" valor={<NoCalificados valor={fila.noCalificados} />} />
        </section>
        <section className="rds-bloque">
          <h3>Costos (calculados con la pauta)</h3>
          <Dato etiqueta="Por lead (pauta ÷ leads)" valor={dinero(fila.costoLead)} />
          <Dato etiqueta="Por lead calificado (pauta ÷ calificados)" valor={dinero(fila.costoCalificado)} />
          <Dato etiqueta="Por cliente (pauta ÷ cierres)" valor={dinero(fila.costoCliente)} />
          <p className="rds-nota">No se usan las columnas de costo del Excel. Excel decía: lead {dinero(fila.costosExcel?.lead)} · cliente {dinero(fila.costosExcel?.cliente)}.</p>
        </section>
      </div>

      <section className="rds-bloque">
        <h3>Origen</h3>
        <Dato etiqueta="Hoja y fila del Excel" valor={`${fila.hoja} · fila ${fila.filaExcel}`} />
        <Dato etiqueta="id / post_id_meta" valor={`${fila.idExcel ?? 'sin id'} · ${fila.postIdMeta ?? '—'}`} />
        {fila.linkOriginal && fila.linkOriginal !== fila.link && <p className="rds-nota">El Excel tenía una redirección de Facebook (l.facebook.com); se muestra el link real.</p>}
        {otras.length > 0 && <div className="rds-otras">
          <span>Misma publicación en:</span>
          {otras.map((o) => <button key={o.id} type="button" className="rds-boton-chico" onClick={() => onFila(o)}><Red red={o.red} /> {fechaCorta(o.fecha)}</button>)}
        </div>}
      </section>

      {fila.link
        ? <a className="rds-boton-link" href={fila.link} target="_blank" rel="noopener noreferrer">Abrir publicación{redLink ? ` en ${redLink}` : ''} <ExternalLink size={14} aria-hidden="true" /></a>
        : <p className="rds-nota">Esta fila no tiene link.</p>}
    </div>
  </Ventana>
}
