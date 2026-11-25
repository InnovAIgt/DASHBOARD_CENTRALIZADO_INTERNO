// Canales de marketing · Redes sociales · ANUNCIOS (pedido de Ismael; mockup_redes_completo). Todo con DATOS REALES de
// Meta: indicadores y tabla por campaña (/anuncios, con el objetivo y el texto promocionado) y, del mes elegido,
// presupuestos (barras de costo por mensaje con la meta), ¿dónde se vieron?, segmentaciones, ¿cuándo nos escriben? y
// edad y sexo (/anuncios-detalle, por anuncio). Sin reclutamiento (va aparte). Un grupo con menos de 5 mensajes dice
// «pocos datos» y nunca sale como ganador. Todo lo que se puede tocar abre la ventana de detalle. Nunca se mezclan monedas.
import { Fragment, useMemo } from 'react'
import { numero, pct } from '../../datos/calculos.js'
import {
  filtrarDetalle, formulariosDe, horariosAnuncios, horasDe, indicadoresAnuncios, masBarato, MIN_MENSAJES, monedaPrincipal, objetivoTexto, piramideEdadSexo,
  plataformasDe, presupuestosDe, recomendacionHorario, segmentosDe, textoDias, ubicacionesDe,
} from '../../datos/anunciosFase2.js'
import { dinero, filtrarRedes, MARCAS, nombreCampana, separarReclutamiento, tituloLimpio, totalesAnuncios } from '../../datos/redes.js'
import { detalleCampana, detalleCostoLead, detalleListaLeads } from '../../datos/redesDetalle.js'
import { costoPorLead, leadsDelMes } from '../../datos/redesLeads.js'
import { DIAS, META_COSTO_MENSAJE } from '../../datos/redesVista.js'
import { useDetalleAnuncios } from '../../datos/useRedesDatos.js'
import { Aviso, COLOR_MAILING, COLOR_SEMAFORO, Tarjeta } from '../mailing/piezas.jsx'
import { clicDetalle, useDetalle } from './Detalle.jsx'
import { BarrasCosto, DonaRedes, TarjetaRedes } from './piezasRedes.jsx'

const colorSem = (s) => COLOR_SEMAFORO[s] ?? COLOR_MAILING.gris
const PAIS_DE = Object.fromEntries(Object.entries(MARCAS).map(([k, v]) => [k, v.pais]))
const COLOR_PLATAFORMA = { facebook: '#3987e5', instagram: '#d6589b', whatsapp: '#18935f', otras: '#5b6b84' }
const ROSA = '#d6589b'

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


