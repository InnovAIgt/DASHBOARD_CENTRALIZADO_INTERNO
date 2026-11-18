// Redes sociales · pestaña Informe detallado (mockup aprobado, página 2).
// Una fila por publicación y red. Buscador, botones de vista, paginación, Excel, ⚠ y ficha al hacer clic.
// Las advertencias de datos SOLO se muestran aquí (D-H).
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ChevronLeft, ChevronRight, Download, ExternalLink, Search } from 'lucide-react'
import { conteoEstados, ESTADOS, filasInforme, totales } from '../logica/calculos.js'
import { dinero, dineroCorto, entero, fechaCorta } from '../logica/formato.js'
import { Estado, Panel, Red } from './comunes.jsx'
import { descargarInforme } from './excel.js'

const POR_PAGINA = 15
const recortar = (texto, n = 24) => (texto && texto.length > n ? `${texto.slice(0, n - 1)}…` : texto || '(sin nombre)')

export function InformeDetallado({ datos, filas, textoFiltros, actualizado, onFila, advertenciasGenerales }) {
  const [vista, setVista] = useState('leads')
  const [busqueda, setBusqueda] = useState('')
  const [pagina, setPagina] = useState(1)
  const [errorExcel, setErrorExcel] = useState(null)
  const conteo = useMemo(() => conteoEstados(filas, datos.publicaciones), [filas, datos.publicaciones])
  const lista = useMemo(() => filasInforme(filas, { vista, busqueda }), [filas, vista, busqueda])
  useEffect(() => { setPagina(1) }, [vista, busqueda, filas])

  const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA))
  const actual = Math.min(pagina, paginas)
  const visibles = lista.slice((actual - 1) * POR_PAGINA, actual * POR_PAGINA)

  const VISTAS = [
    { clave: 'leads', etiqueta: 'Más leads' },
    { clave: 'recientes', etiqueta: 'Más recientes' },
    { clave: 'sin_metricas', etiqueta: `Sin métricas (${conteo.sin_metricas.publicaciones} · ${conteo.sin_metricas.filas} filas)`, tono: 'ambar' },
    { clave: 'incompleta', etiqueta: `Incompletas (${conteo.incompleta.publicaciones})`, tono: 'amarillo' },
    { clave: 'revisar', etiqueta: `⚠ A revisar (${conteo.revisar.filas})`, tono: 'amarillo' },
  ]

  const exportar = async () => {
    try {
      setErrorExcel(null)
      await descargarInforme({ filas: lista, totales: totales(lista, datos.publicaciones), textoFiltros, vista: VISTAS.find((v) => v.clave === vista).etiqueta, busqueda, actualizado })
    } catch (error) {
      console.error('[Redes sociales] No se pudo generar el Excel:', error)
      setErrorExcel('No se pudo generar el archivo Excel. Intenta de nuevo o avisa al equipo técnico.')
    }
  }

  return <div className="rds-vista">
    <Panel titulo="Publicaciones (una fila por publicación y red)"
      subtitulo={`${entero(lista.length)} ${lista.length === 1 ? 'fila' : 'filas'} · respeta los filtros · clic en una fila: ficha de la publicación con su link`}
      accion={<div className="rds-informe-acciones">
        <label className="rds-buscador">
          <Search size={15} aria-hidden="true" />
          <span className="rds-oculto">Buscar publicación</span>
          <input type="search" placeholder="Buscar publicación…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </label>
        <div className="rds-segmento" role="group" aria-label="Vista del informe">
          {VISTAS.map((v) => <button key={v.clave} type="button" aria-pressed={vista === v.clave}
            className={`${vista === v.clave ? 'is-activo' : ''} ${v.tono ? `is-${v.tono}` : ''}`} onClick={() => setVista(v.clave)}>{v.etiqueta}</button>)}
        </div>
        <button type="button" className="rds-boton" onClick={exportar} title="Descargar en Excel lo que se ve (con los filtros y la vista elegida)"><Download size={15} aria-hidden="true" /> Excel</button>
      </div>}>
      {errorExcel && <p className="rds-error" role="alert">{errorExcel}</p>}
      <div className="rds-tabla-caja">
        <table className="rds-tabla is-informe">
          <thead><tr>
            <th>Fecha</th><th>Marca</th><th>Red</th><th>Publicación</th><th>Link</th>
            <th className="num">Pauta</th><th className="num">Alcance</th><th className="num">Visualiz.</th><th className="num">Clics</th><th className="num">Interacc.</th>
            <th className="num">Leads</th><th className="num">Calif.</th><th className="num">No calif.</th><th className="num">Costo/lead</th>
            <th className="num">Cierres</th><th className="num">Unid.</th><th className="num">Costo/cliente</th><th>Estado</th>
          </tr></thead>
          <tbody>
            {visibles.map((f) => {
              const aviso = f.advertencias.length > 0
              return <tr key={f.id} className={`is-clic ${aviso ? 'is-aviso' : ''} ${f.estadoFila !== 'publicada' ? `is-${f.estadoFila}` : ''}`} onClick={() => onFila(f)}>
                <td>{fechaCorta(f.fecha)}</td>
                <td>{f.marca}</td>
                <td><Red red={f.red} /></td>
                <td className="rds-publicacion" title={f.campana}>
                  <span>{recortar(f.campana)}</span>
                  {aviso && <span className="rds-aviso-icono" title={f.advertencias.map((a) => `⚠ ${a.mensaje}`).join('\n')} aria-label="Dato a revisar"> ⚠</span>}
                </td>
                <td>{f.link ? <a className="rds-link" href={f.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} aria-label="Abrir publicación en otra pestaña"><ExternalLink size={14} /></a> : <span className="rds-tenue">–</span>}</td>
                <td className="num">{dineroCorto(f.pauta)}</td>
                <td className="num">{entero(f.alcance)}</td>
                <td className="num">{entero(f.visualizaciones)}</td>
                <td className="num">{entero(f.clics)}</td>
                <td className="num">{entero(f.interacciones)}</td>
                <td className="num rds-fuerte">{entero(f.leads)}</td>
                <td className="num is-azul">{entero(f.calificados)}</td>
                <td className="num rds-tenue">{f.noCalificados !== null && f.noCalificados < 0 ? <span className="is-amarillo" title="Calificados mayor que leads: dato a revisar">⚠ {entero(f.noCalificados)}</span> : entero(f.noCalificados)}</td>
                <td className="num">{dinero(f.costoLead)}</td>
                <td className="num is-verde">{entero(f.cierres)}</td>
                <td className="num">{entero(f.unidades)}</td>
                <td className="num">{dinero(f.costoCliente)}</td>
                <td><Estado estado={f.estadoFila} />{f.estadoFila !== f.estado && <span className="rds-estado-pub" title={`La publicación cuenta como "${ESTADOS[f.estado].etiqueta}" porque otra de sus redes tiene sus resultados.`}> · pub. {ESTADOS[f.estado].etiqueta.toLowerCase()}</span>}</td>
              </tr>
            })}
            {!visibles.length && <tr><td colSpan={18} className="rds-tabla-vacia">Ninguna fila coincide con la búsqueda o la vista elegida.</td></tr>}
          </tbody>
        </table>
      </div>
      <footer className="rds-informe-pie">
        <span>Mostrando {entero(visibles.length)} de {entero(lista.length)} · No calificados = leads − calificados · Costos calculados con la pauta (no se usan los del Excel)</span>
        {paginas > 1 && <span className="rds-paginas">
          <button type="button" className="rds-boton-chico" disabled={actual === 1} onClick={() => setPagina(actual - 1)} aria-label="Página anterior"><ChevronLeft size={14} /></button>
          Página {actual} de {paginas}
          <button type="button" className="rds-boton-chico" disabled={actual === paginas} onClick={() => setPagina(actual + 1)} aria-label="Página siguiente"><ChevronRight size={14} /></button>
        </span>}
      </footer>
    </Panel>

    <div className="rds-dos">
      <section className="rds-panel">
        <div className="rds-eyebrow-gris">Qué significa cada estado</div>
        <ul className="rds-estados">
          {Object.entries(ESTADOS).map(([clave, e]) => <li key={clave}>
            <Estado estado={clave} /> <span>{e.explicacion} <b>{entero(conteo[clave].publicaciones)} {conteo[clave].publicaciones === 1 ? 'publicación' : 'publicaciones'}</b> · {entero(conteo[clave].filas)} {conteo[clave].filas === 1 ? 'fila' : 'filas'}.</span>
          </li>)}
        </ul>
        <p className="rds-nota"><b>Fila y publicación:</b> cada fila de la tabla muestra el estado de esa red. Una publicación (Facebook + Instagram)
          cuenta como <b>Publicada</b> si al menos una de sus redes tiene sus resultados (leads y calificados); por eso una fila
          puede decir "Incompletas · pub. publicada". Los conteos de publicaciones y la meta usan el estado de la publicación.
          Todas cuentan para la meta de 14; los resultados vacíos cuentan como 0.</p>
      </section>
      <section className="rds-panel">
        <div className="rds-eyebrow-gris">Datos a revisar en el Excel</div>
        <p className="rds-nota">Se detectan con reglas automáticas. Las de una fila tienen ⚠ en la tabla (botón "⚠ A revisar"); estas son del archivo completo:</p>
        {advertenciasGenerales.length
          ? <ul className="rds-generales">{advertenciasGenerales.map((a, i) => <li key={i}><AlertTriangle size={14} aria-hidden="true" /> {a.mensaje}</li>)}</ul>
          : <p className="rds-nota">Sin advertencias del archivo completo.</p>}
      </section>
    </div>
  </div>
}
