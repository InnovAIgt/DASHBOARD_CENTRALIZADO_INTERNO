// Flujo de ventas v2 · ventanas de detalle (ejecutivo, mes y lead), tema oscuro estilo Activaciones.
// React las dibuja sobre toda la página (fuera de .fv2); por eso su raíz lleva la clase
// .fv2-ventana, que también está dentro del encierro de estilos (flujo-ventas-v2.css).
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarClock, CheckCircle2, Eye, MessageSquareText, Search, TrendingUp, UserRound, X } from 'lucide-react'
import { formatNumber, formatPercent, isOpen, isWon, leadComments, leadUnits, monthLabel, PIPELINE_STAGES } from '../utils/analytics.js'
import { formatDate, toDate } from '../utils/dates.js'
import { leadDisplayId } from '../utils/leads.js'
import { Calificacion, COLORES, EstadoLead, formatearRatio, Insignia, MiniEtapas, PaisChip } from './comunes.jsx'
import {
  datosAsesor, datosLead, datosMes, ejecutivosEnEtapa, embudoEtapas, esVencido, estaHoy, ETAPAS, fechaReferencia, iniciales,
  INDICADORES, leadsDeIndicador, mesesDelPeriodo, mesesEnEtapa, puntoDebil, tonoPaso, ventasPorMes,
} from './datos.js'
import { diasDesdeCreacion } from './informeDatos.js'
import { Semaforo } from './Semaforo.jsx'
import { BarritasMes, EmbudoEtapas } from './graficas.jsx'
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

