// Canales de marketing · Redes sociales · RESUMEN (mockup_redes_completo). Orden: tarjetas → tabla de hechas y
// programadas por país y marca (con Leads) → píldoras → «Leads de Redes» → contenido. Todo se puede tocar: abre la
// ventana de detalle (Detalle.jsx). Comparaciones contra el MISMO PERÍODO del mes anterior si el mes está en curso.
// El dinero nunca suma monedas; el reclutamiento va aparte. caso = A (plan) | B (programadas de Facebook) | C (sin).
import { Fragment, useMemo, useState } from 'react'
import { numero, pct } from '../../datos/calculos.js'
import {
  alcancePorMarca, alcancePorSemana, COLOR_RED, dinero, filtrarRedes, FORMATOS, hechasYProgramadas, MARCAS, mesActualGt, metricasCuentas, nombreCampana, nombreMes, porRedFormato, REDES,
  resumenPublicaciones, seguidores, separarReclutamiento, serieSemanal, TEXTO_IG_SIN_PROGRAMADAS, tituloLimpio, totalesAnuncios,
} from '../../datos/redes.js'
import { detalleCampana, detalleCostoLead, detalleIndicador, detalleListaLeads, detalleMarca, detallePublicacion } from '../../datos/redesDetalle.js'
import { costoPorLead, leadsDelMes, leadsDePublicacion, leadsPorMarca, resumenLeadsRedes, TEXTO_CERRADOS } from '../../datos/redesLeads.js'
import { diaDeCorte, loImportante, META_COSTO_MENSAJE, mismoPeriodo, pautaPorCampana, programadoVsPublicado, topPublicaciones, variacion } from '../../datos/redesVista.js'
import { COLOR_MAILING, COLOR_SEMAFORO, Numero, Tarjeta } from '../mailing/piezas.jsx'
import { clicDetalle, useDetalle } from './Detalle.jsx'
import { AnioRedes } from './Anio.jsx'
import { useAnioRedes } from '../../datos/useRedesDatos.js'
import { Anillo, BarrasCosto, BarrasProgramado, BarrasSemana, DonaRedes, PildoraImportante, TarjetaRedes } from './piezasRedes.jsx'

const TEXTO_SEMAFORO = { verde: 'Cumplió', amarillo: 'Casi', rojo: 'Bajo' }
const COLOR_ESTADO = { publicada: COLOR_MAILING.entregados, no_publicada: COLOR_MAILING.duro, programada: '#5b6b84' }
const ETIQUETA_ESTADO = { publicada: 'Salieron', no_publicada: 'No salieron', programada: 'Por venir' }
const TONOS = { rojo: COLOR_MAILING.duro, verde: COLOR_MAILING.entregados, amarillo: COLOR_MAILING.temporal, morado: '#9085e9' }
const ROSA = '#d6589b'
const colorSem = (s) => COLOR_SEMAFORO[s] ?? COLOR_MAILING.gris
const COLORES_FORMATO = { fb: ['#3b82e0', '#6aa1ea', '#97bff2', '#c3dcf8'], ig: ['#d64f9a', '#e27bb5', '#eda6cf', '#f7d0e7'] }
export const POR_CONECTAR = 'por conectar'

/** Píldora del semáforo de cumplimiento. */
export function PildoraSem({ semaforo, cumplimiento }) {
  if (!semaforo) return <span className="fv2-tenue">sin programadas</span>
  return <span className={`mkv2-redes-sem is-${semaforo}`}>{TEXTO_SEMAFORO[semaforo]} · {Math.round(cumplimiento)} %</span>
}

/** ▲ / ▼ con su %; inverso = bajar es bueno (costos). */
export function Variacion({ v, inverso = false }) {
  if (v === null || v === undefined || !Number.isFinite(v) || Math.abs(v) < 0.5) return null
  const bueno = inverso ? v < 0 : v > 0
  return <b className={bueno ? 'is-sube' : 'is-baja'}>{v > 0 ? '▲' : '▼'} {Math.abs(v).toFixed(0)} %</b>
}

const dineroPorMoneda = (porMoneda, campo) => porMoneda.map((m) => dinero(m[campo], m.moneda)).join(' · ') || '—'

/** Número de leads, o «por conectar» mientras Prospekt no responde (con el motivo en el globo). */
const Leads = ({ listos, n, motivo }) => (listos ? <>{numero(n)}</> : <span className="mkv2-redes-por-conectar" data-tip={motivo || 'Leads de Prospekt por conectar'}>{POR_CONECTAR}</span>)

/**
 * Lo principal que pidió el ingeniero: publicaciones HECHAS y PROGRAMADAS por país y marca (RED GT = Guatemala; RED SV y
 * DATA RED = El Salvador), con los LEADS calificados de Redes. Instagram no da programadas. Clic en una fila = detalle.
 */
