// Flujo de ventas v2 · tabla de ejecutivos del Panel (rediseño Parte 2, DECISIONES D26). Dos vistas:
//   · «Atrasos (semáforo SLA)» (primero): junta «Top 5 ejecutivos», las 4 tarjetas SLA y «Prioridad del equipo».
//     Una fila por ejecutivo, ordenada por etapas en rojo. Clic en la fila: sus leads en rojo, sus etapas recién
//     vencidas, sus seguimientos vencidos y el botón «Ver coaching».
//   · «Resultados»: la tabla por asesor de siempre (TablaAsesores), sin quitarle columnas.
// No calcula nada nuevo:
//   - Recibidos, Ganados y Conversión = summarize() de sus leads (las mismas cifras de «Resultados»).
//   - Rojas, amarillas y a tiempo = evaluarSlaEtapa() de sus leads abiertos (igual que «Prioridad del equipo» y la ficha).
//   - Cumple SLA = a tiempo ÷ (a tiempo + amarillas + rojas), igual que resumirSlaEtapas.
//   - Seguimientos vencidos = classifyFollowUps().overdue, igual que «Prioridad del equipo».
import { Fragment, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Eye } from 'lucide-react'
import { classifyFollowUps, formatNumber, formatPercent, isOpen, summarize } from '../utils/analytics.js'
import { evaluarSlaEtapa } from '../utils/sla.js'
import { Insignia } from './comunes.jsx'
import { fichaCoaching, iniciales, pctEntero, resumenPorAsesor, tonoConversionTotal, tonoCumplimientoSla } from './datos.js'
import { VentanaCoaching } from './Ejecutivos.jsx'
import { NumeroClic, Segmentado } from './LeadsPorMes.jsx'
import { EncabezadoSeccion, EtiquetaPais } from './piezas.jsx'
import { TablaLeads } from './Tablas.jsx'
import { TablaAsesores } from './TopEjecutivos.jsx'
import { DetalleLead } from './Ventanas.jsx'

export const ID_TABLA_EJECUTIVOS = 'fv2-panel-seguimiento'
export const VISTAS_EJECUTIVOS = [
  { key: 'atrasos', label: 'Atrasos (semáforo SLA)' },
  { key: 'resultados', label: 'Resultados' },
]
const SIN_EJECUTIVO = 'Sin ejecutivo asignado'
const pct = (a, b) => formatPercent(a, b).replace('%', ' %')
const COLOR_SLA = { verde: '#3f9c85', amarillo: '#e6b93a', rojo: '#ff8a99', neutro: undefined }
const porDias = (a, b) => (evaluarSlaEtapa(b)?.diasEnEtapa ?? -1) - (evaluarSlaEtapa(a)?.diasEnEtapa ?? -1)

/** Una fila por ejecutivo (país + nombre), con los ejecutivos sin leads al final de su orden. */
function filasAtrasos(leads, vendedores) {
  const grupos = new Map()
  const fila = (pais, asesor) => {
    const clave = `${pais}\u0000${asesor}`
    if (!grupos.has(clave)) grupos.set(clave, { clave, pais, asesor, leads: [], rojos: [], amarillos: [], verdes: 0, seguimientos: [] })
    return grupos.get(clave)
  }
  for (const v of vendedores) fila(v.country, v.name)
  for (const lead of leads) {
    const g = fila(lead.pais, lead.asesor || SIN_EJECUTIVO)
    g.leads.push(lead)
    if (!isOpen(lead)) continue
    const estado = evaluarSlaEtapa(lead)?.estado
    if (estado === 'rojo') g.rojos.push(lead)
    else if (estado === 'amarillo') g.amarillos.push(lead)
    else if (estado === 'verde') g.verdes++
  }
  for (const lead of classifyFollowUps(leads).overdue) fila(lead.pais, lead.asesor || SIN_EJECUTIVO).seguimientos.push(lead)

  return [...grupos.values()].map((g) => {
    const medibles = g.verdes + g.amarillos.length + g.rojos.length
    return { ...g, s: summarize(g.leads), cumplimiento: medibles ? g.verdes / medibles : null, rojos: g.rojos.sort(porDias), amarillos: g.amarillos.sort(porDias) }
  }).sort((a, b) => b.rojos.length - a.rojos.length || b.amarillos.length - a.amarillos.length
    || b.seguimientos.length - a.seguimientos.length || a.asesor.localeCompare(b.asesor))
}

/** Título con la conclusión: quién tiene más etapas en rojo. */
function tituloAtrasos(filas) {
  const max = filas[0]?.rojos.length ?? 0
  if (!max) return 'Ningún ejecutivo tiene etapas en rojo'
  const primeros = filas.filter((f) => f.rojos.length === max).map((f) => f.asesor)
  const etapas = `${formatNumber(max)} ${max === 1 ? 'etapa' : 'etapas'} en rojo`
  if (primeros.length === 1) return `${primeros[0]} tiene más etapas en rojo (${etapas})`
  if (primeros.length === 2) return `${primeros[0]} y ${primeros[1]} tienen más etapas en rojo (${etapas} cada uno)`
  return `${formatNumber(primeros.length)} ejecutivos empatan con ${etapas}`
}

