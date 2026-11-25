// Canales de marketing · Redes sociales · «AÑO» de Resumen: gráfica de barras por mes (una medida a la vez:
// publicaciones, alcance, inversión, mensajes o leads) y la tabla con todas. Solo se pide cuando se elige «Año»
// (datos/useRedesDatos.js, useAnioRedes); la primera vez tarda, luego sale de la copia del servidor. Sin reclutamiento.
// Clic en un mes = se ve ese mes en Resumen.
import { useState } from 'react'
import { CalendarRange } from 'lucide-react'
import { numero } from '../../datos/calculos.js'
import { anioPorMes, MEDIDAS_ANIO, totalesAnio } from '../../datos/redesAnio.js'
import { dinero, nombreMes } from '../../datos/redes.js'
import { Aviso } from '../mailing/piezas.jsx'
import { TarjetaCompacta } from './piezasRedes.jsx'

export function AnioRedes({ anio, leads, leadsListos, filtros, alElegirMes }) {
  const [medida, setMedida] = useState('publicaciones')
  const anioTxt = String(filtros.mesActual ?? '').slice(0, 4)
  const titulo = `Año ${anioTxt}`
  if (anio.cargando || (!anio.anio && !anio.error)) {
    return <TarjetaCompacta color="#7fb0f0" icono={<CalendarRange size={15} />} titulo={titulo} sub="Por mes, de enero al mes actual">
      <p className="mkv2-redes-vacio is-gris">Cargando el año desde Meta… la primera vez puede tardar hasta un minuto.</p>
    </TarjetaCompacta>
  }
  if (anio.error) return <Aviso titulo="No se pudo leer el año" texto={anio.error} onReintentar={anio.reintentar} />
  const r = anioPorMes(anio.anio, leadsListos ? leads : [], filtros)
  const tot = totalesAnio(r.meses)
  const m = MEDIDAS_ANIO.find((x) => x.k === medida)
  const fmt = (k, v) => (MEDIDAS_ANIO.find((x) => x.k === k)?.dinero ? dinero(v, r.moneda) : numero(v))
  const max = Math.max(1, ...r.meses.map((x) => x[medida]))
  const mayor = r.meses.reduce((a, b) => (b[medida] > (a?.[medida] ?? -1) ? b : a), null)
  const notas = [
    r.leadsPorPais && 'En El Salvador, Prospekt no dice la marca del lead: se cuentan los leads de todo El Salvador.',
    !leadsListos && 'Leads de Prospekt por conectar.',
    r.otrasMonedas && 'La pauta tiene varias monedas: se muestra la que más gastó.',
    ...(anio.avisos ?? []),
  ].filter(Boolean)
  return <TarjetaCompacta color="#7fb0f0" icono={<CalendarRange size={15} />} titulo={titulo}
    sub={`Por mes, de enero a ${nombreMes(r.meses.at(-1)?.mes ?? '').split(' ')[0].toLowerCase()} · sin reclutamiento · clic en un mes para verlo`}>
    <div className="mkv2-tc-vistas" role="tablist" aria-label="Medida de la gráfica">
      {MEDIDAS_ANIO.map((x) => <button key={x.k} type="button" role="tab" aria-selected={medida === x.k} className={medida === x.k ? 'is-activo' : ''} onClick={() => setMedida(x.k)}>{x.nombre}</button>)}
    </div>
    <div className="mkv2-anio-graf" role="img" aria-label={`${m.nombre} por mes`}>
      {r.meses.map((x) => <button key={x.mes} type="button" className="mkv2-anio-col" onClick={() => alElegirMes(x.mes)}
        data-tip={`${nombreMes(x.mes)}\n${m.nombre}: ${fmt(medida, x[medida])}\nClic para ver este mes`}>
        <span className="mkv2-anio-valor">{x === mayor || x === r.meses.at(-1) ? fmt(medida, x[medida]) : ''}</span>
        <span className="mkv2-anio-barra"><i style={{ height: `${(x[medida] / max) * 100}%`, background: m.color }} /></span>
        <small>{nombreMes(x.mes).slice(0, 3)}</small>
      </button>)}
    </div>
    <div className="fv2-tabla-caja"><table className="fv2-tabla mkv2-tabla mkv2-anio-tabla">
      <thead><tr><th>Mes</th>{MEDIDAS_ANIO.map((x) => <th key={x.k} className="num">{x.nombre}</th>)}</tr></thead>
      <tbody>
        {r.meses.map((x) => <tr key={x.mes} className="mkv2-redes-clic" tabIndex={0} onClick={() => alElegirMes(x.mes)} onKeyDown={(e) => { if (e.key === 'Enter') alElegirMes(x.mes) }}>
          <td>{nombreMes(x.mes)}</td>{MEDIDAS_ANIO.map((k) => <td key={k.k} className="num">{fmt(k.k, x[k.k])}</td>)}</tr>)}
        <tr className="mkv2-redes-subtotal"><td>Total del año</td>{MEDIDAS_ANIO.map((k) => <td key={k.k} className="num">{fmt(k.k, tot[k.k])}</td>)}</tr>
      </tbody>
    </table></div>
    {notas.map((n) => <p key={n} className="mkv2-nota">{n}</p>)}
    <p className="mkv2-nota">Alcance = suma del alcance diario de las cuentas (igual que la tarjeta Alcance). Inversión y mensajes: pauta de Meta sin reclutamiento. Leads: Prospekt (origen Redes).</p>
  </TarjetaCompacta>
}
