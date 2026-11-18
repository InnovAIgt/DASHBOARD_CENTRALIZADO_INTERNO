// Flujo de ventas v2 · "Leads por mes" con 3 vistas (DECISIONES D19):
//   📊 Gráfica (columnas + línea de ganados + unidades) · 🔻 Embudo por mes · ▤ Tabla por país.
// Cálculos del dashboard de leads (pantalla/datos.js: mesesResumen, embudoPorMes, tablaMensualPais,
// todos con summarize/byMonth). Todo número se puede cliquear: abre "Detalle de leads"; el mes abre
// "Detalle del mes". Con filtro "Calificado" se esconde lo de no calificados y el embudo tiene 2 pisos.
import { useMemo, useState } from 'react'
import { BarChart3, ChevronRight, Filter, Table2 } from 'lucide-react'
import { formatNumber, formatPercent, monthLabel } from '../utils/analytics.js'
import { Bandera, CODIGO_PAIS, COLORES, formatearRatio, Insignia, Vacio } from './comunes.jsx'
import { embudoPorMes, mesesResumen, tablaMensualPais, tonoConversionTotal } from './datos.js'
import { GraficaMensual, Leyenda, seriesMes } from './graficas.jsx'
import { Tabla } from './Tablas.jsx'

const VISTAS = [
  { key: 'grafica', label: 'Gráfica', icono: BarChart3 },
  { key: 'embudo', label: 'Embudo', icono: Filter },
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
  return <button type="button" className="fv2-res-piso" style={{ width: `${ancho}%`, background: fondo }} onClick={onClick} title={title} aria-label={title}>
    <span>{etiqueta}</span><b>{formatNumber(valor)}</b>
  </button>
}

const FONDOS = ['linear-gradient(100deg, #2f6fc2, #4f8fd8)', 'linear-gradient(100deg, #4f8fd8, #7fb0f0)', 'linear-gradient(100deg, #2f8f76, #4cc9a0)']

function TarjetaEmbudo({ grupo, calificado, onDato, onMes }) {
  const { s } = grupo
  const nombre = grupo.key === 'all' ? 'Todos' : monthLabel(grupo.month, 'long')
  const dato = (clave, titulo) => () => onDato(clave, grupo.leads, `${titulo} · ${nombre}`)
  const tono = tonoConversionTotal(s.conversion)
  return <article className={`fv2-res-embudo-tarjeta ${grupo.key === 'all' ? 'is-todos' : ''}`}>
    <header><h4>{nombre}</h4><span>{formatNumber(s.total)} leads</span></header>
    <div className="fv2-res-embudo">
      {!calificado && <>
        <Piso etiqueta="Total leads" valor={s.total} ancho={100} fondo={FONDOS[0]} onClick={dato('total', 'Total leads')} title={`Total leads de ${nombre}: ${formatNumber(s.total)}`} />
        <p className="fv2-res-entre" title={`${formatNumber(s.qualified)} calificados ÷ ${formatNumber(s.total)} leads (% desde total leads)`}>↓ {pct(s.qualified, s.total)} son calificados</p>
      </>}
      <Piso etiqueta="Calificados" valor={s.qualified} ancho={calificado ? 100 : 80} fondo={FONDOS[1]} onClick={dato('calificados', 'Calificados')} title={`Calificados de ${nombre}: ${formatNumber(s.qualified)}`} />
      <p className="fv2-res-entre" title={`${formatNumber(s.won)} ganados ÷ ${formatNumber(s.qualified)} calificados (% desde leads calificados, como en el dashboard de leads)`}>↓ {pct(s.won, s.qualified)} de los calificados se ganó</p>
      <Piso etiqueta="Ganados" valor={s.won} ancho={calificado ? 72 : 58} fondo={FONDOS[2]} onClick={dato('ganados', 'Ganados')} title={`Ganados de ${nombre}: ${formatNumber(s.won)} (= "Radicados")`} />
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

export function LeadsPorMes({ leads, calificado, onDato, onMes }) {
  const [vista, setVista] = useState('grafica')
  const [pais, setPais] = useState('Guatemala')
  const meses = useMemo(() => mesesResumen(leads), [leads])
  const embudo = useMemo(() => (vista === 'embudo' ? embudoPorMes(leads) : []), [leads, vista])
  const tablas = useMemo(() => (vista === 'tabla' ? tablaMensualPais(leads) : []), [leads, vista])
  const grupo = tablas.find((t) => t.country === pais)
  const subtitulos = {
    grafica: `Columnas: ${calificado ? 'leads calificados (filtro)' : 'calificados + no calificados = leads del mes'} · línea: ganados · abajo: unidades vendidas · clic en un mes abre su detalle. Los ganados se ubican por fecha de cierre; el resto, por fecha de creación.`,
    embudo: `Embudo de cada mes: ${calificado ? 'de los calificados, cuántos se ganaron' : 'de todos los leads, cuántos fueron calificados y cuántos se ganaron'} · clic en un número abre su detalle.`,
    tabla: 'Resumen mensual por país, con las columnas del dashboard de leads · clic en un mes o un número abre su detalle.',
  }

  return <section className="fv2-panel fv2-res-meses">
    <header className="fv2-panel-cabeza">
      <div>
        <div className="fv2-panel-titulo">Leads por mes</div>
        <div className="fv2-panel-sub">{subtitulos[vista]}</div>
      </div>
      <Segmentado opciones={VISTAS} valor={vista} onCambiar={setVista} etiqueta="Vista de leads por mes" />
    </header>

    {!meses.length && <Vacio titulo="Sin meses con datos" texto="Ajusta los filtros para ver la evolución mensual." />}

    {meses.length > 0 && vista === 'grafica' && <>
      <Leyenda items={seriesMes(calificado)} />
      <GraficaMensual filas={meses} calificado={calificado} onMes={(f) => onMes({ month: f.month, leads: f.leads })} />
    </>}

    {meses.length > 0 && vista === 'embudo' && <>
      <div className="fv2-res-embudos">
        {embudo.map((g) => <TarjetaEmbudo key={g.key} grupo={g} calificado={calificado} onDato={onDato} onMes={onMes} />)}
      </div>
      <p className="fv2-res-nota">"Ganados" = todos los ganados del filtro (= "Radicados" en el dashboard de leads). % entre pisos: desde total leads y desde leads calificados, como allá.</p>
    </>}

    {meses.length > 0 && vista === 'tabla' && grupo && <>
      <div className="fv2-res-tabla-cabeza">
        <Segmentado etiqueta="País de la tabla mensual" valor={pais} onCambiar={setPais}
          opciones={tablas.map((t) => ({ key: t.country, label: `${CODIGO_PAIS[t.country]} · ${t.country}` }))} />
        <span className="fv2-res-nota"><Bandera pais={pais} /> {grupo.months.length} meses · {formatNumber(grupo.summary.total)} leads · {formatNumber(grupo.summary.won)} ganados · {formatearRatio(grupo.summary.conversion)} conversión</span>
      </div>
      <TablaPais grupo={grupo} calificado={calificado} onDato={onDato} onMes={onMes} />
    </>}
  </section>
}
