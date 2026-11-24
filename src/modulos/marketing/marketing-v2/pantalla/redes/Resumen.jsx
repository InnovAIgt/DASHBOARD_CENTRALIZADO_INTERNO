// Canales de marketing · Redes sociales · RESUMEN (mockup v6; lo que pidió el ingeniero: hechas y programadas por marca
// y país). 6 tarjetas compactas, «Lo importante del mes», 3 donas que filtran (¿cumplimos lo programado?, por marca,
// por red y formato), programado vs publicado por marca, alcance por semana, ¿qué marca va mejor?, top 5 / no
// salieron y pauta (costo por mensaje). Las comparaciones son contra el MISMO PERÍODO del mes anterior si el mes está
// en curso. El dinero nunca suma monedas distintas. Formato y estado no cambian el Resumen: filtran Publicaciones.
// caso = A (plan del mes) | B (programadas de Facebook) | C (sin programadas: sin semáforo), ver datos/redesProgramadas.js.
import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Eye, FileText, Heart, MessageCircle, Sparkles, Trophy, Users, Wallet } from 'lucide-react'
import { numero, pct } from '../../datos/calculos.js'
import {
  alcancePorSemana, COLOR_RED, dinero, filtrarRedes, FORMATOS, MARCAS, nombreMes, porRedFormato, REDES, resumenPublicaciones, seguidores,
  semaforoCumplimiento, serieSemanal, totalesAnuncios,
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
  const anuncios = filtrarRedes(datos.anuncios, { ...f, red: '' })
  const anunciosAnt = mesAnt ? filtrarRedes(datos.anuncios, { ...f, red: '', mes: mesAnt }) : []
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
  const maxCosto = Math.max(...pauta.map((a) => a.costoMensaje ?? 0), 1)

  return <>
    <div className="mkv2-redes-kpis">
      <TarjetaRedes titulo="Publicaciones" icono={FileText} color={conPlan ? colorSem(r.semaforo) : COLOR_MAILING.apertura} serie={serieSemanal(base, filtros.mes)}
        valor={<><Numero n={conPlan ? r.cumplidas : r.publicadas} />{conPlan && r.aFecha > 0 && <small> de {numero(r.aFecha)}</small>}</>}
        sub={conPlan ? <><PildoraSem semaforo={r.semaforo} cumplimiento={r.cumplimiento} /> · {numero(r.programadas)} por venir</> : 'publicadas · sin programadas'}
        tip={conPlan ? `Programadas que salieron hasta hoy: ${numero(r.cumplidas)} de ${numero(r.aFecha)} (${pct(r.cumplimiento)})\n${numero(r.programadas)} programadas por venir\n${numero(r.publicadas - r.cumplidas)} publicadas fuera de lo programado (cuentan en alcance e interacciones)\nSemáforo: 100 % verde · 90–99 % amarillo · menos de 90 % rojo`
          : `Publicadas en el mes: ${numero(r.publicadas)}\nNo hay programadas para comparar.`}
        onClick={() => irA('publicaciones')} />
      <TarjetaRedes titulo="Alcance" icono={Eye} color="#2fb8c4" serie={serieSemanal(base, filtros.mes, 'alcance')} valor={<Numero n={r.alcance} />}
        sub={rAnt ? <><Variacion v={variacion(r.alcance, rAnt.alcance)} /> {textoAnt}</> : 'personas distintas'}
        tip={`Alcance: ${numero(r.alcance)} personas distintas vieron alguna publicación${rAnt ? `\n${textoAnt}: ${numero(rAnt.alcance)}` : ''}`} />
      <TarjetaRedes titulo="Interacciones" icono={Heart} color="#9085e9" serie={serieSemanal(base, filtros.mes, 'interacciones')} valor={<Numero n={r.interacciones} />}
        sub={<>tasa <b>{pct(r.tasa)}</b> {rAnt && <Variacion v={variacion(r.tasa, rAnt.tasa)} />}</>}
        tip={`Interacciones: ${numero(r.interacciones)} (reacciones, comentarios, compartidos y guardados)\nTasa: ${pct(r.tasa)} del alcance${rAnt ? `\n${textoAnt}: ${pct(rAnt.tasa)}` : ''}`} />
      <TarjetaRedes titulo="Seguidores" icono={Users} color="#3987e5" valor={<Numero n={seguidores(cuentas)} />}
        sub={`${numero(cuentas.length)} ${cuentas.length === 1 ? 'cuenta' : 'cuentas'}`} tip={`Seguidores de las ${numero(cuentas.length)} cuentas filtradas: ${numero(seguidores(cuentas))}`} />
      <TarjetaRedes titulo="Inversión" icono={Wallet} color={COLOR_MAILING.duro}
        valor={unaMoneda ? <Numero n={unaMoneda.gastado} formato={(x) => dinero(x, unaMoneda.moneda)} /> : t.porMoneda.length ? <span className="mkv2-redes-monedas">{dineroPorMoneda(t.porMoneda, 'gastado')}</span> : '—'}
        sub={`${numero(t.campanas)} ${t.campanas === 1 ? 'campaña' : 'campañas'}${t.porMoneda.length > 1 ? ' · monedas separadas' : ''}`}
        tip={`Gasto en anuncios del mes: ${dineroPorMoneda(t.porMoneda, 'gastado')}\nCada cuenta de anuncios tiene su moneda; no se suman monedas distintas.`} onClick={() => irA('anuncios')} />
      <TarjetaRedes titulo="Mensajes" icono={MessageCircle} color={COLOR_MAILING.entregados} valor={<Numero n={t.mensajes} />}
        sub={<><b>{dineroPorMoneda(t.porMoneda, 'costoMensaje')}</b> c/u {unaMoneda && <Variacion v={variacion(unaMoneda.costoMensaje, costoAnt)} inverso />}</>}
        tip={`Conversaciones que abrió un anuncio: ${numero(t.mensajes)}\nCosto por mensaje (gasto ÷ mensajes): ${dineroPorMoneda(t.porMoneda, 'costoMensaje')}`} onClick={() => irA('anuncios')} />
    </div>

    {importante.length > 0 && <div className="mkv2-redes-importantes" aria-label="Lo importante del mes">
      {importante.map((x) => <PildoraImportante key={x.tipo} icono={x.tipo === 'cumplimiento' && x.tono === 'verde' ? CheckCircle2 : ICONOS[x.tipo]}
        color={x.tono === 'marca' ? MARCAS[x.marca]?.color : TONOS[x.tono]} texto={x.texto} detalle={x.detalle} tip={x.tip}
        onClick={x.tipo === 'formato' ? () => { filtrar({ formato: x.formato }); irA('publicaciones') } : x.tipo === 'pauta' ? () => irA('anuncios') : undefined} />)}
    </div>}

    <div className="mkv2-redes-tres">
      <Tarjeta titulo="¿Cumplimos lo programado?" sub={caso === 'C' ? 'Sin programadas para comparar' : caso === 'B' ? 'Programadas de Facebook (API) · hasta hoy' : 'Plan del mes · hasta hoy'}>
        {conPlan
          ? <DonaRedes activo={filtros.estado} centro={r.cumplimiento === null ? '—' : <Numero n={r.cumplimiento} formato={(x) => `${Math.round(x)} %`} />} sub="cumplido"
            items={['publicada', 'no_publicada', 'programada'].map((k) => ({ k, l: ETIQUETA_ESTADO[k], v: k === 'publicada' ? r.cumplidas : k === 'no_publicada' ? r.noPublicadas : r.programadas, c: COLOR_ESTADO[k] }))}
            onElegir={(k) => { filtrar({ estado: filtros.estado === k ? '' : k }); irA('publicaciones') }} />
          : <p className="mkv2-redes-nota-caso">No hay plan de publicaciones cargado ni programadas de Facebook: se muestra solo lo publicado por marca, red y semana, sin semáforo. Instagram no da programadas.</p>}
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

    <div className="mkv2-redes-tres">
      <Tarjeta titulo="¿Qué marca va mejor?" sub={rAnt ? `Alcance ${textoAnt} · clic filtra` : 'Clic filtra'}>
        <div className="mkv2-redes-marcas">
          {marcas.map((m, i) => {
            const s = resumenPublicaciones(base.filter((p) => p.marca === m))
            const a = baseAnt ? resumenPublicaciones(baseAnt.filter((p) => p.marca === m)) : null
            return <button type="button" key={m} className={`mkv2-redes-marca ${filtros.marca === m ? 'is-activa' : ''}`} style={{ '--c': MARCAS[m].color, animationDelay: `${i * 0.06}s` }}
              onClick={() => filtrar({ marca: filtros.marca === m ? '' : m })} data-tip={`${MARCAS[m].nombre} (${MARCAS[m].pais}) · clic para ${filtros.marca === m ? 'ver todas' : 'ver solo esta marca'}`}>
              <Anillo pct={conPlan ? s.cumplimiento : null} color={colorSem(semaforoCumplimiento(s.cumplimiento))} />
              <span className="mkv2-redes-marca-datos">
                <span className="mkv2-redes-marca-cabeza"><b>{MARCAS[m].corto}</b><em>{MARCAS[m].pais}</em></span>
                <span className="mkv2-redes-marca-cifras">
                  <span><b>{conPlan ? `${numero(s.cumplidas)}/${numero(s.aFecha)}` : numero(s.publicadas)}</b><small>publicadas</small></span>
                  <span><b>{numero(s.alcance)} {a && <Variacion v={variacion(s.alcance, a.alcance)} />}</b><small>alcance</small></span>
                  <span><b>{pct(s.tasa)}</b><small>tasa</small></span>
                </span>
              </span>
            </button>
          })}
        </div>
      </Tarjeta>
      <Tarjeta titulo={lista === 'top' || !conPlan ? 'Top 5 publicaciones' : 'Lo que no salió'}
        acciones={conPlan && <div className="mkv2-redes-minitabs">
          <button type="button" className={lista === 'top' ? 'is-activa' : ''} onClick={() => setLista('top')}>Top 5</button>
          <button type="button" className={lista === 'no' ? 'is-activa' : ''} onClick={() => setLista('no')}>No salieron{noSalieron.length ? ` (${noSalieron.length})` : ''}</button>
        </div>}>
        <div className="mkv2-redes-lista">
          {lista === 'top' || !conPlan
            ? (top.length ? top.map((p, i) => <div key={p.id} className="mkv2-redes-li" style={{ animationDelay: `${i * 0.05}s` }}>
              <span className={`mkv2-redes-li-n ${i === 0 ? 'is-oro' : ''}`}>{i + 1}</span>
              <span className="mkv2-redes-li-t"><b>{p.titulo}</b><small>{MARCAS[p.marca]?.corto} · <span className={`mkv2-redes-red is-${p.red}`}>{p.red === 'fb' ? 'FB' : 'IG'}</span> · {FORMATOS[p.formato] ?? p.formato}</small></span>
              <span className="mkv2-redes-li-v">{numero(p.interacciones)}<small>{pct(p.alcance ? (p.interacciones / p.alcance) * 100 : null)}</small></span>
            </div>) : <p className="mkv2-redes-vacio is-gris">Sin publicaciones con estos filtros</p>)
            : noSalieron.length
              ? noSalieron.map((p) => <div key={p.id} className="mkv2-redes-li is-no">
                <span className="mkv2-redes-li-n">{Number(p.fecha.slice(8, 10))}</span>
                <span className="mkv2-redes-li-t"><b>{p.titulo}</b><small>{MARCAS[p.marca]?.corto} · <span className={`mkv2-redes-red is-${p.red}`}>{p.red === 'fb' ? 'FB' : 'IG'}</span> · {p.fecha.slice(8, 10)}/{p.fecha.slice(5, 7)}</small></span>
              </div>)
              : <p className="mkv2-redes-vacio">✔ Todo lo programado salió</p>}
        </div>
      </Tarjeta>
      <Tarjeta titulo="Pauta: costo por mensaje" sub="Gasto ÷ mensajes por campaña · meta por confirmar">
        {pauta.length
          ? <>
            <DonaRedes centro={unaMoneda?.costoMensaje != null ? dinero(unaMoneda.costoMensaje, unaMoneda.moneda) : '—'} sub="promedio"
              items={[['verde', 'En meta'], ['amarillo', 'Cerca'], ['rojo', 'Caras'], [null, 'Sin meta']].map(([k, l]) => ({ k: k ?? 'sin', l, v: pauta.filter((a) => a.semaforo === k).length, c: k ? colorSem(k) : COLOR_MAILING.gris }))
                .filter((x) => x.v > 0)} />
            <div className="mkv2-redes-pauta">
              {pauta.map((a) => <div key={a.id} className="mkv2-redes-pauta-fila" data-tip={`${a.campana}\n${dinero(a.gastado, a.moneda)} → ${numero(a.mensajes)} mensajes\nCosto por mensaje: ${dinero(a.costoMensaje, a.moneda)}`}>
                <span><b>{a.campana}</b><small>{MARCAS[a.marca]?.corto} · {numero(a.mensajes)} msj</small></span>
                <span className="mkv2-redes-pauta-barra"><i style={{ width: `${((a.costoMensaje ?? 0) / maxCosto) * 100}%`, background: a.semaforo ? colorSem(a.semaforo) : COLOR_MAILING.gris }} /></span>
                <span className={`mkv2-redes-sem ${a.semaforo ? `is-${a.semaforo}` : ''}`}>{dinero(a.costoMensaje, a.moneda)}</span>
              </div>)}
            </div>
          </>
          : <p className="mkv2-redes-vacio is-gris">Sin campañas en este mes</p>}
      </Tarjeta>
    </div>
    <p className="mkv2-nota">Redes: <span style={{ color: COLOR_RED.fb }}>■</span> {REDES.fb} · <span style={{ color: COLOR_RED.ig }}>■</span> {REDES.ig}. Las comparaciones usan el mismo período del mes anterior mientras el mes está en curso.</p>
  </>
}
