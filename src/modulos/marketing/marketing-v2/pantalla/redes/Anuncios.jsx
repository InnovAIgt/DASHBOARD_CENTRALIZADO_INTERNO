// Canales de marketing · Redes sociales · ANUNCIOS (fase 2, pedido de Ismael; mockup v6). Secundario: no cambia la fase 1.
// Indicadores, presupuestos y tabla con la forma real de las rutas; horarios, edad y sexo, segmentaciones, ubicación y
// formularios son DATOS DE EJEMPLO (marcados «Ejemplo») hasta conectarlos (PENDIENTES). Nunca se mezclan monedas.
import { Fragment, useMemo } from 'react'
import { DollarSign, Eye, MessageCircle, MousePointerClick, Target, Users, Wallet } from 'lucide-react'
import { numero, pct } from '../../datos/calculos.js'
import { ejemploFase2, indicadoresAnuncios, monedaPrincipal, presupuestos } from '../../datos/anunciosFase2.js'
import { dinero, filtrarRedes, MARCAS } from '../../datos/redes.js'
import { DIAS, META_COSTO_MENSAJE } from '../../datos/redesVista.js'
import { COLOR_MAILING, COLOR_SEMAFORO, Tarjeta } from '../mailing/piezas.jsx'
import { DonaRedes, TarjetaRedes } from './piezasRedes.jsx'

const Ejemplo = () => <span className="mkv2-redes-fase" data-tip="Todavía no se pide a Meta: datos de ejemplo (PENDIENTES)">Ejemplo</span>
const colorSem = (s) => COLOR_SEMAFORO[s] ?? COLOR_MAILING.gris

function Burbujas({ filas, moneda }) {
  if (!filas.length) return <p className="mkv2-redes-vacio is-gris">Sin campañas</p>
  const W = 360; const H = 220; const pl = 44; const pb = 30; const pt = 12; const pr = 12
  const mX = Math.max(...filas.map((f) => f.gastado)) * 1.15 || 1
  const mY = Math.max(...filas.map((f) => f.mensajes)) * 1.15 || 1
  const x = (v) => pl + ((W - pl - pr) * v) / mX
  const y = (v) => H - pb - ((H - pt - pb) * v) / mY
  const meta = META_COSTO_MENSAJE[moneda]
  return <svg className="mkv2-redes-burbujas" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Inversión contra mensajes por campaña">
    {[0, 0.5, 1].map((k) => <g key={k}><line x1={pl} x2={W - pr} y1={y(mY * k)} y2={y(mY * k)} stroke="rgba(255,255,255,.06)" />
      <text x={pl - 5} y={y(mY * k) + 4} textAnchor="end">{numero(Math.round(mY * k))}</text>
      <text x={x(mX * k)} y={H - pb + 14} textAnchor="middle">{dinero(mX * k, moneda).replace(/\.\d+$/, '')}</text></g>)}
    {meta && <line x1={x(0)} y1={y(0)} x2={x(mX)} y2={y(Math.min(mY, mX / meta))} stroke="rgba(255,255,255,.35)" strokeDasharray="4 4" />}
    {filas.map((f) => <circle key={f.id} cx={x(f.gastado)} cy={y(f.mensajes)} r={7 + (f.mensajes / mY) * 9} fill={colorSem(f.semaforo)} fillOpacity=".75"
      stroke={MARCAS[f.marca]?.color} strokeWidth="2.5" className="mkv2-redes-burbuja"
      data-tip={`${f.campana}\n${dinero(f.gastado, moneda)} → ${numero(f.mensajes)} mensajes\nCosto por mensaje: ${dinero(f.costo, moneda)}`} />)}
  </svg>
}

