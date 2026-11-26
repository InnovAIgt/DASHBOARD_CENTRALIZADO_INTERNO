// Flujo de ventas v2 · ficha de coaching por ejecutivo (DECISIONES D17) y su ventana «Ver coaching» (D26).
// Rediseño Parte 2: las tarjetas SLA, «Prioridad del equipo», el selector «Vista» y el selector «Equipo» se
// quitaron del Panel; su contenido quedó en la tabla de ejecutivos (TablaEjecutivos.jsx). La ficha no cambió.
import { useState } from 'react'
import { formatNumber, isOpen } from '../utils/analytics.js'
import { evaluarSlaEtapa, prioridadSla } from '../utils/sla.js'
import { Bandera } from './comunes.jsx'
import { pctEntero, recorridoLeads } from './datos.js'
import { CabezaVentana, DetalleAsesor, DetalleLead, useVentana, Ventana } from './Ventanas.jsx'
import { SeguimientoEjecutivo } from './SeguimientoEjecutivo.jsx'
import { CalendarClock, Check, Eye, Phone, TrendingUp, TriangleAlert } from 'lucide-react'
import { RecorridoLeads } from './RecorridoLeads.jsx'
import { TablaLeads } from './Tablas.jsx'

const TONOS = {
  apoyo: { etiqueta: 'Necesita apoyo', clase: 'is-apoyo' },
  bien: { etiqueta: 'Va bien', clase: 'is-bien' },
  pocos: { etiqueta: 'Pocos datos', clase: 'is-pocos' },
}

const ICONOS_ACCION = {
  sla: TriangleAlert,
  vencidos: TriangleAlert,
  mover: CalendarClock,
  reforzar: TrendingUp,
  ritmo: Check,
}

const RESULTADOS = [
  { clave: 'citas', etiqueta: 'Citas cumplidas' },
  { clave: 'propuestas', etiqueta: 'Propuestas enviadas' },
  { clave: 'cierres', etiqueta: 'Ganados' },
]

function porcentaje(ratio) {
  return ratio == null ? '—' : `${pctEntero(ratio)}%`
}

function BarraResultado({ resultado }) {
  const propio = resultado.ratio == null ? 0 : Math.min(100, Math.max(0, pctEntero(resultado.ratio)))
  const equipo = resultado.equipo == null ? 0 : Math.min(100, Math.max(0, pctEntero(resultado.equipo)))
  return <div className="fv2-coach-barra" aria-hidden="true">
    {resultado.equipoDen > 0 && <span className="fv2-coach-barra-equipo" style={{ left: `${Math.min(99, equipo)}%` }} />}
    <span className="fv2-coach-barra-propia" style={{ width: `${propio}%` }} />
  </div>
}

function Resultado({ etiqueta, resultado }) {
  const sinDatos = resultado.den === 0
  const equipoSinDatos = resultado.equipoDen === 0
  const brecha = resultado.pts == null ? '—' : `${resultado.pts > 0 ? '+' : ''}${resultado.pts} pts`
  return <div className="fv2-coach-resultado">
    <div className="fv2-coach-resultado-cabeza">
      <span>{etiqueta}</span>
      <strong>{sinDatos ? 'Sin datos' : `${formatNumber(resultado.num)} de ${formatNumber(resultado.den)}`}</strong>
    </div>
    <BarraResultado resultado={resultado} />
    <div className="fv2-coach-resultado-pie">
      <span>{porcentaje(sinDatos ? null : resultado.ratio)}</span>
      <span>Equipo {porcentaje(equipoSinDatos ? null : resultado.equipo)}</span>
      <b className={resultado.pts > 0 ? 'is-positivo' : resultado.pts < 0 ? 'is-negativo' : ''}>{brecha}</b>
    </div>
  </div>
}