function Cifra({ valor, tono }) {
  return valor ? <span className={`fv2n-cifra is-${tono}`}>{formatNumber(valor)}</span> : <span className="fv2-tenue">0</span>
}

function Desplegable({ titulo, children }) {
  return <details className="fv2n-desplegable"><summary>{titulo}</summary>{children}</details>
}

function DetalleFila({ fila, ficha, onLead, onCoaching }) {
  return <div className="fv2n-ejec-detalle">
    {fila.rojos.length
      ? <>
        <h4>Etapas en rojo · {formatNumber(fila.rojos.length)} <small>más de 2 días hábiles de atraso, primero las más atrasadas</small></h4>
        <TablaLeads className="fv2-tabla-ventana" leads={fila.rojos} columnas={['lead', 'etapa', 'diasEtapa', 'slaEtapa', 'detalle']} onLead={onLead} />
      </>
      : <p className="fv2n-ejec-vacio">{fila.leads.some(isOpen) ? `${formatNumber(fila.leads.filter(isOpen).length)} leads abiertos · sin etapas rojas.` : 'Sin leads abiertos en los filtros actuales.'}</p>}
    {fila.amarillos.length > 0 && <Desplegable titulo={`${fila.amarillos.length === 1 ? 'Ver 1 etapa recién vencida' : `Ver las ${formatNumber(fila.amarillos.length)} etapas recién vencidas`} (hasta 2 días hábiles de atraso)`}>
      <TablaLeads className="fv2-tabla-ventana" leads={fila.amarillos} columnas={['lead', 'etapa', 'diasEtapa', 'slaEtapa', 'detalle']} onLead={onLead} />
    </Desplegable>}
    {fila.seguimientos.length > 0 && <Desplegable titulo={fila.seguimientos.length === 1 ? 'Ver 1 seguimiento vencido' : `Ver los ${formatNumber(fila.seguimientos.length)} seguimientos vencidos`}>
      <TablaLeads className="fv2-tabla-ventana" leads={fila.seguimientos} columnas={['lead', 'etapa', 'fecha', 'comentario', 'detalle']} onLead={onLead} />
    </Desplegable>}
    {ficha && <button type="button" className="fv2n-boton" onClick={onCoaching}><Eye size={14} aria-hidden="true" /> Ver coaching de {fila.asesor.split(' ')[0]}<ChevronRight size={14} aria-hidden="true" /></button>}
  </div>
}

