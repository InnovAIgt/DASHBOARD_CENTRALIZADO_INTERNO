// Panel comercial unificado: análisis general y mensual antes del seguimiento SLA/coaching.
// Filtro "Calificado" (el de siempre): una sola conversión y sin lo de no calificados. Con "Todos":
// Conversión (ganados ÷ total) + Conversión de calificados (D10) como dato extra.
// Todo número abre su detalle con las ventanas que ya existían (DetalleLeads, DetalleMes,
// DetalleEtapa y DetalleAsesor).
import { useMemo, useState } from 'react'
import { formatNumber } from '../utils/analytics.js'
import { Ejecutivos } from './Ejecutivos.jsx'
import { COLORES, formatearRatio } from './comunes.jsx'
import { fichaCoaching, INDICADORES, resumenLeads, soloCalificados, tonoConversion, tonoConversionTotal } from './datos.js'
import { COLOR_TONO, ComparativaRegional, TarjetasPais } from './graficas.jsx'
import { LeadsPorMes } from './LeadsPorMes.jsx'
import { TopEjecutivos } from './TopEjecutivos.jsx'
import { DetalleAsesor, DetalleLeads, DetalleMes } from './Ventanas.jsx'

function Dato({ icono, etiqueta, valor, nota, color, title, onAbrir }) {
  return <button type="button" className="fv2-res-franja-dato" onClick={onAbrir} title={title} aria-label={`Ver el detalle de ${etiqueta.toLowerCase()}`}>
    <span className="fv2-res-franja-icono" aria-hidden="true">{icono}</span>
    <b style={color ? { color } : undefined}>{valor}</b>
    <span className="fv2-res-franja-texto"><strong>{etiqueta}</strong><small>{nota}</small></span>
  </button>
}

/**
 * Franja de una sola línea con los 5 indicadores del dashboard de leads (KpiGrid): Total leads,
 * Ganados (allá "Radicados"), Unidades vendidas, Unidades promedio por cierre y Conversión.
 * Con "Todos" se agrega la Conversión de calificados (D10).
 */
function FranjaIndicadores({ resumen, calificado, onAbrir }) {
  const s = resumen.general
  const c = resumen.calificados
  return <section className="fv2-res-franja" aria-label="Indicadores generales">
    <Dato icono="👥" etiqueta="Total leads" valor={formatNumber(s.total)} color={COLORES.azulClaro}
      nota={calificado ? 'Solo calificados (filtro)' : `${formatNumber(s.qualified)} calificados · ${formatNumber(s.unqualified)} no calificados`}
      title={`${formatNumber(s.total)} leads con los filtros activos`} onAbrir={() => onAbrir('total')} />
    <Dato icono="✅" etiqueta="Ganados" valor={formatNumber(s.won)} color={COLORES.verdeClaro} nota={'= "Radicados" en el dashboard de leads'}
      title={`${formatNumber(s.won)} ganados (${formatNumber(s.open)} leads aún abiertos)`} onAbrir={() => onAbrir('ganados')} />
    <Dato icono="📦" etiqueta="Unidades vendidas" valor={formatNumber(s.units)} color="#e0b52e" nota="En leads ganados"
      title={`Σ unidades en leads ganados: ${formatNumber(s.units)}`} onAbrir={() => onAbrir('unidades')} />
    <Dato icono="🧮" etiqueta="Unid. promedio por cierre" valor={s.won ? formatNumber(Math.round(s.avgUnits)) : '—'}
      nota={s.won ? `${formatNumber(s.units)} unidades ÷ ${formatNumber(s.won)} ganados` : 'Sin cierres con éxito'}
      title={s.won ? `${formatNumber(s.units)} ÷ ${formatNumber(s.won)} = ${(s.avgUnits).toFixed(2)}` : 'Sin ganados'} onAbrir={() => onAbrir('porCierre')} />
    <Dato icono="📈" etiqueta="Conversión" valor={formatearRatio(s.conversion)} color={COLOR_TONO[tonoConversionTotal(s.conversion)]}
      nota={`${formatNumber(s.won)} ganados ÷ ${formatNumber(s.total)} leads`}
      title={`Ganados ÷ total de leads = ${formatNumber(s.won)} ÷ ${formatNumber(s.total)}`} onAbrir={() => onAbrir('conversionTotal')} />
    {!calificado && <Dato icono="🎯" etiqueta="Conversión de calificados" valor={formatearRatio(c.ratio)} color={COLOR_TONO[tonoConversion(c.ratio)]}
      nota={`${formatNumber(c.ganadosCalificados)} ganados calificados ÷ ${formatNumber(c.calificados)} calificados`}
      title="Dato extra (D10): ganados que eran calificados ÷ calificados" onAbrir={() => onAbrir('conversion')} />}
  </section>
}

