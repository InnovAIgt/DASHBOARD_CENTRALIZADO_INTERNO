// Canales de marketing · Mailing: filtros globales (aplican a todas las sub-pestañas).
// Forma de la plantilla: etiqueta arriba de cada campo, en cuadrícula. País y Cliente salen del cruce con Cumplimiento
// de Clientes y aplican a las vistas por correo.
import { X } from 'lucide-react'
import { FILTROS_INICIALES, NOMBRE_CARGO, OPCIONES_CARGO, SIN_CLASIFICAR } from '../../datos/calculos.js'
import { textosCampana } from '../../datos/campana.js'

export function Filtros({ filtros, cambiar, opciones, ocultas }) {
  const poner = (clave) => (e) => cambiar({ ...filtros, [clave]: e.target.value })
  const hayFiltros = filtros.campana || filtros.cargo || filtros.asunto || filtros.desde || filtros.hasta || filtros.pais || filtros.cliente
  const notaClientes = 'Sale del cruce con Cumplimiento de Clientes: aplica a Correos por corregir, Detalle por correo y Relación con clientes (los totales de Brevo no se pueden separar por país)'
  return <section className="mkv2-tarjeta mkv2-filtros-tarjeta" aria-label="Filtros">
    <div className="mkv2-filtros-rejilla">
      <label className="mkv2-campo-v">
        <span>Campaña</span>
        <select className="mkv2-control" value={filtros.campana} onChange={poner('campana')}>
          <option value="">Todas las campañas</option>
          {opciones.campanas.map((c) => <option key={c.id} value={c.id}>{textosCampana(c).unaLinea}</option>)}
        </select>
      </label>
      <label className="mkv2-campo-v">
        <span>Cargo destinatario</span>
        <select className="mkv2-control" value={filtros.cargo} onChange={poner('cargo')}>
          <option value="">Todos los cargos</option>
          {OPCIONES_CARGO.map((c) => <option key={c} value={c}>{c === SIN_CLASIFICAR ? c : `${c} · ${NOMBRE_CARGO[c]}`}</option>)}
        </select>
      </label>
      <label className="mkv2-campo-v mkv2-span2">
        <span>Asunto de campaña</span>
        <select className="mkv2-control" value={filtros.asunto} onChange={poner('asunto')}>
          <option value="">Todos los asuntos</option>
          {opciones.asuntos.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </label>
      <label className="mkv2-campo-v" title={notaClientes}>
        <span>País cliente</span>
        <select className="mkv2-control" value={filtros.pais} onChange={poner('pais')}>
          <option value="">Todos los países</option>
          <option value="GT">GT · Guatemala</option>
          <option value="SV">SV · El Salvador</option>
        </select>
      </label>
      <label className="mkv2-campo-v" title={notaClientes}>
        <span>Buscar empresa / cliente</span>
        <input className="mkv2-control" type="search" value={filtros.cliente} onChange={poner('cliente')} placeholder="Empresa, código o ejecutivo" />
      </label>
      <label className="mkv2-campo-v">
        <span>Envío desde</span>
        <input className="mkv2-control" type="date" value={filtros.desde} max={filtros.hasta || undefined} onChange={poner('desde')} />
      </label>
      <label className="mkv2-campo-v">
        <span>Envío hasta</span>
        <input className="mkv2-control" type="date" value={filtros.hasta} min={filtros.desde || undefined} onChange={poner('hasta')} />
      </label>
      <label className="mkv2-interruptor mkv2-span2" title="Campañas con TEST, VALIDACIÓN o PRUEBA en el nombre">
        <input type="checkbox" className="fv2-casilla" checked={filtros.mostrarPrueba}
          onChange={(e) => cambiar({ ...filtros, mostrarPrueba: e.target.checked, campana: '' })} />
        <span>Mostrar campañas de prueba{!filtros.mostrarPrueba && ocultas > 0 ? ` (${ocultas} ocultas)` : ''}</span>
      </label>
      <div className="mkv2-filtros-fin">
        <button type="button" className="fv2-pildora" disabled={!hayFiltros}
          onClick={() => cambiar({ ...FILTROS_INICIALES, mostrarPrueba: filtros.mostrarPrueba })}><X size={13} />Limpiar filtros</button>
      </div>
    </div>
  </section>
}
