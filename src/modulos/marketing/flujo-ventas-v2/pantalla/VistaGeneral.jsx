// Panel comercial unificado (rediseño 2026-11, D25 y D26). Orden de arriba hacia abajo:
//   1. 6 números · 2. Qué atender hoy · 3. Recorrido de las 6 etapas · 4. Tabla de ejecutivos (Atrasos / Resultados;
//   junta Top 5, tarjetas SLA, Prioridad del equipo y coaching) · 5. Leads y unidades por mes · 6. Embudo por mes
//   (D27). La comparativa regional y las tarjetas por país se quitaron, y «¿Por qué se pierden?» pasó a la pestaña Forecast (D27).
// No hay cálculos nuevos: todos los números salen de funciones que ya existían (summarize/byCountry en
// resumenLeads, resumirSlaEtapas, buildForecast, embudoEtapas/recorridoLeads). Con filtro "Calificado":
// una sola conversión; con "Todos": además la Conversión de calificados (D10) como línea pequeña.
// Todo número abre su detalle con las ventanas que ya existían.
import { useMemo, useState } from 'react'
import { buildForecast, formatNumber } from '../utils/analytics.js'
import { resumirSlaEtapas } from '../utils/sla.js'
import { COLORES, formatearRatio } from './comunes.jsx'
import { embudoEtapas, fichaCoaching, pctEntero, recorridoLeads, resumenLeads, soloCalificados, tonoConversionTotal, tonoCumplimientoSla } from './datos.js'
import { COLOR_TONO } from './graficas.jsx'
import { LeadsPorMes } from './LeadsPorMes.jsx'
import { EncabezadoSeccion, FilaNumeros, TarjetaAccion, TarjetaNumero } from './piezas.jsx'
import { RecorridoLeads } from './RecorridoLeads.jsx'
import { ID_TABLA_EJECUTIVOS, TablaEjecutivos } from './TablaEjecutivos.jsx'
import { DetalleAsesor, DetalleEtapa, DetalleLeads, DetalleMes } from './Ventanas.jsx'

const irATabla = () => document.getElementById(ID_TABLA_EJECUTIVOS)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
// Color del «Cumplimiento SLA» según tonoCumplimientoSla (límites en datos.js, D25). El rojo es el tono de texto del boceto.
const COLOR_SLA = { verde: COLORES.verdeClaro, amarillo: '#e6b93a', rojo: '#ff8a99', neutro: undefined }
const plural = (n, uno, varios) => `${formatNumber(n)} ${n === 1 ? uno : varios}`

