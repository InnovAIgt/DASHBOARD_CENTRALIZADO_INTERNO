// Flujo de ventas v2 · vista general: tarjetas por país, indicadores, gráficas y tablas.
import { useMemo, useState } from 'react'
import { formatNumber, formatPercent } from '../utils/analytics.js'
import { COLORES, formatearRatio, Vacio } from './comunes.jsx'
import { conversionCalificados, datosVistaGeneral } from './datos.js'
import { DesempenoEjecutivos, EmbudoMes, GraficaMensual, LEYENDA_EJECUTIVOS, Leyenda, SERIES_MES, TarjetasPais } from './graficas.jsx'
import { ResumenAsesores, ResumenMensual } from './Tablas.jsx'
import { DetalleAsesor, DetalleLeads, DetalleMes } from './Ventanas.jsx'

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

function Indicador({ etiqueta, valor, nota, color, onAbrir }) {
  return <button type="button" className="fv2-kpi" onClick={onAbrir} title={`Ver el detalle de ${etiqueta.toLowerCase()}`}>
    <span className="fv2-kpi-etiqueta">{etiqueta}</span>
    <span className="fv2-kpi-numero" style={color ? { color } : undefined}>{valor}</span>
    <span className="fv2-kpi-nota">{nota}</span>
  </button>
}

/**
 * 6 indicadores. Las cifras salen de summarize() de la lógica copiada, salvo la conversión de
 * calificados y el desglose de ganados, que salen de conversionCalificados() (corregida, D10).
 */
function Indicadores({ summary, conversion, onAbrir }) {
  return <section className="fv2-kpis">
    <Indicador etiqueta="Total leads" valor={formatNumber(summary.total)} nota={`${formatNumber(summary.open)} abiertos`} onAbrir={() => onAbrir('total')} />
    <Indicador etiqueta="Calificados" valor={formatNumber(summary.qualified)} color={COLORES.azul} nota={`${formatNumber(summary.unqualified)} no calificados`} onAbrir={() => onAbrir('calificados')} />
    <Indicador
      etiqueta="Ganados"
      valor={formatNumber(summary.won)}
      color={COLORES.verde}
      nota={<>{formatNumber(conversion.ganadosCalificados)} de leads calificados · {formatNumber(conversion.ganadosNoCalificados)} de no calificados<br />Conversión general {formatPercent(summary.won, summary.total)}</>}
      onAbrir={() => onAbrir('ganados')}
    />
    <Indicador etiqueta="Conversión de calificados" valor={formatearRatio(conversion.ratio)} color={COLORES.amarillo} nota={`${formatNumber(conversion.ganadosCalificados)} ganados calificados ÷ ${formatNumber(conversion.calificados)} calificados`} onAbrir={() => onAbrir('conversion')} />
    <Indicador etiqueta="Unidades vendidas" valor={formatNumber(summary.units)} nota="En leads ganados" onAbrir={() => onAbrir('unidades')} />
    <Indicador
      etiqueta="Unidades por cierre"
      valor={summary.won ? formatNumber(Math.round(summary.avgUnits)) : '—'}
      nota={summary.won ? `${formatNumber(summary.units)} unidades ÷ ${formatNumber(summary.won)} ganados` : 'Sin ganados en la selección'}
      onAbrir={() => onAbrir('porCierre')}
    />
  </section>
}

export function VistaGeneral({ leads, summary, showAllFunnel }) {
  const [asesorSel, setAsesorSel] = useState(null)
  const [mesSel, setMesSel] = useState(null)
  const [indicadorSel, setIndicadorSel] = useState(null)
  const datos = useMemo(() => datosVistaGeneral(leads, showAllFunnel), [leads, showAllFunnel])
  const conversion = useMemo(() => conversionCalificados(leads), [leads])
  const abrirAsesor = (name, country) => setAsesorSel({ name, country, leads, month: null })

  return <div className="fv2-vista">
    <TarjetasPais paises={datos.countries} />

    <Indicadores summary={summary} conversion={conversion} onAbrir={setIndicadorSel} />

    <Panel titulo="Leads por mes" subtitulo="Columnas: calificados + no calificados = leads del mes. Línea: ganados, con su escala a la derecha. Los ganados se ubican por fecha de cierre; el resto, por fecha de creación." accion={<Leyenda items={SERIES_MES} />}>
      {datos.months.length ? <GraficaMensual filas={datos.months} /> : <Vacio titulo="Sin meses con datos" texto="Ajusta los filtros para ver la evolución mensual." />}
    </Panel>

    <Panel titulo="Desempeño por ejecutivo" subtitulo="Todos los ejecutivos, ordenados por ganados y luego por calificados. La barra reparte sus leads por resultado. Haz clic en un ejecutivo para ver su detalle." accion={<Leyenda items={LEYENDA_EJECUTIVOS} />}>
      {datos.ejecutivos.length
        ? <DesempenoEjecutivos filas={datos.ejecutivos} onSeleccionar={abrirAsesor} />
        : <Vacio titulo="Sin ejecutivos con los filtros actuales" />}
    </Panel>

    <Panel titulo="Embudo por mes" subtitulo={showAllFunnel ? 'Leads → calificados → ganados en cada mes, más el total general. El % de ganados es la conversión de calificados.' : 'Solo los meses con leads según los filtros activos. El % de ganados es la conversión de calificados.'}>
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

    {indicadorSel && <DetalleLeads clave={indicadorSel} leads={leads} onClose={() => setIndicadorSel(null)} />}
    {asesorSel && <DetalleAsesor {...asesorSel} onClose={() => setAsesorSel(null)} />}
    {mesSel && <DetalleMes {...mesSel} onClose={() => setMesSel(null)} />}
  </div>
}
