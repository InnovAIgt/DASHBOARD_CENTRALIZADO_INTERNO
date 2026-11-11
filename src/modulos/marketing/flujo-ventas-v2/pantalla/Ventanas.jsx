// Flujo de ventas v2 · ventanas de detalle (ejecutivo, mes y lead), tema oscuro estilo Activaciones.
// React las dibuja sobre toda la página (fuera de .fv2); por eso su raíz lleva la clase
// .fv2-ventana, que también está dentro del encierro de estilos (flujo-ventas-v2.css).
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarClock, CheckCircle2, Eye, MessageSquareText, Search, TrendingUp, UserRound, X } from 'lucide-react'
import { formatNumber, formatPercent, isWon, leadUnits, monthLabel, PIPELINE_STAGES } from '../utils/analytics.js'
import { formatDate } from '../utils/dates.js'
import { leadDisplayId } from '../utils/leads.js'
import { Calificacion, COLORES, EstadoLead, formatearRatio, Insignia, PaisChip } from './comunes.jsx'
import { datosAsesor, datosLead, datosMes, fechaReferencia, INDICADORES, leadsDeIndicador } from './datos.js'
import { Medidor } from './graficas.jsx'
import { NombreLead, Tabla, TablaLeads } from './Tablas.jsx'

function Ventana({ capa, etiqueta, ancho = 'normal', onCerrar, children }) {
  return createPortal(<div className="fv2-ventana" style={{ zIndex: 1000 + capa }} role="presentation">
    <button type="button" className="fv2-ventana-fondo" onClick={onCerrar} aria-label="Cerrar ventana" />
    <section className={`fv2-ventana-caja is-${ancho}`} role="dialog" aria-modal="true" aria-label={etiqueta}>{children}</section>
  </div>, document.body)
}

function CabezaVentana({ eyebrow, titulo, subtitulo, onCerrar, children }) {
  return <header className="fv2-ventana-cabeza">
    <div className="fv2-ventana-titulos">
      <div className="fv2-eyebrow">{eyebrow}</div>
      <h2>{titulo}</h2>
      {subtitulo && <div className="fv2-ventana-sub">{subtitulo}</div>}
    </div>
    {children}
    <button type="button" className="fv2-cerrar" onClick={onCerrar} aria-label="Cerrar"><X size={18} /></button>
  </header>
}

function Metrica({ etiqueta, valor, color }) {
  return <div className="fv2-metrica" style={{ '--fv2-color': color }}>
    <span>{etiqueta}</span>
    <strong>{valor}</strong>
  </div>
}

/** Bloquea el desplazamiento de la página y cierra con Escape (como las ventanas anteriores). */
function useVentana(onCerrar, hija, cerrarHija) {
  useEffect(() => {
    const alEscape = (event) => {
      if (event.key !== 'Escape') return
      if (hija) cerrarHija()
      else onCerrar()
    }
    document.addEventListener('keydown', alEscape)
    return () => document.removeEventListener('keydown', alEscape)
  }, [onCerrar, hija, cerrarHija])

  useEffect(() => {
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = anterior }
  }, [])
}

// ---------- Detalle de leads (al cliquear un indicador) ----------
const fechaCorta = new Intl.DateTimeFormat('es-SV', { day: '2-digit', month: 'short', year: 'numeric' })

