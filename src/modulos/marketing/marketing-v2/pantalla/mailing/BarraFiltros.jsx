// Canales de marketing · Mailing: barra de filtros con el estilo de la de Facturación (facturacion-linea.html, solo
// se leyó; no se toca) y de la maqueta de tarjetas compactas. Misma lógica de filtros de Mailing:
//   País cliente (Todos · GT · SV) · Período (desde–hasta + ↺) · «Filtros ▾» (Campaña, Cargo, Asunto, Buscar
//   empresa/cliente y campañas de prueba) · PDF (herramienta compartida del portal) · ↺ redondo = limpiar todo.
// Sin tipo de cambio. País y Cliente salen del cruce con Cumplimiento y aplican a las vistas por correo.
import { useState } from 'react'
import { CalendarDays, ChevronDown, Download, ListFilter, RotateCcw } from 'lucide-react'
import { Bandera } from '../../../flujo-ventas-v2/pantalla/comunes.jsx'
import { FILTROS_INICIALES, NOMBRE_CARGO, OPCIONES_CARGO, SIN_CLASIFICAR } from '../../datos/calculos.js'
import { textosCampana } from '../../datos/campana.js'

export const ID_BOTON_PDF = 'mkv2-boton-pdf'
export const TEXTO_PAIS_INACTIVO = 'Los totales de Brevo no se separan por país'
const NOTA_CLIENTES = 'Sale del cruce con Cumplimiento de Clientes: aplica a Correos por corregir, Detalle por correo y Relación con clientes (los totales de Brevo no se separan por país).'

/** paisActivo: solo en las vistas que se pueden separar por país (por correo y «Por comercial»); si no, se ve desactivado. */
export function BarraFiltros({ filtros, cambiar, opciones, ocultas, pdfListo, paisActivo = true }) {
  const [abierto, setAbierto] = useState(false)
  const poner = (clave) => (e) => cambiar({ ...filtros, [clave]: e.target.value })
  const enPanel = [filtros.campana, filtros.cargo, filtros.asunto, filtros.cliente].filter(Boolean).length + (filtros.mostrarPrueba ? 1 : 0)
  const hayFiltros = Object.keys(FILTROS_INICIALES).some((k) => filtros[k] !== FILTROS_INICIALES[k])
  const pais = (valor, contenido) => <button type="button" className={`mkv2-chip-pais ${filtros.pais === valor ? 'is-activo' : ''}`} disabled={!paisActivo}
    aria-pressed={filtros.pais === valor} onClick={() => cambiar({ ...filtros, pais: valor })} data-tip={paisActivo ? NOTA_CLIENTES : TEXTO_PAIS_INACTIVO}>{contenido}</button>

  return <section className="mkv2-barra" aria-label="Filtros de Mailing">
    <div className="mkv2-barra-fila">
      <div className={`mkv2-barra-grupo ${paisActivo ? '' : 'is-inactivo'}`} data-tip={paisActivo ? undefined : TEXTO_PAIS_INACTIVO}>
        <span className="mkv2-barra-etiqueta">País cliente</span>
        {pais('', 'Todos')}
        {pais('GT', <><Bandera pais="GT" />GT</>)}
        {pais('SV', <><Bandera pais="SV" />SV</>)}
      </div>
      <span className="mkv2-barra-nota">{paisActivo ? 'Los correos sin identificar no tienen país y no aparecen al filtrar.' : `${TEXTO_PAIS_INACTIVO}: el país no aplica en esta pestaña.`}</span>
    </div>
    <div className="mkv2-barra-fila">
      <div className="mkv2-barra-grupo">
        <span className="mkv2-barra-periodo"><CalendarDays size={15} aria-hidden="true" />Período</span>
        <input className="mkv2-fecha" type="date" aria-label="Fecha de envío desde" value={filtros.desde} max={filtros.hasta || undefined} onChange={poner('desde')} />
        <span className="mkv2-barra-guion">—</span>
        <input className="mkv2-fecha" type="date" aria-label="Fecha de envío hasta" value={filtros.hasta} min={filtros.desde || undefined} onChange={poner('hasta')} />
        <button type="button" className="mkv2-boton-icono" onClick={() => cambiar({ ...filtros, desde: '', hasta: '' })} disabled={!filtros.desde && !filtros.hasta}
          data-tip="Limpiar el período" aria-label="Limpiar el período"><RotateCcw size={15} /></button>
      </div>
      <button type="button" className={`mkv2-boton-barra ${abierto ? 'is-abierto' : ''}`} aria-expanded={abierto} onClick={() => setAbierto(!abierto)}>
        <ListFilter size={15} aria-hidden="true" />Filtros{enPanel > 0 && <span className="mkv2-insignia-filtros">{enPanel}</span>}<ChevronDown size={14} aria-hidden="true" />
      </button>
      <button type="button" id={ID_BOTON_PDF} className="mkv2-boton-barra mkv2-boton-pdf" disabled={!pdfListo}
        data-tip={pdfListo ? 'Descargar la vista actual en PDF (eliges los módulos)' : 'Preparando la herramienta de PDF…'}><Download size={15} aria-hidden="true" />PDF</button>
      <button type="button" className="mkv2-boton-icono mkv2-boton-redondo" onClick={() => cambiar({ ...FILTROS_INICIALES })} disabled={!hayFiltros}
        data-tip="Limpiar todos los filtros" aria-label="Limpiar todos los filtros"><RotateCcw size={16} /></button>
    </div>
    {abierto && <div className="mkv2-panel-filtros">
      <label className="mkv2-campo-v">
        <span>Campaña</span>
        <select className="mkv2-control" value={filtros.campana} onChange={poner('campana')}>
          <option value="">Todas las campañas</option>
          {opciones.campanas.map((c) => <option key={c.id} value={c.id}>{textosCampana(c).unaLinea}</option>)}
        </select>
      </label>
      <label className="mkv2-campo-v">
        <span>Cargo</span>
        <select className="mkv2-control" value={filtros.cargo} onChange={poner('cargo')}>
          <option value="">Todos los cargos</option>
          {OPCIONES_CARGO.map((c) => <option key={c} value={c}>{c === SIN_CLASIFICAR ? c : `${c} · ${NOMBRE_CARGO[c]}`}</option>)}
        </select>
      </label>
      <label className="mkv2-campo-v">
        <span>Asunto</span>
        <select className="mkv2-control" value={filtros.asunto} onChange={poner('asunto')}>
          <option value="">Todos los asuntos</option>
          {opciones.asuntos.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </label>
      <label className="mkv2-campo-v" data-tip={NOTA_CLIENTES}>
        <span>Buscar empresa / cliente</span>
        <input className="mkv2-control" type="search" value={filtros.cliente} onChange={poner('cliente')} placeholder="Empresa, código o ejecutivo" />
      </label>
      <label className="mkv2-interruptor mkv2-panel-prueba" data-tip="Campañas con [VALIDACIÓN], [TEST] o [PRUEBA] entre corchetes, o con TEST o PRUEBA en el nombre">
        <input type="checkbox" className="fv2-casilla" checked={filtros.mostrarPrueba}
          onChange={(e) => cambiar({ ...filtros, mostrarPrueba: e.target.checked, campana: '' })} />
        <span>Mostrar campañas de prueba{!filtros.mostrarPrueba && ocultas > 0 ? ` (${ocultas} ocultas)` : ''}</span>
      </label>
    </div>}
  </section>
}
