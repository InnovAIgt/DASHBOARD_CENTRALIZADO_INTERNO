// Flujo de ventas v2 · vista general: indicadores, gráficas y tablas.
import { useMemo, useState } from 'react'
import { formatNumber, formatPercent } from '../utils/analytics.js'
import { COLORES, formatearRatio, Vacio } from './comunes.jsx'
import { datosVistaGeneral } from './datos.js'
import { ComparativaPaises, EmbudoMes, Leyenda, TendenciaMensual, TopEjecutivos } from './graficas.jsx'
import { ResumenAsesores, ResumenMensual } from './Tablas.jsx'
import { DetalleAsesor, DetalleMes } from './Ventanas.jsx'

const SERIES = [
  { key: 'total', label: 'Leads', color: COLORES.azul },
  { key: 'won', label: 'Ganados', color: COLORES.verde },
  { key: 'units', label: 'Unidades', color: COLORES.amarillo, punteada: true },
]

function Panel({ titulo, subtitulo, accion, className = '', children }) {
  return <section className={`fv2-panel ${className}`}>
    <header className="fv2-panel-cabeza">
      <div>
        <div className="fv2-panel-titulo">{titulo}</div>
        {subtitulo && <div className="fv2-panel-sub">{subtitulo}</div>}
      </div>
      {accion}
    </header>
    {children}
  </section>
}

function Indicador({ etiqueta, valor, nota, color }) {
  return <article className="fv2-kpi">
    <div>
      <div className="fv2-kpi-etiqueta">{etiqueta}</div>
      <div className="fv2-kpi-numero" style={color ? { color } : undefined}>{valor}</div>
    </div>
    <div className="fv2-kpi-nota">{nota}</div>
  </article>
}

/** 6 indicadores. Todas las cifras salen de summarize() de la lógica copiada. */
function Indicadores({ summary }) {
  return <section className="fv2-kpis">
    <Indicador etiqueta="Total leads" valor={formatNumber(summary.total)} nota={`${formatNumber(summary.open)} abiertos`} />
    <Indicador etiqueta="Calificados" valor={formatNumber(summary.qualified)} color={COLORES.azul} nota={`${formatNumber(summary.unqualified)} no calificados`} />
    <Indicador etiqueta="Ganados" valor={formatNumber(summary.won)} color={COLORES.verde} nota={`Conversión general ${formatPercent(summary.won, summary.total)} (ganados ÷ total)`} />
    <Indicador etiqueta="Conversión de calificados" valor={formatearRatio(summary.qualifiedConversion)} color={COLORES.amarillo} nota="Ganados ÷ calificados" />
    <Indicador etiqueta="Unidades vendidas" valor={formatNumber(summary.units)} nota="Suma de unidades en leads ganados" />
    <Indicador
      etiqueta="Unidades por cierre"
      valor={summary.won ? formatNumber(Math.round(summary.avgUnits)) : '—'}
      nota={summary.won ? `${formatNumber(summary.units)} unidades ÷ ${formatNumber(summary.won)} ganados` : 'Sin ganados en la selección'}
    />
  </section>
}

export function VistaGeneral({ leads, summary, showAllFunnel }) {
  const [asesorSel, setAsesorSel] = useState(null)
  const [mesSel, setMesSel] = useState(null)
  const datos = useMemo(() => datosVistaGeneral(leads, showAllFunnel), [leads, showAllFunnel])
  const abrirAsesor = (name, country) => setAsesorSel({ name, country, leads, month: null })

  return <div className="fv2-vista">
    <Indicadores summary={summary} />

    <div className="fv2-fila-graficas">
      <Panel titulo="Leads, ganados y unidades por mes" subtitulo="Pasa el cursor sobre un mes para ver el detalle. Los ganados se ubican por fecha de cierre; el resto, por fecha de creación." accion={<Leyenda items={SERIES} />}>
        {datos.months.length ? <TendenciaMensual filas={datos.months} series={SERIES} /> : <Vacio titulo="Sin meses con datos" texto="Ajusta los filtros para ver la evolución mensual." />}
      </Panel>
      <Panel titulo="Guatemala vs. El Salvador" subtitulo="Leads, calificados, ganados y unidades por país">
        <ComparativaPaises paises={datos.countries} />
      </Panel>
    </div>

    <Panel titulo="Top 10 ejecutivos por ganados" subtitulo="Ganados / total de leads de cada ejecutivo. Haz clic en un nombre para ver su detalle." accion={<Leyenda items={[{ label: 'Total leads', color: COLORES.azul }, { label: 'Ganados', color: COLORES.verde }]} />}>
      {datos.topGanados.length
        ? <TopEjecutivos filas={datos.topGanados} onSeleccionar={(name) => abrirAsesor(name, datos.advisors.find((row) => row.name === name)?.country)} />
        : <Vacio titulo="Sin datos" />}
    </Panel>

    <Panel titulo="Embudo por mes" subtitulo={showAllFunnel ? 'Leads → calificados → ganados en cada mes, más el total general.' : 'Solo los meses con leads según los filtros activos.'}>
      {datos.months.length
        ? <div className="fv2-embudos">{datos.monthlyFunnelGroups.map((grupo) => <EmbudoMes key={grupo.key} grupo={grupo} />)}</div>
        : <Vacio titulo="Sin meses con datos" texto="Ajusta los filtros para ver el embudo mensual." />}
    </Panel>

    <Panel titulo="Resultados por ejecutivo" subtitulo="Agrupados por país. Haz clic en un ejecutivo para ver sus leads, etapas y pronóstico.">
      <ResumenAsesores grupos={datos.advisorsByCountry} onAsesor={abrirAsesor} />
    </Panel>

    {datos.monthlyCountryTables.map((grupo) => <Panel
      key={grupo.country}
      titulo={`Resultados mensuales · ${grupo.country}`}
      subtitulo={`${grupo.months.length} meses · ${formatNumber(grupo.summary.total)} leads · ${formatNumber(grupo.summary.won)} ganados. Haz clic en un mes para ver su detalle.`}
    >
      <ResumenMensual grupo={grupo} onMes={(country, fila) => setMesSel({ country, month: fila.month, leads: fila.leads })} />
    </Panel>)}

    {asesorSel && <DetalleAsesor {...asesorSel} onClose={() => setAsesorSel(null)} />}
    {mesSel && <DetalleMes {...mesSel} onClose={() => setMesSel(null)} />}
  </div>
}