/** ¿Cuándo nos escriben?: recomendación, 4 momentos del día, días de la semana, top 3 y el mapa por hora plegado. */
function CuandoEscriben({ horasDet, dd, zona, abrir }) {
  const h = horariosAnuncios(horasDet)
  const rec = recomendacionHorario(horasDet)
  const mapa = horasDe(horasDet)
  const maxMom = Math.max(1, ...h.momentos.map((m) => m.mensajes))
  const maxDia = Math.max(1, ...h.dias.map((d) => d.mensajes))
  const maxHora = Math.max(1, ...mapa.matriz.flat())
  const mejorMom = rec?.momento.k
  const detMomento = (m) => ({ etiqueta: '¿Cuándo nos escriben?', titulo: `${m.nombre} (${m.horas})`, chips: [`hora de ${zona}`],
    kpis: [{ t: 'Mensajes', v: numero(m.mensajes), c: '#2fb8c4' }, { t: 'Costo por mensaje', v: m.pocos ? 'pocos datos' : dd(m.costo), c: '#d98b1f' }, { t: 'Gasto', v: dd(m.gastado), c: '#5b6b84' }],
    bloques: [{ t: 'Por día de la semana', filas: DIAS.map((nombre, d) => { const q = horasDet.filter((x) => x.dia === d && m.franjas.includes(x.franja)); const n = q.reduce((s, x) => s + x.mensajes, 0); return { l: nombre, v: numero(n), n, c: '#2fb8c4' } }) }] })
  const detDia = (d) => ({ etiqueta: '¿Cuándo nos escriben?', titulo: d.nombre.replace(/^./, (l) => l.toUpperCase()), chips: [`hora de ${zona}`],
    kpis: [{ t: 'Mensajes', v: numero(d.mensajes), c: '#2fb8c4' }, { t: 'Costo por mensaje', v: d.pocos ? 'pocos datos' : dd(d.costo), c: '#d98b1f' }],
    bloques: [{ t: 'Por momento del día', filas: h.momentos.map((m) => { const q = horasDet.filter((x) => x.dia === d.dia && m.franjas.includes(x.franja)); const n = q.reduce((s, x) => s + x.mensajes, 0); return { l: `${m.nombre} (${m.horas})`, v: numero(n), n, c: '#2fb8c4' } }) }] })
  if (!h.total) return <p className="mkv2-redes-vacio is-gris">Sin mensajes en este mes</p>
  return <div className="mkv2-redes-cuando">
    <div className="mkv2-redes-recomendacion">
      <small>Recomendación</small>
      {rec ? <><b>Pautar {textoDias(rec.dias)}, de {String(rec.momento.desde).padStart(2, '0')}:00 a {String(rec.momento.hasta).padStart(2, '0')}:00</b>
        <span>Es cuando llegan más mensajes ({numero(rec.mensajes)}){rec.costo !== null ? ` a ${dd(rec.costo)} c/u` : ''}. Calculado con los mensajes del mes.</span></>
        : <><b>Aún no hay suficientes datos este mes</b><span>Ningún momento del día tiene {MIN_MENSAJES} mensajes o más.</span></>}
    </div>
    <div className="mkv2-redes-momentos">
      {h.momentos.map((m) => <div key={m.k} className={`mkv2-redes-momento mkv2-redes-clic ${m.k === mejorMom ? 'is-mejor' : ''} ${m.pocos ? 'is-pocos' : ''}`} {...clicDetalle(abrir, () => detMomento(m))}>
        <b>{m.nombre}</b><small>{m.horas}</small>
        <strong>{numero(m.mensajes)}</strong>
        <span className="mkv2-redes-momento-barra"><i style={{ height: `${(m.mensajes / maxMom) * 100}%` }} /></span>
        <em>{m.pocos ? 'pocos datos' : `${dd(m.costo)} c/u`}</em>
      </div>)}
    </div>
    <div className="mkv2-duo mkv2-redes-cuando-abajo">
      <div>
        <h4 className="mkv2-redes-subtitulo">Por día de la semana</h4>
        {h.dias.map((d) => <div key={d.dia} className="mkv2-redes-dia-fila mkv2-redes-clic" {...clicDetalle(abrir, () => detDia(d))}>
          <span>{DIAS[d.dia]}</span><span className="mkv2-redes-det-barra"><i style={{ width: `${(d.mensajes / maxDia) * 100}%`, background: '#2fb8c4' }} /></span><b>{numero(d.mensajes)}</b>
        </div>)}
      </div>
      <div>
        <h4 className="mkv2-redes-subtitulo">Los 3 mejores momentos</h4>
        {h.top.map((c, i) => <div key={`${c.dia}-${c.momento.k}`} className="mkv2-redes-li">
          <span className={`mkv2-redes-li-n ${i === 0 ? 'is-oro' : ''}`}>{i + 1}</span>
          <span className="mkv2-redes-li-t"><b>{DIAS[c.dia]} · {c.momento.nombre.toLowerCase()} ({c.momento.desde}–{c.momento.hasta} h)</b></span>
          <span className="mkv2-redes-li-v">{numero(c.mensajes)} msj{c.pocos && <small>pocos datos</small>}</span>
        </div>)}
      </div>
    </div>
    <details className="mkv2-seg-pocos">
      <summary>Ver mapa por hora <small>(mensajes por día y franja de 2 h)</small></summary>
      <div className="mkv2-redes-heat">
        <span />{Array.from({ length: 12 }, (_, b) => <span key={b} className="mkv2-redes-heat-h">{b * 2}h</span>)}
        {mapa.matriz.map((fila, di) => <Fragment key={di}><span className="mkv2-redes-heat-d">{DIAS[di]}</span>
          {fila.map((v, b) => <span key={b} className="mkv2-redes-heat-c" style={{ background: `rgba(47,184,196,${(0.08 + 0.92 * (v / maxHora)).toFixed(2)})` }}
            data-tip={`${DIAS[di]} ${b * 2}:00–${b * 2 + 2}:00\n${numero(v)} mensajes${v > 0 && v < MIN_MENSAJES ? '\nPocos datos' : ''}`} />)}</Fragment>)}
      </div>
    </details>
  </div>
}