export function DetalleLeads({ clave, leads, onClose }) {
  const [leadSel, setLeadSel] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  useVentana(onClose, leadSel, () => setLeadSel(null))
  const indicador = INDICADORES[clave]
  const lista = useMemo(() => leadsDeIndicador(clave, leads), [clave, leads])
  const texto = busqueda.trim().toLowerCase()
  const visibles = texto
    ? lista.filter((lead) => [lead.clientName, leadDisplayId(lead), lead.asesor, lead.pais, PIPELINE_STAGES[lead.apiStage - 1]]
      .some((valor) => String(valor ?? '').toLowerCase().includes(texto)))
    : lista
  const ganadosEnLista = lista.filter(isWon).length
  const unidades = lista.filter(isWon).reduce((total, lead) => total + leadUnits(lead), 0)
  const columnas = ['Cliente', 'Ejecutivo', 'País', 'Etapa', 'Estado',
    ...(indicador.marca === 'calificacion' ? ['Calificación'] : indicador.marca === 'gano' ? ['¿Ganó?'] : []),
    'Fecha', { label: 'Unidades', num: true }, 'Ficha']

  return <>
    <Ventana capa={0} etiqueta={`Detalle de ${indicador.titulo}`} ancho="ancha" onCerrar={onClose}>
      <CabezaVentana eyebrow="Detalle de leads" titulo={indicador.titulo} subtitulo={`${indicador.descripcion} Respeta los filtros activos.`} onCerrar={onClose} />
      <div className="fv2-ventana-cuerpo">
        <div className="fv2-detalle-barra">
          <div className="fv2-buscador">
            <Search size={15} aria-hidden="true" />
            <input type="text" placeholder="Buscar por cliente, código, ejecutivo, país o etapa…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} aria-label="Buscar leads" />
          </div>
          <span className="fv2-detalle-cuenta">
            <b>{formatNumber(visibles.length)}</b> de {formatNumber(lista.length)} leads
            {indicador.marca === 'gano' && <> · <b style={{ color: COLORES.verdeClaro }}>{formatNumber(ganadosEnLista)}</b> ganaron ({formatearRatio(lista.length ? ganadosEnLista / lista.length : 0)})</>}
            {(clave === 'unidades' || clave === 'porCierre') && <> · <b>{formatNumber(unidades)}</b> unidades</>}
          </span>
        </div>
        <p className="fv2-nota">Ordenados por fecha, de la más reciente a la más antigua. Fecha: de cierre si el lead es ganado; si no, de creación.</p>
        <Tabla columnas={columnas} vacio={visibles.length ? null : 'Ningún lead coincide con la búsqueda.'} className="fv2-tabla-detalle">
          {visibles.map((lead) => {
            const fecha = fechaReferencia(lead)
            return <tr key={lead.id} className={indicador.marca === 'gano' && isWon(lead) ? 'fv2-fila-gano' : ''}>
              <td><button type="button" className="fv2-enlace-lead" onClick={() => setLeadSel(lead)}><NombreLead lead={lead} /></button></td>
              <td>{lead.asesor}</td>
              <td><PaisChip pais={lead.pais} /></td>
              <td>{PIPELINE_STAGES[lead.apiStage - 1] ?? '—'}</td>
              <td><EstadoLead estado={lead.estado} /></td>
              {indicador.marca === 'calificacion' && <td><Calificacion tipo={lead.tipoLead} /></td>}
              {indicador.marca === 'gano' && <td>{isWon(lead) ? <Insignia tono="verde"><CheckCircle2 size={11} />Ganó</Insignia> : <span className="fv2-tenue">—</span>}</td>}
              <td className="fv2-sin-salto">{fecha ? fechaCorta.format(fecha) : 'Sin fecha'}</td>
              <td className="num">{isWon(lead) && leadUnits(lead) ? formatNumber(leadUnits(lead)) : '—'}</td>
              <td><button type="button" className="fv2-btn-ficha" onClick={() => setLeadSel(lead)}><Eye size={13} />Ver ficha</button></td>
            </tr>
          })}
        </Tabla>
      </div>
    </Ventana>
    {leadSel && <DetalleLead lead={leadSel} onClose={() => setLeadSel(null)} />}
  </>
}

