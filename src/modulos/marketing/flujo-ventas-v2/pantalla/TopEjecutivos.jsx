// Flujo de ventas v2 · "Top 5 ejecutivos: leads recibidos vs. ganados" (DECISIONES D19).
// Barras: mismo orden que "Top radicados" del dashboard de leads (más ganados; si empatan, más leads),
// escala REAL (la barra más larga es el ejecutivo con más leads del top). Tabla por país: "Resumen por
// asesor (agrupado por país)" del dashboard de leads, con todos los ejecutivos.
// El nombre o la barra abren la ventana del ejecutivo (DetalleAsesor); los números de la tabla, "Detalle de leads".
import { Fragment, useMemo, useState } from 'react'
import { BarChart3, ChevronRight, Table2 } from 'lucide-react'
import { formatNumber, formatPercent } from '../utils/analytics.js'
import { Bandera, COLORES, Insignia, PaisChip, Vacio } from './comunes.jsx'
import { iniciales, resumenPorAsesor, tonoConversionTotal, topEjecutivos } from './datos.js'
import { COLOR_TONO, Leyenda, VERDE_CLARO } from './graficas.jsx'
import { NumeroClic, Segmentado } from './LeadsPorMes.jsx'
import { Tabla } from './Tablas.jsx'

const VISTAS = [
  { key: 'barras', label: 'Barras', icono: BarChart3 },
  { key: 'tabla', label: 'Tabla por país', icono: Table2 },
]
const pct = (a, b) => formatPercent(a, b).replace('%', ' %')
const GRIS_LEADS = '#3b4a6b'

function Barras({ filas, calificado, onAsesor }) {
  const max = Math.max(1, ...filas.map((f) => f.total))
  return <div className="fv2-res-top">
    {filas.map((f, i) => {
      const verdeCal = f.partes.ganadosCalificados
      const verdeNoCal = f.partes.ganadosNoCalificados
      const tono = tonoConversionTotal(f.conversion)
      const titulo = `${f.name} (${f.country}): ${formatNumber(f.total)} leads recibidos · ${formatNumber(f.won)} ganados`
        + (calificado ? '' : ` (${formatNumber(verdeCal)} de calificados · ${formatNumber(verdeNoCal)} de no calificados)`)
        + ` · conversión ${pct(f.won, f.total)} · clic para ver su ficha`
      return <button type="button" key={f.name} className="fv2-res-top-fila" onClick={() => onAsesor(f.name, f.country)} title={titulo} aria-label={`Ver la ficha de ${f.name}`}>
        <span className={`fv2-res-avatar ${i === 0 && f.won > 0 ? 'is-oro' : ''}`}>{iniciales(f.name)}</span>
        <span className="fv2-res-top-nombre"><b>{f.name}</b><small><Bandera pais={f.country} />{f.country}</small></span>
        <span className="fv2-res-top-pista">
          <i className="fv2-res-top-leads" style={{ width: `${(f.total / max) * 100}%`, background: GRIS_LEADS }}><em>{formatNumber(f.total)}</em></i>
          {verdeCal > 0 && <i className="fv2-res-top-ganados" style={{ width: `${(verdeCal / max) * 100}%`, background: COLORES.verde }} />}
          {!calificado && verdeNoCal > 0 && <i className="fv2-res-top-ganados" style={{ left: `${(verdeCal / max) * 100}%`, width: `${(verdeNoCal / max) * 100}%`, background: VERDE_CLARO }} />}
        </span>
        <span className="fv2-res-top-cifras">
          <b style={{ color: COLORES.verdeClaro }}>{formatNumber(f.won)}</b> <small>ganados</small>
          <em style={{ color: COLOR_TONO[tono] }}>{pct(f.won, f.total)} conversión</em>
        </span>
      </button>
    })}
  </div>
}

function TablaAsesores({ grupos, calificado, onAsesor, onDato }) {
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

export function TopEjecutivos({ leads, calificado, onAsesor, onDato, onIrEjecutivos }) {
  const [vista, setVista] = useState('barras')
  const top = useMemo(() => topEjecutivos(leads), [leads])
  const grupos = useMemo(() => (vista === 'tabla' ? resumenPorAsesor(leads) : []), [leads, vista])
  const leyenda = [
    { label: 'Leads recibidos', color: GRIS_LEADS },
    { label: calificado ? 'Ganados' : 'Ganados de calificados', color: COLORES.verde },
    ...(calificado ? [] : [{ label: 'de no calificados', color: VERDE_CLARO }]),
  ]
  return <section className="fv2-panel fv2-res-top-panel">
    <header className="fv2-panel-cabeza">
      <div>
        <div className="fv2-panel-titulo">Top 5 ejecutivos: leads recibidos vs. ganados</div>
        <div className="fv2-panel-sub">
          Clic en un ejecutivo abre su ventana de detalle ·{' '}
          <button type="button" className="fv2-res-enlace" onClick={onIrEjecutivos}>Ir al seguimiento del equipo ›</button>
        </div>
      </div>
      <div className="fv2-res-acciones">
        {vista === 'barras' && <Leyenda items={leyenda} />}
        <Segmentado opciones={VISTAS} valor={vista} onCambiar={setVista} etiqueta="Vista del top de ejecutivos" />
      </div>
    </header>
    {vista === 'barras' && (top.length ? <Barras filas={top} calificado={calificado} onAsesor={onAsesor} /> : <Vacio titulo="Sin ejecutivos con los filtros actuales" />)}
    {vista === 'tabla' && <TablaAsesores grupos={grupos} calificado={calificado} onAsesor={onAsesor} onDato={onDato} />}
    {vista === 'barras' && top.length > 0 && <p className="fv2-res-nota">Orden: más ganados y, si empatan, más leads (como "Top radicados" del dashboard de leads). Escala real: la barra más larga es {top.reduce((a, b) => (b.total > a.total ? b : a)).name} ({formatNumber(Math.max(...top.map((f) => f.total)))} leads).</p>}
  </section>
}
