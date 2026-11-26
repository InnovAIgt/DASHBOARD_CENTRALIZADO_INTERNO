// Flujo de ventas v2 · análisis mensual: gráfica, embudo visible y tabla por país.
// Cálculos del dashboard de leads (pantalla/datos.js: mesesResumen, embudoPorMes, tablaMensualPais,
// todos con summarize/byMonth). Todo número se puede cliquear: abre "Detalle de leads"; el mes abre
// "Detalle del mes". Con filtro "Calificado" se esconde lo de no calificados y el embudo tiene 2 pisos.
import { useMemo, useState } from 'react'
import { BarChart3, ChevronRight, Table2 } from 'lucide-react'
import { formatNumber, formatPercent, monthLabel } from '../utils/analytics.js'
import { COLORES, formatearRatio, Insignia, Vacio } from './comunes.jsx'
import { embudoPorMes, mesesResumen, tablaMensualPais, tonoConversionTotal } from './datos.js'
import { Leyenda } from './graficas.jsx'
import { GraficaMeses, seriesBarras, tituloMeses } from './GraficaMeses.jsx'
import { EncabezadoSeccion, EtiquetaPais } from './piezas.jsx'
import { Tabla } from './Tablas.jsx'

const VISTAS = [
  { key: 'grafica', label: 'Gráfica', icono: BarChart3 },
  { key: 'tabla', label: 'Tabla por país', icono: Table2 },
]

const pct = (a, b) => formatPercent(a, b).replace('%', ' %')

/** Botón de opciones (segmentado), reutilizado en "Leads por mes" y en el Top 5. */
export function Segmentado({ opciones, valor, onCambiar, etiqueta }) {
  return <div className="fv2-res-segmento" role="group" aria-label={etiqueta}>
    {opciones.map((o) => {
      const Icono = o.icono
      return <button type="button" key={o.key} className={valor === o.key ? 'is-activo' : ''} aria-pressed={valor === o.key}
        aria-label={`${etiqueta}: ${o.label}`} onClick={() => onCambiar(o.key)}>
        {Icono && <Icono size={13} aria-hidden="true" />}{o.label}
      </button>
    })}
  </div>
}

/** Número que se puede cliquear (abre "Detalle de leads"). */
export function NumeroClic({ valor, title, onClick, color, className = '' }) {
  return <button type="button" className={`fv2-res-num ${className}`} style={color ? { color } : undefined} title={title} aria-label={title} onClick={onClick}>{valor}</button>
}

// ---------- Vista 2: embudo por mes ----------
function Piso({ etiqueta, valor, ancho, fondo, onClick, title }) {
  const anchoSeguro = Math.max(0, Math.min(100, ancho))
  return <button type="button" className="fv2-res-piso" onClick={onClick} title={title} aria-label={title}>
    <span className="fv2-res-piso-cabeza"><span>{etiqueta}</span><b>{formatNumber(valor)}</b></span>
    <span className="fv2-res-piso-pista" aria-hidden="true"><i style={{ width: `${anchoSeguro}%`, background: fondo }} /></span>
  </button>
}

const FONDOS = ['linear-gradient(100deg, #2f6fc2, #4f8fd8)', 'linear-gradient(100deg, #4f8fd8, #7fb0f0)', 'linear-gradient(100deg, #2f8f76, #4cc9a0)']

