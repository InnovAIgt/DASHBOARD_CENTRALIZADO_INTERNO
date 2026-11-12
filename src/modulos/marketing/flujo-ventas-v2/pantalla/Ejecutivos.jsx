// Flujo de ventas v2 · pestaña "Ejecutivos": fichas de coaching (DECISIONES D17).
import { useMemo, useState } from 'react'
import { formatNumber } from '../utils/analytics.js'
import { Bandera, Vacio } from './comunes.jsx'
import { fichaCoaching, pctEntero } from './datos.js'
import { DetalleAsesor } from './Ventanas.jsx'
import { CalendarClock, Check, Eye, Phone, TrendingUp, TriangleAlert } from 'lucide-react'

const TONOS = {
  apoyo: { etiqueta: 'Necesita apoyo', clase: 'is-apoyo' },
  bien: { etiqueta: 'Va bien', clase: 'is-bien' },
  pocos: { etiqueta: 'Pocos datos', clase: 'is-pocos' },
}

const ICONOS_ACCION = {
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

function Ficha({ ficha, onDetalle, onFiltro }) {
  const estado = TONOS[ficha.estado]
  return <article className={`fv2-coach-card ${estado.clase}`}>
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
        <div><strong>{porcentaje(ficha.conversion.ratio)}</strong><span>conversión</span></div>
        <div className={ficha.vencidos ? 'is-vencido' : ''}><strong>{formatNumber(ficha.vencidos)}</strong><span>seguimientos vencidos</span></div>
      </div>
      <div className="fv2-coach-ranking">
        <span>{ficha.ranking.estrella ? '★' : '#'}</span>
        <strong>{ficha.ranking.n}</strong>
        <small>de {ficha.ranking.m} en ventas</small>
      </div>
    </header>

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

    <footer className="fv2-coach-pie">
      <span>{formatNumber(ficha.ventas)} ganados calificados · {formatNumber(ficha.unidades)} unidades</span>
      <button type="button" className="fv2-coach-detalle" onClick={onDetalle}><Eye size={15} aria-hidden="true" /> Ver ficha completa</button>
    </footer>
  </article>
}

export function Ejecutivos({ leads, leadsEquipo, baseEjecutivos }) {
  const [asesorSel, setAsesorSel] = useState(null)
  const { fichas, sinLeads, equipo } = useMemo(
    () => fichaCoaching(leads, leadsEquipo, baseEjecutivos),
    [leads, leadsEquipo, baseEjecutivos],
  )

  return <section className="fv2-panel">
    <header className="fv2-panel-cabeza">
      <div>
        <div className="fv2-panel-titulo">Coaching por ejecutivo</div>
        <div className="fv2-panel-sub">Qué resultados obtiene cada vendedor y dónde enfocar el seguimiento</div>
      </div>
    </header>

    {fichas.length
      ? <div className="fv2-coach-lista">
        {fichas.map((ficha) => <Ficha key={ficha.name} ficha={ficha}
          onDetalle={() => setAsesorSel({
            name: ficha.name, country: ficha.country,
            ranking: ficha.ranking,
          })}
          onFiltro={(filtroInicial) => setAsesorSel({
            name: ficha.name, country: ficha.country,
            ranking: ficha.ranking, filtroInicial,
          })} />)}
      </div>
      : <Vacio titulo="Sin ejecutivos con los filtros actuales" />}

    {sinLeads.length > 0 && <div className="fv2-coach-sin-leads">
      <strong>Sin leads en este período</strong>
      <span>{sinLeads.map((ejecutivo) => `${ejecutivo.name} (${ejecutivo.country})`).join(' · ')}</span>
    </div>}

    {asesorSel && <DetalleAsesor {...asesorSel} leads={leads} month={null}
      equipo={{ ratio: equipo.conversion.ratio, embudo: equipo.embudo }}
      onClose={() => setAsesorSel(null)} />}
  </section>
}
