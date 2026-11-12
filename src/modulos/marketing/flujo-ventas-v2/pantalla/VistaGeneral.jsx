// Flujo de ventas v2 · vista general: tarjetas por país, indicadores, gráficas y tablas.
import { useMemo, useState } from 'react'
import { formatNumber } from '../utils/analytics.js'
import { COLORES, formatearRatio, Vacio } from './comunes.jsx'
import { conversionCalificados, datosVistaGeneral } from './datos.js'
import { leadReferenceMonth } from '../utils/leads.js'
import { EmbudoEtapas, GraficaMensual, Leyenda, SERIES_MES, TarjetasPais } from './graficas.jsx'
import { DetalleEtapa, DetalleLeads, DetalleMes } from './Ventanas.jsx'

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
// Total leads, Calificados, Ganados y Unidades por cierre ya están en las tarjetas por país, así
// que aquí solo quedan los que no se repiten (12/11/2026).
function Indicadores({ summary, conversion, onAbrir }) {
  return <section className="fv2-kpis">
    <Indicador etiqueta="Conversión de calificados" valor={formatearRatio(conversion.ratio)} color={COLORES.azulClaro} nota={`${formatNumber(conversion.ganadosCalificados)} ganados calificados ÷ ${formatNumber(conversion.calificados)} calificados`} onAbrir={() => onAbrir('conversion')} />
    <Indicador etiqueta="Unidades vendidas" valor={formatNumber(summary.units)} nota="En leads ganados" onAbrir={() => onAbrir('unidades')} />
  </section>
}

// Pestaña Resumen (4.0b): tarjetas por país → indicadores (Conversión y Unidades) → "Leads por mes" → embudo por etapa.
// "Desempeño por ejecutivo", "Resultados por ejecutivo" y "Resultados mensuales" pasaron a la
// pestaña Ejecutivos (tarjetas). El detalle mensual por país se abre desde la gráfica.
export function VistaGeneral({ leads, summary, contexto, paisFiltro }) {
  const [mesSel, setMesSel] = useState(null)
  const [indicadorSel, setIndicadorSel] = useState(null) // { clave, leads, titulo? }
  const [etapaSel, setEtapaSel] = useState(null)
  const datos = useMemo(() => datosVistaGeneral(leads), [leads])
  const conversion = useMemo(() => conversionCalificados(leads), [leads])
  // Detalle mensual de un mes de la gráfica, con el filtro de país actual (Todos, GT o SV).
  const abrirMes = (fila) => setMesSel({ month: fila.month, country: paisFiltro, leads: leads.filter((l) => leadReferenceMonth(l) === fila.month) })

  return <div className="fv2-vista">
    <TarjetasPais paises={datos.countries} />

    <Indicadores summary={summary} conversion={conversion} onAbrir={(clave) => setIndicadorSel({ clave, leads })} />

    <Panel titulo="Leads por mes" subtitulo="Columnas: calificados + no calificados = leads del mes. Línea: ganados, con su escala a la derecha. Los ganados se ubican por fecha de cierre; el resto, por fecha de creación. Clic en un mes para ver su detalle." accion={<Leyenda items={SERIES_MES} />}>
      {datos.months.length ? <GraficaMensual filas={datos.months} onMes={abrirMes} /> : <Vacio titulo="Sin meses con datos" texto="Ajusta los filtros para ver la evolución mensual." />}
    </Panel>

    <Panel titulo="Embudo de ventas por etapa" subtitulo="Leads que llegaron a cada etapa y % que pasó desde la anterior. La etapa con la mayor caída va en amarillo. Haz clic en una etapa para ver su detalle.">
      {leads.length
        ? <EmbudoEtapas embudo={datos.embudo} onEtapa={setEtapaSel} />
        : <Vacio titulo="Sin leads con los filtros actuales" />}
      <p className="fv2-nota fv2-nota-pie">
        Etapa estimada: los leads perdidos se ubican en la última etapa con datos registrados por el vendedor.
        "Mejor" = ejecutivo con mayor % de paso de esa etapa a la siguiente (mínimo 5 leads; en Cierre, % que se ganó).
      </p>
    </Panel>

    {indicadorSel && <DetalleLeads {...indicadorSel} onClose={() => setIndicadorSel(null)} />}
    {etapaSel && <DetalleEtapa etapa={etapaSel} leads={leads} embudo={datos.embudo} contexto={contexto} onClose={() => setEtapaSel(null)} />}
    {mesSel && <DetalleMes {...mesSel} onClose={() => setMesSel(null)} />}
  </div>
}
