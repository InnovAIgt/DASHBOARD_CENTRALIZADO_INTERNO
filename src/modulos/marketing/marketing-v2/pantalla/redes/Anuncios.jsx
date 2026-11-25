// Canales de marketing · Redes sociales · ANUNCIOS (fase 2, pedido de Ismael; mockup v6). Todo con DATOS REALES de Meta:
// indicadores y tabla por campaña (/anuncios) y, del mes elegido, horarios, edad y sexo, segmentaciones, presupuestos,
// plataforma y ubicación y formularios (/anuncios-detalle, por anuncio). Sin reclutamiento (va aparte). Un grupo con
// menos de 5 mensajes se marca «pocos datos» y nunca sale como ganador. Nunca se mezclan monedas.
import { Fragment, useMemo } from 'react'
import { DollarSign, Eye, MessageCircle, MousePointerClick, Target, Users, Wallet } from 'lucide-react'
import { numero, pct } from '../../datos/calculos.js'
import {
  edadesDe, filtrarDetalle, formulariosDe, horasDe, indicadoresAnuncios, masBarato, MIN_MENSAJES, monedaPrincipal, presupuestosDe, segmentosDe, ubicacionesDe,
} from '../../datos/anunciosFase2.js'
import { dinero, filtrarRedes, MARCAS, nombreCampana, separarReclutamiento, totalesAnuncios } from '../../datos/redes.js'
import { DIAS, META_COSTO_MENSAJE } from '../../datos/redesVista.js'
import { useDetalleAnuncios } from '../../datos/useRedesDatos.js'
import { Aviso, COLOR_MAILING, COLOR_SEMAFORO, Tarjeta } from '../mailing/piezas.jsx'
import { DonaRedes, TarjetaRedes } from './piezasRedes.jsx'

const colorSem = (s) => COLOR_SEMAFORO[s] ?? COLOR_MAILING.gris
const PAIS_DE = Object.fromEntries(Object.entries(MARCAS).map(([k, v]) => [k, v.pais]))
const Pocos = () => <span className="mkv2-redes-pocos" data-tip={`Menos de ${MIN_MENSAJES} mensajes: no se usa para elegir el mejor`}>pocos datos</span>

function Burbujas({ filas, moneda }) {
  if (!filas.length) return <p className="mkv2-redes-vacio is-gris">Sin campañas</p>
  const W = 360; const H = 220; const pl = 44; const pb = 30; const pt = 12; const pr = 12
  const mX = Math.max(...filas.map((f) => f.gastado)) * 1.15 || 1
  const mY = Math.max(...filas.map((f) => f.mensajes)) * 1.15 || 1
  const x = (v) => pl + ((W - pl - pr) * v) / mX
  const y = (v) => H - pb - ((H - pt - pb) * v) / mY
  const meta = META_COSTO_MENSAJE[moneda]
  const pres = (f) => [f.presupuestoDiario ? `${dinero(f.presupuestoDiario, moneda)} diario` : null, f.presupuestoTotal ? `${dinero(f.presupuestoTotal, moneda)} total` : null].filter(Boolean).join(' · ') || 'sin presupuesto en Meta'
  return <svg className="mkv2-redes-burbujas" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Inversión contra mensajes por campaña">
    {[0, 0.5, 1].map((k) => <g key={k}><line x1={pl} x2={W - pr} y1={y(mY * k)} y2={y(mY * k)} stroke="rgba(255,255,255,.06)" />
      <text x={pl - 5} y={y(mY * k) + 4} textAnchor="end">{numero(Math.round(mY * k))}</text>
      <text x={x(mX * k)} y={H - pb + 14} textAnchor={k === 0 ? 'start' : k === 1 ? 'end' : 'middle'}>{dinero(mX * k, moneda).replace(/\.\d+$/, '')}</text></g>)}
    {meta && <line x1={x(0)} y1={y(0)} x2={x(mX)} y2={y(Math.min(mY, mX / meta))} stroke="rgba(255,255,255,.35)" strokeDasharray="4 4" />}
    {filas.map((f) => <circle key={f.id} cx={x(f.gastado)} cy={y(f.mensajes)} r={7 + (f.mensajes / mY) * 9} fill={f.pocos ? COLOR_MAILING.gris : colorSem(f.semaforo)} fillOpacity={f.pocos ? '.35' : '.75'}
      stroke={MARCAS[f.marca]?.color ?? COLOR_MAILING.gris} strokeWidth="2.5" className="mkv2-redes-burbuja"
      data-tip={`${f.campana}\nPresupuesto: ${pres(f)}\n${dinero(f.gastado, moneda)} → ${numero(f.mensajes)} mensajes\nCosto por mensaje: ${dinero(f.costo, moneda)}${f.pocos ? '\nPocos datos (menos de 5 mensajes)' : ''}`} />)}
  </svg>
}

