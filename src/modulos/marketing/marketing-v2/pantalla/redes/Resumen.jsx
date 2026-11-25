// Canales de marketing · Redes sociales · RESUMEN (mockup v6; lo que pidió el ingeniero: hechas y programadas por marca
// y país). 6 tarjetas compactas, «Lo importante del mes», 3 donas que filtran (¿cumplimos lo programado?, por marca,
// por red y formato), programado vs publicado por marca, alcance por semana, ¿qué marca va mejor?, top 5 / no
// salieron y pauta (costo por mensaje). Las comparaciones son contra el MISMO PERÍODO del mes anterior si el mes está
// en curso. El dinero nunca suma monedas distintas. Formato y estado no cambian el Resumen: filtran Publicaciones.
// caso = A (plan del mes) | B (programadas de Facebook) | C (sin programadas: sin semáforo), ver datos/redesProgramadas.js.
import { Fragment, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Eye, FileText, Heart, MessageCircle, Sparkles, Trophy, Users, Wallet } from 'lucide-react'
import { numero, pct } from '../../datos/calculos.js'
import {
  alcancePorMarca, alcancePorSemana, COLOR_RED, dinero, filtrarRedes, FORMATOS, hechasYProgramadas, MARCAS, metricasCuentas, nombreCampana, nombreMes, porRedFormato, REDES,
  resumenPublicaciones, seguidores, separarReclutamiento, serieSemanal, TEXTO_IG_SIN_PROGRAMADAS, tituloLimpio, totalesAnuncios,
} from '../../datos/redes.js'
import { diaDeCorte, loImportante, mismoPeriodo, pautaPorCampana, programadoVsPublicado, topPublicaciones, variacion } from '../../datos/redesVista.js'
import { COLOR_MAILING, COLOR_SEMAFORO, Numero, Tarjeta } from '../mailing/piezas.jsx'
import { Anillo, BarrasProgramado, BarrasSemana, DonaRedes, PildoraImportante, TarjetaRedes } from './piezasRedes.jsx'

const TEXTO_SEMAFORO = { verde: 'Cumplió', amarillo: 'Casi', rojo: 'Bajo' }
const COLOR_ESTADO = { publicada: COLOR_MAILING.entregados, no_publicada: COLOR_MAILING.duro, programada: '#5b6b84' }
const ETIQUETA_ESTADO = { publicada: 'Salieron', no_publicada: 'No salieron', programada: 'Por venir' }
const TONOS = { rojo: COLOR_MAILING.duro, verde: COLOR_MAILING.entregados, amarillo: COLOR_MAILING.temporal, morado: '#9085e9' }
const ICONOS = { cumplimiento: AlertTriangle, formato: Sparkles, top: Trophy, pauta: Wallet }
const colorSem = (s) => COLOR_SEMAFORO[s] ?? COLOR_MAILING.gris
const COLORES_FORMATO = { fb: ['#3b82e0', '#6aa1ea', '#97bff2', '#c3dcf8'], ig: ['#d64f9a', '#e27bb5', '#eda6cf', '#f7d0e7'] }

/** Píldora del semáforo de cumplimiento. */
export function PildoraSem({ semaforo, cumplimiento }) {
  if (!semaforo) return <span className="fv2-tenue">sin programadas</span>
  return <span className={`mkv2-redes-sem is-${semaforo}`}>{TEXTO_SEMAFORO[semaforo]} · {Math.round(cumplimiento)} %</span>
}

/** ▲ / ▼ con su %; inverso = bajar es bueno (costos). */
export function Variacion({ v, inverso = false }) {
  if (v === null || Math.abs(v) < 0.5) return null
  const bueno = inverso ? v < 0 : v > 0
  return <b className={bueno ? 'is-sube' : 'is-baja'}>{v > 0 ? '▲' : '▼'} {Math.abs(v).toFixed(0)} %</b>
}

const dineroPorMoneda = (porMoneda, campo) => porMoneda.map((m) => dinero(m[campo], m.moneda)).join(' · ') || '—'