function TarjetaEmbudo({ grupo, calificado, onDato, onMes }) {
  const { s } = grupo
  const nombre = grupo.key === 'all' ? 'Todos' : monthLabel(grupo.month, 'long')
  const dato = (clave, titulo) => () => onDato(clave, grupo.leads, `${titulo} · ${nombre}`)
  const tono = tonoConversionTotal(s.conversion)
  const anchoCalificados = calificado ? 100 : (s.total ? (s.qualified / s.total) * 100 : 0)
  const totalReferencia = calificado ? s.qualified : s.total
  const anchoGanados = totalReferencia ? (s.won / totalReferencia) * 100 : 0
  return <article className={`fv2-res-embudo-tarjeta ${grupo.key === 'all' ? 'is-todos' : ''}`}>
    <header><h4>{nombre}</h4><span>{formatNumber(s.total)} leads</span></header>
    <div className="fv2-res-embudo">
      {!calificado && <>
        <Piso etiqueta="Total leads" valor={s.total} ancho={100} fondo={FONDOS[0]} onClick={dato('total', 'Total leads')} title={`Total leads de ${nombre}: ${formatNumber(s.total)}`} />
        <p className="fv2-res-entre" title={`${formatNumber(s.qualified)} calificados ÷ ${formatNumber(s.total)} leads (% desde total leads)`}>↓ {pct(s.qualified, s.total)} son calificados</p>
      </>}
      <Piso etiqueta="Calificados" valor={s.qualified} ancho={anchoCalificados} fondo={FONDOS[1]} onClick={dato('calificados', 'Calificados')} title={`Calificados de ${nombre}: ${formatNumber(s.qualified)}`} />
      <p className="fv2-res-entre" title={`${formatNumber(s.won)} ganados ÷ ${formatNumber(s.qualified)} calificados (% desde leads calificados, como en el dashboard de leads)`}>↓ {pct(s.won, s.qualified)} de los calificados se ganó</p>
      <Piso etiqueta="Ganados" valor={s.won} ancho={anchoGanados} fondo={FONDOS[2]} onClick={dato('ganados', 'Ganados')} title={`Ganados de ${nombre}: ${formatNumber(s.won)} (= "Radicados")`} />
    </div>
    <div className="fv2-res-embudo-datos">
      <button type="button" className="is-verde" onClick={dato('ganados', 'Ganados')} title={`${formatNumber(s.won)} ganados`} aria-label={`Ver los ${formatNumber(s.won)} ganados de ${nombre}`}><b>{formatNumber(s.won)}</b><small>ganados</small></button>
      <button type="button" className="is-amarillo" onClick={dato('unidades', 'Unidades vendidas')} title={`${formatNumber(s.units)} unidades en leads ganados`} aria-label={`Ver las unidades de ${nombre}`}><b>{formatNumber(s.units)}</b><small>unidades</small></button>
      <button type="button" className={`is-${tono}`} onClick={dato('conversionTotal', 'Conversión')} title={`${formatNumber(s.won)} ganados ÷ ${formatNumber(s.total)} leads`} aria-label={`Ver la conversión de ${nombre}`}><b>{pct(s.won, s.total)}</b><small>conversión</small></button>
    </div>
    {grupo.key === 'all'
      ? <span className="fv2-res-embudo-pie">Total del período</span>
      : <button type="button" className="fv2-res-embudo-pie is-enlace" onClick={() => onMes({ month: grupo.month, leads: grupo.leads })} aria-label={`Ver el detalle de ${nombre}`}>Ver detalle del mes<ChevronRight size={12} aria-hidden="true" /></button>}
  </article>
}

// ---------- Vista 3: tabla mensual por país ----------
function TablaPais({ grupo, calificado, onDato, onMes }) {
  const columnas = ['Mes', { label: 'Total leads', num: true }, { label: 'Calificados', num: true },
    ...(calificado ? [] : [{ label: 'No calificados', num: true }]),
    { label: 'Ganados', num: true }, { label: 'Conversión', num: true }, { label: 'Unid. promedio', num: true }, { label: 'Unidades', num: true }]
  return <Tabla columnas={columnas} vacio={grupo.months.length ? null : `No hay leads de ${grupo.country} con los filtros actuales.`} className="fv2-res-tabla">
    {grupo.months.map((m) => {
      const mes = monthLabel(m.month, 'long')
      const abrir = (clave, titulo) => () => onDato(clave, m.leads, `${titulo} · ${mes} · ${grupo.country}`)
      return <tr key={m.month}>
        <td><button type="button" className="fv2-res-mes" onClick={() => onMes({ month: m.month, country: grupo.country, leads: m.leads })} aria-label={`Ver el detalle de ${mes} en ${grupo.country}`}>{mes}<ChevronRight size={13} aria-hidden="true" /></button></td>
        <td className="num"><NumeroClic valor={formatNumber(m.total)} title={`${formatNumber(m.total)} leads en ${mes}`} onClick={abrir('total', 'Total leads')} /></td>
        <td className="num"><NumeroClic valor={formatNumber(m.qualified)} title={`${formatNumber(m.qualified)} calificados en ${mes}`} onClick={abrir('calificados', 'Calificados')} /></td>
        {!calificado && <td className="num"><NumeroClic valor={formatNumber(m.unqualified)} title={`${formatNumber(m.unqualified)} no calificados en ${mes}`} onClick={abrir('noCalificados', 'No calificados')} /></td>}
        <td className="num"><NumeroClic valor={formatNumber(m.won)} title={`${formatNumber(m.won)} ganados en ${mes}`} onClick={abrir('ganados', 'Ganados')} color={COLORES.verdeClaro} /></td>
        <td className="num"><button type="button" className="fv2-res-num" onClick={abrir('conversionTotal', 'Conversión')} title={`${formatNumber(m.won)} ganados ÷ ${formatNumber(m.total)} leads`} aria-label={`Ver la conversión de ${mes}`}>
          <Insignia tono={tonoConversionTotal(m.conversion)}>{pct(m.won, m.total)}</Insignia></button></td>
        <td className="num"><NumeroClic valor={m.won ? formatNumber(Math.round(m.avgUnits)) : '—'} title={m.won ? `${formatNumber(m.units)} unidades ÷ ${formatNumber(m.won)} ganados` : 'Sin ganados'} onClick={abrir('porCierre', 'Unidades por cierre')} /></td>
        <td className="num"><NumeroClic valor={formatNumber(m.units)} title={`${formatNumber(m.units)} unidades vendidas en ${mes}`} onClick={abrir('unidades', 'Unidades vendidas')} color="#e0b52e" /></td>
      </tr>
    })}
  </Tabla>
}