export function TablaHechasProgramadas({ items, marcas, filtros, leads, alAbrirMarca }) {
  const paises = hechasYProgramadas(items, marcas)
  const conFb = !filtros.red || filtros.red === 'fb'
  const conIg = !filtros.red || filtros.red === 'ig'
  const igSinProgramadas = paises.every((p) => p.total.igProgramadas === null)
  const filas = paises.reduce((n, p) => n + p.marcas.length + (p.marcas.length > 1 ? 1 : 0), 0)
  const pm = leads.listos ? leadsPorMarca(leads.delMes) : null
  let primeraFila = true
  const celdaIg = (x) => {
    if (!igSinProgramadas) return <td className="num">{x.igProgramadas === null ? '—' : numero(x.igProgramadas)}</td>
    if (!primeraFila) return null
    primeraFila = false
    return <td className="mkv2-redes-ig-sin" rowSpan={filas}>{TEXTO_IG_SIN_PROGRAMADAS}</td>
  }
  const celdaLeads = (n, extra = '') => <td className="num mkv2-redes-leads-celda"><Leads listos={leads.listos} n={n} motivo={leads.motivo} />{extra && <small> {extra}</small>}</td>
  const celdas = (x) => <>
    {conFb && <><td className="num"><b>{numero(x.fbHechas)}</b></td><td className="num">{numero(x.fbProgramadas)}</td></>}
    {conIg && <><td className="num"><b>{numero(x.igHechas)}</b></td>{celdaIg(x)}</>}
    <td className="num"><b>{numero(x.hechas)}</b></td>
  </>
  return <div className="fv2-tabla-caja"><table className="fv2-tabla mkv2-tabla mkv2-redes-hechas">
    <thead>
      <tr><th scope="col" rowSpan={2}>País</th><th scope="col" rowSpan={2}>Marca</th>
        {conFb && <th scope="colgroup" colSpan={2} className="num">Facebook</th>}
        {conIg && <th scope="colgroup" colSpan={2} className="num">Instagram</th>}
        <th scope="col" rowSpan={2} className="num">Total hechas</th>
        <th scope="col" rowSpan={2} className="num mkv2-redes-leads-th" data-tip="Leads calificados con origen «PostIAlo Redes Sociales» (Prospekt), por país y mes. En El Salvador, la marca sale de la publicación estimada; si no se sabe, «sin marca».">Leads calificados</th></tr>
      <tr>{conFb && <><th scope="col" className="num">Hechas</th><th scope="col" className="num" data-tip="Programadas pendientes en Facebook: por venir y las que ya debían salir y no salieron">Programadas</th></>}
        {conIg && <><th scope="col" className="num">Hechas</th><th scope="col" className="num">Programadas</th></>}</tr>
    </thead>
    <tbody>
      {paises.map((p) => <Fragment key={p.pais}>
        {p.marcas.map((x, i) => <tr key={x.marca} className={`mkv2-redes-clic ${filtros.marca === x.marca ? 'is-marcada' : ''}`} tabIndex={0}
          onClick={() => alAbrirMarca(x.marca)} onKeyDown={(e) => { if (e.key === 'Enter') alAbrirMarca(x.marca) }} data-tip={`${MARCAS[x.marca].nombre} · clic para ver el detalle`}>
          {i === 0 && <th scope="rowgroup" rowSpan={p.marcas.length + (p.marcas.length > 1 ? 1 : 0)}><span className="mkv2-redes-pais">{p.pais}</span>{p.nombre}</th>}
          <td><span className="mkv2-redes-punto" style={{ background: MARCAS[x.marca].color }} /><b>{MARCAS[x.marca].corto}</b>
            {!x.hechas && !x.fbProgramadas && !x.igProgramadas && <small className="mkv2-redes-sin-datos"> Sin datos para este mes</small>}</td>
          {celdas(x)}
          {celdaLeads(p.pais === 'GT' && pm ? pm.gt + (pm.sinMarca.GT ?? 0) : pm?.[x.marca] ?? 0)}
        </tr>)}
        {p.marcas.length > 1 && <tr className="mkv2-redes-subtotal"><td>Total {p.nombre}</td>{celdas(p.total)}
          {celdaLeads(pm ? p.marcas.reduce((n, x) => n + (pm[x.marca] ?? 0), 0) + (pm.sinMarca[p.pais] ?? 0) : 0, pm?.sinMarca[p.pais] ? `(${numero(pm.sinMarca[p.pais])} sin marca)` : '')}</tr>}
      </Fragment>)}
      {!paises.length && <tr><td colSpan={9} className="fv2-tabla-vacia">Sin marcas con estos filtros</td></tr>}
    </tbody>
  </table></div>
}