function VistaAtrasos({ filas, fichas, onDato, onLead, onCoaching }) {
  const [abierta, setAbierta] = useState(null)
  const columnas = ['Ejecutivo', 'Recibidos', 'Ganados', 'Conversión', 'Rojas', 'Amarillas', 'A tiempo', 'Cumple SLA', 'Seg. vencidos', '']
  const numericas = new Set(['Recibidos', 'Ganados', 'Conversión', 'Rojas', 'Amarillas', 'A tiempo', 'Cumple SLA', 'Seg. vencidos'])
  return <div className="fv2-tabla-caja fv2n-ejec">
    <table className="fv2-tabla">
      <thead><tr>{columnas.map((c) => <th key={c} className={numericas.has(c) ? 'num' : ''}>{c}</th>)}</tr></thead>
      <tbody>
        {filas.map((f) => {
          const abiertaEsta = abierta === f.clave
          const ficha = fichas.find((x) => x.name === f.asesor)
          const dato = (clave, titulo) => (e) => { e.stopPropagation(); onDato(clave, f.leads, `${titulo} · ${f.asesor}`) }
          const alternar = () => setAbierta(abiertaEsta ? null : f.clave)
          return <Fragment key={f.clave}>
            <tr className={`fv2n-ejec-fila ${abiertaEsta ? 'is-abierta' : ''} ${f.rojos.length ? 'is-rojo' : ''}`} onClick={alternar}>
              <td>
                <button type="button" className="fv2n-ejec-nombre" aria-expanded={abiertaEsta} onClick={(e) => { e.stopPropagation(); alternar() }}>
                  <span className="fv2n-avatar" aria-hidden="true">{iniciales(f.asesor)}</span>
                  <span>{f.asesor}</span>
                  <EtiquetaPais pais={f.pais} />
                </button>
              </td>
              <td className="num"><NumeroClic valor={formatNumber(f.s.total)} title={`${formatNumber(f.s.total)} leads de ${f.asesor}`} onClick={dato('total', 'Total leads')} /></td>
              <td className="num"><NumeroClic valor={formatNumber(f.s.won)} title={`${formatNumber(f.s.won)} ganados de ${f.asesor}`} onClick={dato('ganados', 'Ganados')} color="#3f9c85" /></td>
              <td className="num"><button type="button" className="fv2-res-num" onClick={dato('conversionTotal', 'Conversión')} title={`${formatNumber(f.s.won)} ganados ÷ ${formatNumber(f.s.total)} leads`}>
                <Insignia tono={tonoConversionTotal(f.s.conversion)}>{pct(f.s.won, f.s.total)}</Insignia></button></td>
              <td className="num"><Cifra valor={f.rojos.length} tono="rojo" /></td>
              <td className="num"><Cifra valor={f.amarillos.length} tono="amarillo" /></td>
              <td className="num"><Cifra valor={f.verdes} tono="verde" /></td>
              <td className="num">{f.cumplimiento == null ? <span className="fv2-tenue">—</span>
                : <b className="fv2n-mono" style={{ color: COLOR_SLA[tonoCumplimientoSla(f.cumplimiento)] }}>{pctEntero(f.cumplimiento)}%</b>}</td>
              <td className="num">{f.seguimientos.length ? <span className="fv2n-cifra is-rojo">{formatNumber(f.seguimientos.length)}</span> : <span className="fv2-tenue">0</span>}</td>
              <td className="fv2n-ejec-flecha" aria-hidden="true">{abiertaEsta ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</td>
            </tr>
            {abiertaEsta && <tr className="fv2n-ejec-abierta"><td colSpan={columnas.length}>
              <DetalleFila fila={f} ficha={ficha} onLead={onLead} onCoaching={() => onCoaching(ficha)} />
            </td></tr>}
          </Fragment>
        })}
        {!filas.length && <tr><td colSpan={columnas.length} className="fv2-tabla-vacia">No hay ejecutivos para la selección actual.</td></tr>}
      </tbody>
    </table>
  </div>
}

/**
 * @param vista / onVista  vista elegida ('atrasos' | 'resultados'); vive en VistaGeneral para que
 *                         «Ver equipo» de «Qué atender hoy» pueda abrir «Atrasos».
 * @param onAsesor         (name, country) → ventana del ejecutivo (clic en el nombre en «Resultados»)
 */
export function TablaEjecutivos({ leads, leadsEquipo, baseEjecutivos, horizonte, calificado, vista, onVista, onDato, onAsesor }) {
  const [leadSel, setLeadSel] = useState(null)
  const [coachingSel, setCoachingSel] = useState(null) // ficha
  const coaching = useMemo(() => fichaCoaching(leads, leadsEquipo ?? leads, baseEjecutivos ?? []), [leads, leadsEquipo, baseEjecutivos])
  const filas = useMemo(() => filasAtrasos(leads, [...coaching.fichas, ...coaching.sinLeads]), [leads, coaching])
  const grupos = useMemo(() => (vista === 'resultados' ? resumenPorAsesor(leads) : []), [leads, vista])
  const totalRojas = filas.reduce((suma, f) => suma + f.rojos.length, 0)
  const conRojas = filas.filter((f) => f.rojos.length).length

  return <section className="fv2-panel fv2n-bloque" id={ID_TABLA_EJECUTIVOS}>
    <EncabezadoSeccion
      titulo={vista === 'atrasos' ? tituloAtrasos(filas) : 'Resultados por asesor'}
      explicacion={vista === 'atrasos'
        ? `Un renglón por ejecutivo, ordenado por etapas en rojo (${formatNumber(totalRojas)} en ${formatNumber(conRojas)} ${conRojas === 1 ? 'ejecutivo' : 'ejecutivos'}). Clic en un renglón para ver sus leads atrasados y su coaching.`
        : 'Agrupado por país, como el resumen por asesor del dashboard de leads. Clic en un asesor abre su detalle; clic en un número, sus leads.'}>
      <Segmentado opciones={VISTAS_EJECUTIVOS} valor={vista} onCambiar={onVista} etiqueta="Vista de la tabla de ejecutivos" />
    </EncabezadoSeccion>

    {vista === 'atrasos' && <VistaAtrasos filas={filas} fichas={coaching.fichas} onDato={onDato} onLead={setLeadSel} onCoaching={setCoachingSel} />}
    {vista === 'resultados' && <div className="fv2n-resultados"><TablaAsesores grupos={grupos} calificado={calificado} onAsesor={onAsesor} onDato={onDato} /></div>}

    {coaching.sinLeads.length > 0 && <p className="fv2-coach-sin-leads">
      <strong>Sin leads en este período:</strong> {coaching.sinLeads.map((e) => `${e.name} (${e.country})`).join(' · ')}
    </p>}

    {coachingSel && <VentanaCoaching ficha={coachingSel} horizonte={horizonte} leadsDetalle={leads}
      equipo={{ ratio: coaching.equipo.conversion.ratio, embudo: coaching.equipo.embudo }} onClose={() => setCoachingSel(null)} />}
    {leadSel && <DetalleLead lead={leadSel} onClose={() => setLeadSel(null)} />}
  </section>
}