/**
 * Rediseño Parte 3 (D27): gráfica de 3 barras con una sola escala (GraficaMeses.jsx), título con la conclusión,
 * «Tabla por país» con las DOS tablas a la vez y todas sus columnas, y el embudo con 4 tarjetas por fila.
 */
export function LeadsPorMes({ leads, calificado, onDato, onMes }) {
  const [vista, setVista] = useState('grafica')
  const meses = useMemo(() => mesesResumen(leads), [leads])
  const embudo = useMemo(() => embudoPorMes(leads), [leads])
  const tablas = useMemo(() => (vista === 'tabla' ? tablaMensualPais(leads) : []), [leads, vista])
  const explicacion = vista === 'grafica'
    ? <>Cada mes tiene 3 barras: <b>azul</b> = {calificado ? 'leads calificados' : 'leads del mes (calificados en azul + no calificados en gris)'}, <b>verde</b> = ganados y <b>amarillo</b> = unidades vendidas. Cada lead cuenta en un solo mes: los ganados (y sus unidades), en el mes en que se cerró la venta; los demás, en el mes en que entraron. Pasa el mouse para ver el detalle o haz clic en un mes para abrirlo.</>
    : 'Resumen mensual de cada país, con las columnas del dashboard de leads. Clic en un mes o en un número abre su detalle.'

  return <>
    <section className="fv2-panel fv2n-bloque fv2n-meses">
      <EncabezadoSeccion titulo={tituloMeses(meses)} explicacion={explicacion}>
        <Segmentado opciones={VISTAS} valor={vista} onCambiar={setVista} etiqueta="Vista de leads por mes" />
      </EncabezadoSeccion>

      {!meses.length && <Vacio titulo="Sin meses con datos" texto="Ajusta los filtros para ver la evolución mensual." />}

      {meses.length > 0 && vista === 'grafica' && <>
        <Leyenda items={seriesBarras(calificado)} />
        <GraficaMeses filas={meses} calificado={calificado} onMes={(f) => onMes({ month: f.month, leads: f.leads })} />
      </>}

      {meses.length > 0 && vista === 'tabla' && <div className="fv2n-tablas-pais">
        {tablas.map((grupo) => <div key={grupo.country} className="fv2n-tabla-pais">
          <div className="fv2n-tabla-pais-cabeza">
            <b>Resumen mensual · {grupo.country}</b>
            <span className="fv2-res-nota">{grupo.months.length} {grupo.months.length === 1 ? 'mes' : 'meses'} · {formatNumber(grupo.summary.total)} leads · {formatNumber(grupo.summary.won)} ganados · {formatearRatio(grupo.summary.conversion)} conversión</span>
            <EtiquetaPais pais={grupo.country} />
          </div>
          {/* Todas las columnas, también «No calificados» (con el filtro Calificado sale en 0). */}
          <TablaPais grupo={grupo} calificado={false} onDato={onDato} onMes={onMes} />
        </div>)}
      </div>}
    </section>

    {meses.length > 0 && <section className="fv2-panel fv2n-bloque fv2-res-embudo-mensual fv2n-embudo-mes">
      <EncabezadoSeccion titulo="Embudo de conversión por mes"
        explicacion={<>Total del período y {meses.length} {meses.length === 1 ? 'mes' : 'meses'} con leads, con los filtros activos.{calificado ? ' Se compara de calificados a ganados.' : ' Se compara de leads a calificados y ganados.'} Clic en una cifra abre su detalle.</>} />
      <div className="fv2-res-embudos">
        {embudo.map((grupoMes) => <TarjetaEmbudo key={grupoMes.key} grupo={grupoMes} calificado={calificado} onDato={onDato} onMes={onMes} />)}
      </div>
    </section>}
  </>
}
