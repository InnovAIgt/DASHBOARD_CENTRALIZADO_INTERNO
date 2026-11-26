// Flujo de ventas v2 · «Resumen por asesor (agrupado por país)» del dashboard de leads, con todos los ejecutivos.
// Rediseño Parte 2 (D26): es la vista «Resultados» de la tabla de ejecutivos (TablaEjecutivos.jsx). Sin cambios en
// columnas ni cifras. El gráfico de barras «Top 5 ejecutivos» se quitó (se juntó en la vista «Atrasos»).
// El nombre abre la ventana del ejecutivo (DetalleAsesor); los números, «Detalle de leads».
import { Fragment } from 'react'
import { ChevronRight } from 'lucide-react'
import { formatNumber, formatPercent } from '../utils/analytics.js'
import { Bandera, COLORES, Insignia, PaisChip } from './comunes.jsx'
import { tonoConversionTotal } from './datos.js'
import { NumeroClic } from './LeadsPorMes.jsx'
import { Tabla } from './Tablas.jsx'

const pct = (a, b) => formatPercent(a, b).replace('%', ' %')

export function TablaAsesores({ grupos, calificado, onAsesor, onDato }) {
  const columnas = ['País', 'Asesor', { label: 'Total leads', num: true }, { label: 'Calificados', num: true },
    ...(calificado ? [] : [{ label: 'No calificados', num: true }]),
    { label: 'Ganados', num: true }, { label: 'Conversión', num: true }, { label: 'Unid. promedio', num: true }, { label: 'Unidades totales', num: true }]
  return <Tabla columnas={columnas} vacio={grupos.length ? null : 'No hay asesores en la selección.'} className="fv2-res-tabla">
    {grupos.map((g) => <Fragment key={g.country}>
      <tr className="fv2-res-grupo"><td colSpan={columnas.length}>
        <Bandera pais={g.country} /> <b>{g.country}</b> <span>{g.advisors.length} asesores · {formatNumber(g.summary.total)} leads · {formatNumber(g.summary.won)} ganados</span>
      </td></tr>
      {g.advisors.map((a) => {
        const abrir = (clave, titulo) => () => onDato(clave, a.leads, `${titulo} · ${a.name}`)
        return <tr key={`${g.country}-${a.name}`}>
          <td><PaisChip pais={g.country} /></td>
          <td><button type="button" className="fv2-res-mes" onClick={() => onAsesor(a.name, g.country)} aria-label={`Ver la ficha de ${a.name}`}>{a.name}<ChevronRight size={13} aria-hidden="true" /></button></td>
          <td className="num"><NumeroClic valor={formatNumber(a.total)} title={`${formatNumber(a.total)} leads de ${a.name}`} onClick={abrir('total', 'Total leads')} /></td>
          <td className="num"><NumeroClic valor={formatNumber(a.qualified)} title={`${formatNumber(a.qualified)} calificados de ${a.name}`} onClick={abrir('calificados', 'Calificados')} /></td>
          {!calificado && <td className="num"><NumeroClic valor={formatNumber(a.unqualified)} title={`${formatNumber(a.unqualified)} no calificados de ${a.name}`} onClick={abrir('noCalificados', 'No calificados')} /></td>}
          <td className="num"><NumeroClic valor={formatNumber(a.won)} title={`${formatNumber(a.won)} ganados de ${a.name}`} onClick={abrir('ganados', 'Ganados')} color={COLORES.verdeClaro} /></td>
          <td className="num"><button type="button" className="fv2-res-num" onClick={abrir('conversionTotal', 'Conversión')} title={`${formatNumber(a.won)} ganados ÷ ${formatNumber(a.total)} leads`} aria-label={`Ver la conversión de ${a.name}`}>
            <Insignia tono={tonoConversionTotal(a.conversion)}>{pct(a.won, a.total)}</Insignia></button></td>
          <td className="num"><NumeroClic valor={a.won ? formatNumber(Math.round(a.avgUnits)) : '—'} title={a.won ? `${formatNumber(a.units)} unidades ÷ ${formatNumber(a.won)} ganados` : 'Sin ganados'} onClick={abrir('porCierre', 'Unidades por cierre')} /></td>
          <td className="num"><NumeroClic valor={formatNumber(a.units)} title={`${formatNumber(a.units)} unidades de ${a.name}`} onClick={abrir('unidades', 'Unidades vendidas')} color="#e0b52e" /></td>
        </tr>
      })}
    </Fragment>)}
  </Tabla>
}