/** Público: pirámide de edad y sexo (hombres a la izquierda, mujeres a la derecha), costo por grupo y frase de lectura. */
function Piramide({ edadSexo, dd, abrir }) {
  const p = piramideEdadSexo(edadSexo)
  if (!p.filas.length) return <p className="mkv2-redes-vacio is-gris">Sin mensajes en este mes</p>
  const detFila = (f) => ({ etiqueta: 'Edad y sexo', titulo: `${f.edad} años`,
    kpis: [{ t: 'Hombres', v: numero(f.hombres.mensajes), c: '#3b82e0', sub: f.hombres.pocos ? 'pocos datos' : `${dd(f.hombres.costo)} c/u` },
      { t: 'Mujeres', v: numero(f.mujeres.mensajes), c: '#d64f9a', sub: f.mujeres.pocos ? 'pocos datos' : `${dd(f.mujeres.costo)} c/u` },
      { t: 'Total', v: numero(f.mensajes), c: '#5b6b84', sub: `${dd(f.gastado)} gastado` }],
    texto: `Costo por mensaje del grupo: ${f.pocos ? 'pocos datos (menos de 5 mensajes)' : dd(f.costo)}.` })
  const barra = (g, lado) => <span className={`mkv2-redes-pir-lado is-${lado}`}>
    <i className={g.pocos ? 'is-pocos' : ''} style={{ width: `${(g.mensajes / p.max) * 100}%` }}>{g.mensajes > 0 && <b>{numero(g.mensajes)}</b>}</i>
  </span>
  return <div className="mkv2-redes-pir">
    <div className="mkv2-redes-pir-totales">
      <div style={{ '--c': '#3b82e0' }}><small>Hombres</small><b>{numero(p.hombres.mensajes)}</b><span>{Math.round(p.hombres.pct)} % · {p.hombres.pocos ? 'pocos datos' : `${dd(p.hombres.costo)} c/u`}</span></div>
      <div style={{ '--c': '#d64f9a' }}><small>Mujeres</small><b>{numero(p.mujeres.mensajes)}</b><span>{Math.round(p.mujeres.pct)} % · {p.mujeres.pocos ? 'pocos datos' : `${dd(p.mujeres.costo)} c/u`}</span></div>
      <div style={{ '--c': '#18935f' }}><small>Más barato</small><b>{p.barato ? `${p.barato.edad} ${p.barato.sexo}` : '—'}</b><span>{p.barato ? `${dd(p.barato.costo)} por mensaje` : 'pocos datos'}</span></div>
    </div>
    <div className="mkv2-redes-pir-cabeza"><span>Hombres</span><span /><span>Mujeres</span><span>c/u</span></div>
    {p.filas.map((f) => <div key={f.edad} className="mkv2-redes-pir-fila mkv2-redes-clic" {...clicDetalle(abrir, () => detFila(f))}>
      {barra(f.hombres, 'izq')}<span className="mkv2-redes-pir-edad">{f.edad}</span>{barra(f.mujeres, 'der')}
      <small className={p.barato && (p.barato === f.hombres || p.barato === f.mujeres) ? 'mkv2-redes-sem is-verde' : ''}>{f.pocos ? 'pocos datos' : dd(f.costo)}</small>
    </div>)}
    <p className="mkv2-redes-esc"><i style={{ background: '#3b82e0' }} /> Hombres · <i style={{ background: '#d64f9a' }} /> Mujeres · <i className="is-rayado" /> Rayado = pocos datos (menos de {MIN_MENSAJES})</p>
    {p.frase && <p className="mkv2-redes-lectura"><b>Lectura:</b> {p.frase}</p>}
  </div>
}