/** Chips del público de un conjunto: marca · edad · sexo · ubicaciones · país. */
const chipsPublico = (s) => [MARCAS[s.marca]?.corto ?? 'Sin página', s.publico?.edad && `Edad ${s.publico.edad}`, s.publico?.sexo,
  s.publico?.ubicaciones === 'Automáticas' ? 'Ubicaciones automáticas' : s.publico?.ubicaciones, s.publico?.paises?.length ? s.publico.paises.join(', ') : null].filter(Boolean)

/** Una segmentación: nombre y costo · chips del público · intereses (1 línea) · mensajes y gasto. */
function FilaSegmento({ s, n, oro, moneda }) {
  const intereses = s.publico?.intereses ?? []
  return <li className={`mkv2-seg ${s.pocos ? 'is-pocos' : ''}`}>
    <div className="mkv2-seg-l1">
      <span className={`mkv2-redes-li-n ${oro ? 'is-oro' : ''}`}>{n}</span>
      <b className="mkv2-una-linea" data-tip={`${s.nombre}\nCampaña: ${s.campana}`}>{nombreCampana(s.nombre)}</b>
      {s.pocos ? <span className="mkv2-redes-pocos">pocos datos</span> : <span className={`mkv2-redes-sem ${s.semaforo ? `is-${s.semaforo}` : ''}`}>{dinero(s.costo, moneda)}</span>}
    </div>
    <div className="mkv2-seg-chips">{chipsPublico(s).map((c) => <span key={c} className="mkv2-seg-chip">{c}</span>)}</div>
    {intereses.length > 0 && <div className="mkv2-seg-intereses mkv2-una-linea" data-tip={`Intereses (${intereses.length}):\n${intereses.join('\n')}`}>
      Intereses: {intereses.slice(0, 2).join(', ')}{intereses.length > 2 ? ` +${intereses.length - 2}` : ''}</div>}
    <div className="mkv2-seg-l3">{numero(s.mensajes)} {s.mensajes === 1 ? 'mensaje' : 'mensajes'} · {dinero(s.gastado, moneda)}</div>
  </li>
}

/** Segmentaciones: arriba solo las ganadoras (5+ mensajes); las de pocos datos, plegadas abajo. */
function Segmentaciones({ segmentos, moneda }) {
  const ganadoras = segmentos.filter((s) => !s.pocos)
  const pocas = segmentos.filter((s) => s.pocos)
  if (!segmentos.length) return <p className="mkv2-redes-vacio is-gris">Sin conjuntos con resultados en este mes</p>
  return <div className="mkv2-seg-caja">
    {ganadoras.length
      ? <ol className="mkv2-seg-lista">{ganadoras.map((s, i) => <FilaSegmento key={s.id} s={s} n={i + 1} oro={i === 0} moneda={moneda} />)}</ol>
      : <p className="mkv2-redes-vacio is-gris">Aún no hay suficientes datos este mes</p>}
    {pocas.length > 0 && <details className="mkv2-seg-pocos">
      <summary>Ver {pocas.length} con pocos datos <small>(menos de {MIN_MENSAJES} mensajes)</small></summary>
      <ol className="mkv2-seg-lista">{pocas.map((s, i) => <FilaSegmento key={s.id} s={s} n={ganadoras.length + i + 1} moneda={moneda} />)}</ol>
    </details>}
  </div>
}

/** Recuadros del detalle: cargando, error con «Reintentar» o el contenido. */
const Estado = ({ det, children }) => (det.cargando ? <p className="mkv2-redes-vacio is-gris">Cargando datos de Meta…</p>
  : det.error ? <Aviso titulo="No se pudo leer este detalle de Meta" texto={det.error} onReintentar={det.reintentar} /> : children)

export function AnunciosRedes({ datos, filtros }) {
  const det = useDetalleAnuncios(filtros.mes)
  return <AnunciosVista datos={datos} filtros={filtros} det={det} />
}