/**
 * Lo principal que pidió el ingeniero: publicaciones HECHAS y PROGRAMADAS por país y marca (RED GT = Guatemala; RED SV y
 * DATA RED = El Salvador). Instagram no da programadas: en su columna se dice, en lugar de un 0. Clic en una marca filtra.
 */
export function TablaHechasProgramadas({ items, marcas, filtros, filtrar }) {
  const paises = hechasYProgramadas(items, marcas)
  const conFb = !filtros.red || filtros.red === 'fb'
  const conIg = !filtros.red || filtros.red === 'ig'
  const igSinProgramadas = paises.every((p) => p.total.igProgramadas === null)
  const filas = paises.reduce((n, p) => n + p.marcas.length + (p.marcas.length > 1 ? 1 : 0), 0)
  let primeraFila = true
  const celdaIg = (x) => {
    if (!igSinProgramadas) return <td className="num">{x.igProgramadas === null ? '—' : numero(x.igProgramadas)}</td>
    if (!primeraFila) return null
    primeraFila = false
    return <td className="mkv2-redes-ig-sin" rowSpan={filas}>{TEXTO_IG_SIN_PROGRAMADAS}</td>
  }
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
        <th scope="col" rowSpan={2} className="num">Total hechas</th></tr>
      <tr>{conFb && <><th scope="col" className="num">Hechas</th><th scope="col" className="num" data-tip="Programadas pendientes en Facebook: por venir y las que ya debían salir y no salieron">Programadas</th></>}
        {conIg && <><th scope="col" className="num">Hechas</th><th scope="col" className="num">Programadas</th></>}</tr>
    </thead>
    <tbody>
      {paises.map((p) => <Fragment key={p.pais}>
        {p.marcas.map((x, i) => <tr key={x.marca} className={filtros.marca === x.marca ? 'is-marcada' : ''}>
          {i === 0 && <th scope="rowgroup" rowSpan={p.marcas.length + (p.marcas.length > 1 ? 1 : 0)}>{p.nombre}</th>}
          <td><button type="button" className="mkv2-redes-marca-boton" onClick={() => filtrar({ marca: filtros.marca === x.marca ? '' : x.marca })}
            data-tip={`${MARCAS[x.marca].nombre} · clic para ${filtros.marca === x.marca ? 'ver todas' : 'ver solo esta marca'}`}>
            <span className="mkv2-redes-punto" style={{ background: MARCAS[x.marca].color }} />{MARCAS[x.marca].corto}</button></td>
          {celdas(x)}
        </tr>)}
        {p.marcas.length > 1 && <tr className="mkv2-redes-subtotal"><td>Total {p.nombre}</td>{celdas(p.total)}</tr>}
      </Fragment>)}
      {!paises.length && <tr><td colSpan={8} className="fv2-tabla-vacia">Sin marcas con estos filtros</td></tr>}
    </tbody>
  </table></div>
}

