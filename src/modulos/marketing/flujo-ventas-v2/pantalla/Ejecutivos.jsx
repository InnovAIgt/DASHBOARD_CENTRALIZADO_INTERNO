// Flujo de ventas v2 · seguimiento del equipo y coaching (DECISIONES D17).
import { useMemo, useState } from 'react'
import { classifyFollowUps, formatNumber, isOpen } from '../utils/analytics.js'
import { evaluarSlaEtapa, prioridadSla, resumirSlaEtapas } from '../utils/sla.js'
import { Bandera, Vacio } from './comunes.jsx'
import { embudoEtapas, fichaCoaching, pctEntero, recorridoLeads } from './datos.js'
import { DetalleAsesor, DetalleEtapa, DetalleLead } from './Ventanas.jsx'
import { PerdidasEquipo, SeguimientoEjecutivo } from './SeguimientoEjecutivo.jsx'
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

function IndicadoresSla({ resumen }) {
  const cumplimiento = resumen.cumplimiento == null ? '—' : `${pctEntero(resumen.cumplimiento)}%`
  const indicadores = [
    { etiqueta: 'Etapas vencidas', valor: resumen.vencidas, nota: 'amarillas + rojas', tono: 'is-vencida' },
    { etiqueta: 'Prioridad alta', valor: resumen.rojos, nota: 'más de 2 días tarde', tono: 'is-rojo' },
    { etiqueta: 'Recién vencidas', valor: resumen.amarillos, nota: 'hasta 2 días tarde', tono: 'is-amarillo' },
    { etiqueta: 'A tiempo', valor: resumen.verdes, nota: `${cumplimiento} de las etapas con fecha`, tono: 'is-verde' },
  ]
  return <section className="fv2-sla-panorama" aria-label="Indicadores de cumplimiento SLA">
    {indicadores.map((indicador) => <article className={`fv2-sla-panorama-dato ${indicador.tono}`} key={indicador.etiqueta}>
      <span>{indicador.etiqueta}</span>
      <strong>{formatNumber(indicador.valor)}</strong>
      <small>{indicador.nota}</small>
    </article>)}
  </section>
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

function Ficha({ ficha, horizonte, onDetalle, onFiltro, onLead, compacta = false }) {
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
        <div><strong>{porcentaje(ficha.conversion.ratio)}</strong><span>conversión</span></div>
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
      <button type="button" className="fv2-coach-detalle" onClick={onDetalle}><Eye size={15} aria-hidden="true" /> Ver ficha completa</button>
    </footer>
  </article>
}

function AlertasSlaEquipo({ leads, vendedores, onLead }) {
  const grupos = new Map()
  for (const vendedor of vendedores) {
    const clave = `${vendedor.country}\u0000${vendedor.name}`
    grupos.set(clave, { pais: vendedor.country, asesor: vendedor.name, leads: [], seguimientos: [], abiertos: 0 })
  }
  for (const lead of leads) {
    if (!isOpen(lead)) continue
    const asesor = lead.asesor || 'Sin ejecutivo asignado'
    const clave = `${lead.pais}\u0000${asesor}`
    const grupo = grupos.get(clave) ?? { pais: lead.pais, asesor, leads: [], seguimientos: [], abiertos: 0 }
    grupo.abiertos++
    const sla = evaluarSlaEtapa(lead)
    if (sla?.estado === 'rojo') grupo.leads.push(lead)
    grupos.set(clave, grupo)
  }
  for (const lead of classifyFollowUps(leads).overdue) {
    const asesor = lead.asesor || 'Sin ejecutivo asignado'
    const clave = `${lead.pais}\u0000${asesor}`
    const grupo = grupos.get(clave) ?? { pais: lead.pais, asesor, leads: [], seguimientos: [], abiertos: 0 }
    grupo.seguimientos.push(lead)
    grupos.set(clave, grupo)
  }
  const filas = [...grupos.values()].sort((a, b) => b.leads.length - a.leads.length
    || b.seguimientos.length - a.seguimientos.length || a.asesor.localeCompare(b.asesor))
  const totalSeguimientos = filas.reduce((total, fila) => total + fila.seguimientos.length, 0)

  return <section className="fv2-coach-alertas">
    <header>
      <div><h3>Prioridad del equipo</h3><p>Ordenado por etapas rojas; los seguimientos vencidos se identifican por separado.</p></div>
      <div className="fv2-coach-alertas-totales">
        <strong>{formatNumber(filas.reduce((total, fila) => total + fila.leads.length, 0))} etapas rojas</strong>
        <strong className="is-seguimiento">{formatNumber(totalSeguimientos)} {totalSeguimientos === 1 ? 'seguimiento vencido' : 'seguimientos vencidos'}</strong>
      </div>
    </header>
    {filas.length
      ? <div className="fv2-coach-alertas-lista">
        {filas.map((fila) => <article className={`fv2-coach-alerta ${fila.leads.length ? '' : 'is-sin-rojos'}`} key={`${fila.pais}-${fila.asesor}`}>
          <div className="fv2-coach-alerta-cabeza">
            <span><Bandera pais={fila.pais} />{fila.asesor}</span>
            <div className="fv2-coach-alerta-cifras">
              <b className="is-rojo">{formatNumber(fila.leads.length)} {fila.leads.length === 1 ? 'etapa roja' : 'etapas rojas'}</b>
              <b className={fila.seguimientos.length ? 'is-seguimiento' : ''}>
                {formatNumber(fila.seguimientos.length)} {fila.seguimientos.length === 1 ? 'seguimiento vencido' : 'seguimientos vencidos'}
              </b>
            </div>
          </div>
          {fila.leads.length
            ? <TablaLeads
              className="fv2-tabla-ventana"
              leads={fila.leads}
              columnas={['lead', 'etapa', 'diasEtapa', 'slaEtapa', 'detalle']}
              onLead={onLead}
            />
            : <p className="fv2-coach-alertas-vacio">{fila.abiertos ? `${formatNumber(fila.abiertos)} leads abiertos · sin etapas rojas.` : 'Sin leads abiertos en los filtros actuales.'}</p>}
          {fila.seguimientos.length > 0 && <details className="fv2-coach-alerta-seguimientos">
            <summary>Ver los {formatNumber(fila.seguimientos.length)} seguimientos vencidos</summary>
            <TablaLeads className="fv2-tabla-ventana" leads={fila.seguimientos}
              columnas={['lead', 'etapa', 'fecha', 'comentario', 'detalle']} onLead={onLead} />
          </details>}
        </article>)}
      </div>
      : <p className="fv2-coach-alertas-vacio">No hay vendedores para la selección actual.</p>}
  </section>
}

export function Ejecutivos({ leads, leadsEquipo, baseEjecutivos, horizonte }) {
  const [ejecutivoSel, setEjecutivoSel] = useState(null)
  const [asesorDetalle, setAsesorDetalle] = useState(null)
  const [leadSel, setLeadSel] = useState(null)
  const [etapaSel, setEtapaSel] = useState(null)
  const [modoVista, setModoVista] = useState('jefatura')
  const [equipoSel, setEquipoSel] = useState('Todos')
  const [coachingSel, setCoachingSel] = useState(null)
  const { fichas, sinLeads, equipo } = useMemo(
    () => {
      const filtrarEquipo = (items) => equipoSel === 'Todos' ? items : items.filter((lead) => lead.pais === equipoSel)
      const base = equipoSel === 'Todos' ? baseEjecutivos : baseEjecutivos.filter((ejecutivo) => ejecutivo.country === equipoSel)
      return fichaCoaching(filtrarEquipo(leads), filtrarEquipo(leadsEquipo), base)
    },
    [leads, leadsEquipo, baseEjecutivos, equipoSel],
  )
  const fichasPrioridad = [...fichas].sort((a, b) => b.sla.rojos - a.sla.rojos
    || b.sla.amarillos - a.sla.amarillos || a.name.localeCompare(b.name))
  const opcionesEjecutivo = [...fichas, ...sinLeads].sort((a, b) => a.name.localeCompare(b.name))
  const claveEjecutivo = (ejecutivo) => JSON.stringify([ejecutivo.country, ejecutivo.name])
  const ejecutivoActivo = opcionesEjecutivo.some((item) => claveEjecutivo(item) === ejecutivoSel)
    ? ejecutivoSel
    : opcionesEjecutivo[0] ? claveEjecutivo(opcionesEjecutivo[0]) : null
  const fichaActiva = fichas.find((ficha) => claveEjecutivo(ficha) === ejecutivoActivo)
  const coachingActivo = fichasPrioridad.find((ficha) => claveEjecutivo(ficha) === coachingSel) ?? fichasPrioridad[0]
  const leadsVista = equipoSel === 'Todos' ? leads : leads.filter((lead) => lead.pais === equipoSel)
  const leadsSla = modoVista === 'ejecutivo' && fichaActiva ? fichaActiva.leads : leadsVista
  const resumenSla = useMemo(() => resumirSlaEtapas(leadsSla), [leadsSla])
  const leadsPerdidas = modoVista === 'ejecutivo' && ejecutivoActivo
    ? leadsVista.filter((lead) => claveEjecutivo({ country: lead.pais, name: lead.asesor }) === ejecutivoActivo)
    : leadsVista
  const embudoEquipo = useMemo(() => embudoEtapas(leadsVista), [leadsVista])
  const recorridoEquipo = useMemo(() => recorridoLeads(embudoEquipo), [embudoEquipo])
  const embudoVentana = useMemo(() => ({ ...embudoEquipo, mayorCaida: recorridoEquipo.frenado?.hasta ?? null }), [embudoEquipo, recorridoEquipo])
  const abrirFicha = (ficha, filtroInicial = null) => setAsesorDetalle({
    name: ficha.name, country: ficha.country, ranking: ficha.ranking, filtroInicial,
  })

  return <div className="fv2-vista" id="fv2-panel-seguimiento"><section className="fv2-panel">
    <header className="fv2-panel-cabeza">
      <div>
        <div className="fv2-panel-titulo">Seguimiento de ventas y coaching</div>
        <div className="fv2-panel-sub">Prioridad de vencidos, avance por etapa y resultados por ejecutivo</div>
      </div>
    </header>

    <div className="fv2-coach-filtros">
      <label><span>Vista</span><select value={modoVista} onChange={(e) => setModoVista(e.target.value)}>
        <option value="jefatura">Jefatura / equipo</option>
        <option value="ejecutivo">Ejecutivo</option>
      </select></label>
      <label><span>Equipo temporal · sin inicio de sesión</span><select value={equipoSel} onChange={(e) => setEquipoSel(e.target.value)}>
        <option value="Todos">Guatemala + El Salvador</option>
        <option value="Guatemala">Guatemala</option>
        <option value="El Salvador">El Salvador</option>
      </select></label>
      {modoVista === 'ejecutivo' && <label><span>Ejecutivo</span><select value={ejecutivoActivo ?? ''} onChange={(e) => setEjecutivoSel(e.target.value)}>
        {opcionesEjecutivo.map((ejecutivo) => <option key={claveEjecutivo(ejecutivo)} value={claveEjecutivo(ejecutivo)}>{ejecutivo.name} · {ejecutivo.country}</option>)}
      </select></label>}
      {modoVista === 'jefatura' && fichasPrioridad.length > 0 && <label><span>Coaching del ejecutivo</span><select
        value={coachingActivo ? claveEjecutivo(coachingActivo) : ''}
        onChange={(e) => setCoachingSel(e.target.value)}>
        {fichasPrioridad.map((ficha) => <option key={claveEjecutivo(ficha)} value={claveEjecutivo(ficha)}>{ficha.name} · {ficha.country}</option>)}
      </select></label>}
    </div>

    <IndicadoresSla resumen={resumenSla} />

    {modoVista === 'jefatura'
      ? <>
        <AlertasSlaEquipo leads={leadsVista} vendedores={[...fichas, ...sinLeads]} onLead={setLeadSel} />
        <section className="fv2-coach-panel fv2-coach-panel-equipo">
          <h3>Recorrido de los leads <small>tiempo, SLA y mejor ejecutivo en cada etapa</small></h3>
          <RecorridoLeads recorrido={recorridoEquipo} mostrarResumenSla={false} onClickEtapa={setEtapaSel} />
        </section>
        <section className="fv2-coach-coaching-equipo">
          <header><div><h3>Coaching del ejecutivo</h3><p>Compara sus resultados, avance por etapa y acciones de esta semana.</p></div></header>
          {coachingActivo
            ? <Ficha ficha={coachingActivo} horizonte={horizonte} compacta onLead={setLeadSel}
              onDetalle={() => abrirFicha(coachingActivo)}
              onFiltro={(filtroInicial) => abrirFicha(coachingActivo, filtroInicial)} />
            : <Vacio titulo="Sin ejecutivos con los filtros actuales" />}
          {sinLeads.length > 0 && <p className="fv2-coach-sin-leads">
            <strong>Sin leads en este período:</strong> {sinLeads.map((ejecutivo) => `${ejecutivo.name} (${ejecutivo.country})`).join(' · ')}
          </p>}
        </section>
      </>
      : fichaActiva
        ? <Ficha ficha={fichaActiva} horizonte={horizonte} onLead={setLeadSel}
          onDetalle={() => abrirFicha(fichaActiva)}
          onFiltro={(filtroInicial) => abrirFicha(fichaActiva, filtroInicial)} />
        : <Vacio titulo={ejecutivoActivo ? 'Este ejecutivo no tiene leads en los filtros actuales' : 'No hay ejecutivos para esta selección'} />}

    {asesorDetalle && <DetalleAsesor {...asesorDetalle} leads={leadsVista} month={null}
      equipo={{ ratio: equipo.conversion.ratio, embudo: equipo.embudo }}
      onClose={() => setAsesorDetalle(null)} />}
    {etapaSel && <DetalleEtapa etapa={etapaSel} leads={leadsVista} embudo={embudoVentana}
      contexto={equipoSel === 'Todos' ? 'filtros activos' : equipoSel} onClose={() => setEtapaSel(null)} />}
  </section>

    {/* Igual que "¿Por qué se pierden los leads?" de la Vista 2 del dashboard de leads, para todo el equipo. */}
    <PerdidasEquipo leads={leadsPerdidas} onLead={setLeadSel} />

    {leadSel && <DetalleLead lead={leadSel} onClose={() => setLeadSel(null)} />}
  </div>
}