/** La vista, separada del pedido de datos (se prueba dibujándola con datos inventados). */
export function AnunciosVista({ datos, filtros, det }) {
  const f = { ...filtros, red: '', formato: '', estado: '' }
  // Reclutamiento aparte: no entra en los indicadores ni en la tabla de marketing (DECISIONES.md, 24/11/2026).
  const { marketing: todos, reclutamiento } = useMemo(() => separarReclutamiento(filtrarRedes(datos.anuncios, f)), [datos.anuncios, f.pais, f.marca, f.mes]) // eslint-disable-line react-hooks/exhaustive-deps
  const tRec = totalesAnuncios(reclutamiento)
  const notaRec = tRec.campanas > 0 && <p className="mkv2-nota" data-tip={reclutamiento.map((a) => `${a.campana}: ${dinero(a.gastado, a.moneda)}`).join('\n')}>
    <b>Reclutamiento (aparte):</b> {tRec.porMoneda.map((m) => dinero(m.gastado, m.moneda)).join(' · ')} en {numero(tRec.campanas)} {tRec.campanas === 1 ? 'campaña' : 'campañas'} · no cuenta en estos indicadores.</p>
  const { moneda, campanas, otras } = monedaPrincipal(todos)
  const k = indicadoresAnuncios(campanas)
  const d = (v) => dinero(v, moneda)

  // Detalle del mes elegido, con los mismos filtros de marca, país y red.
  const dt = filtrarDetalle(det.detalle, filtros, PAIS_DE)
  const monedaDet = dt?.moneda ?? moneda
  const dd = (v) => dinero(v, monedaDet)
  const edades = edadesDe(dt?.edadSexo)
  const edadBarata = masBarato(edades)
  const maxEdad = Math.max(1, ...edades.map((e) => Math.max(e.hombres, e.mujeres)))
  const ubic = ubicacionesDe(dt?.ubicaciones)
  const ubicBarata = masBarato(ubic)
  const horas = horasDe(dt?.horas)
  const maxHora = Math.max(1, ...horas.matriz.flat())
  const segmentos = segmentosDe(dt?.segmentos, monedaDet)
  const pres = presupuestosDe(dt?.presupuestos, monedaDet)
  const formularios = formulariosDe(dt?.formularios)
  const zona = dt?.zonaHoraria ? `${dt.zonaHoraria.replace('America/', '').replace('_', ' ')} (UTC−6)` : 'El Salvador (UTC−6)'

  // Marca filtrada (o la única marca del país filtrado) sin NINGÚN anuncio en la cuenta conectada, en ningún mes.
  const marcasFiltro = Object.keys(MARCAS).filter((m) => (!filtros.marca || m === filtros.marca) && (!filtros.pais || MARCAS[m].pais === filtros.pais))
  const conAnuncios = (m) => (datos.marcasConAnuncios ? datos.marcasConAnuncios.includes(m) : datos.anuncios.some((a) => a.marca === m))
  const sinCuenta = (filtros.marca || filtros.pais) && marcasFiltro.length === 1 && !conAnuncios(marcasFiltro[0]) ? MARCAS[marcasFiltro[0]] : null
  if (!todos.length) return <Tarjeta titulo="Anuncios">
    <p className="mkv2-redes-vacio is-gris">{sinCuenta
      ? `${sinCuenta.corto} no tiene anuncios en la cuenta publicitaria conectada (USD · El Salvador). Si pauta desde otra cuenta, hay que conectarla.`
      : 'Sin campañas de marketing en este mes con estos filtros.'}</p>{notaRec}</Tarjeta>
  return <>
    <p className="mkv2-redes-fase-nota"><span className="mkv2-redes-fase">Fase 2</span> Pedido de Ismael. Datos reales de Meta del mes elegido; el gasto se reparte por la página de cada anuncio. Un grupo con menos de {MIN_MENSAJES} mensajes dice «pocos datos» y no se elige como el mejor.{otras.length ? ` Se muestran las campañas en ${moneda}; hay otras en ${otras.join(', ')} que no se suman.` : ''}</p>
    {notaRec}
    <div className="mkv2-redes-kpis mkv2-redes-kpis7">
      <TarjetaRedes titulo="Impresiones" icono={Eye} color="#3987e5" valor={numero(k.impresiones)} sub="veces que se vieron" tip="Impresiones (visualizaciones) de los anuncios" />
      <TarjetaRedes titulo="Alcance" icono={Users} color="#2fb8c4" valor={numero(k.alcance)} sub={<>frecuencia <b>{k.frecuencia ? k.frecuencia.toFixed(1) : '—'}</b></>} tip="Suma del alcance de cada anuncio; frecuencia = impresiones ÷ alcance" />
      <TarjetaRedes titulo="Clics" icono={MousePointerClick} color="#9085e9" valor={numero(k.clics)} sub={<>CTR <b>{pct(k.ctr)}</b></>} tip="CTR = clics ÷ impresiones × 100 (calculado en el dashboard)" />
      <TarjetaRedes titulo="Costo por clic" icono={DollarSign} color={COLOR_MAILING.temporal} valor={d(k.cpc)} sub="inversión ÷ clics" tip="CPC calculado en el dashboard" />
      <TarjetaRedes titulo="Mensajes" icono={MessageCircle} color={COLOR_MAILING.entregados} valor={numero(k.mensajes)} sub={<><b>{d(k.costoMensaje)}</b> c/u</>} tip="Conversaciones iniciadas; costo = gasto ÷ mensajes" />
      {formularios > 0
        ? <TarjetaRedes titulo="Conversiones" icono={Target} color={COLOR_MAILING.duro} valor={numero(k.mensajes + formularios)} sub={`${numero(k.mensajes)} mensajes + ${numero(formularios)} formularios`}
          tip={`Mensajes y formularios de Meta (no son ventas).\nFormularios: solo el conteo que da Meta (acciones «lead»), sin leer su contenido.`} />
        : <TarjetaRedes titulo="Conversiones" icono={Target} color={COLOR_MAILING.duro} valor={numero(k.mensajes)} sub="mensajes" tip="Conversaciones iniciadas por los anuncios (no son ventas). Sin formularios en el mes." />}
      <TarjetaRedes titulo="Inversión" icono={Wallet} color="#5b6b84" valor={d(k.gastado)} sub={`${numero(new Set(campanas.map((c) => c.campana)).size)} campañas`} tip={`Gasto total en ${moneda} (sin reclutamiento)`} />
    </div>

    <div className="mkv2-duo mkv2-redes-duo-ads">
      <Tarjeta titulo="Horarios de mayor interés" sub={`Mensajes por día y hora · hora de ${zona}, la zona de la cuenta`}>
        <Estado det={det}>
          <div className="mkv2-redes-heat">
            <span />{Array.from({ length: 12 }, (_, b) => <span key={b} className="mkv2-redes-heat-h">{b * 2}h</span>)}
            {horas.matriz.map((fila, di) => <Fragment key={di}><span className="mkv2-redes-heat-d">{DIAS[di]}</span>
              {fila.map((v, b) => <span key={b} className="mkv2-redes-heat-c" style={{ background: `rgba(47,184,196,${(0.08 + 0.92 * (v / maxHora)).toFixed(2)})`, animationDelay: `${(di * 12 + b) * 0.004}s` }}
                data-tip={`${DIAS[di]} ${b * 2}:00–${b * 2 + 2}:00\n${numero(v)} mensajes${v > 0 && v < MIN_MENSAJES ? '\nPocos datos' : ''}`} />)}</Fragment>)}
          </div>
          <p className="mkv2-redes-esc">menos <i /> más · {horas.mejor
            ? <b>mejor: {DIAS[horas.mejor.dia]} de {horas.mejor.franja * 2}:00 a {horas.mejor.franja * 2 + 2}:00 ({numero(horas.mejor.mensajes)} mensajes)</b>
            : <>{numero(horas.total)} mensajes · <Pocos /> para elegir un mejor horario</>}</p>
        </Estado>
      </Tarjeta>
      <Tarjeta titulo="Público: edad y sexo" sub="Mensajes por edad y sexo · costo por mensaje">
        <Estado det={det}>
          {edades.length ? <>
            <div className="mkv2-redes-edad mkv2-redes-edad-h"><span /><span><i style={{ background: '#3b82e0' }} />Hombres</span><span><i style={{ background: '#d64f9a' }} />Mujeres</span><span>c/u</span></div>
            {edades.map((e, i) => <div key={e.edad} className={`mkv2-redes-edad ${e.pocos ? 'is-pocos' : ''}`}>
              <b>{e.edad}</b>
              <span className="is-izq"><i style={{ width: `${(e.hombres / maxEdad) * 100}%`, background: '#3b82e0', animationDelay: `${i * 0.05}s` }} data-tip={`${e.edad} · Hombres\n${numero(e.hombres)} mensajes`} /></span>
              <span><i style={{ width: `${(e.mujeres / maxEdad) * 100}%`, background: '#d64f9a', animationDelay: `${i * 0.05}s` }} data-tip={`${e.edad} · Mujeres\n${numero(e.mujeres)} mensajes`} /></span>
              <small className={e === edadBarata ? 'mkv2-redes-sem is-verde' : ''} data-tip={`${dd(e.gastado)} → ${numero(e.mensajes)} mensajes`}>{e.pocos ? <Pocos /> : dd(e.costo)}</small>
            </div>)}
            {edadBarata && <p className="mkv2-redes-esc"><b>Más barato: {edadBarata.edad}</b> · {dd(edadBarata.costo)} por mensaje</p>}
          </> : <p className="mkv2-redes-vacio is-gris">Sin mensajes en este mes</p>}
        </Estado>
      </Tarjeta>
    </div>

    <div className="mkv2-redes-tres">
      <Tarjeta titulo="Segmentaciones ganadoras" sub="Conjuntos de anuncios y su público, por costo por mensaje">
        <Estado det={det}><Segmentaciones segmentos={segmentos} moneda={monedaDet} /></Estado>
      </Tarjeta>
      <Tarjeta titulo="Presupuestos más efectivos" sub="Presupuesto de cada campaña: inversión vs mensajes · arriba de la línea = mejor que la meta · gris = pocos datos">
        <Estado det={det}><Burbujas filas={pres} moneda={monedaDet} /></Estado>
      </Tarjeta>
      <Tarjeta titulo="Plataforma y ubicación" sub="Dónde se ven los anuncios (impresiones)">
        <Estado det={det}>
          {ubic.length ? <>
            <DonaRedes centro={`${numero(Math.round(ubic.reduce((n, u) => n + u.impresiones, 0) / 1000))}k`} sub="impresiones"
              items={ubic.map((u, i) => ({ k: u.clave, l: `${u.nombre}${u.pocos ? ' (pocos datos)' : ''}`, v: u.impresiones,
                c: (u.red === 'fb' ? ['#3b82e0', '#6aa1ea', '#97bff2', '#c3dcf8'] : u.red === 'ig' ? ['#d64f9a', '#e27bb5', '#eda6cf', '#f7d0e7'] : ['#3f9c85', '#7cc3b0', '#5b6b84'])[i % (u.red === 'otra' ? 3 : 4)] }))} />
            {ubicBarata
              ? <p className="mkv2-redes-importante" style={{ '--c': COLOR_MAILING.entregados, marginTop: 8 }}>🏅 <b>{ubicBarata.nombre}</b> <span>es la más barata: {dd(ubicBarata.costo)} por mensaje</span></p>
              : <p className="mkv2-redes-esc"><Pocos /> para elegir la ubicación más barata</p>}
          </> : <p className="mkv2-redes-vacio is-gris">Sin impresiones en este mes</p>}
        </Estado>
      </Tarjeta>
    </div>

    <Tarjeta titulo={`Campañas · ${numero(new Set(campanas.map((c) => c.campana)).size)}`} sub={`Columnas del Excel de Marketing · en ${moneda} · tasas calculadas en el dashboard`}>
      <div className="fv2-tabla-caja"><table className="fv2-tabla mkv2-tabla">
        <thead><tr>{['Campaña', 'Marca', 'Presupuesto', 'Gastado', 'Alcance', 'Visualizaciones', 'Clics', 'CPC', 'Mensajes', 'Costo por mensaje'].map((h, i) => <th key={h} className={i > 1 ? 'num' : ''}>{h}</th>)}</tr></thead>
        <tbody>{[...campanas].sort((a, b) => b.gastado - a.gastado).map((a) => {
          const costo = a.mensajes > 0 ? a.gastado / a.mensajes : null
          const pocos = a.mensajes < MIN_MENSAJES
          return <tr key={a.id}><td className="mkv2-celda-campana"><b className="mkv2-una-linea" data-tip={a.campana}>{nombreCampana(a.campana)}</b></td><td>{MARCAS[a.marca]?.corto ?? 'Sin página'}</td><td className="num">{d(a.presupuesto ?? a.presupuestoDiario ?? null)}</td><td className="num">{d(a.gastado)}</td>
            <td className="num">{numero(a.alcance)}</td><td className="num">{numero(a.visualizaciones)}</td><td className="num">{numero(a.clics)}</td>
            <td className="num">{d(a.clics ? a.gastado / a.clics : null)}</td><td className="num">{numero(a.mensajes)}</td>
            <td className="num">{pocos && costo !== null ? <span data-tip="Menos de 5 mensajes">{d(costo)} <Pocos /></span> : d(costo)}</td></tr>
        })}</tbody>
      </table></div>
    </Tarjeta>
  </>
}