// ---------- Ejecutivo ----------
export function DetalleAsesor({ name, country, leads, month, onClose }) {
  const [leadSel, setLeadSel] = useState(null)
  const [selectedMonth, setSelectedMonth] = useState(month ?? '')
  const [selectedType, setSelectedType] = useState('')
  useVentana(onClose, leadSel, () => setLeadSel(null))
  const { availableMonths, own, summary, stages, maxStage, forecast, advisorCountry, conversion } = datosAsesor({ name, country, leads, selectedMonth, selectedType })

  return <>
    <Ventana capa={0} etiqueta={`Detalle de ${name}`} ancho="ancha" onCerrar={onClose}>
      <CabezaVentana eyebrow="Detalle del ejecutivo" titulo={<>{name} {advisorCountry && <PaisChip pais={advisorCountry} />}</>} onCerrar={onClose}>
        <div className="fv2-ventana-filtros">
          <label><span>Mes</span>
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
              <option value="">Todos los meses</option>
              {availableMonths.map((value) => <option value={value} key={value}>{monthLabel(value, 'long')}</option>)}
            </select>
          </label>
          <label><span>Tipo de lead</span>
            <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
              <option value="">Todos</option>
              <option value="calificado">Calificado</option>
              <option value="no_calificado">No calificado</option>
            </select>
          </label>
        </div>
      </CabezaVentana>

      <div className="fv2-ventana-cuerpo">
        <div className="fv2-metricas is-5">
          <Metrica etiqueta="Leads" valor={formatNumber(summary.total)} color={COLORES.azul} />
          <Metrica etiqueta="Calificados" valor={formatNumber(summary.qualified)} color={COLORES.azulClaro} />
          <Metrica etiqueta="Ganados" valor={formatNumber(summary.won)} color={COLORES.verde} />
          <Metrica etiqueta="Unidades vendidas" valor={formatNumber(summary.units)} color={COLORES.amarillo} />
          <Metrica etiqueta="Conversión de calificados" valor={formatearRatio(conversion.ratio)} color={COLORES.rosa} />
        </div>

        <div className="fv2-dos-columnas">
          <section className="fv2-bloque">
            <h3>Embudo del ejecutivo</h3>
            {[
              { label: 'Leads', valor: summary.total, color: COLORES.azul },
              { label: 'Calificados', valor: summary.qualified, color: COLORES.azulClaro, pct: formatPercent(summary.qualified, summary.total) },
              { label: 'Ganados', valor: summary.won, color: COLORES.verde, pct: formatearRatio(conversion.ratio) },
            ].map((p) => <div key={p.label} className="fv2-embudo-paso">
              <div className="fv2-embudo-texto"><span>{p.label}</span><b>{formatNumber(p.valor)}</b>{p.pct && <small>{p.pct}</small>}</div>
              <Medidor valor={p.valor} max={Math.max(1, summary.total)} color={p.color} alto={8} />
            </div>)}
            <p className="fv2-nota">
              Ganados: {formatNumber(conversion.ganadosCalificados)} de leads calificados · {formatNumber(conversion.ganadosNoCalificados)} de no calificados.
              Conversión de calificados = ganados calificados ÷ calificados. Conversión general: {formatPercent(summary.won, summary.total)}.
              {' '}{formatNumber(summary.units)} unidades vendidas en los {formatNumber(summary.won)} leads ganados de {name}.
            </p>
          </section>

          <section className="fv2-bloque">
            <h3>Etapas <small>distribución actual</small></h3>
            <div className="fv2-etapas">
              {stages.map((stage) => <div key={stage.stage} className="fv2-etapa-fila">
                <span className="fv2-etapa-num">{stage.stage}</span>
                <span className="fv2-etapa-nombre">{stage.label}</span>
                <Medidor valor={stage.count} max={maxStage} color={COLORES.azul} />
                <span className="fv2-etapa-cuenta">{stage.count}<small> · {stage.open} abiertos</small></span>
              </div>)}
            </div>
          </section>
        </div>

        <section className="fv2-bloque">
          <h3>Leads del ejecutivo <small>{formatNumber(own.length)} en esta selección</small></h3>
          <TablaLeads className="fv2-tabla-ventana" leads={[...own].sort((a, b) => b.apiStage - a.apiStage)} columnas={['lead', 'etapa', 'calificacion', 'estado', 'fecha', 'comentario', 'unidadesGanadas', 'detalle']} onLead={setLeadSel} />
        </section>

        <section className="fv2-bloque">
          <h3><TrendingUp size={15} color={COLORES.verde} /> Pronóstico <small>{forecast.items.length} casos · {formatNumber(forecast.units)} unidades proyectadas</small></h3>
          <TablaLeads className="fv2-tabla-ventana" leads={forecast.items.map((item) => item.lead)} columnas={['lead', 'fecha', 'comentario', 'unidadesProyectadas', 'detalle']} vacio="Sin casos que cumplan el criterio de pronóstico (próximos 30 días)." onLead={setLeadSel} />
        </section>
      </div>
    </Ventana>
    {leadSel && <DetalleLead lead={leadSel} onClose={() => setLeadSel(null)} />}
  </>
}

// ---------- Mes ----------
export function DetalleMes({ month, country, leads, onClose }) {
  const [leadSel, setLeadSel] = useState(null)
  useVentana(onClose, leadSel, () => setLeadSel(null))
  const { summary, stages, units, conversion } = datosMes(leads)

  return <>
    <Ventana capa={1} etiqueta={`Detalle de ${monthLabel(month, 'long')} · ${country}`} ancho="ancha" onCerrar={onClose}>
      <CabezaVentana
        eyebrow="Detalle mensual"
        titulo={<>{monthLabel(month, 'long')} <PaisChip pais={country} /></>}
        subtitulo="Los ganados se ubican por fecha de cierre; el resto de leads, por fecha de creación."
        onCerrar={onClose}
      />
      <div className="fv2-ventana-cuerpo">
        <div className="fv2-metricas is-6">
          <Metrica etiqueta="Total de leads" valor={formatNumber(summary.total)} color={COLORES.azul} />
          <Metrica etiqueta="Calificados" valor={formatNumber(summary.qualified)} color={COLORES.azulClaro} />
          <Metrica etiqueta="No calificados" valor={formatNumber(summary.unqualified)} color={COLORES.tenue} />
          <Metrica etiqueta="Ganados" valor={formatNumber(summary.won)} color={COLORES.verde} />
          <Metrica etiqueta="Conversión de calificados" valor={formatearRatio(conversion.ratio)} color={COLORES.rosa} />
          <Metrica etiqueta="Unidades vendidas" valor={formatNumber(units)} color={COLORES.amarillo} />
        </div>
        <p className="fv2-nota">
          Ganados: {formatNumber(conversion.ganadosCalificados)} de leads calificados · {formatNumber(conversion.ganadosNoCalificados)} de no calificados.
          Conversión de calificados = ganados calificados ÷ calificados. Conversión general: {formatPercent(summary.won, summary.total)}.
        </p>

        <section className="fv2-bloque">
          <h3>Avance por etapa <small>leads que alcanzaron cada etapa según Prospekt IA</small></h3>
          <div className="fv2-etapas-cuadros">
            {stages.map((stage) => <div className="fv2-etapa-cuadro" key={stage.stage}>
              <small>Etapa {stage.stage}</small>
              <strong>{stage.label}</strong>
              <span><b>{formatNumber(stage.reached)}</b> alcanzaron · <b>{formatNumber(stage.current)}</b> actuales</span>
            </div>)}
          </div>
        </section>

        <section className="fv2-bloque">
          <h3>Leads del mes <small>{formatNumber(leads.length)} leads · selecciona uno para ver su ficha</small></h3>
          <TablaLeads
            className="fv2-tabla-ventana"
            leads={[...leads].sort((a, b) => String(a.clientName ?? leadDisplayId(a)).localeCompare(String(b.clientName ?? leadDisplayId(b))))}
            columnas={['lead', 'asesor', 'etapa', 'estado', 'calificacion', 'fechaCierre', 'unidadesGanadas', 'detalle']}
            onLead={setLeadSel}
          />
        </section>
      </div>
    </Ventana>
    {leadSel && <DetalleLead lead={leadSel} onClose={() => setLeadSel(null)} />}
  </>
}