function Paso({ paso, onFiltro }) {
  const comparacion = paso.pocos || paso.pts == null ? 'pocos' : paso.pts < 0 ? 'bajo' : 'bien'
  const titulo = paso.pocos ? 'Pocos datos' : paso.pts == null ? 'Sin datos del equipo' : `${paso.pts > 0 ? '+' : ''}${paso.pts} pts vs. equipo`
  return <button type="button" className={`fv2-coach-paso is-${comparacion}`}
    onClick={() => onFiltro({ tipo: 'llegaron', etapa: paso.desde })}
    aria-label={`Filtrar leads que llegaron a ${paso.nombre.split(' → ')[0]}`}>
    <span className="fv2-coach-paso-nombre">
      {paso.nombre}
      <small>{formatNumber(paso.pasaron)} de {formatNumber(paso.llegaron)} pasaron</small>
    </span>
    <span className="fv2-coach-paso-barra" aria-hidden="true">
      <i className="fv2-coach-paso-rango" style={{
        left: `${Math.min(paso.ratio == null ? 0 : pctEntero(paso.ratio), paso.equipo == null ? 0 : pctEntero(paso.equipo))}%`,
        width: `${Math.abs((paso.ratio == null ? 0 : pctEntero(paso.ratio)) - (paso.equipo == null ? 0 : pctEntero(paso.equipo)))}%`,
      }} />
      {paso.equipo != null && <i className="fv2-coach-marca-equipo" style={{ left: `${Math.min(99, pctEntero(paso.equipo))}%` }} />}
      {!paso.pocos && paso.ratio != null && <i className="fv2-coach-marca-propia" style={{ left: `${Math.min(99, pctEntero(paso.ratio))}%` }} />}
    </span>
    <span className="fv2-coach-paso-valores">
      {paso.pocos ? `${formatNumber(paso.llegaron)} leads · no se compara` : `Tú ${porcentaje(paso.ratio)} · equipo ${porcentaje(paso.equipo)}`}
      <b>{titulo}</b>
    </span>
  </button>
}

function Accion({ accion, onFiltro }) {
  const Icono = ICONOS_ACCION[accion.clave] ?? Check
  const contenido = <>
    <span className="fv2-coach-accion-icono"><Icono size={17} aria-hidden="true" /></span>
    <span className="fv2-coach-accion-texto">
      <strong>{accion.titulo}</strong>
      <small>{accion.texto}</small>
    </span>
    {accion.cuantos != null && <span className="fv2-coach-accion-cuenta">{formatNumber(accion.cuantos)}</span>}
  </>
  return accion.filtro
    ? <button type="button" className={`fv2-coach-accion is-${accion.tono}`} onClick={() => onFiltro(accion.filtro)}>{contenido}</button>
    : <div className={`fv2-coach-accion is-${accion.tono}`}>{contenido}</div>
}

export function Ficha({ ficha, horizonte, onDetalle, onFiltro, onLead, compacta = false, textoDetalle = 'Ver ficha completa' }) {
  const estado = TONOS[ficha.estado]
  const oportunidades = ficha.leads.filter(isOpen)
    .map((lead) => ({ lead, sla: evaluarSlaEtapa(lead) }))
    .sort((a, b) => prioridadSla(a.sla) - prioridadSla(b.sla)
      || (b.sla?.diasEnEtapa ?? -1) - (a.sla?.diasEnEtapa ?? -1))
  return <article className={`fv2-coach-card ${estado.clase} ${compacta ? 'is-compacta' : ''}`}>
    <header className="fv2-coach-cabeza">
      <span className="fv2-coach-avatar">{ficha.iniciales}</span>
      <div className="fv2-coach-identidad">
        <div className="fv2-coach-nombre-linea">
          <h3>{ficha.name}</h3>
          <span className="fv2-coach-pais"><Bandera pais={ficha.country} />{ficha.country}</span>
        </div>
        <span className={`fv2-coach-estado ${estado.clase}`}>{estado.etiqueta}</span>
      </div>
      <div className="fv2-coach-indicadores">
        <div><strong>{formatNumber(ficha.calificados)}</strong><span>calificados recibidos</span></div>
        <div><strong>{formatNumber(ficha.enCamino)}</strong><span>en camino</span></div>
        {/* Con un decimal, como la tabla de ejecutivos (solo cómo se muestra). */}
        <div><strong>{ficha.conversion.ratio == null ? '—' : `${(ficha.conversion.ratio * 100).toFixed(1)} %`}</strong><span>conversión</span></div>
        <div className={ficha.vencidos ? 'is-vencido' : ''}><strong>{formatNumber(ficha.vencidos)}</strong><span>seguimientos vencidos</span></div>
        <div className={ficha.sla.rojos ? 'is-vencido' : ''}><strong>{porcentaje(ficha.sla.cumplimiento)}</strong><span>etapas cumplidas a tiempo</span></div>
      </div>
      <div className="fv2-coach-ranking">
        <span>{ficha.ranking.estrella ? '★' : '#'}</span>
        <strong>{ficha.ranking.n}</strong>
        <small>de {ficha.ranking.m} en ventas</small>
      </div>
    </header>

    {!compacta && <section className="fv2-coach-prioridad">
      <header>
        <div><h4>Mis oportunidades por prioridad</h4><p>Primero rojas, después amarillas y al final las que siguen a tiempo.</p></div>
        <strong>{formatNumber(oportunidades.length)} abiertas</strong>
      </header>
      <TablaLeads
        className="fv2-tabla-ventana"
        leads={oportunidades.map(({ lead }) => lead)}
        columnas={['lead', 'etapa', 'diasEtapa', 'slaEtapa', 'detalle']}
        vacio="No hay oportunidades abiertas en esta selección."
        onLead={onLead}
      />
    </section>}

    <div className="fv2-coach-paneles">
      <section className="fv2-coach-panel">
        <h4><TrendingUp size={16} aria-hidden="true" /> Resultados</h4>
        <div className="fv2-coach-resultados">
          {RESULTADOS.map(({ clave, etiqueta }) => <Resultado key={clave} etiqueta={etiqueta} resultado={ficha.resultados[clave]} />)}
        </div>
        <div className="fv2-coach-leyenda"><i />Tú <i className="is-equipo" />Equipo</div>
      </section>

      <section className="fv2-coach-panel">
        <h4><Phone size={16} aria-hidden="true" /> Avance por etapa <small>llegaron · % que pasa</small></h4>
        <div className="fv2-coach-pasos">
          {ficha.pasos.map((paso) => <Paso key={paso.desde} paso={paso} onFiltro={onFiltro} />)}
        </div>
      </section>

      <section className="fv2-coach-panel">
        <h4><CalendarClock size={16} aria-hidden="true" /> Acciones de esta semana</h4>
        <div className="fv2-coach-acciones">
          {ficha.acciones.map((accion, indice) => <Accion key={`${accion.clave}-${indice}`} accion={accion} onFiltro={onFiltro} />)}
        </div>
      </section>
    </div>

    {!compacta && <section className="fv2-coach-pipeline">
      <div className="fv2-coach-pipeline-cabeza">
        <h4>Recorrido del ejecutivo por etapa <small>tiempo, SLA y avance</small></h4>
      </div>
      <RecorridoLeads recorrido={recorridoLeads(ficha.embudo)} mostrarMejor={false} mostrarLeyendas={false} mostrarResumenSla={false} />
    </section>}

    <SeguimientoEjecutivo leads={ficha.leads} horizonte={horizonte} onLead={onLead} />

    <footer className="fv2-coach-pie">
      <span>{formatNumber(ficha.ventas)} ganados calificados · {formatNumber(ficha.unidades)} unidades</span>
      <button type="button" className="fv2-coach-detalle" onClick={onDetalle}><Eye size={15} aria-hidden="true" /> {textoDetalle}</button>
    </footer>
  </article>
}

