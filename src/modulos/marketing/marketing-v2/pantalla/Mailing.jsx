// Canales de marketing · pestaña Mailing (Parte 2: solo estructura, todo vacío).
// Las 5 sub-pestañas, columnas y filtros salen de docs/marketing/v2/MAILING.md (secciones 6 y 7).
// No hay datos reales ni inventados ni llamadas a la API de Brevo (eso va en la Parte 3).
import { CalendarDays, Lock, Search } from 'lucide-react'
import { Bandera } from '../../flujo-ventas-v2/pantalla/comunes.jsx'
import { AvisoPendiente, AvisoSesion, KpiVacio, Panel, TablaVacia, Vacio } from './comunes.jsx'

export const SUBPESTANAS_MAILING = [
  { key: 'generales', label: 'Resultados generales' },
  { key: 'comparar', label: 'Comparar campañas' },
  { key: 'corregir', label: 'Correos por corregir' },
  { key: 'detalle', label: 'Detalle por correo' },
  { key: 'clientes', label: 'Relación con clientes' },
  { key: 'cargos', label: 'Asignar cargo a campañas' },
]

/** Barra de filtros globales: visible pero deshabilitada hasta que haya datos de Brevo. */
function FiltrosMailing() {
  const lista = (etiqueta, opcion) => <label className="mkv2-campo">
    <span className="fv2-etiqueta-grupo">{etiqueta}</span>
    <select className="mkv2-select" disabled aria-label={etiqueta}><option>{opcion}</option></select>
  </label>
  return <div className="fv2-filtros-caja mkv2-filtros" aria-disabled="true">
    <span className="fv2-filtros-eyebrow">Filtros · se activan cuando haya datos de Brevo</span>
    <div className="fv2-filtros-barra">
      {lista('Campaña', 'Todas')}
      {lista('Cargo', 'Todos')}
      {lista('Asunto', 'Todos')}
      <div className="fv2-grupo-pais" role="group" aria-label="País">
        <span className="fv2-etiqueta-grupo">País</span>
        <button type="button" className="fv2-btn-pais is-activo" disabled>Todos</button>
        <button type="button" className="fv2-btn-pais" disabled title="Guatemala"><Bandera pais="GT" />GT</button>
        <button type="button" className="fv2-btn-pais" disabled title="El Salvador"><Bandera pais="SV" />SV</button>
      </div>
      <label className="mkv2-buscar">
        <Search size={14} aria-hidden="true" />
        <input type="search" disabled placeholder="Cliente: empresa, código, contacto, correo o ejecutivo…" aria-label="Buscar cliente" />
      </label>
      <div className="fv2-periodo">
        <span className="fv2-periodo-etiqueta"><CalendarDays size={15} />Desde</span>
        <input type="date" className="fv2-fecha" disabled aria-label="Desde" />
        <span className="fv2-periodo-guion">—</span>
        <span className="fv2-periodo-etiqueta">Hasta</span>
        <input type="date" className="fv2-fecha" disabled aria-label="Hasta" />
      </div>
    </div>
  </div>
}

function ResultadosGenerales() {
  return <>
    <div className="mkv2-kpis">
      <KpiVacio etiqueta="Enviados" nota="Destinatarios de la campaña" />
      <KpiVacio etiqueta="Entregados" nota="Tasa de entrega" />
      <KpiVacio etiqueta="Apertura registrada" nota="Sobre entregados" />
      <KpiVacio etiqueta="Clic registrado" nota="Sobre entregados" />
      <KpiVacio etiqueta="Rebote temporal" nota="Sobre enviados" />
      <KpiVacio etiqueta="Rebote permanente" nota="Sobre enviados" />
    </div>
    <div className="mkv2-grid2">
      <Panel titulo="Recorrido del mailing" sub="Envío → Entrega → Apertura → Clic"><Vacio /></Panel>
      <Panel titulo="Incidencias de entrega" sub="Entregado · Rebote temporal · Rebote permanente · Sin confirmación"><Vacio /></Panel>
    </div>
    <div className="mkv2-grid3">
      <Panel titulo="Tasa de entrega" sub="Semáforo: 100 % verde · 90 % a menos de 100 % amarillo · menos de 90 % rojo"><Vacio /></Panel>
      <Panel titulo="Correos por corregir" sub="Direcciones marcadas CORREGIR CORREO"><Vacio /></Panel>
      <Panel titulo="Análisis por cargo" sub="Gerente General · Financiero · de Operaciones"><Vacio /></Panel>
    </div>
    <Panel titulo="Resultado por campaña" sub="Código, asunto, cargo, métricas y tasas">
      <TablaVacia columnas={['Código', 'Asunto', 'Cargo', 'Enviados', 'Entrega', 'Apertura', 'Clic', 'Rebotes', '% por corregir']} />
    </Panel>
    <Panel titulo="Leads" sub="Bot de WhatsApp → CRM">
      <Vacio texto="Próximamente: calificados (75 puntos o más) y no calificados." />
    </Panel>
  </>
}