/** Bloque «Leads de Redes»: del post al cliente (embudo) y leads del mes. */
function LeadsDeRedes({ leads, alcance, mensajes, gasto, moneda, abrir, items, filtros }) {
  const r = leads.listos ? resumenLeadsRedes(leads.delMes) : null
  const pasos = [
    { k: 'Alcance', sub: 'vieron el contenido', v: alcance ?? 0, c: '#2fb8c4', fuente: 'Meta' },
    { k: 'Mensajes', sub: 'escribieron por la pauta', v: mensajes, c: '#9085e9', fuente: 'Meta' },
    { k: 'Leads calificados', sub: 'origen Redes', v: r?.total, c: ROSA, fuente: 'Prospekt', lista: leads.delMes },
    { k: 'En proceso', sub: 'etapas 2 a 5', v: r?.enProceso, c: '#d9a520', fuente: 'Prospekt', lista: leads.delMes?.filter((l) => !(l.etapa === 6 || String(l.status).toLowerCase() === 'cerrado') && l.etapa >= 2) },
    { k: TEXTO_CERRADOS, sub: 'etapa 6 · Prospekt no separa ganados y perdidos', v: r?.cerrados, c: '#18935f', fuente: 'Prospekt', lista: leads.delMes?.filter((l) => l.etapa === 6 || String(l.status).toLowerCase() === 'cerrado') },
  ]
  // Las barras no van a escala con el alcance: se dibujan en escala logarítmica para que se vean todas.
  const escala = (v) => (v > 0 ? Math.log10(v + 1) / Math.log10(Math.max(...pasos.map((p) => p.v ?? 0), 1) + 1) : 0)
  // La pauta es solo de la cuenta USD (El Salvador): costo por lead = inversión ÷ leads de SV; en GT, «sin pauta».
  const cpl = costoPorLead({ gasto, leads: leads.delMes, filtros })
  const abrirPaso = (p) => (p.lista && leads.listos ? abrir(detalleListaLeads(p.lista, p.k, items)) : null)
  return <>
    <h2 className="mkv2-redes-seccion">Leads de Redes</h2>
    <div className="mkv2-duo mkv2-redes-leads">
      <Tarjeta titulo="Del post al cliente" sub="Cuántos avanzan en cada paso · clic en un paso de Prospekt para ver la lista">
        <div className="mkv2-redes-embudo">
          {pasos.map((p) => <div key={p.k} className={`mkv2-redes-embudo-fila ${p.lista && leads.listos ? 'mkv2-redes-clic' : ''}`}
            {...(p.lista && leads.listos ? { role: 'button', tabIndex: 0, onClick: () => abrirPaso(p), onKeyDown: (e) => { if (e.key === 'Enter') abrirPaso(p) } } : {})}>
            <span className="mkv2-redes-embudo-l"><b>{p.k} <em className={`is-${p.fuente === 'Meta' ? 'meta' : 'prospekt'}`}>{p.fuente}</em></b><small>{p.sub}</small></span>
            <span className="mkv2-redes-embudo-barra">{p.v !== undefined && p.v !== null && <i style={{ width: `${Math.max(2, escala(p.v) * 100)}%`, background: p.c }} />}</span>
            <span className="mkv2-redes-embudo-v">{p.v === undefined || p.v === null ? <Leads listos={false} motivo={leads.motivo} /> : numero(p.v)}</span>
          </div>)}
        </div>
        <p className="mkv2-nota">Las barras no van a escala (escala logarítmica): el alcance es mucho mayor que el resto.</p>
      </Tarjeta>
      <Tarjeta titulo="Leads del mes" sub="Solo origen «PostIAlo Redes Sociales» · sin pruebas (LDTEST)">
        <div className="mkv2-redes-leads-mes">
          <div className={`mkv2-redes-mini-kpi ${leads.listos ? 'mkv2-redes-clic' : ''}`} style={{ '--c': ROSA }}
            {...(leads.listos ? clicDetalle(abrir, () => detalleListaLeads(leads.delMes, 'Leads calificados de Redes', items)) : {})}>
            <small>Calificados <em className="mkv2-redes-exacto">exacto</em></small><b><Leads listos={leads.listos} n={r?.total} motivo={leads.motivo} /></b>
            <span>{r ? `GT ${numero(r.porPais.GT)} · SV ${numero(r.porPais.SV)}` : ''}</span></div>
          <div className="mkv2-redes-mini-kpi" style={{ '--c': '#18935f' }}><small>{TEXTO_CERRADOS}</small><b><Leads listos={leads.listos} n={r?.cerrados} motivo={leads.motivo} /></b>
            <span>{r?.total ? `${pct((r.cerrados / r.total) * 100)} de los leads` : ''}</span></div>
          <div className={`mkv2-redes-mini-kpi ${leads.listos ? 'mkv2-redes-clic' : ''}`} style={{ '--c': '#d9a520' }}
            {...(leads.listos ? clicDetalle(abrir, () => detalleCostoLead({ gasto, moneda, leads: leads.delMes, filtros })) : {})}>
            <small>Costo por lead</small><b>{!leads.listos ? <Leads listos={false} motivo={leads.motivo} /> : cpl.sinPauta ? 'Sin pauta' : dinero(cpl.costo, moneda)}</b>
            <span>{cpl.sinPauta ? 'Guatemala no tiene pauta conectada' : `inversión ÷ ${numero(cpl.leadsSV)} leads de SV · GT sin pauta`}</span></div>
          <div className="mkv2-redes-mini-kpi" style={{ '--c': '#5b6b84' }}><small>No calificados</small><b>{leads.noCalificados ? numero(leads.noCalificados.total) : '—'}</b>
            <span>total de Prospekt · no dice el canal</span></div>
        </div>
      </Tarjeta>
    </div>
  </>
}