export function ResumenRedes({ datos, items, filtros, filtrar, irA, caso }) {
  const [lista, setLista] = useState('top')
  const f = { ...filtros, formato: '', estado: '' }
  const base = useMemo(() => filtrarRedes(items, f), [items, f.pais, f.marca, f.red, f.mes]) // eslint-disable-line react-hooks/exhaustive-deps
  const corte = diaDeCorte(filtros.mes, datos.hoy)
  const mesAnt = datos.meses[datos.meses.indexOf(filtros.mes) + 1]
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
  // Alcance de las cuentas: suma del alcance de cada día (Meta v25 no da el alcance único del mes).
  // Mismo período del mes anterior con el MISMO cálculo (suma del alcance de cada día, días 1 a «corte»).
  const cuentasF = filtrarRedes(datos.cuentas, { ...f, mes: '' })
  const mc = metricasCuentas(cuentasF, filtros.mes)
  const mcAnt = mesAnt ? metricasCuentas(cuentasF, mesAnt, corte) : null
  const alcMarca = alcancePorMarca(cuentasF, filtros.mes, null, marcas)
  const alcMarcaAnt = mesAnt ? alcancePorMarca(cuentasF, mesAnt, corte, marcas) : null
  const alcTotal = Object.values(alcMarca).reduce((n, v) => n + v, 0)
  const t = totalesAnuncios(anuncios)
  const tAnt = totalesAnuncios(anunciosAnt)
  const unaMoneda = t.porMoneda.length === 1 ? t.porMoneda[0] : null
  const costoAnt = unaMoneda ? tAnt.porMoneda.find((m) => m.moneda === unaMoneda.moneda)?.costoMensaje ?? null : null
  const conPlan = caso !== 'C'
  const redes = filtros.red ? [filtros.red] : ['fb', 'ig']
  const importante = loImportante(base, anuncios, marcas).filter((x) => conPlan || x.tipo !== 'cumplimiento')
  const nFb = base.filter((p) => p.estado === 'publicada' && p.red === 'fb').length
  const masFb = nFb >= r.publicadas - nFb
  const noSalieron = base.filter((p) => p.estado === 'no_publicada')
  const top = topPublicaciones(base)
  const pauta = pautaPorCampana(anuncios)
  const maxCosto = Math.max(...pauta.filter((a) => !a.pocos).map((a) => a.costoMensaje ?? 0), 1)
  const pocosPauta = pauta.filter((a) => a.pocos).length

  return <>
    <div className="mkv2-redes-kpis">
      <TarjetaRedes titulo="Publicaciones" icono={FileText} color={conPlan ? colorSem(r.semaforo) : COLOR_MAILING.apertura} serie={serieSemanal(base, filtros.mes)}
        valor={<><Numero n={conPlan ? r.cumplidas : r.publicadas} />{conPlan && r.aFecha > 0 && <small> de {numero(r.aFecha)}</small>}</>}
        sub={conPlan ? <><PildoraSem semaforo={r.semaforo} cumplimiento={r.cumplimiento} /> · {numero(r.programadas)} por venir</> : 'publicadas · sin programadas'}
        tip={conPlan ? `Programadas que salieron hasta hoy: ${numero(r.cumplidas)} de ${numero(r.aFecha)} (${pct(r.cumplimiento)})\n${numero(r.programadas)} programadas por venir\n${numero(r.publicadas - r.cumplidas)} publicadas fuera de lo programado (cuentan en alcance e interacciones)\nSemáforo: 100 % verde · 90–99 % amarillo · menos de 90 % rojo`
          : `Publicadas en el mes: ${numero(r.publicadas)}\nNo hay programadas para comparar.`}
        onClick={() => irA('publicaciones')} />
      <TarjetaRedes titulo="Alcance" icono={Eye} color="#2fb8c4" serie={serieSemanal(base, filtros.mes, 'alcance')} valor={mc ? <Numero n={mc.alcanceDiario} /> : '—'}
        sub={mcAnt ? <><Variacion v={variacion(mc?.alcanceDiario, mcAnt.alcanceDiario)} /> {textoAnt} · suma diaria</> : 'suma de alcance diario'}
        tip={`Alcance de las cuentas en el mes: ${mc ? numero(mc.alcanceDiario) : '—'}\nEs la SUMA DEL ALCANCE DE CADA DÍA: una persona que vio contenido varios días se cuenta varias veces (Meta no da el alcance único del mes).${mc ? `\nVistas: ${numero(mc.vistas)}` : ''}${mcAnt ? `\n${textoAnt}: ${numero(mcAnt.alcanceDiario)} (mismo cálculo)` : ''}`} />
      <TarjetaRedes titulo="Interacciones" icono={Heart} color="#9085e9" serie={serieSemanal(base, filtros.mes, 'interacciones')} valor={<Numero n={r.interacciones} />}
        sub={<>tasa <b>{pct(r.tasa)}</b> {rAnt && <Variacion v={variacion(r.tasa, rAnt.tasa)} />}</>}
        tip={`Interacciones de las publicaciones del mes: ${numero(r.interacciones)}\nFacebook: reacciones y compartidos (Meta no da los comentarios con este permiso). Instagram: interacciones totales.\nTasa: ${pct(r.tasa)} del alcance de las publicaciones${rAnt ? `\n${textoAnt}: ${pct(rAnt.tasa)}` : ''}`} />
      <TarjetaRedes titulo="Seguidores" icono={Users} color="#3987e5" valor={<Numero n={seguidores(cuentas)} />}
        sub={`${numero(cuentas.length)} ${cuentas.length === 1 ? 'cuenta' : 'cuentas'}`} tip={`Seguidores de las ${numero(cuentas.length)} cuentas filtradas: ${numero(seguidores(cuentas))}`} />
      <TarjetaRedes titulo="Inversión" icono={Wallet} color={COLOR_MAILING.duro}
        valor={unaMoneda ? <Numero n={unaMoneda.gastado} formato={(x) => dinero(x, unaMoneda.moneda)} /> : t.porMoneda.length ? <span className="mkv2-redes-monedas">{dineroPorMoneda(t.porMoneda, 'gastado')}</span> : '—'}
        sub={`${numero(t.campanas)} ${t.campanas === 1 ? 'campaña' : 'campañas'}${t.porMoneda.length > 1 ? ' · monedas separadas' : ''}${tRec.campanas ? ` · + ${dineroPorMoneda(tRec.porMoneda, 'gastado')} reclutamiento aparte` : ''}`}
        tip={`Gasto en anuncios de marketing del mes: ${dineroPorMoneda(t.porMoneda, 'gastado')}${tRec.campanas ? `\nReclutamiento (aparte, no se suma): ${dineroPorMoneda(tRec.porMoneda, 'gastado')} en ${numero(tRec.campanas)} ${tRec.campanas === 1 ? 'campaña' : 'campañas'}` : ''}\nCada cuenta de anuncios tiene su moneda; no se suman monedas distintas.`} onClick={() => irA('anuncios')} />
      <TarjetaRedes titulo="Mensajes" icono={MessageCircle} color={COLOR_MAILING.entregados} valor={<Numero n={t.mensajes} />}
        sub={<><b>{dineroPorMoneda(t.porMoneda, 'costoMensaje')}</b> c/u {unaMoneda && <Variacion v={variacion(unaMoneda.costoMensaje, costoAnt)} inverso />}</>}
        tip={`Conversaciones que abrió un anuncio: ${numero(t.mensajes)}\nCosto por mensaje (gasto ÷ mensajes): ${dineroPorMoneda(t.porMoneda, 'costoMensaje')}`} onClick={() => irA('anuncios')} />
    </div>

    <Tarjeta titulo="Publicaciones hechas y programadas · por país y marca" sub={`${nombreMes(filtros.mes)} · hechas = publicadas · programadas = pendientes de Facebook (por venir y las que no salieron) · clic en una marca filtra`}>
      <TablaHechasProgramadas items={base} marcas={marcas} filtros={filtros} filtrar={filtrar} />
    </Tarjeta>

    {importante.length > 0 && <div className="mkv2-redes-importantes" aria-label="Lo importante del mes">
      {importante.map((x) => <PildoraImportante key={x.tipo} icono={x.tipo === 'cumplimiento' && x.tono === 'verde' ? CheckCircle2 : ICONOS[x.tipo]}
        color={x.tono === 'marca' ? MARCAS[x.marca]?.color : TONOS[x.tono]} texto={x.tipo === 'top' ? tituloLimpio(x.texto) : x.texto} detalle={x.detalle} tip={x.tip}
        onClick={x.tipo === 'formato' ? () => { filtrar({ formato: x.formato }); irA('publicaciones') } : x.tipo === 'pauta' ? () => irA('anuncios') : undefined} />)}
    </div>}

    <div className="mkv2-redes-tres">
      <Tarjeta titulo="¿Cumplimos lo programado?" sub={caso === 'C' ? 'Sin programadas para comparar' : caso === 'B' ? 'Programadas de Facebook (API) · hasta hoy' : 'Plan del mes · hasta hoy'}>
        {conPlan
          ? <DonaRedes activo={filtros.estado} centro={r.cumplimiento === null ? '—' : <Numero n={r.cumplimiento} formato={(x) => `${Math.round(x)} %`} />} sub="cumplido"
            items={['publicada', 'no_publicada', 'programada'].map((k) => ({ k, l: ETIQUETA_ESTADO[k], v: k === 'publicada' ? r.cumplidas : k === 'no_publicada' ? r.noPublicadas : r.programadas, c: COLOR_ESTADO[k] }))}
            onElegir={(k) => { filtrar({ estado: filtros.estado === k ? '' : k }); irA('publicaciones') }} />
          : <p className="mkv2-redes-nota-caso">No hay plan de publicaciones cargado ni programadas de Facebook: se muestra solo lo publicado por marca, red y semana, sin semáforo. {TEXTO_IG_SIN_PROGRAMADAS}.</p>}
      </Tarjeta>
      <Tarjeta titulo="Publicaciones por marca" sub="Publicadas · clic filtra">
        <DonaRedes activo={filtros.marca} centro={<Numero n={r.publicadas} />} sub="publicadas"
          items={marcas.map((m) => ({ k: m, l: MARCAS[m].corto, v: base.filter((p) => p.estado === 'publicada' && p.marca === m).length, c: MARCAS[m].color }))}
          onElegir={(k) => filtrar({ marca: filtros.marca === k ? '' : k })} />
      </Tarjeta>
      <Tarjeta titulo="Por red y formato" sub="Publicadas · clic filtra">
        <DonaRedes activo={filtros.red && filtros.formato ? `${filtros.red}|${filtros.formato}` : ''}
          centro={r.publicadas ? `${Math.round(((masFb ? nFb : r.publicadas - nFb) / r.publicadas) * 100)} %` : '—'} sub={masFb ? 'en Facebook' : 'en Instagram'}
          items={porRedFormato(base).map((x) => ({ k: x.clave, l: `${x.red === 'fb' ? 'FB' : 'IG'} · ${FORMATOS[x.formato] ?? x.formato}`, v: x.publicaciones,
            c: COLORES_FORMATO[x.red]?.[Object.keys(FORMATOS).indexOf(x.formato)] ?? COLOR_RED[x.red] }))}
          onElegir={(k) => { const [red, formato] = k.split('|'); filtrar(filtros.red === red && filtros.formato === formato ? { formato: '' } : { red, formato }); irA('publicaciones') }} />
      </Tarjeta>
    </div>

    <div className="mkv2-duo">
      <Tarjeta titulo="Programado vs publicado por marca" sub={conPlan ? 'Gris = programadas a la fecha · color = publicadas (semáforo) · clic filtra' : 'Sin programadas: solo publicadas · clic filtra'}>
        <BarrasProgramado activa={filtros.marca} onElegir={(m) => filtrar({ marca: filtros.marca === m ? '' : m })}
          filas={programadoVsPublicado(base, marcas).map((x) => ({ ...x, nombre: MARCAS[x.marca].nombre, corto: MARCAS[x.marca].corto,
            programadas: conPlan ? x.programadas : 0, color: conPlan ? colorSem(x.semaforo) : MARCAS[x.marca].color }))} />
      </Tarjeta>
      <Tarjeta titulo="Alcance por semana" sub="Facebook e Instagram lado a lado · publicaciones del mes">
        <BarrasSemana semanas={alcancePorSemana(base, filtros.mes)} redes={redes} corte={corte} />
      </Tarjeta>
    </div>

    <div className="mkv2-redes-tres mkv2-redes-fila-baja">
      <Tarjeta titulo="¿Qué marca va mejor?" sub={`Alcance (suma diaria de sus cuentas, igual que la tarjeta Alcance)${alcMarcaAnt ? ` ${textoAnt}` : ''} · el círculo es su parte del alcance · clic filtra`} className="mkv2-redes-baja">
        <div className="mkv2-redes-marcas">
          {marcas.map((m, i) => {
            const s = resumenPublicaciones(base.filter((p) => p.marca === m))
            const alc = alcMarca[m] ?? 0
            const ant = alcMarcaAnt ? alcMarcaAnt[m] ?? 0 : null
            const parte = alcTotal > 0 ? (alc / alcTotal) * 100 : 0
            return <button type="button" key={m} className={`mkv2-redes-marca ${filtros.marca === m ? 'is-activa' : ''}`} style={{ '--c': MARCAS[m].color, animationDelay: `${i * 0.06}s` }}
              onClick={() => filtrar({ marca: filtros.marca === m ? '' : m })}
              data-tip={`${MARCAS[m].nombre} (${MARCAS[m].pais})\nAlcance: ${numero(alc)} (${Math.round(parte)} % del alcance de las marcas filtradas)${ant !== null ? `\n${textoAnt}: ${numero(ant)}` : ''}\nClic para ${filtros.marca === m ? 'ver todas' : 'ver solo esta marca'}`}>
              <Anillo pct={parte} color={MARCAS[m].color} />
              <span className="mkv2-redes-marca-datos">
                <span className="mkv2-redes-marca-cabeza"><b>{MARCAS[m].corto}</b><em>{MARCAS[m].pais}</em></span>
                {s.publicadas === 0
                  ? <span className="mkv2-redes-marca-sin">Sin publicaciones este mes<small>alcance de la cuenta: {numero(alc)}</small></span>
                  : <span className="mkv2-redes-marca-cifras">
                    <span><b>{numero(conPlan ? s.cumplidas : s.publicadas)}{conPlan ? `/${numero(s.aFecha)}` : ''}</b><small>publicadas</small></span>
                    <span><b>{numero(alc)} {ant !== null && <Variacion v={variacion(alc, ant)} />}</b><small>alcance</small></span>
                    <span><b>{pct(s.tasa)}</b><small>tasa</small></span>
                  </span>}
              </span>
            </button>
          })}
        </div>
      </Tarjeta>
      <Tarjeta titulo={lista === 'top' || !conPlan ? 'Top 5 publicaciones' : 'Lo que no salió'} className="mkv2-redes-baja"
        acciones={conPlan && <div className="mkv2-redes-minitabs">
          <button type="button" className={lista === 'top' ? 'is-activa' : ''} onClick={() => setLista('top')}>Top 5</button>
          <button type="button" className={lista === 'no' ? 'is-activa' : ''} onClick={() => setLista('no')}>No salieron{noSalieron.length ? ` (${noSalieron.length})` : ''}</button>
        </div>}>
        <div className="mkv2-redes-lista mkv2-redes-lista-llena">
          {lista === 'top' || !conPlan
            ? (top.length ? top.map((p, i) => <div key={p.id} className="mkv2-redes-li" style={{ animationDelay: `${i * 0.05}s` }} data-tip={p.titulo}>
              <span className={`mkv2-redes-li-n ${i === 0 ? 'is-oro' : ''}`}>{i + 1}</span>
              <span className="mkv2-redes-li-t"><b className="mkv2-dos-lineas">{tituloLimpio(p.titulo)}</b><small>{MARCAS[p.marca]?.corto} · <span className={`mkv2-redes-red is-${p.red}`}>{p.red === 'fb' ? 'FB' : 'IG'}</span> · {FORMATOS[p.formato] ?? p.formato}</small></span>
              <span className="mkv2-redes-li-v">{numero(p.interacciones)}<small>{pct(p.alcance ? (p.interacciones / p.alcance) * 100 : null)}</small></span>
            </div>) : <p className="mkv2-redes-vacio is-gris">Sin publicaciones con estos filtros</p>)
            : noSalieron.length
              ? noSalieron.map((p) => <div key={p.id} className="mkv2-redes-li is-no" data-tip={p.titulo}>
                <span className="mkv2-redes-li-n">{Number(p.fecha.slice(8, 10))}</span>
                <span className="mkv2-redes-li-t"><b className="mkv2-dos-lineas">{tituloLimpio(p.titulo)}</b><small>{MARCAS[p.marca]?.corto} · <span className={`mkv2-redes-red is-${p.red}`}>{p.red === 'fb' ? 'FB' : 'IG'}</span> · {p.fecha.slice(8, 10)}/{p.fecha.slice(5, 7)}</small></span>
              </div>)
              : <p className="mkv2-redes-vacio">✔ Todo lo programado salió</p>}
        </div>
      </Tarjeta>
      <Tarjeta titulo="Pauta: costo por mensaje" sub={`Gasto ÷ mensajes por campaña · meta por confirmar${pocosPauta ? ` · ${pocosPauta} con pocos datos (menos de 5 mensajes), sin color` : ''}`} className="mkv2-redes-baja">
        {pauta.length
          ? <>
            <DonaRedes centro={unaMoneda?.costoMensaje != null ? dinero(unaMoneda.costoMensaje, unaMoneda.moneda) : '—'} sub="promedio"
              items={[['verde', 'En meta'], ['amarillo', 'Cerca'], ['rojo', 'Caras'], [null, 'Sin meta']].map(([k, l]) => ({ k: k ?? 'sin', l, v: pauta.filter((a) => !a.pocos && a.semaforo === k).length, c: k ? colorSem(k) : COLOR_MAILING.gris }))
                .filter((x) => x.v > 0)} />
            <div className="mkv2-redes-pauta">
              {pauta.map((a) => <div key={a.id} className={`mkv2-redes-pauta-fila ${a.pocos ? 'is-pocos' : ''}`}
                data-tip={`${a.campana}\n${dinero(a.gastado, a.moneda)} → ${numero(a.mensajes)} mensajes\nCosto por mensaje: ${dinero(a.costoMensaje, a.moneda)}${a.pocos ? '\nPocos datos: menos de 5 mensajes, no cuenta en En meta / Cerca / Caras' : ''}${a.gastado === 0 && a.mensajes > 0 ? '\nSin gasto este mes: Meta atribuye el mensaje a un anuncio que gastó antes' : ''}`}>
                <span><b className="mkv2-una-linea">{nombreCampana(a.campana)}</b><small>{MARCAS[a.marca]?.corto ?? 'Sin página'} · {numero(a.mensajes)} msj</small></span>
                <span className="mkv2-redes-pauta-barra"><i style={{ width: `${a.pocos ? 0 : ((a.costoMensaje ?? 0) / maxCosto) * 100}%`, background: a.semaforo ? colorSem(a.semaforo) : COLOR_MAILING.gris }} /></span>
                {a.pocos ? <span className="mkv2-redes-pocos">pocos datos</span> : <span className={`mkv2-redes-sem ${a.semaforo ? `is-${a.semaforo}` : ''}`}>{dinero(a.costoMensaje, a.moneda)}</span>}
              </div>)}
            </div>
          </>
          : <p className="mkv2-redes-vacio is-gris">Sin campañas de marketing en este mes</p>}
        {tRec.campanas > 0 && <p className="mkv2-nota" data-tip={reclutamiento.map((a) => `${a.campana}: ${dinero(a.gastado, a.moneda)}`).join('\n')}>
          <b>Reclutamiento (aparte):</b> {dineroPorMoneda(tRec.porMoneda, 'gastado')} en {numero(tRec.campanas)} {tRec.campanas === 1 ? 'campaña' : 'campañas'} · no cuenta en inversión, mensajes ni costo por mensaje.</p>}
        {gtSinPauta && <p className="mkv2-nota">RED GT: sin pauta en las cuentas que ve el token.</p>}
      </Tarjeta>
    </div>
    <p className="mkv2-nota">Redes: <span style={{ color: COLOR_RED.fb }}>■</span> {REDES.fb} · <span style={{ color: COLOR_RED.ig }}>■</span> {REDES.ig}. Fechas en hora de Guatemala y El Salvador (UTC−6). Las comparaciones usan el mismo período del mes anterior mientras el mes está en curso. La tarjeta Alcance es la suma del alcance diario de las cuentas (una persona puede contarse más de una vez); los gráficos de alcance usan el alcance de cada publicación.</p>
  </>
}