function CompararCampanas() {
  return <Panel titulo="Comparar campañas" sub="La comparación por asunto es descriptiva: no prueba que el asunto sea la causa.">
    <TablaVacia columnas={['Código', 'Asunto', 'Cargo', 'Envíos', 'Entregados', 'Apertura', 'Clic', 'Rebotes', '% por corregir', 'Fecha']} />
  </Panel>
}

function CorreosPorCorregir() {
  return <>
    <AvisoSesion />
    <Panel titulo="Correos por corregir" sub="Agrupados por ejecutivo · direcciones únicas · aviso con plazo de 48 horas">
      <TablaVacia columnas={['Correo', 'Cliente', 'Ejecutivo', 'Status', 'Motivo técnico', 'Estado final', 'Campaña y asunto', 'Fecha de rebote']} />
    </Panel>
  </>
}

function DetallePorCorreo() {
  return <>
    <AvisoSesion />
    <Panel titulo="Detalle por correo" sub="Un destinatario por fila, con su historial de eventos">
      <TablaVacia columnas={['Correo', 'Cliente y país', 'Ejecutivo', 'Campaña', 'Cargo', 'Estado final', 'Status', 'Apertura', 'Clic', 'Motivo técnico', 'Fecha de envío']} />
    </Panel>
  </>
}

function RelacionConClientes() {
  return <>
    <AvisoSesion />
    <Panel titulo="Relación con clientes" sub="Cruce exacto del correo con GG, GF y GO de Cumplimiento de Clientes">
      <TablaVacia columnas={['Correo', 'Campaña y cargo objetivo', 'Clasificación', 'Cliente(s)', 'Ejecutivo(s)', 'Código(s)', 'Cargo(s) en la base', 'Estado del mailing']} />
    </Panel>
  </>
}

/** Pedida por Eduardo: Marketing (Ismael) elige el cargo de cada campaña de Brevo. Lo elegido a mano gana sobre lo
 *  sugerido por el nombre (código-cargo-sector-asunto); sin ninguno queda «Sin clasificar». Solo estructura: no guarda. */
function AsignarCargo() {
  return <>
    <AvisoPendiente titulo="Pendiente: definir dónde se guarda la selección" texto="Mientras tanto, el cargo sale solo del nombre de la campaña." />
    <div className="mkv2-aviso-sesion" role="note">
      <Lock size={15} aria-hidden="true" />
      Solo las personas autorizadas podrán guardar (por confirmar con Ismael).
    </div>
    <Panel titulo="Asignar cargo a campañas" sub="Si el nombre sigue la regla código-cargo-sector-asunto, el cargo viene sugerido; si no, se elige a mano. Lo elegido alimenta el filtro Cargo y el Análisis por cargo.">
      <TablaVacia columnas={['Campaña', 'Asunto', 'Fecha', 'Cargo sugerido', 'Cargo', 'Guardar']} />
      <div className="mkv2-ejemplo-cargo" aria-disabled="true">
        <label className="mkv2-campo">
          <span className="fv2-etiqueta-grupo">Cargo</span>
          <select className="mkv2-select" disabled aria-label="Cargo de la campaña (ejemplo)" defaultValue="">
            <option value="">Elegir…</option>
            <option value="GG">GG · Gerente General</option>
            <option value="GF">GF · Gerente Financiero</option>
            <option value="GO">GO · Gerente de Operaciones</option>
          </select>
        </label>
        <button type="button" className="fv2-btn-pais" disabled>Guardar</button>
        <span className="fv2-panel-sub">Ejemplo deshabilitado: así se elegirá el cargo en cada campaña.</span>
      </div>
    </Panel>
  </>
}

const CONTENIDO = {
  generales: ResultadosGenerales,
  comparar: CompararCampanas,
  corregir: CorreosPorCorregir,
  detalle: DetallePorCorreo,
  clientes: RelacionConClientes,
  cargos: AsignarCargo,
}

export function Mailing({ sub, onSub }) {
  const actual = CONTENIDO[sub] ? sub : 'generales'
  const Contenido = CONTENIDO[actual]
  return <div className="mkv2-mailing">
    <FiltrosMailing />
    <nav className="mkv2-subpestanas" role="tablist" aria-label="Secciones de Mailing">
      {SUBPESTANAS_MAILING.map((p) => <button type="button" key={p.key} role="tab" aria-selected={actual === p.key}
        className={`mkv2-subpestana ${actual === p.key ? 'is-activa' : ''}`} onClick={() => onSub(p.key)}>{p.label}</button>)}
    </nav>
    <AvisoPendiente titulo="Pendiente de conexión con Brevo" texto="Los datos aparecerán cuando se conecte la API de Brevo." />
    <Contenido />
  </div>
}