/**
 * Ventana «Ver coaching» (D26). Primero muestra la ficha de coaching corta (la que antes iba suelta en el Panel);
 * «Ver ficha completa» la cambia por la ficha completa (antes: Vista «Ejecutivo»). Desde la ficha completa,
 * «Abrir detalle del ejecutivo» abre la ventana del ejecutivo de siempre (DetalleAsesor).
 * @param leadsDetalle  leads con los filtros activos (los mismos que usaba la ventana del ejecutivo)
 * @param equipo        { ratio, embudo } del equipo de comparación, para DetalleAsesor
 */
export function VentanaCoaching({ ficha, horizonte, leadsDetalle, equipo, onClose }) {
  const [completa, setCompleta] = useState(false)
  const [asesorDetalle, setAsesorDetalle] = useState(null) // { filtroInicial }
  const [leadSel, setLeadSel] = useState(null)
  useVentana(onClose, asesorDetalle || leadSel, () => { setAsesorDetalle(null); setLeadSel(null) })

  return <>
    <Ventana capa={0} etiqueta={`Coaching de ${ficha.name}`} ancho="ancha" onCerrar={onClose}>
      <CabezaVentana eyebrow={completa ? 'Ficha completa del ejecutivo' : 'Ficha de coaching'} titulo={ficha.name}
        subtitulo="Sus resultados y su avance por etapa, comparados con el equipo del país filtrado." onCerrar={onClose}>
        {completa && <button type="button" className="fv2n-boton" onClick={() => setCompleta(false)}>Volver al coaching</button>}
      </CabezaVentana>
      <div className="fv2-ventana-cuerpo">
        <Ficha ficha={ficha} horizonte={horizonte} compacta={!completa} onLead={setLeadSel}
          textoDetalle={completa ? 'Abrir detalle del ejecutivo' : 'Ver ficha completa'}
          onDetalle={() => (completa ? setAsesorDetalle({ filtroInicial: null }) : setCompleta(true))}
          onFiltro={(filtroInicial) => setAsesorDetalle({ filtroInicial })} />
      </div>
    </Ventana>
    {asesorDetalle && <DetalleAsesor name={ficha.name} country={ficha.country} ranking={ficha.ranking} filtroInicial={asesorDetalle.filtroInicial}
      leads={leadsDetalle} month={null} equipo={equipo} onClose={() => setAsesorDetalle(null)} />}
    {leadSel && <DetalleLead lead={leadSel} onClose={() => setLeadSel(null)} />}
  </>
}