/** 1 · Los 6 números de arriba, con su desglose GT · SV cuando hay leads de los dos países. */
function NumerosPrincipales({ leads, resumen, sla, calificado, onAbrir }) {
  const s = resumen.general
  const c = resumen.calificados
  const paises = resumen.paises
  const conDesglose = paises.length > 1
  const desglose = (valor) => (conDesglose ? paises.map((p) => ({ pais: p.country, valor: valor(p) })) : null)
  const slaPais = useMemo(() => (conDesglose ? paises.map((p) => ({ pais: p.country, sla: resumirSlaEtapas(leads.filter((l) => l.pais === p.country)) })) : []), [conDesglose, paises, leads])
  const medibles = sla.verdes + sla.amarillos + sla.rojos
  const pctSla = (r) => (r == null ? '—' : `${pctEntero(r)}%`)

  return <FilaNumeros etiqueta="Números principales">
    <TarjetaNumero etiqueta={calificado ? 'Leads calificados' : 'Total leads'} valor={formatNumber(s.total)} color={COLORES.azulClaro}
      desglose={desglose((p) => formatNumber(p.total))}
      nota={calificado ? null : `${formatNumber(s.qualified)} calificados · ${formatNumber(s.unqualified)} no calificados`}
      title={`${formatNumber(s.total)} leads con los filtros activos`} onAbrir={() => onAbrir('total')} />
    <TarjetaNumero etiqueta="Ganados" valor={formatNumber(s.won)} color={COLORES.verdeClaro}
      desglose={desglose((p) => formatNumber(p.won))}
      title={`${formatNumber(s.won)} ganados (= "Radicados") · ${formatNumber(s.open)} leads aún abiertos`} onAbrir={() => onAbrir('ganados')} />
    <TarjetaNumero etiqueta="Conversión" valor={formatearRatio(s.conversion)} color={COLOR_TONO[tonoConversionTotal(s.conversion)]}
      nota={`${formatNumber(s.won)} ganados de ${formatNumber(s.total)} leads`}
      extra={calificado ? null : {
        texto: `Conversión de calificados: ${formatearRatio(c.ratio)} (${formatNumber(c.ganadosCalificados)} de ${formatNumber(c.calificados)})`,
        title: 'Ganados que eran calificados ÷ calificados (D10)',
        onAbrir: () => onAbrir('conversion'),
      }}
      title={`Ganados ÷ total de leads = ${formatNumber(s.won)} ÷ ${formatNumber(s.total)}`} onAbrir={() => onAbrir('conversionTotal')} />
    <TarjetaNumero etiqueta="Unidades vendidas" valor={formatNumber(s.units)} color="#e0b52e"
      desglose={desglose((p) => formatNumber(p.units))}
      title={`Unidades en leads ganados: ${formatNumber(s.units)}`} onAbrir={() => onAbrir('unidades')} />
    <TarjetaNumero etiqueta="Unidades por cierre" valor={s.won ? formatNumber(Math.round(s.avgUnits)) : '—'}
      desglose={desglose((p) => (p.won ? formatNumber(Math.round(p.avgUnits)) : '—'))}
      nota={s.won ? 'promedio por venta ganada' : 'Sin cierres con éxito'}
      title={s.won ? `${formatNumber(s.units)} unidades ÷ ${formatNumber(s.won)} ganados = ${s.avgUnits.toFixed(2)}` : 'Sin ganados'} onAbrir={() => onAbrir('porCierre')} />
    <TarjetaNumero etiqueta="Cumplimiento SLA" valor={pctSla(sla.cumplimiento)} color={COLOR_SLA[tonoCumplimientoSla(sla.cumplimiento)]}
      desglose={slaPais.length ? slaPais.map((p) => ({ pais: p.pais, valor: pctSla(p.sla.cumplimiento) })) : null}
      nota={medibles ? `${formatNumber(sla.verdes)} de ${plural(medibles, 'etapa', 'etapas')} a tiempo` : 'Sin etapas abiertas con fecha'}
      title="Etapas abiertas dentro del plazo de 2 días hábiles ÷ etapas abiertas con fecha" onAbrir={() => onAbrir('slaMedible')} />
  </FilaNumeros>
}

/** 2 · Qué atender hoy: lo urgente primero (rojo), luego lo recién vencido (amarillo) y lo que se puede cerrar (verde). */
function QueAtenderHoy({ sla, forecast, horizonte, onIrForecast, irAlEquipo }) {
  const rojos = sla.porEtapa.flatMap((etapa) => etapa.registros).filter(({ sla: s }) => s.estado === 'rojo')
  const ejecutivosRojo = new Set(rojos.map(({ lead }) => `${lead.pais}\u0000${lead.asesor || 'Sin ejecutivo asignado'}`)).size
  return <section className="fv2n-bloque" aria-label="Qué atender hoy">
    <EncabezadoSeccion titulo="Qué atender hoy" explicacion="Lo que necesita acción, de lo más urgente a lo menos." />
    <div className="fv2n-acciones">
      <TarjetaAccion tono="rojo" numero={formatNumber(sla.rojos)} boton="Ver equipo" onIr={irAlEquipo}>
        {sla.rojos === 1 ? 'etapa' : 'etapas'} con <b>más de 2 días hábiles</b> de atraso{sla.rojos ? `, en ${plural(ejecutivosRojo, 'ejecutivo', 'ejecutivos')}` : ''}.
      </TarjetaAccion>
      <TarjetaAccion tono="amarillo" numero={formatNumber(sla.amarillos)} boton="Ver cuáles" onIr={irAlEquipo}>
        {sla.amarillos === 1 ? 'etapa recién vencida' : 'etapas recién vencidas'} (hasta 2 días hábiles de atraso). Se arreglan rápido.
      </TarjetaAccion>
      <TarjetaAccion tono="verde" numero={formatNumber(forecast.items.length)} boton="Ver forecast" onIr={onIrForecast}>
        {forecast.items.length === 1 ? 'oportunidad' : 'oportunidades'} con señal de cierre en los próximos {horizonte} días · <b>{plural(forecast.units, 'unidad', 'unidades')}</b>.
      </TarjetaAccion>
    </div>
  </section>
}

/** Título del recorrido con la conclusión: el tramo con menor % de paso (el mismo que se marca en amarillo). */
function tituloRecorrido(recorrido) {
  const t = recorrido.frenado
  if (!t) return 'Recorrido de los leads por etapa'
  const etapa = (k) => recorrido.etapas[k - 1].label
  return `Los leads se frenan más al pasar de ${etapa(t.desde)} a ${etapa(t.hasta)} (pasa el ${pctEntero(t.ratio)} %)`
}