// ---------- Lead ----------
function Dato({ etiqueta, valor }) {
  return <div className="fv2-dato"><span>{etiqueta}</span><strong>{valor || '—'}</strong></div>
}

export function DetalleLead({ lead, onClose }) {
  const { comments, stage, product } = datosLead(lead)
  const nombre = lead.clientName ?? `Lead ${leadDisplayId(lead)}`
  return <Ventana capa={2} etiqueta={`Ficha de ${nombre}`} onCerrar={onClose}>
    <CabezaVentana
      eyebrow="Ficha del lead"
      titulo={nombre}
      subtitulo={<span className="fv2-en-linea">{leadDisplayId(lead)} · <PaisChip pais={lead.pais} /> {lead.asesor}</span>}
      onCerrar={onClose}
    />
    <div className="fv2-ventana-cuerpo">
      <div className="fv2-ficha-resumen">
        <div>
          <span>Unidades vendidas en este lead</span>
          <strong>{isWon(lead) ? formatNumber(leadUnits(lead)) : '—'}</strong>
        </div>
        <EstadoLead estado={lead.estado} />
      </div>
      <div className="fv2-dos-columnas">
        <section className="fv2-bloque">
          <h3><UserRound size={15} /> Información comercial</h3>
          <Dato etiqueta="Ejecutivo" valor={lead.asesor} />
          <Dato etiqueta="País" valor={lead.pais} />
          <Dato etiqueta="Etapa actual" valor={stage} />
          <Dato etiqueta="Calificación" valor={<Calificacion tipo={lead.tipoLead} />} />
          <Dato etiqueta="Producto / rubro" valor={product} />
        </section>
        <section className="fv2-bloque">
          <h3><CalendarClock size={15} /> Fechas y seguimiento</h3>
          <Dato etiqueta="Creado" valor={formatDate(lead.fechaCreacion)} />
          {isWon(lead) && <Dato etiqueta="Cierre exitoso" valor={formatDate(lead.fechaCierreExitoso)} />}
          <Dato etiqueta="Próxima gestión" valor={formatDate(lead.proximaGestion)} />
          <Dato etiqueta="Fecha de reunión" valor={formatDate(lead.fechaReunion)} />
          <Dato etiqueta="Fecha estimada de pronóstico" valor={formatDate(lead.fcFecha)} />
          <Dato etiqueta="Incluir en pronóstico" valor={lead.fcIncluir || lead.fcIntentar ? 'Sí' : lead.fcExcluir ? 'No' : 'Sin indicar'} />
        </section>
      </div>
      <section className="fv2-bloque">
        <h3><MessageSquareText size={15} /> Comentarios y contexto</h3>
        {lead.comentarioReunion && <div className="fv2-comentario-caja"><strong>Reunión</strong><p>{lead.comentarioReunion}</p></div>}
        {comments.length
          ? comments.map((comment, index) => <div className="fv2-comentario-caja" key={`${index}-${comment}`}><strong>{index === 0 && lead.comentarioGestion === comment ? 'Última gestión' : 'Comentario'}</strong><p>{comment}</p></div>)
          : !lead.comentarioReunion && <p className="fv2-nota">No hay comentarios para este lead.</p>}
        {lead.motivo && <div className="fv2-comentario-caja is-perdida"><strong>Motivo de pérdida</strong><p>{lead.motivo}</p></div>}
      </section>
    </div>
  </Ventana>
}