export function AnunciosRedes({ datos, filtros }) {
  const f = { ...filtros, red: '', formato: '', estado: '' }
  const todos = useMemo(() => filtrarRedes(datos.anuncios, f), [datos.anuncios, f.pais, f.marca, f.mes]) // eslint-disable-line react-hooks/exhaustive-deps
  const { moneda, campanas, otras } = monedaPrincipal(todos)
  const k = indicadoresAnuncios(campanas)
  const marcas = Object.keys(MARCAS).filter((m) => (!filtros.pais || MARCAS[m].pais === filtros.pais) && (!filtros.marca || m === filtros.marca))
  const ej = ejemploFase2({ mes: filtros.mes, mensajes: k.mensajes, gastado: k.gastado, impresiones: k.impresiones, marcas, redes: filtros.red ? [filtros.red] : ['fb', 'ig'] })
  const maxHora = Math.max(1, ...ej.horas.flat())
  let mejor = [0, 0, -1]
  ej.horas.forEach((fila, d) => fila.forEach((v, b) => { if (v > mejor[2]) mejor = [d, b, v] }))
  const maxEdad = Math.max(1, ...ej.edades.map((e) => Math.max(e.hombres, e.mujeres)))
  const conCosto = ej.edades.filter((e) => e.costo !== null)
  const edadBarata = conCosto.length ? conCosto.reduce((a, b) => (b.costo < a.costo ? b : a)) : null
  const ubicBarata = [...ej.ubicaciones].sort((a, b) => a.costoMensaje - b.costoMensaje)[0]
  const pres = presupuestos(campanas)
  const d = (v) => dinero(v, moneda)

  if (!todos.length) return <Tarjeta titulo="Anuncios"><p className="mkv2-redes-vacio is-gris">Sin campañas en este mes con estos filtros.</p></Tarjeta>
  return <>
    <p className="mkv2-redes-fase-nota"><span className="mkv2-redes-fase">Fase 2</span> Pedido de Ismael. Lo marcado «Ejemplo» todavía no se pide a Meta.{otras.length ? ` Se muestran las campañas en ${moneda}; hay otras en ${otras.join(', ')} que no se suman.` : ''}</p>
    <div className="mkv2-redes-kpis mkv2-redes-kpis7">
      <TarjetaRedes titulo="Impresiones" icono={Eye} color="#3987e5" valor={numero(k.impresiones)} sub="veces que se vieron" tip="Impresiones (visualizaciones) de los anuncios" />
      <TarjetaRedes titulo="Alcance" icono={Users} color="#2fb8c4" valor={numero(k.alcance)} sub={<>frecuencia <b>{k.frecuencia ? k.frecuencia.toFixed(1) : '—'}</b></>} tip="Personas distintas; frecuencia = impresiones ÷ alcance" />
      <TarjetaRedes titulo="Clics" icono={MousePointerClick} color="#9085e9" valor={numero(k.clics)} sub={<>CTR <b>{pct(k.ctr)}</b></>} tip="CTR = clics ÷ impresiones × 100 (calculado en el dashboard)" />
      <TarjetaRedes titulo="Costo por clic" icono={DollarSign} color={COLOR_MAILING.temporal} valor={d(k.cpc)} sub="inversión ÷ clics" tip="CPC calculado en el dashboard" />
      <TarjetaRedes titulo="Mensajes" icono={MessageCircle} color={COLOR_MAILING.entregados} valor={numero(k.mensajes)} sub={<><b>{d(k.costoMensaje)}</b> c/u</>} tip="Conversaciones iniciadas; costo = gasto ÷ mensajes" />
      <TarjetaRedes titulo="Conversiones" icono={Target} color={COLOR_MAILING.duro} valor={numero(k.mensajes + ej.formularios)} sub={`${numero(k.mensajes)} mensajes + ${numero(ej.formularios)} formularios (ejemplo)`} tip="Mensajes y formularios de Meta (no son ventas). Formularios: ejemplo" />
      <TarjetaRedes titulo="Inversión" icono={Wallet} color="#5b6b84" valor={d(k.gastado)} sub={`${numero(campanas.length)} campañas`} tip={`Gasto total en ${moneda}`} />
    </div>

    <div className="mkv2-duo mkv2-redes-duo-ads">
      <Tarjeta titulo={<>Horarios de mayor interés <Ejemplo /></>} sub="Mensajes por día y hora">
        <div className="mkv2-redes-heat">
          <span />{Array.from({ length: 12 }, (_, b) => <span key={b} className="mkv2-redes-heat-h">{b * 2}h</span>)}
          {ej.horas.map((fila, di) => <Fragment key={di}><span className="mkv2-redes-heat-d">{DIAS[di]}</span>
            {fila.map((v, b) => <span key={b} className="mkv2-redes-heat-c" style={{ background: `rgba(47,184,196,${(0.08 + 0.92 * (v / maxHora)).toFixed(2)})`, animationDelay: `${(di * 12 + b) * 0.004}s` }}
              data-tip={`${DIAS[di]} ${b * 2}:00–${b * 2 + 2}:00\n${numero(v)} mensajes`} />)}</Fragment>)}
        </div>
        <p className="mkv2-redes-esc">menos <i /> más · <b>mejor: {DIAS[mejor[0]]} de {mejor[1] * 2}:00 a {mejor[1] * 2 + 2}:00</b></p>
      </Tarjeta>
      <Tarjeta titulo={<>Público: edad y sexo <Ejemplo /></>} sub="Mensajes · costo por mensaje">
        <div className="mkv2-redes-edad mkv2-redes-edad-h"><span /><span><i style={{ background: '#3b82e0' }} />Hombres</span><span><i style={{ background: '#d64f9a' }} />Mujeres</span><span>c/u</span></div>
        {ej.edades.map((e, i) => <div key={e.rango} className="mkv2-redes-edad">
          <b>{e.rango}</b>
          <span className="is-izq"><i style={{ width: `${(e.hombres / maxEdad) * 100}%`, background: '#3b82e0', animationDelay: `${i * 0.05}s` }} data-tip={`${e.rango} · Hombres\n${numero(e.hombres)} mensajes`} /></span>
          <span><i style={{ width: `${(e.mujeres / maxEdad) * 100}%`, background: '#d64f9a', animationDelay: `${i * 0.05}s` }} data-tip={`${e.rango} · Mujeres\n${numero(e.mujeres)} mensajes`} /></span>
          <small className={e === edadBarata ? 'mkv2-redes-sem is-verde' : ''}>{d(e.costo)}</small>
        </div>)}
      </Tarjeta>
    </div>

    <div className="mkv2-redes-tres">
      <Tarjeta titulo={<>Segmentaciones ganadoras <Ejemplo /></>} sub="Públicos por costo por mensaje">
        <div className="mkv2-redes-lista">{ej.segmentos.map((s, i) => <div key={s.nombre} className="mkv2-redes-li">
          <span className={`mkv2-redes-li-n ${i === 0 ? 'is-oro' : ''}`}>{i + 1}</span>
          <span className="mkv2-redes-li-t"><b>{s.nombre}</b><small>{MARCAS[s.marca]?.corto} · {numero(s.mensajes)} msj · {d(s.gastado)}</small></span>
          <span className={`mkv2-redes-sem is-${(s.costo <= (META_COSTO_MENSAJE[moneda] ?? Infinity)) ? 'verde' : 'amarillo'}`}>{d(s.costo)}</span>
        </div>)}</div>
      </Tarjeta>
      <Tarjeta titulo="Presupuestos más efectivos" sub="Inversión vs mensajes · arriba de la línea = mejor que la meta">
        <Burbujas filas={pres} moneda={moneda} />
      </Tarjeta>
      <Tarjeta titulo={<>Plataforma y ubicación <Ejemplo /></>} sub="Dónde se ven los anuncios">
        <DonaRedes centro={`${numero(Math.round(k.impresiones / 1000))}k`} sub="impresiones"
          items={ej.ubicaciones.map((u, i) => ({ k: u.clave, l: u.nombre, v: u.impresiones, c: (u.red === 'fb' ? ['#3b82e0', '#6aa1ea', '#97bff2'] : ['#d64f9a', '#e27bb5', '#eda6cf'])[i % 3] }))} />
        {ubicBarata && <p className="mkv2-redes-importante" style={{ '--c': COLOR_MAILING.entregados, marginTop: 8 }}>🏅 <b>{ubicBarata.nombre}</b> <span>es la más barata: {d(ubicBarata.costoMensaje)} por mensaje</span></p>}
      </Tarjeta>
    </div>

    <Tarjeta titulo={`Campañas · ${numero(campanas.length)}`} sub={`Columnas del Excel de Marketing · en ${moneda} · tasas calculadas en el dashboard`}>
      <div className="fv2-tabla-caja"><table className="fv2-tabla mkv2-tabla">
        <thead><tr>{['Campaña', 'Marca', 'Presupuesto', 'Gastado', 'Alcance', 'Visualizaciones', 'Clics', 'CPC', 'Mensajes', 'Costo por mensaje'].map((h, i) => <th key={h} className={i > 1 ? 'num' : ''}>{h}</th>)}</tr></thead>
        <tbody>{pres.map((p) => {
          const a = campanas.find((c) => c.id === p.id)
          return <tr key={p.id}><td><b>{a.campana}</b></td><td>{MARCAS[a.marca]?.corto}</td><td className="num">{d(a.presupuesto ?? null)}</td><td className="num">{d(a.gastado)}</td>
            <td className="num">{numero(a.alcance)}</td><td className="num">{numero(a.visualizaciones)}</td><td className="num">{numero(a.clics)}</td>
            <td className="num">{d(a.clics ? a.gastado / a.clics : null)}</td><td className="num">{numero(a.mensajes)}</td>
            <td className="num"><span className={`mkv2-redes-sem ${p.semaforo ? `is-${p.semaforo}` : ''}`}>{d(p.costo)}</span></td></tr>
        })}</tbody>
      </table></div>
    </Tarjeta>
  </>
}