export function ResumenRedes({ datos, items, filtros, filtrar, irA, caso, leadsRedes = null }) {
  const abrir = useDetalle()
  const [lista, setLista] = useState('top')
  // «Mes elegido» o «Año» (enero → mes actual). El año se pide a Meta SOLO cuando se elige esta opción.
  const [vista, setVista] = useState('mes')
  const mesActual = mesActualGt()
  const anio = useAnioRedes(mesActual, vista === 'anio')
  const selectorVista = <div className="mkv2-tc-vistas mkv2-redes-vista" role="tablist" aria-label="Ver el mes o el año">
    <button type="button" role="tab" aria-selected={vista === 'mes'} className={vista === 'mes' ? 'is-activo' : ''} onClick={() => setVista('mes')}>{nombreMes(filtros.mes)}</button>
    <button type="button" role="tab" aria-selected={vista === 'anio'} className={vista === 'anio' ? 'is-activo' : ''} onClick={() => setVista('anio')}>Año {mesActual.slice(0, 4)}</button>
  </div>
  const f = { ...filtros, formato: '', estado: '' }
  const base = useMemo(() => filtrarRedes(items, f), [items, f.pais, f.marca, f.red, f.mes]) // eslint-disable-line react-hooks/exhaustive-deps
  const corte = diaDeCorte(filtros.mes, datos.hoy)
  // Comparación contra el mes anterior al elegido (en enero, diciembre 2025) solo si Meta dio datos de ese mes.
  const mesAntPedido = datos.meses[datos.meses.indexOf(filtros.mes) + 1]
  const mesAnt = mesAntPedido && (items.some((x) => String(x.fecha).startsWith(mesAntPedido)) || datos.anuncios.some((a) => a.mes === mesAntPedido)
    || datos.cuentas.some((c) => (c.metricas?.[mesAntPedido]?.alcanceDiario ?? 0) > 0)) ? mesAntPedido : null
  const baseAnt = mesAnt ? mismoPeriodo(filtrarRedes(items, { ...f, mes: mesAnt }), corte) : null
  const textoAnt = mesAnt ? (corte ? `vs 1–${corte} ${nombreMes(mesAnt).split(' ')[0].slice(0, 3).toLowerCase()}` : 'vs mes anterior') : ''
  const r = resumenPublicaciones(base)
  const rAnt = baseAnt ? resumenPublicaciones(baseAnt) : null
  const marcas = Object.keys(MARCAS).filter((m) => (!filtros.pais || MARCAS[m].pais === filtros.pais) && (!filtros.marca || m === filtros.marca))
  const cuentas = filtrarRedes(datos.cuentas, { ...f, mes: '' })
  // Anuncios: el reclutamiento NO cuenta en inversión, mensajes ni costo por mensaje; se muestra aparte con su gasto.
  const { marketing: anuncios, reclutamiento } = separarReclutamiento(filtrarRedes(datos.anuncios, { ...f, red: '' }))
  const anunciosAnt = mesAnt ? separarReclutamiento(filtrarRedes(datos.anuncios, { ...f, red: '', mes: mesAnt })).marketing : []
  const tRec = totalesAnuncios(reclutamiento)
  const gtSinPauta = marcas.includes('gt') && !filtrarRedes(datos.anuncios, { ...f, red: '', marca: 'gt' }).length
  // Alcance de las cuentas: suma del alcance de cada día, y el mismo período del mes anterior con el MISMO cálculo.
  const mc = metricasCuentas(cuentas, filtros.mes)
  const mcAnt = mesAnt ? metricasCuentas(cuentas, mesAnt, corte) : null
  const alcMarca = alcancePorMarca(cuentas, filtros.mes, null, marcas)
  const alcMarcaAnt = mesAnt ? alcancePorMarca(cuentas, mesAnt, corte, marcas) : null
  const alcTotal = Object.values(alcMarca).reduce((n, v) => n + v, 0)
  const t = totalesAnuncios(anuncios)
  const tAnt = totalesAnuncios(anunciosAnt)
  const unaMoneda = t.porMoneda.length === 1 ? t.porMoneda[0] : null
  const moneda = unaMoneda?.moneda ?? 'USD'
  const costoAnt = unaMoneda ? tAnt.porMoneda.find((m) => m.moneda === unaMoneda.moneda)?.costoMensaje ?? null : null
  const conPlan = caso !== 'C'
  const redes = filtros.red ? [filtros.red] : ['fb', 'ig']
  const importante = loImportante(base, anuncios, marcas).filter((x) => conPlan || x.tipo !== 'cumplimiento')
  const nFb = base.filter((p) => p.estado === 'publicada' && p.red === 'fb').length
  const masFb = nFb >= r.publicadas - nFb
  const noSalieron = base.filter((p) => p.estado === 'no_publicada')
  const top = topPublicaciones(base)
  const pauta = pautaPorCampana(anuncios)
  const pvp = programadoVsPublicado(base, marcas)
  const hayProgramadas = conPlan && pvp.some((x) => x.programadas > 0)

  // Leads de Redes (Prospekt): exactos por país y mes; marca por la publicación estimada.
  const listos = leadsRedes?.fuente === 'prospekt'
  const leads = {
    listos,
    motivo: leadsRedes?.cargando ? 'Cargando leads de Prospekt…' : leadsRedes?.error || 'Leads de Prospekt por conectar',
    delMes: listos ? leadsDelMes(leadsRedes.leads, filtros.mes, f) : [],
    noCalificados: leadsRedes?.noCalificados ?? null,
  }
  const leadsMes = resumenLeadsRedes(leads.delMes)
  const ctx = { items: base, cuentas, mes: filtros.mes, marcas, anuncios, reclutamiento, alcanceMarca: alcMarca, textoAnt, alcanceAnt: mcAnt?.alcanceDiario ?? null }
  const abrirMarca = (m) => abrir({ ...detalleMarca(m, { items: base, cuentas, mes: filtros.mes, alcance: alcMarca[m] ?? 0, alcanceAnt: alcMarcaAnt?.[m] ?? null, textoAnt,
    leads: leads.delMes.filter((l) => (m === 'gt' ? l.pais === 'GT' : l.marca === m)) }), acciones: [{ texto: filtros.marca === m ? 'Ver todas las marcas' : 'Filtrar por esta marca', alHacer: () => filtrar({ marca: filtros.marca === m ? '' : m }) }] })
  const abrirPub = (p) => abrir(detallePublicacion(p, leadsDePublicacion(leads.delMes, p.id)))

  if (vista === 'anio') {
    return <>{selectorVista}<AnioRedes anio={anio} leads={leadsRedes?.leads ?? []} leadsListos={listos} filtros={{ ...filtros, mesActual }}
      alElegirMes={(m) => { filtrar({ mes: m }); setVista('mes') }} /></>
  }

  return <>
    {selectorVista}
    <div className="mkv2-redes-kpis">
      <TarjetaRedes titulo="Publicaciones" color={conPlan ? colorSem(r.semaforo) : COLOR_MAILING.apertura} serie={serieSemanal(base, filtros.mes)}
        valor={<><Numero n={conPlan ? r.cumplidas : r.publicadas} />{conPlan && r.aFecha > 0 && <small> de {numero(r.aFecha)}</small>}</>}
        sub={conPlan ? <><PildoraSem semaforo={r.semaforo} cumplimiento={r.cumplimiento} /> · {numero(r.programadas)} por venir</> : 'publicadas · sin programadas'}
        tip="Clic para ver el detalle" onClick={() => abrir({ ...detalleIndicador('publicaciones', ctx), acciones: [{ texto: 'Ver la lista en Publicaciones', alHacer: () => irA('publicaciones') }] })} />
      <TarjetaRedes titulo="Alcance" color="#2fb8c4" serie={serieSemanal(base, filtros.mes, 'alcance')} valor={mc ? <Numero n={mc.alcanceDiario} /> : '—'}
        sub={mcAnt ? <><Variacion v={variacion(mc?.alcanceDiario, mcAnt.alcanceDiario)} /> {textoAnt} · suma diaria</> : 'suma de alcance diario'}
        tip="Suma del alcance de cada día de las cuentas · clic para ver el detalle" onClick={() => abrir(detalleIndicador('alcance', ctx))} />
      <TarjetaRedes titulo="Interacciones" color="#9085e9" serie={serieSemanal(base, filtros.mes, 'interacciones')} valor={<Numero n={r.interacciones} />}
        sub={<>tasa <b>{pct(r.tasa)}</b> {rAnt && <Variacion v={variacion(r.tasa, rAnt.tasa)} />}</>} tip="Clic para ver el detalle" onClick={() => abrir(detalleIndicador('interacciones', ctx))} />
      <TarjetaRedes titulo="Seguidores" color="#3987e5" valor={<Numero n={seguidores(cuentas)} />}
        sub={`${numero(cuentas.length)} ${cuentas.length === 1 ? 'cuenta' : 'cuentas'}`} tip="Clic para ver el detalle" onClick={() => abrir(detalleIndicador('seguidores', ctx))} />
      <TarjetaRedes titulo="Inversión" color={COLOR_MAILING.duro}
        valor={unaMoneda ? <Numero n={unaMoneda.gastado} formato={(x) => dinero(x, unaMoneda.moneda)} /> : t.porMoneda.length ? <span className="mkv2-redes-monedas">{dineroPorMoneda(t.porMoneda, 'gastado')}</span> : '—'}
        sub={`${numero(t.campanas)} ${t.campanas === 1 ? 'campaña' : 'campañas'}${tRec.campanas ? ' · reclutamiento aparte' : ''}`}
        tip="Sin reclutamiento · clic para ver el detalle" onClick={() => abrir(detalleIndicador('inversion', ctx))} />
      <TarjetaRedes titulo="Mensajes" color={COLOR_MAILING.entregados} valor={<Numero n={t.mensajes} />}
        sub={<><b>{dineroPorMoneda(t.porMoneda, 'costoMensaje')}</b> c/u {unaMoneda && <Variacion v={variacion(unaMoneda.costoMensaje, costoAnt)} inverso />}</>}
        tip="Clic para ver el detalle" onClick={() => abrir(detalleIndicador('mensajes', ctx))} />
    </div>

    <Tarjeta titulo="Publicaciones hechas y programadas · por país y marca" sub={`${nombreMes(filtros.mes)} · hechas = publicadas · programadas = pendientes de Facebook · clic en una marca para ver el detalle`}>
      <TablaHechasProgramadas items={base} marcas={marcas} filtros={filtros} leads={leads} alAbrirMarca={abrirMarca} />
    </Tarjeta>

    <div className="mkv2-redes-importantes" aria-label="Lo importante del mes">
      {importante.map((x) => <PildoraImportante key={x.tipo}
        color={x.tono === 'marca' ? MARCAS[x.marca]?.color : TONOS[x.tono]} texto={x.tipo === 'top' ? tituloLimpio(x.texto) : x.texto} detalle={x.detalle} tip={x.tip}
        onClick={x.tipo === 'formato' ? () => { filtrar({ formato: x.formato }); irA('publicaciones') } : x.tipo === 'pauta' ? () => irA('anuncios') : x.tipo === 'top' && top[0] ? () => abrirPub(top[0]) : undefined} />)}
      {listos && <PildoraImportante color={ROSA} texto={`${numero(leadsMes.total)} leads calificados de Redes`} detalle={`${numero(leadsMes.cerrados)} cerrados (ganados o perdidos)`}
        tip="Clic para ver la lista" onClick={() => abrir(detalleListaLeads(leads.delMes, 'Leads calificados de Redes', base))} />}
    </div>

    <LeadsDeRedes leads={leads} alcance={mc?.alcanceDiario} mensajes={t.mensajes} gasto={unaMoneda?.gastado ?? 0} moneda={moneda} abrir={abrir} items={base} filtros={f} />

    <h2 className="mkv2-redes-seccion">Contenido</h2>
    <div className="mkv2-redes-tres">
      <Tarjeta titulo="¿Cumplimos lo programado?" sub={caso === 'C' ? 'Sin programadas para comparar' : caso === 'B' ? 'Programadas de Facebook (API) · hasta hoy' : 'Plan del mes · hasta hoy'}>
        {conPlan
          ? <DonaRedes activo={filtros.estado} centro={r.cumplimiento === null ? '—' : <Numero n={r.cumplimiento} formato={(x) => `${Math.round(x)} %`} />} sub="cumplido"
            items={['publicada', 'no_publicada', 'programada'].map((k) => ({ k, l: ETIQUETA_ESTADO[k], v: k === 'publicada' ? r.cumplidas : k === 'no_publicada' ? r.noPublicadas : r.programadas, c: COLOR_ESTADO[k] }))}
            onElegir={(k) => { filtrar({ estado: filtros.estado === k ? '' : k }); irA('publicaciones') }} />
          : <p className="mkv2-redes-nota-caso">No hay programadas de Facebook este mes: se muestra solo lo publicado. {TEXTO_IG_SIN_PROGRAMADAS}.</p>}
      </Tarjeta>
      <Tarjeta titulo="Publicaciones por marca" sub="Publicadas · clic para ver el detalle">
        <DonaRedes activo={filtros.marca} centro={<Numero n={r.publicadas} />} sub="publicadas"
          items={marcas.map((m) => ({ k: m, l: MARCAS[m].corto, v: base.filter((p) => p.estado === 'publicada' && p.marca === m).length, c: MARCAS[m].color }))}
          onElegir={abrirMarca} />
      </Tarjeta>
      <Tarjeta titulo="Por red y formato" sub="Publicadas · clic filtra Publicaciones">
        <DonaRedes activo={filtros.red && filtros.formato ? `${filtros.red}|${filtros.formato}` : ''}
          centro={r.publicadas ? `${Math.round(((masFb ? nFb : r.publicadas - nFb) / r.publicadas) * 100)} %` : '—'} sub={masFb ? 'en Facebook' : 'en Instagram'}
          items={porRedFormato(base).map((x) => ({ k: x.clave, l: `${x.red === 'fb' ? 'FB' : 'IG'} · ${FORMATOS[x.formato] ?? x.formato}`, v: x.publicaciones,
            c: COLORES_FORMATO[x.red]?.[Object.keys(FORMATOS).indexOf(x.formato)] ?? COLOR_RED[x.red] }))}
          onElegir={(k) => { const [red, formato] = k.split('|'); filtrar(filtros.red === red && filtros.formato === formato ? { formato: '' } : { red, formato }); irA('publicaciones') }} />
      </Tarjeta>
    </div>

    <div className="mkv2-duo">
      {hayProgramadas && <Tarjeta titulo="Programado vs publicado por marca" sub="Gris = programadas a la fecha · color = publicadas (semáforo) · clic para ver el detalle">
        <BarrasProgramado activa={filtros.marca} onElegir={abrirMarca}
          filas={pvp.map((x) => ({ ...x, nombre: MARCAS[x.marca].nombre, corto: MARCAS[x.marca].corto, color: colorSem(x.semaforo) }))} />
      </Tarjeta>}
      <Tarjeta titulo="Alcance por semana" sub="Facebook e Instagram lado a lado · publicaciones del mes · clic en una semana para ver sus publicaciones">
        <BarrasSemana semanas={alcancePorSemana(base, filtros.mes)} redes={redes} corte={corte} onElegir={(s) => {
          const pubs = base.filter((p) => p.estado === 'publicada' && Number(p.fecha.slice(8, 10)) >= s.desde && Number(p.fecha.slice(8, 10)) <= s.hasta && redes.includes(p.red))
          abrir({ etiqueta: 'Semana', titulo: `Días ${s.desde}–${s.hasta} · ${numero(pubs.length)} publicaciones`,
            kpis: redes.map((rd) => ({ t: `Alcance ${REDES[rd]}`, v: numero(s[rd]), c: COLOR_RED[rd] })),
            bloques: [{ t: 'Publicaciones', vacio: 'Sin publicaciones esa semana', filas: pubs.sort((a, b) => b.alcance - a.alcance).map((p) => ({ l: tituloLimpio(p.titulo), tip: p.titulo, v: numero(p.alcance), n: p.alcance, c: COLOR_RED[p.red], sub: `${MARCAS[p.marca]?.corto} · ${REDES[p.red]} · ${p.fecha.slice(8, 10)}/${p.fecha.slice(5, 7)}`, ir: detallePublicacion(p, leadsDePublicacion(leads.delMes, p.id)) })) }] })
        }} />
      </Tarjeta>
    </div>

    <div className="mkv2-redes-tres mkv2-redes-fila-baja">
      <Tarjeta titulo="¿Qué marca va mejor?" sub={`Alcance (suma diaria de sus cuentas)${alcMarcaAnt ? ` ${textoAnt}` : ''} · el círculo es su parte del alcance · clic para ver el detalle`} className="mkv2-redes-baja">
        <div className="mkv2-redes-marcas">
          {marcas.map((m, i) => {
            const s = resumenPublicaciones(base.filter((p) => p.marca === m))
            const alc = alcMarca[m] ?? 0
            const ant = alcMarcaAnt ? alcMarcaAnt[m] ?? 0 : null
            const parte = alcTotal > 0 ? (alc / alcTotal) * 100 : 0
            const nLeads = leads.delMes.filter((l) => (m === 'gt' ? l.pais === 'GT' : l.marca === m)).length
            return <button type="button" key={m} className={`mkv2-redes-marca ${filtros.marca === m ? 'is-activa' : ''}`} style={{ '--c': MARCAS[m].color, animationDelay: `${i * 0.06}s` }}
              onClick={() => abrirMarca(m)} data-tip={`${MARCAS[m].nombre} (${MARCAS[m].pais}) · clic para ver el detalle`}>
              <Anillo pct={parte} color={MARCAS[m].color} />
              <span className="mkv2-redes-marca-datos">
                <span className="mkv2-redes-marca-cabeza"><b>{MARCAS[m].corto}</b><em>{MARCAS[m].pais}</em></span>
                {s.publicadas === 0 && !alc
                  ? <span className="mkv2-redes-marca-sin">Sin datos para este mes</span>
                  : s.publicadas === 0
                  ? <span className="mkv2-redes-marca-sin">Sin publicaciones este mes<small>alcance de la cuenta: {numero(alc)}</small></span>
                  : <span className="mkv2-redes-marca-cifras">
                    <span><b>{numero(conPlan ? s.cumplidas : s.publicadas)}{conPlan ? `/${numero(s.aFecha)}` : ''}</b><small>publicadas</small></span>
                    <span><b>{numero(alc)} {ant !== null && <Variacion v={variacion(alc, ant)} />}</b><small>alcance</small></span>
                    <span><b className="mkv2-redes-rosa"><Leads listos={listos} n={nLeads} motivo={leads.motivo} /></b><small>leads</small></span>
                  </span>}
              </span>
            </button>
          })}
        </div>
      </Tarjeta>
      <Tarjeta titulo={lista === 'top' || !conPlan ? 'Top 5 publicaciones' : 'Lo que no salió'} sub="Por interacciones · clic para ver el detalle" className="mkv2-redes-baja"
        acciones={conPlan && <div className="mkv2-redes-minitabs">
          <button type="button" className={lista === 'top' ? 'is-activa' : ''} onClick={() => setLista('top')}>Top 5</button>
          <button type="button" className={lista === 'no' ? 'is-activa' : ''} onClick={() => setLista('no')}>No salieron{noSalieron.length ? ` (${noSalieron.length})` : ''}</button>
        </div>}>
        <div className="mkv2-redes-lista mkv2-redes-lista-llena">
          {lista === 'top' || !conPlan
            ? (top.length ? top.map((p, i) => <div key={p.id} className="mkv2-redes-li mkv2-redes-clic" style={{ animationDelay: `${i * 0.05}s` }} data-tip={p.titulo} {...clicDetalle(abrir, () => detallePublicacion(p, leadsDePublicacion(leads.delMes, p.id)))}>
              <span className={`mkv2-redes-li-n ${i === 0 ? 'is-oro' : ''}`}>{i + 1}</span>
              <span className="mkv2-redes-li-t"><b className="mkv2-dos-lineas">{tituloLimpio(p.titulo)}</b><small>{MARCAS[p.marca]?.corto} · <span className={`mkv2-redes-red is-${p.red}`}>{p.red === 'fb' ? 'FB' : 'IG'}</span> · {FORMATOS[p.formato] ?? p.formato}</small></span>
              <span className="mkv2-redes-li-v">{numero(p.interacciones)}<small>{pct(p.alcance ? (p.interacciones / p.alcance) * 100 : null)}</small></span>
            </div>) : <p className="mkv2-redes-vacio is-gris">Sin publicaciones con estos filtros</p>)
            : noSalieron.length
              ? noSalieron.map((p) => <div key={p.id} className="mkv2-redes-li is-no mkv2-redes-clic" data-tip={p.titulo} {...clicDetalle(abrir, () => detallePublicacion(p))}>
                <span className="mkv2-redes-li-n">{Number(p.fecha.slice(8, 10))}</span>
                <span className="mkv2-redes-li-t"><b className="mkv2-dos-lineas">{tituloLimpio(p.titulo)}</b><small>{MARCAS[p.marca]?.corto} · <span className={`mkv2-redes-red is-${p.red}`}>{p.red === 'fb' ? 'FB' : 'IG'}</span> · {p.fecha.slice(8, 10)}/{p.fecha.slice(5, 7)}</small></span>
              </div>)
              : <p className="mkv2-redes-vacio">Todo lo programado salió</p>}
        </div>
      </Tarjeta>
      <Tarjeta titulo="Pauta: costo por mensaje" sub="Gasto ÷ mensajes por campaña · meta por confirmar · clic para ver el detalle" className="mkv2-redes-baja">
        {pauta.length
          ? <BarrasCosto meta={META_COSTO_MENSAJE[moneda] ?? null} formato={(v) => dinero(v, moneda)} colorDe={(x) => (x.semaforo ? colorSem(x.semaforo) : COLOR_MAILING.gris)}
            filas={pauta.map((a) => ({ id: a.id, nombre: nombreCampana(a.campana), tip: a.campana, sub: `${MARCAS[a.marca]?.corto ?? 'Sin página'} · ${numero(a.mensajes)} mensajes · ${dinero(a.gastado, a.moneda)}`,
              costo: a.costoMensaje, pocos: a.pocos, semaforo: a.semaforo, onClick: () => abrir(detalleCampana(a, { meta: META_COSTO_MENSAJE[a.moneda] })) }))} />
          : <p className="mkv2-redes-vacio is-gris">Sin campañas de marketing en este mes</p>}
        <p className="mkv2-nota">{tRec.campanas > 0 && <>Reclutamiento (aparte): {dineroPorMoneda(tRec.porMoneda, 'gastado')} en {numero(tRec.campanas)} {tRec.campanas === 1 ? 'campaña' : 'campañas'}. </>}
          {gtSinPauta && 'RED GT: sin pauta en la cuenta conectada.'}</p>
      </Tarjeta>
    </div>
    <p className="mkv2-nota">Redes: <span style={{ color: COLOR_RED.fb }}>■</span> {REDES.fb} · <span style={{ color: COLOR_RED.ig }}>■</span> {REDES.ig}. Fechas en hora de Guatemala y El Salvador (UTC−6). El alcance del Resumen es la suma del alcance diario de las cuentas (una persona puede contarse más de una vez). Leads: exactos por origen «PostIAlo Redes Sociales»; la publicación de cada lead es estimada.</p>
  </>
}
