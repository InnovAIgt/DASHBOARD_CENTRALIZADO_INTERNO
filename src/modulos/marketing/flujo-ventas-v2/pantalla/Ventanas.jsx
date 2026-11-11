// Flujo de ventas v2 · ventanas de detalle (ejecutivo, mes y lead), tema oscuro estilo Activaciones.
// React las dibuja sobre toda la página (fuera de .fv2); por eso su raíz lleva la clase
// .fv2-ventana, que también está dentro del encierro de estilos (flujo-ventas-v2.css).
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarClock, MessageSquareText, TrendingUp, UserRound, X } from 'lucide-react'
import { formatNumber, formatPercent, isWon, leadUnits, monthLabel } from '../utils/analytics.js'
import { formatDate } from '../utils/dates.js'
import { leadDisplayId } from '../utils/leads.js'
import { Calificacion, COLORES, EstadoLead, PaisChip } from './comunes.jsx'
import { datosAsesor, datosLead, datosMes } from './datos.js'
import { Medidor } from './graficas.jsx'
import { TablaLeads } from './Tablas.jsx'

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

// ---------- Ejecutivo ----------
export function DetalleAsesor({ name, country, leads, month, onClose }) {
  const [leadSel, setLeadSel] = useState(null)
  const [selectedMonth, setSelectedMonth] = useState(month ?? '')
  const [selectedType, setSelectedType] = useState('')
  useVentana(onClose, leadSel, () => setLeadSel(null))
  const { availableMonths, own, summary, stages, maxStage, forecast, advisorCountry } = datosAsesor({ name, country, leads, selectedMonth, selectedType })

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
          <Metrica etiqueta="Conversión" valor={formatPercent(summary.won, summary.total)} color={COLORES.rosa} />
        </div>

        <div className="fv2-dos-columnas">
          <section className="fv2-bloque">
            <h3>Embudo del ejecutivo</h3>
            {[
              { label: 'Leads', valor: summary.total, color: COLORES.azul },
              { label: 'Calificados', valor: summary.qualified, color: COLORES.azulClaro, desde: summary.total },
              { label: 'Ganados', valor: summary.won, color: COLORES.verde, desde: summary.qualified },
            ].map((p) => <div key={p.label} className="fv2-embudo-paso">
              <div className="fv2-embudo-texto"><span>{p.label}</span><b>{formatNumber(p.valor)}</b>{p.desde !== undefined && <small>{formatPercent(p.valor, p.desde)}</small>}</div>
              <Medidor valor={p.valor} max={Math.max(1, summary.total)} color={p.color} alto={8} />
            </div>)}
            <p className="fv2-nota">{formatNumber(summary.units)} unidades vendidas en los {formatNumber(summary.won)} leads ganados de {name}.</p>
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
  const { summary, stages, units } = datosMes(leads)

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
          <Metrica etiqueta="Conversión" valor={formatPercent(summary.won, summary.total)} color={COLORES.rosa} />
          <Metrica etiqueta="Unidades vendidas" valor={formatNumber(units)} color={COLORES.amarillo} />
        </div>

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