function Metrica({ etiqueta, valor, nota, color }) {
  return <div className="fv2-metrica" style={{ '--fv2-color': color }}>
    <span>{etiqueta}</span>
    <strong>{valor}</strong>
    {nota && <small>{nota}</small>}
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

export function DetalleLeads({ clave, leads, titulo, onClose }) {
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
    <Ventana capa={0} etiqueta={`Detalle de ${titulo ?? indicador.titulo}`} ancho="ancha" onCerrar={onClose}>
      <CabezaVentana eyebrow="Detalle de leads" titulo={titulo ?? indicador.titulo} subtitulo={`${indicador.descripcion} Respeta los filtros activos.`} onCerrar={onClose} />
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

// ---------- Ejecutivo (4.0b: mismo contenido, reordenado) ----------
const PESTANAS_LEADS = [
  { key: 'abiertos', label: 'Abiertos', filtro: isOpen },
  { key: 'ganados', label: 'Ganados', filtro: isWon },
  { key: 'perdidos', label: 'Perdidos', filtro: (l) => l.estado === 'perdido' },
  { key: 'vencidos', label: 'Vencidos', filtro: esVencido, rojo: true },
]

export function DetalleAsesor({ name, country, leads, month, posicion, equipo, onClose }) {
  const [leadSel, setLeadSel] = useState(null)
  const [mesSel, setMesSel] = useState(null)
  const [selectedMonth, setSelectedMonth] = useState(month ?? '')
  const [selectedType, setSelectedType] = useState('')
  const [pestanaLeads, setPestanaLeads] = useState('abiertos')
  const [etapaFiltro, setEtapaFiltro] = useState(null)
  const [verPronostico, setVerPronostico] = useState(false)
  useVentana(onClose, leadSel || mesSel, () => { setLeadSel(null); setMesSel(null) })
  const { availableMonths, own, summary, forecast, advisorCountry, conversion } = datosAsesor({ name, country, leads, selectedMonth, selectedType })
  const embudo = useMemo(() => embudoEtapas(own), [own])
  const debil = equipo?.embudo ? puntoDebil(embudo, equipo.embudo) : null
  const meses = useMemo(() => ventasPorMes(own, mesesDelPeriodo(own)), [own])
  const vencidos = own.filter(esVencido).length
  const pestana = PESTANAS_LEADS.find((p) => p.key === pestanaLeads)
  const listaLeads = [...own]
    .filter((l) => (etapaFiltro ? estaHoy(l, etapaFiltro) : pestana.filtro(l)))
    .sort((a, b) => b.apiStage - a.apiStage)
  const embudoVista = { etapas: embudo.etapas.map((e) => ({ ...e, mejor: null })), mayorCaida: debil?.stage ?? null }

  return <>
    <Ventana capa={0} etiqueta={`Detalle de ${name}`} ancho="ancha" onCerrar={onClose}>
      <header className="fv2-ventana-cabeza">
        <span className="fv2-avatar is-grande">{iniciales(name)}</span>
        <div className="fv2-ventana-titulos">
          <div className="fv2-eyebrow">Detalle del ejecutivo</div>
          <h2>{name} {advisorCountry && <PaisChip pais={advisorCountry} />} {posicion && <span className={`fv2-posicion ${posicion === 1 ? 'is-primero' : ''}`}>{posicion === 1 ? '★ ' : ''}#{posicion} del equipo</span>}</h2>
        </div>
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
        <button type="button" className="fv2-cerrar" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
      </header>

      <div className="fv2-ventana-cuerpo">
        <div className="fv2-metricas is-6">
          <Metrica etiqueta="Leads" valor={formatNumber(summary.total)} nota={`${formatNumber(summary.qualified)} calificados`} color={COLORES.azul} />
          <Metrica etiqueta="Ganados" valor={formatNumber(summary.won)} nota={`${formatNumber(conversion.ganadosCalificados)} calif. · ${formatNumber(conversion.ganadosNoCalificados)} no calif.`} color={COLORES.verde} />
          <Metrica etiqueta="Conversión de calificados" valor={formatearRatio(conversion.ratio)} nota={equipo ? `equipo: ${formatearRatio(equipo.ratio)}` : undefined} color={COLORES.azulClaro} />
          <Metrica etiqueta="Unidades vendidas" valor={formatNumber(summary.units)} nota={summary.won ? `${formatNumber(Math.round(summary.avgUnits))} por cierre` : 'sin ganados'} color={COLORES.tenue} />
          <Metrica etiqueta="Abiertos hoy" valor={formatNumber(summary.open)} nota="en proceso" color={COLORES.azul} />
          {vencidos > 0
            ? <Metrica etiqueta="Seguimientos" valor={`${formatNumber(vencidos)} vencidos`} nota="próxima gestión ya pasada" color={COLORES.rosa} />
            : <Metrica etiqueta="Seguimientos" valor="Al día" nota="0 vencidos" color={COLORES.verde} />}
        </div>

        <div className="fv2-ejec-bloques">
          <section className="fv2-bloque">
            <h3>Avance por etapa <small>llegaron · % que pasó · están hoy</small></h3>
            <EmbudoEtapas embudo={embudoVista} onEtapa={(k) => setEtapaFiltro(k)} />
            <p className="fv2-nota">
              {debil
                ? <>Su punto débil: <b className="fv2-texto-amarillo">{debil.label}</b> (pasa {formatearRatio(debil.ratio)}{debil.equipo != null ? `, el equipo pasa ${formatearRatio(debil.equipo)}` : ''}). </>
                : 'Sin datos suficientes para señalar un punto débil (se necesitan al menos 5 leads en la etapa anterior). '}
              Clic en una etapa para ver sus leads.
            </p>
          </section>
          <section className="fv2-bloque">
            <h3>Ventas por mes <small>clic en un mes: su detalle</small></h3>
            {meses.length
              ? <BarritasMes meses={meses} onMes={(m) => setMesSel({ month: m.month, country: advisorCountry, ejecutivo: name, leads: m.leads })} />
              : <p className="fv2-nota">Sin meses con leads.</p>}
            <p className="fv2-nota">Verde fuerte = de calificados · verde claro = de no calificados.</p>
          </section>
        </div>

        <section className="fv2-bloque">
          <div className="fv2-bloque-cabeza">
            <h3>Leads del ejecutivo <small>{formatNumber(own.length)} en esta selección</small></h3>
            <div className="fv2-vistas">
              {etapaFiltro && <button type="button" className="fv2-vista-pildora is-activa" onClick={() => setEtapaFiltro(null)} title="Quitar filtro de etapa">
                Hoy en {ETAPAS[etapaFiltro - 1]} ✕
              </button>}
              {PESTANAS_LEADS.map((p) => <button type="button" key={p.key}
                className={`fv2-vista-pildora ${!etapaFiltro && pestanaLeads === p.key ? 'is-activa' : ''}`}
                onClick={() => { setEtapaFiltro(null); setPestanaLeads(p.key) }}>
                {p.label}<span className={`fv2-vista-cuenta ${p.rojo ? 'is-rojo' : ''}`}>{formatNumber(own.filter(p.filtro).length)}</span>
              </button>)}
            </div>
          </div>
          <Tabla columnas={['Cliente', 'Etapa', 'Calificación', 'Estado', 'Próxima gestión', 'Último comentario', { label: 'Unid.', num: true }, '']}
            vacio={listaLeads.length ? null : 'Sin leads en esta pestaña.'} className="fv2-tabla-ventana">
            {listaLeads.map((lead) => {
              const comentario = leadComments(lead)[0]
              return <tr key={lead.id}>
                <td><button type="button" className="fv2-enlace-lead" onClick={() => setLeadSel(lead)}><NombreLead lead={lead} /></button></td>
                <td><span className="fv2-etapa-celda"><MiniEtapas etapa={lead.apiStage} ganado={isWon(lead)} /><small>{PIPELINE_STAGES[lead.apiStage - 1] ?? '—'}</small></span></td>
                <td><Calificacion tipo={lead.tipoLead} /></td>
                <td><EstadoLead estado={lead.estado} /></td>
                <td><Semaforo lead={lead} fecha={toDate(lead.proximaGestion)} /></td>
                <td><span className="fv2-comentario" title={comentario}>{comentario ?? '—'}</span></td>
                <td className="num">{isWon(lead) && leadUnits(lead) ? formatNumber(leadUnits(lead)) : '—'}</td>
                <td><button type="button" className="fv2-btn-ficha" onClick={() => setLeadSel(lead)}><Eye size={13} />Ver ficha</button></td>
              </tr>
            })}
          </Tabla>
        </section>

        <section className="fv2-bloque">
          <div className="fv2-bloque-cabeza">
            <h3><TrendingUp size={15} color={COLORES.verde} /> Pronóstico <small>{forecast.items.length} casos con señal de cierre · {formatNumber(forecast.units)} unidades proyectadas</small></h3>
            <button type="button" className="fv2-pildora" onClick={() => setVerPronostico((v) => !v)} aria-expanded={verPronostico}>{verPronostico ? 'Ocultar casos ▴' : 'Ver casos ▾'}</button>
          </div>
          {verPronostico && <TablaLeads className="fv2-tabla-ventana" leads={forecast.items.map((item) => item.lead)} columnas={['lead', 'fecha', 'comentario', 'unidadesProyectadas', 'detalle']} vacio="Sin casos que cumplan el criterio de pronóstico (próximos 30 días)." onLead={setLeadSel} />}
        </section>
      </div>
    </Ventana>
    {leadSel && <DetalleLead lead={leadSel} onClose={() => setLeadSel(null)} />}
    {mesSel && <DetalleMes {...mesSel} onClose={() => setMesSel(null)} />}
  </>
}

// ---------- Mes ----------
// 4.0b: country puede ser null ("Todos los países", desde la gráfica "Leads por mes") y
// `ejecutivo` indica que es el detalle de un solo ejecutivo (desde sus barritas de ventas por mes).
export function DetalleMes({ month, country, ejecutivo, leads, onClose }) {
  const [leadSel, setLeadSel] = useState(null)
  useVentana(onClose, leadSel, () => setLeadSel(null))
  const { summary, stages, units, conversion } = datosMes(leads)
  const donde = country ?? 'Todos los países'

  return <>
    <Ventana capa={1} etiqueta={`Detalle de ${monthLabel(month, 'long')} · ${ejecutivo ?? donde}`} ancho="ancha" onCerrar={onClose}>
      <CabezaVentana
        eyebrow={ejecutivo ? `Detalle mensual · ${ejecutivo}` : 'Detalle mensual'}
        titulo={<>{monthLabel(month, 'long')} {country ? <PaisChip pais={country} /> : <span className="fv2-tenue">· Todos los países</span>}</>}
        subtitulo="Los ganados se ubican por fecha de cierre; el resto de leads, por fecha de creación."
        onCerrar={onClose}
      />
      <div className="fv2-ventana-cuerpo">
        <div className="fv2-metricas is-6">
          <Metrica etiqueta="Total de leads" valor={formatNumber(summary.total)} color={COLORES.azul} />
          <Metrica etiqueta="Calificados" valor={formatNumber(summary.qualified)} color={COLORES.azulClaro} />
          <Metrica etiqueta="No calificados" valor={formatNumber(summary.unqualified)} color={COLORES.tenue} />
          <Metrica etiqueta="Ganados" valor={formatNumber(summary.won)} color={COLORES.verde} />
          <Metrica etiqueta="Conversión de calificados" valor={formatearRatio(conversion.ratio)} color={COLORES.azulClaro} />
          <Metrica etiqueta="Unidades vendidas" valor={formatNumber(units)} color={COLORES.tenue} />
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

// ---------- Etapa del embudo (4.0) ----------
// 4 datos arriba + pestañas Por mes / Por ejecutivo / Leads en esta etapa. Etapa real estimada y
// colores según datos.js (DECISIONES D12 y D13). El "Descargar Excel" de esta ventana queda para después.
function BarraDoble({ llegaron, pasaron, max, tono }) {
  const a = max ? (llegaron / max) * 100 : 0
  const b = max ? (pasaron / max) * 100 : 0
  return <span className="fv2-barra-doble">
    <i className="is-llegaron" style={{ width: `${a}%` }} />
    <i className={`is-pasaron is-${tono}`} style={{ width: `${b}%` }} />
  </span>
}

export function DetalleEtapa({ etapa, leads, embudo, contexto, onClose }) {
  const [pestana, setPestana] = useState('mes')
  const [leadSel, setLeadSel] = useState(null)
  useVentana(onClose, leadSel, () => setLeadSel(null))
  const e = embudo.etapas[etapa - 1]
  const anterior = embudo.etapas[etapa - 2]
  const siguiente = ETAPAS[etapa] // no existe en Cierre: ahí "pasar" = ganarse
  const caida = embudo.mayorCaida === etapa
  const meses = useMemo(() => mesesEnEtapa(leads, etapa), [leads, etapa])
  const ejecutivos = useMemo(() => ejecutivosEnEtapa(leads, etapa), [leads, etapa])
  const enEtapa = useMemo(() => leads.filter((l) => estaHoy(l, etapa))
    .sort((a, b) => (diasDesdeCreacion(b) ?? 0) - (diasDesdeCreacion(a) ?? 0)), [leads, etapa])
  const maxMes = Math.max(1, ...meses.map((m) => m.llegaron))
  const maxEjec = Math.max(1, ...ejecutivos.map((f) => f.llegaron))
  const verbo = siguiente ? 'pasaron' : 'se ganaron'
  const tonoCirculo = e.entrada == null ? 'azul' : caida ? 'amarillo' : tonoPaso(e.entrada)
  const columnas = (primera) => [primera, `Llegaron · ${verbo}`, { label: 'Llegaron', num: true }, { label: siguiente ? 'Pasaron' : 'Ganados', num: true }, { label: '% de paso', num: true }]

  return <>
    <Ventana capa={0} etiqueta={`Detalle de la etapa ${e.label}`} ancho="ancha" onCerrar={onClose}>
      <header className="fv2-ventana-cabeza">
        <span className={`fv2-etapa-circulo is-grande is-${tonoCirculo}`}>{etapa}</span>
        <div className="fv2-ventana-titulos">
          <div className="fv2-ventana-sub">Etapa {etapa} de 6 · {contexto}</div>
          <h2>{e.label}</h2>
        </div>
        <button type="button" className="fv2-cerrar" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
      </header>

      <div className="fv2-ventana-cuerpo">
        <div className="fv2-etapa-datos">
          <div className="fv2-etapa-dato">
            <span>Llegaron</span>
            <strong>{formatNumber(e.llegaron)}</strong>
            <small>{anterior ? `de ${formatNumber(anterior.llegaron)} en ${anterior.label}` : 'inicio del embudo'}</small>
          </div>
          <div className="fv2-etapa-dato">
            <span>{siguiente ? `Pasaron a ${siguiente}` : 'Se ganaron'}</span>
            <strong className={`is-${tonoPaso(e.salida)}`}>{e.salida == null ? '—' : formatearRatio(e.salida)}</strong>
            <small>{formatNumber(e.pasaron)} de {formatNumber(e.llegaron)}</small>
          </div>
          <div className="fv2-etapa-dato">
            <span>Están hoy aquí</span>
            <strong>{formatNumber(e.hoy)}</strong>
            {e.hoyVencidos > 0
              ? <small className="is-rojo">{formatNumber(e.hoyVencidos)} con gestión vencida</small>
              : <small>ninguno con gestión vencida</small>}
          </div>
          <div className="fv2-etapa-dato is-mejor">
            <span>Mejor en esta etapa</span>
            {e.mejor
              ? <><strong>{e.mejor.name}</strong><small>{formatearRatio(e.mejor.ratio)} de paso · {formatNumber(e.mejor.llegaron)} leads</small></>
              : <><strong>—</strong><small>Nadie tiene al menos 5 leads en esta etapa</small></>}
          </div>
        </div>

        <div className="fv2-ventana-pestanas" role="tablist">
          {[['mes', 'Por mes'], ['ejecutivo', 'Por ejecutivo'], ['leads', `Leads en esta etapa (${formatNumber(enEtapa.length)})`]].map(([k, l]) =>
            <button type="button" key={k} role="tab" aria-selected={pestana === k} className={pestana === k ? 'is-activa' : ''} onClick={() => setPestana(k)}>{l}</button>)}
        </div>

        {pestana === 'mes' && <>
          <Tabla columnas={columnas('Mes')} vacio={meses.length ? null : 'Sin meses con leads en el período.'}>
            {meses.map((m) => <tr key={m.month}>
              <td className="fv2-fuerte fv2-capital">{monthLabel(m.month, 'long')}</td>
              <td className="fv2-celda-barra"><BarraDoble llegaron={m.llegaron} pasaron={m.pasaron} max={maxMes} tono={tonoPaso(m.ratio)} /></td>
              <td className="num">{formatNumber(m.llegaron)}</td>
              <td className="num">{formatNumber(m.pasaron)}</td>
              <td className="num">{m.ratio == null ? '—' : <span className={`fv2-insignia is-${tonoPaso(m.ratio)}`}>{formatearRatio(m.ratio)}</span>}</td>
            </tr>)}
          </Tabla>
          <p className="fv2-nota">
            Barra clara = llegaron a {e.label} · barra fuerte = {siguiente ? `pasaron a ${siguiente}` : 'se ganaron'}.
            Verde ≥ 75 % · gris 60–74 % · amarillo &lt; 60 % (atención). Los meses salen del Período elegido arriba; para comparar meses amplía el Período.
          </p>
        </>}

        {pestana === 'ejecutivo' && <>
          <Tabla columnas={columnas('Ejecutivo')} vacio={ejecutivos.length ? null : 'Ningún ejecutivo tiene leads en esta etapa.'}>
            {ejecutivos.map((f) => <tr key={f.name} className={f.pocos ? 'fv2-fila-pocos' : ''}>
              <td><span className="fv2-doble"><span className="fv2-fuerte">{f.name}</span><small>{f.country}{f.pocos ? ' · pocos datos' : ''}</small></span></td>
              <td className="fv2-celda-barra"><BarraDoble llegaron={f.llegaron} pasaron={f.pasaron} max={maxEjec} tono={f.pocos ? 'neutro' : tonoPaso(f.ratio)} /></td>
              <td className="num">{formatNumber(f.llegaron)}</td>
              <td className="num">{formatNumber(f.pasaron)}</td>
              <td className="num"><span className={`fv2-insignia is-${f.pocos ? 'neutro' : tonoPaso(f.ratio)}`}>{formatearRatio(f.ratio)}</span></td>
            </tr>)}
          </Tabla>
          <p className="fv2-nota">De mejor a peor % de paso. Con menos de 5 leads en esta etapa van al final como "pocos datos" y no compiten por "Mejor".</p>
        </>}

        {pestana === 'leads' && <Tabla columnas={['Cliente', 'Ejecutivo', 'País', { label: 'Días desde creación', num: true }, 'Próxima gestión']}
          vacio={enEtapa.length ? null : 'No hay leads abiertos en esta etapa hoy.'}>
          {enEtapa.map((lead) => <tr key={lead.id} className="fv2-fila-clic" onClick={() => setLeadSel(lead)} title="Abrir la ficha del lead">
            <td><NombreLead lead={lead} /></td>
            <td>{lead.asesor}</td>
            <td><PaisChip pais={lead.pais} /></td>
            <td className="num">{formatNumber(diasDesdeCreacion(lead) ?? 0)}</td>
            <td><Semaforo lead={lead} fecha={toDate(lead.proximaGestion)} /></td>
          </tr>)}
        </Tabla>}
      </div>
    </Ventana>
    {leadSel && <DetalleLead lead={leadSel} onClose={() => setLeadSel(null)} />}
  </>
}