export function AnunciosRedes({ datos, filtros, leadsRedes = null }) {
  const det = useDetalleAnuncios(filtros.mes)
  return <AnunciosVista datos={datos} filtros={filtros} det={det} leadsRedes={leadsRedes} />
}

/** La vista, separada del pedido de datos (se prueba dibujándola con datos inventados). */
export function AnunciosVista({ datos, filtros, det, leadsRedes = null }) {
  const abrir = useDetalle()
  const f = { ...filtros, red: '', formato: '', estado: '' }
  // Reclutamiento aparte: no entra en los indicadores ni en la tabla de marketing (DECISIONES.md, 24/11/2026).
  const { marketing: todos, reclutamiento } = useMemo(() => separarReclutamiento(filtrarRedes(datos.anuncios, f)), [datos.anuncios, f.pais, f.marca, f.mes]) // eslint-disable-line react-hooks/exhaustive-deps
  const tRec = totalesAnuncios(reclutamiento)
  const notaRec = tRec.campanas > 0 && <p className="mkv2-nota" data-tip={reclutamiento.map((a) => `${a.campana}: ${dinero(a.gastado, a.moneda)}`).join('\n')}>
    <b>Reclutamiento (aparte):</b> {tRec.porMoneda.map((m) => dinero(m.gastado, m.moneda)).join(' · ')} en {numero(tRec.campanas)} {tRec.campanas === 1 ? 'campaña' : 'campañas'} · no cuenta en estos indicadores.</p>
  const { moneda, campanas, otras } = monedaPrincipal(todos)
  const k = indicadoresAnuncios(campanas)
  const d = (v) => dinero(v, moneda)
  const meta = META_COSTO_MENSAJE[moneda] ?? null

  // Detalle del mes elegido, con los mismos filtros de marca, país y red.
  const dt = filtrarDetalle(det.detalle, filtros, PAIS_DE)
  const monedaDet = dt?.moneda ?? moneda
  const dd = (v) => dinero(v, monedaDet)
  const ubic = ubicacionesDe(dt?.ubicaciones)
  const ubicBarata = masBarato(ubic)
  const plataformas = plataformasDe(dt?.ubicaciones)
  const segmentos = segmentosDe(dt?.segmentos, monedaDet)
  const pres = presupuestosDe(dt?.presupuestos, monedaDet)
  const formularios = formulariosDe(dt?.formularios)
  const zona = dt?.zonaHoraria ? `${dt.zonaHoraria.replace('America/', '').replace('_', ' ')} (UTC−6)` : 'El Salvador (UTC−6)'

  // Leads de Redes del mes (Prospekt, exactos por origen y país) para el costo por lead.
  const listos = leadsRedes?.fuente === 'prospekt'
  const leads = listos ? leadsDelMes(leadsRedes.leads, filtros.mes, { pais: filtros.pais, marca: filtros.marca }) : []
  // La pauta es solo de la cuenta USD (El Salvador): costo por lead = inversión ÷ leads de SV; en GT, «sin pauta».
  const cpl = costoPorLead({ gasto: k.gastado, leads, filtros })

  // Texto de la publicación promocionada: el de la creatividad o, si es una publicación existente, su título.
  const textoDe = (a) => a.texto || (a.publicacion ? datos.publicaciones.find((p) => p.id === `fb-${a.publicacion}`)?.titulo : null) || null
  const detCampana = (a) => detalleCampana(a, { moneda, objetivo: objetivoTexto(a.objetivo), texto: textoDe(a), meta })

  // Marca filtrada (o la única marca del país filtrado) sin NINGÚN anuncio en la cuenta conectada, en ningún mes.
  const marcasFiltro = Object.keys(MARCAS).filter((m) => (!filtros.marca || m === filtros.marca) && (!filtros.pais || MARCAS[m].pais === filtros.pais))
  const conAnuncios = (m) => (datos.marcasConAnuncios ? datos.marcasConAnuncios.includes(m) : datos.anuncios.some((a) => a.marca === m))
  const sinCuenta = (filtros.marca || filtros.pais) && marcasFiltro.length === 1 && !conAnuncios(marcasFiltro[0]) ? MARCAS[marcasFiltro[0]] : null
  if (!todos.length) return <Tarjeta titulo="Anuncios">
    <p className="mkv2-redes-vacio is-gris">{sinCuenta
      ? `${sinCuenta.corto} no tiene anuncios en la cuenta publicitaria conectada (USD · El Salvador). Si pauta desde otra cuenta, hay que conectarla.`
      : 'Sin campañas de marketing en este mes con estos filtros.'}</p>{notaRec}</Tarjeta>

  const porCampana = (titulo, campo, formato) => ({ etiqueta: 'Anuncios', titulo,
    bloques: [{ t: 'Por campaña', filas: [...campanas].sort((a, b) => b[campo] - a[campo]).map((a) => ({ l: nombreCampana(a.campana), tip: a.campana, v: formato(a[campo]), n: a[campo], c: MARCAS[a.marca]?.color, sub: MARCAS[a.marca]?.corto ?? 'Sin página', ir: detCampana(a) })) }] })
  return <>
    <p className="mkv2-redes-fase-nota"><span className="mkv2-redes-fase">Fase 2</span> Datos reales de Meta del mes elegido; el gasto se reparte por la página de cada anuncio. Un grupo con menos de {MIN_MENSAJES} mensajes dice «pocos datos» y no se elige como el mejor.{otras.length ? ` Se muestran las campañas en ${moneda}; hay otras en ${otras.join(', ')} que no se suman.` : ''}</p>
    {notaRec}
    <div className="mkv2-redes-kpis mkv2-redes-kpis7">
      <TarjetaRedes titulo="Impresiones" color="#3987e5" valor={numero(k.impresiones)} sub="veces que se vieron" tip="Clic para ver el detalle" onClick={() => abrir(porCampana(`Impresiones · ${numero(k.impresiones)}`, 'visualizaciones', numero))} />
      <TarjetaRedes titulo="Alcance" color="#2fb8c4" valor={numero(k.alcance)} sub={<>frecuencia <b>{k.frecuencia ? k.frecuencia.toFixed(1) : '—'}</b></>} tip="Suma del alcance de cada anuncio · clic para ver el detalle" onClick={() => abrir(porCampana(`Alcance · ${numero(k.alcance)}`, 'alcance', numero))} />
      <TarjetaRedes titulo="Clics" color="#9085e9" valor={numero(k.clics)} sub={<>CTR <b>{pct(k.ctr)}</b> · CPC {d(k.cpc)}</>} tip="Clic para ver el detalle" onClick={() => abrir(porCampana(`Clics · ${numero(k.clics)}`, 'clics', numero))} />
      <TarjetaRedes titulo="Mensajes" color={COLOR_MAILING.entregados} valor={numero(k.mensajes)} sub={<><b>{d(k.costoMensaje)}</b> c/u</>} tip="Clic para ver el detalle" onClick={() => abrir(porCampana(`Mensajes · ${numero(k.mensajes)}`, 'mensajes', numero))} />
      {formularios > 0
        ? <TarjetaRedes titulo="Conversiones" color={COLOR_MAILING.duro} valor={numero(k.mensajes + formularios)} sub={`${numero(k.mensajes)} mensajes + ${numero(formularios)} formularios`}
          tip="Mensajes y formularios de Meta (no son ventas). Formularios: solo el conteo de Meta, sin leer su contenido." />
        : <TarjetaRedes titulo="Conversiones" color={COLOR_MAILING.duro} valor={numero(k.mensajes)} sub="mensajes" tip="Conversaciones iniciadas por los anuncios (no son ventas). Sin formularios en el mes." />}
      <TarjetaRedes titulo="Leads" color={ROSA} valor={listos ? numero(leads.length) : '—'} sub={listos ? <><em className="mkv2-redes-exacto">de Redes</em> {cpl.sinPauta ? 'sin pauta' : `${d(cpl.costo)} c/u (SV)`}</> : <span className="mkv2-redes-por-conectar">por conectar</span>}
        tip={listos ? `Leads calificados de Redes del mes (Prospekt): ${numero(leads.length)} (SV ${numero(cpl.leadsSV)})
Costo por lead = inversión de la cuenta USD (El Salvador) ÷ leads de SV; Guatemala no tiene pauta
Clic para ver el detalle` : leadsRedes?.error || 'Leads de Prospekt por conectar'}
        onClick={listos ? () => abrir({ ...detalleCostoLead({ gasto: k.gastado, moneda, leads, filtros }), acciones: [], kpis: [...detalleCostoLead({ gasto: k.gastado, moneda, leads, filtros }).kpis, { t: 'Ver la lista', v: numero(leads.length), c: ROSA, sub: 'leads del mes', ir: detalleListaLeads(leads, 'Leads calificados de Redes', datos.publicaciones) }] }) : undefined} />
      <TarjetaRedes titulo="Inversión" color="#5b6b84" valor={d(k.gastado)} sub={`${numero(new Set(campanas.map((c) => c.campana)).size)} campañas`} tip={`Gasto total en ${moneda} (sin reclutamiento) · clic para ver el detalle`} onClick={() => abrir(porCampana(`Inversión · ${d(k.gastado)}`, 'gastado', d))} />
    </div>

    <div className="mkv2-redes-tres mkv2-redes-fila-ads">
      <Tarjeta titulo="Presupuestos más efectivos" sub="Cuánto costó cada mensaje · barra más corta = más barato · meta por confirmar">
        <Estado det={det}>
          <BarrasCosto meta={META_COSTO_MENSAJE[monedaDet] ?? null} formato={dd} colorDe={(x) => (x.semaforo ? colorSem(x.semaforo) : COLOR_MAILING.gris)}
            filas={[...pres].sort((a, b) => (a.costo ?? Infinity) - (b.costo ?? Infinity)).map((p) => ({ id: p.id, nombre: nombreCampana(p.campana), tip: p.campana,
              sub: `${dd(p.gastado)} → ${numero(p.mensajes)} msj${p.presupuestoDiario ? ` · ${dd(p.presupuestoDiario)} diario` : p.presupuestoTotal ? ` · ${dd(p.presupuestoTotal)} total` : ''}`,
              costo: p.costo, pocos: p.pocos, semaforo: p.semaforo,
              onClick: () => abrir(detalleCampana({ ...p, presupuesto: p.presupuestoTotal, moneda: monedaDet }, { moneda: monedaDet, meta: META_COSTO_MENSAJE[monedaDet] })) }))} />
          <p className="mkv2-redes-lectura"><b>Cómo leerla:</b> si la barra no pasa la línea punteada, la campaña está en meta.</p>
        </Estado>
      </Tarjeta>
      <Tarjeta titulo="¿Dónde se vieron?" sub="Impresiones por plataforma · clic para ver sus ubicaciones">
        <Estado det={det}>
          {plataformas.length ? <>
            <DonaRedes centro={`${numero(Math.round(plataformas.reduce((n, p) => n + p.impresiones, 0) / 1000))}k`} sub="impresiones"
              items={plataformas.map((p) => ({ k: p.k, l: p.nombre, v: p.impresiones, c: COLOR_PLATAFORMA[p.k] }))}
              onElegir={(kk) => { const p = plataformas.find((x) => x.k === kk); if (p) abrir({ etiqueta: '¿Dónde se vieron?', titulo: `${p.nombre} · ${numero(p.impresiones)} impresiones`,
                kpis: [{ t: 'Mensajes', v: numero(p.mensajes), c: '#18935f' }, { t: 'Costo por mensaje', v: p.pocos ? 'pocos datos' : dd(p.costo), c: '#d98b1f' }, { t: 'Gasto', v: dd(p.gastado), c: '#5b6b84' }],
                bloques: [{ t: 'Ubicaciones', filas: p.ubicaciones.map((u) => ({ l: u.nombre, v: numero(u.impresiones), n: u.impresiones, c: COLOR_PLATAFORMA[kk], sub: `${numero(u.mensajes)} msj · ${u.pocos ? 'pocos datos' : `${dd(u.costo)} c/u`}` })) }] }) }} />
            {ubicBarata
              ? <p className="mkv2-redes-importante" style={{ '--c': COLOR_MAILING.entregados, marginTop: 8 }}><b>{ubicBarata.nombre}</b> <span>es la más barata: {dd(ubicBarata.costo)} por mensaje</span></p>
              : <p className="mkv2-redes-esc"><span className="mkv2-redes-pocos">pocos datos</span> para elegir la ubicación más barata</p>}
          </> : <p className="mkv2-redes-vacio is-gris">Sin impresiones en este mes</p>}
        </Estado>
      </Tarjeta>
      <Tarjeta titulo="Segmentaciones ganadoras" sub="Públicos con 5+ mensajes · por costo por mensaje">
        <Estado det={det}><Segmentaciones segmentos={segmentos} moneda={monedaDet} /></Estado>
      </Tarjeta>
    </div>

    <div className="mkv2-duo mkv2-redes-duo-ads">
      <Tarjeta titulo="¿Cuándo nos escriben?" sub={`Mensajes de la pauta por momento del día y día de la semana · hora de ${zona}`}>
        <Estado det={det}><CuandoEscriben horasDet={dt?.horas ?? []} dd={dd} zona={zona} abrir={abrir} /></Estado>
      </Tarjeta>
      <Tarjeta titulo="Público: edad y sexo" sub="Mensajes por grupo · costo por mensaje · clic en una fila para ver el detalle">
        <Estado det={det}><Piramide edadSexo={dt?.edadSexo ?? []} dd={dd} abrir={abrir} /></Estado>
      </Tarjeta>
    </div>

    <Tarjeta titulo={`Campañas · ${numero(new Set(campanas.map((c) => c.campana)).size)}`} sub={`En ${moneda} · debajo del nombre, el objetivo y el texto promocionado · clic en una campaña para ver su detalle`}>
      <div className="fv2-tabla-caja"><table className="fv2-tabla mkv2-tabla mkv2-redes-campanas">
        <thead><tr>{['Campaña', 'Marca', 'Gastado', 'Alcance', 'Clics', 'CPC', 'Mensajes', 'Costo c/u'].map((h, i) => <th key={h} className={i > 1 ? 'num' : ''}>{h}</th>)}</tr></thead>
        <tbody>{[...campanas].sort((a, b) => b.gastado - a.gastado).map((a) => {
          const costo = a.mensajes > 0 ? a.gastado / a.mensajes : null
          const pocos = a.mensajes < MIN_MENSAJES
          const texto = textoDe(a)
          return <tr key={a.id} className={`mkv2-redes-clic ${pocos ? 'is-pocos' : ''}`} tabIndex={0} onClick={() => abrir(detCampana(a))} onKeyDown={(e) => { if (e.key === 'Enter') abrir(detCampana(a)) }}>
            <td className="mkv2-celda-campana"><b className="mkv2-una-linea" data-tip={a.campana}>{nombreCampana(a.campana)}</b>
              <small className="mkv2-una-linea mkv2-redes-campana-sub" data-tip={texto ?? undefined}>{[objetivoTexto(a.objetivo), texto ? `«${tituloLimpio(texto)}»` : null].filter(Boolean).join(' · ') || 'Sin objetivo ni texto en Meta'}</small></td>
            <td>{MARCAS[a.marca]?.corto ?? 'Sin página'}</td><td className="num">{d(a.gastado)}</td>
            <td className="num">{numero(a.alcance)}</td><td className="num">{numero(a.clics)}</td>
            <td className="num">{d(a.clics ? a.gastado / a.clics : null)}</td><td className="num">{numero(a.mensajes)}</td>
            <td className="num">{pocos ? <span className="mkv2-redes-pocos">pocos datos</span> : <span className={`mkv2-redes-sem ${costo !== null && meta ? (costo <= meta ? 'is-verde' : 'is-amarillo') : ''}`}>{d(costo)}</span>}</td></tr>
        })}</tbody>
      </table></div>
    </Tarjeta>
  </>
}