export function VistaGeneral({ leads, filters, paisFiltro, leadsEquipo, baseEjecutivos, horizonte, onIrForecast }) {
  const [mesSel, setMesSel] = useState(null)
  const [indicadorSel, setIndicadorSel] = useState(null) // { clave, leads, titulo? }
  const [asesorSel, setAsesorSel] = useState(null)
  const [etapaSel, setEtapaSel] = useState(null)
  const [vistaEjecutivos, setVistaEjecutivos] = useState('atrasos')
  // «Ver equipo» / «Ver cuáles»: abre la vista Atrasos de la tabla de ejecutivos y baja hasta ella.
  const irAlEquipo = () => { setVistaEjecutivos('atrasos'); setTimeout(irATabla, 0) }
  const calificado = soloCalificados(filters)
  const resumen = useMemo(() => resumenLeads(leads), [leads])
  const embudo = useMemo(() => embudoEtapas(leads), [leads])
  const recorrido = useMemo(() => recorridoLeads(embudo), [embudo])
  // La ventana de la etapa marca como «mayor caída» la misma etapa que el recorrido (antes en Ejecutivos.jsx).
  const embudoVentana = useMemo(() => ({ ...embudo, mayorCaida: recorrido.frenado?.hasta ?? null }), [embudo, recorrido])
  const sla = embudo.sla // = resumirSlaEtapas(leads)
  const forecast = useMemo(() => buildForecast(leads, horizonte), [leads, horizonte])
  // Ventana del ejecutivo: mismos datos que abre la pestaña Ejecutivos (ranking y equipo, D17).
  const coaching = useMemo(() => (asesorSel ? fichaCoaching(leads, leadsEquipo ?? leads, baseEjecutivos ?? []) : null), [asesorSel, leads, leadsEquipo, baseEjecutivos])
  const abrirDato = (clave, lista, titulo) => setIndicadorSel({ clave, leads: lista, titulo })
  // Detalle del mes: de la gráfica o el embudo, con el país del filtro; de la tabla, con su país.
  const abrirMes = ({ month, country, leads: delMes }) => setMesSel({ month, country: country ?? paisFiltro, leads: delMes })

  return <div className="fv2-vista">
    <NumerosPrincipales leads={leads} resumen={resumen} sla={sla} calificado={calificado} onAbrir={(clave) => abrirDato(clave, leads)} />

    <QueAtenderHoy sla={sla} forecast={forecast} horizonte={horizonte} onIrForecast={onIrForecast} irAlEquipo={irAlEquipo} />

    <section className="fv2-panel fv2n-bloque fv2n-recorrido">
      <EncabezadoSeccion titulo={tituloRecorrido(recorrido)}
        explicacion="Recorrido de las 6 etapas: cuántos leads llegaron, el promedio de días, el semáforo de 2 días hábiles y el % que pasa a la siguiente. Clic en una etapa para ver sus leads." />
      <RecorridoLeads recorrido={recorrido} mostrarResumenSla={false} marcarFrenado onClickEtapa={setEtapaSel} />
    </section>

    <TablaEjecutivos leads={leads} leadsEquipo={leadsEquipo} baseEjecutivos={baseEjecutivos} horizonte={horizonte} calificado={calificado}
      vista={vistaEjecutivos} onVista={setVistaEjecutivos} onDato={abrirDato}
      onAsesor={(name, country) => setAsesorSel({ name, country })} />

    <LeadsPorMes leads={leads} calificado={calificado} onDato={abrirDato} onMes={abrirMes} />


    {indicadorSel && <DetalleLeads {...indicadorSel} onClose={() => setIndicadorSel(null)} />}
    {mesSel && <DetalleMes {...mesSel} onClose={() => setMesSel(null)} />}
    {etapaSel && <DetalleEtapa etapa={etapaSel} leads={leads} embudo={embudoVentana} contexto="filtros activos" onClose={() => setEtapaSel(null)} />}
    {asesorSel && coaching && <DetalleAsesor name={asesorSel.name} country={asesorSel.country} leads={leads} month={null}
      ranking={coaching.fichas.find((f) => f.name === asesorSel.name)?.ranking}
      equipo={{ ratio: coaching.equipo.conversion.ratio, embudo: coaching.equipo.embudo }}
      onClose={() => setAsesorSel(null)} />}
  </div>
}