export function VistaGeneral({ leads, filters, paisFiltro, leadsEquipo, baseEjecutivos, horizonte }) {
  const [mesSel, setMesSel] = useState(null)
  const [indicadorSel, setIndicadorSel] = useState(null) // { clave, leads, titulo? }
  const [asesorSel, setAsesorSel] = useState(null)
  const calificado = soloCalificados(filters)
  const resumen = useMemo(() => resumenLeads(leads), [leads])
  // Ventana del ejecutivo: mismos datos que abre la pestaña Ejecutivos (ranking y equipo, D17).
  const coaching = useMemo(() => (asesorSel ? fichaCoaching(leads, leadsEquipo ?? leads, baseEjecutivos ?? []) : null), [asesorSel, leads, leadsEquipo, baseEjecutivos])
  const abrirDato = (clave, lista, titulo) => setIndicadorSel({ clave, leads: lista, titulo })
  // Detalle del mes: de la gráfica o el embudo, con el país del filtro; de la tabla, con su país.
  const abrirMes = ({ month, country, leads: delMes }) => setMesSel({ month, country: country ?? paisFiltro, leads: delMes })

  return <div className="fv2-vista">
    <FranjaIndicadores resumen={resumen} calificado={calificado} onAbrir={(clave) => abrirDato(clave, leads)} />

    <LeadsPorMes leads={leads} calificado={calificado} onDato={abrirDato} onMes={abrirMes} />

    <ComparativaRegional paises={resumen.paises} calificado={calificado} paisFiltro={paisFiltro} onAbrir={(clave, pais) => abrirDato(
      clave, leads.filter((lead) => lead.pais === pais), `${INDICADORES[clave].titulo} · ${pais}`,
    )} />

    <TarjetasPais paises={resumen.paises} calificado={calificado} tono={tonoConversionTotal} onAbrir={(clave, pais) => abrirDato(
      clave, leads.filter((lead) => lead.pais === pais), `${INDICADORES[clave].titulo} · ${pais}`,
    )} />

    <TopEjecutivos leads={leads} calificado={calificado} onDato={abrirDato}
      onIrEjecutivos={() => document.getElementById('fv2-panel-seguimiento')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
      onAsesor={(name, country) => setAsesorSel({ name, country })} />

    <Ejecutivos leads={leads} leadsEquipo={leadsEquipo} baseEjecutivos={baseEjecutivos} horizonte={horizonte} />

    {indicadorSel && <DetalleLeads {...indicadorSel} onClose={() => setIndicadorSel(null)} />}
    {mesSel && <DetalleMes {...mesSel} onClose={() => setMesSel(null)} />}
    {asesorSel && coaching && <DetalleAsesor name={asesorSel.name} country={asesorSel.country} leads={leads} month={null}
      ranking={coaching.fichas.find((f) => f.name === asesorSel.name)?.ranking}
      equipo={{ ratio: coaching.equipo.conversion.ratio, embudo: coaching.equipo.embudo }}
      onClose={() => setAsesorSel(null)} />}
  </div>
}
