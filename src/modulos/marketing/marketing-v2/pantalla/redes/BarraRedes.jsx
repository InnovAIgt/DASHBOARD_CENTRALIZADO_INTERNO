// Canales de marketing · Redes sociales: barra de filtros con el mismo estilo que la de Mailing (clases mkv2-barra…,
// que no se cambian). País (Todos · GT · SV) · Marca (DATA RED = SV) · Red (Facebook · Instagram) · Mes · PDF · ↺.
import { Download, RotateCcw } from 'lucide-react'
import { Bandera } from '../../../flujo-ventas-v2/pantalla/comunes.jsx'
import { FILTROS_REDES, MARCAS, nombreMes, REDES } from '../../datos/redes.js'

export const ID_BOTON_PDF_REDES = 'mkv2-redes-boton-pdf'

/** Grupo de botones tipo «chip» (uno activo). */
function Grupo({ etiqueta, opciones, valor, onElegir }) {
  return <div className="mkv2-barra-grupo">
    <span className="mkv2-barra-etiqueta">{etiqueta}</span>
    {opciones.map(([v, contenido, tip]) => <button key={v || 'todos'} type="button" className={`mkv2-chip-pais ${valor === v ? 'is-activo' : ''}`}
      aria-pressed={valor === v} onClick={() => onElegir(v)} data-tip={tip}>{contenido}</button>)}
  </div>
}

export function BarraRedes({ filtros, cambiar, meses, pdfListo }) {
  const poner = (k) => (v) => cambiar({ ...filtros, [k]: v })
  // Las marcas que se ofrecen dependen del país (DATA RED es de El Salvador).
  const marcas = Object.entries(MARCAS).filter(([, m]) => !filtros.pais || m.pais === filtros.pais)
  const elegirPais = (pais) => cambiar({ ...filtros, pais, marca: filtros.marca && pais && MARCAS[filtros.marca]?.pais !== pais ? '' : filtros.marca })
  const hayFiltros = ['pais', 'marca', 'red', 'formato', 'estado'].some((k) => filtros[k])
  return <section className="mkv2-barra mkv2-redes-barra" aria-label="Filtros de Redes sociales">
    <div className="mkv2-barra-fila">
      <Grupo etiqueta="País" valor={filtros.pais} onElegir={elegirPais}
        opciones={[['', 'Todos'], ['GT', <><Bandera pais="GT" />GT</>], ['SV', <><Bandera pais="SV" />SV</>, 'El Salvador (incluye DATA RED)']]} />
      <Grupo etiqueta="Marca" valor={filtros.marca} onElegir={poner('marca')}
        opciones={[['', 'Todas'], ...marcas.map(([k, m]) => [k, <><i className="mkv2-redes-punto" style={{ background: m.color }} />{m.corto}</>, `${m.nombre} · ${m.pais}`])]} />
      <Grupo etiqueta="Red" valor={filtros.red} onElegir={poner('red')}
        opciones={[['', 'Ambas'], ...Object.entries(REDES).map(([k, n]) => [k, n])]} />
      <Grupo etiqueta="Mes" valor={filtros.mes} onElegir={poner('mes')}
        opciones={[...meses].reverse().map((m) => [m, nombreMes(m).split(' ')[0], nombreMes(m)])} />
      <button type="button" id={ID_BOTON_PDF_REDES} className="mkv2-boton-barra mkv2-boton-pdf" disabled={!pdfListo}
        data-tip={pdfListo ? 'Descargar la vista actual en PDF (eliges los módulos)' : 'Preparando la herramienta de PDF…'}><Download size={15} aria-hidden="true" />PDF</button>
      <button type="button" className="mkv2-boton-icono mkv2-boton-redondo" onClick={() => cambiar({ ...FILTROS_REDES, mes: filtros.mes })} disabled={!hayFiltros}
        data-tip="Limpiar todos los filtros (el mes se queda)" aria-label="Limpiar todos los filtros"><RotateCcw size={16} /></button>
    </div>
  </section>
}
