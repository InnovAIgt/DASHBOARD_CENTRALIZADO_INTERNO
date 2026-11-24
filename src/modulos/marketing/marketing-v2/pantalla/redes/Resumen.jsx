// Canales de marketing · Redes sociales · RESUMEN (como el mockup de Redes, con el estilo de Mailing):
// 6 tarjetas compactas con mini gráfica, 3 donas que se pueden tocar (programado vs publicado, por marca, por red y
// formato), barras programado vs publicado por marca con semáforo, alcance por semana (Facebook e Instagram lado a
// lado) y tarjetas por marca con anillo. El dinero nunca suma monedas distintas (se muestra por moneda).
// Formato y estado (de las donas) no cambian el Resumen: filtran la lista de Publicaciones.
import { useMemo } from 'react'
import { Eye, FileText, Heart, MessageCircle, Users, Wallet } from 'lucide-react'
import { numero, pct } from '../../datos/calculos.js'
import {
  alcancePorSemana, COLOR_RED, dinero, ESTADOS, filtrarRedes, FORMATOS, MARCAS, nombreMes, porMarca, porRedFormato, REDES,
  resumenPublicaciones, seguidores, semaforoCumplimiento, serieSemanal, totalesAnuncios,
} from '../../datos/redes.js'
import { Bloque, COLOR_MAILING, COLOR_SEMAFORO, FilaBarra, LeyendaSemaforo, Numero, Tarjeta } from '../mailing/piezas.jsx'
import { Anillo, BarrasSemana, DonaRedes, TarjetaRedes } from './piezasRedes.jsx'

const TEXTO_SEMAFORO = { verde: 'Cumplió', amarillo: 'Casi', rojo: 'Bajo' }
const COLOR_ESTADO = { publicada: COLOR_MAILING.entregados, no_publicada: COLOR_MAILING.duro, programada: '#5b6b84' }
const colorSem = (s) => COLOR_SEMAFORO[s] ?? COLOR_MAILING.gris

/** Píldora del semáforo de cumplimiento. */
function PildoraSem({ semaforo, cumplimiento }) {
  if (!semaforo) return <span className="fv2-tenue">sin programadas</span>
  return <span className={`mkv2-redes-sem is-${semaforo}`}>{TEXTO_SEMAFORO[semaforo]} · {Math.round(cumplimiento)} %</span>
}

/** Dinero por moneda en una línea (nunca se suman monedas distintas). */
const dineroPorMoneda = (porMoneda, campo) => porMoneda.map((m) => dinero(m[campo], m.moneda)).join(' · ') || '—'

export function ResumenRedes({ datos, filtros, filtrar, irA }) {
  const f = { ...filtros, formato: '', estado: '' }
  const base = useMemo(() => filtrarRedes(datos.publicaciones, f), [datos.publicaciones, f.pais, f.marca, f.red, f.mes]) // eslint-disable-line react-hooks/exhaustive-deps
  const r = resumenPublicaciones(base)
  const mesAnterior = datos.meses[datos.meses.indexOf(filtros.mes) + 1]
  const anterior = mesAnterior ? resumenPublicaciones(filtrarRedes(datos.publicaciones, { ...f, mes: mesAnterior })) : null
  const cambioAlcance = anterior?.alcance ? ((r.alcance - anterior.alcance) / anterior.alcance) * 100 : null
  const cuentas = filtrarRedes(datos.cuentas, { ...f, mes: '' })
  const anuncios = filtrarRedes(datos.anuncios, { ...f, red: '' })
  const t = totalesAnuncios(anuncios)
  const marcas = porMarca(base).filter((m) => !filtros.marca || m.marca === filtros.marca).filter((m) => !filtros.pais || MARCAS[m.marca].pais === filtros.pais)
  const redes = filtros.red ? [filtros.red] : ['fb', 'ig']
  const unaMoneda = t.porMoneda.length === 1 ? t.porMoneda[0] : null
  const sem = r.semaforo

  return <>
    <Bloque titulo={`Resultados · ${nombreMes(filtros.mes)}`} />
    <div className="mkv2-redes-kpis">
      <TarjetaRedes titulo="Publicaciones" icono={FileText} color={colorSem(sem)} serie={serieSemanal(base, filtros.mes)}
        valor={<><Numero n={r.publicadas} /> <small>de {numero(r.aFecha)}</small></>}
        sub={<><PildoraSem semaforo={sem} cumplimiento={r.cumplimiento} /> · {numero(r.programadas)} por venir</>}
        tip={`Publicaciones: ${numero(r.publicadas)} publicadas de ${numero(r.aFecha)} programadas a la fecha (${pct(r.cumplimiento)})\n${numero(r.programadas)} programadas por venir\nSemáforo: 100 % verde · 90–99 % amarillo · menos de 90 % rojo`} />
      <TarjetaRedes titulo="Alcance" icono={Eye} color="#2fb8c4" serie={serieSemanal(base, filtros.mes, 'alcance')} valor={<Numero n={r.alcance} />}
        sub={cambioAlcance === null ? 'personas distintas' : <><b className={cambioAlcance >= 0 ? 'is-sube' : 'is-baja'}>{cambioAlcance >= 0 ? '▲' : '▼'} {Math.abs(cambioAlcance).toFixed(1)} %</b> vs mes anterior</>}
        tip={`Alcance: ${numero(r.alcance)} personas distintas vieron alguna publicación${anterior ? `\nMes anterior: ${numero(anterior.alcance)}` : ''}`} />
      <TarjetaRedes titulo="Interacciones" icono={Heart} color="#9085e9" serie={serieSemanal(base, filtros.mes, 'interacciones')} valor={<Numero n={r.interacciones} />}
        sub={<>tasa <b>{pct(r.tasa)}</b> del alcance</>}
        tip={`Interacciones: ${numero(r.interacciones)} (reacciones, comentarios, compartidos y guardados)\nTasa: ${pct(r.tasa)} del alcance`} />
      <TarjetaRedes titulo="Seguidores" icono={Users} color="#3987e5" valor={<Numero n={seguidores(cuentas)} />}
        sub={`${numero(cuentas.length)} ${cuentas.length === 1 ? 'cuenta' : 'cuentas'}`} tip={`Seguidores de las ${numero(cuentas.length)} cuentas filtradas: ${numero(seguidores(cuentas))}`} />
      <TarjetaRedes titulo="Inversión" icono={Wallet} color="#c9364b"
        valor={unaMoneda ? <Numero n={unaMoneda.gastado} formato={(x) => dinero(x, unaMoneda.moneda)} /> : t.porMoneda.length ? <span className="mkv2-redes-monedas">{dineroPorMoneda(t.porMoneda, 'gastado')}</span> : '—'}
        sub={`${numero(t.campanas)} ${t.campanas === 1 ? 'campaña' : 'campañas'}${t.porMoneda.length > 1 ? ' · monedas separadas' : ''}`}
        tip={`Inversión (gastado en anuncios): ${dineroPorMoneda(t.porMoneda, 'gastado')}\nCada cuenta de anuncios tiene su moneda; no se suman monedas distintas.`} onClick={() => irA('anuncios')} />
      <TarjetaRedes titulo="Mensajes" icono={MessageCircle} color={COLOR_MAILING.entregados} valor={<Numero n={t.mensajes} />}
        sub={<><b>{dineroPorMoneda(t.porMoneda, 'costoMensaje')}</b> por mensaje</>}
        tip={`Mensajes: ${numero(t.mensajes)} conversaciones que abrió un anuncio\nCosto por mensaje: ${dineroPorMoneda(t.porMoneda, 'costoMensaje')}`} onClick={() => irA('anuncios')} />
    </div>

    <div className="mkv2-redes-tres">
      <Tarjeta titulo="Programado vs publicado" sub="Clic en una parte para ver esas publicaciones">
        <DonaRedes activo={filtros.estado} centro={r.cumplimiento === null ? '—' : <Numero n={r.cumplimiento} formato={(x) => `${Math.round(x)} %`} />} sub="cumplimiento"
          items={[['publicada', r.publicadas], ['no_publicada', r.noPublicadas], ['programada', r.programadas]].map(([k, v]) => ({ k, l: ESTADOS[k], v, c: COLOR_ESTADO[k] }))}
          onElegir={(k) => { filtrar({ estado: filtros.estado === k ? '' : k }); irA('publicaciones') }} />
      </Tarjeta>
      <Tarjeta titulo="Por marca" sub="Publicadas · clic para ver solo esa marca">
        <DonaRedes activo={filtros.marca} centro={<Numero n={r.publicadas} />} sub="publicadas"
          items={porMarca(base).filter((m) => !filtros.pais || MARCAS[m.marca].pais === filtros.pais).map((m) => ({ k: m.marca, l: MARCAS[m.marca].corto, v: m.publicadas, c: MARCAS[m.marca].color }))}
          onElegir={(k) => filtrar({ marca: filtros.marca === k ? '' : k })} />
      </Tarjeta>
      <Tarjeta titulo="Por red y formato" sub="Publicadas · clic para ver esas publicaciones">
        <DonaRedes activo={filtros.red && filtros.formato ? `${filtros.red}|${filtros.formato}` : ''}
          centro={<Numero n={porRedFormato(base).filter((x) => x.red === 'fb').reduce((n, x) => n + x.publicaciones, 0)} />} sub="en Facebook"
          items={porRedFormato(base).map((x, i) => ({ k: x.clave, l: `${REDES[x.red]} · ${FORMATOS[x.formato] ?? x.formato}`, v: x.publicaciones, c: x.red === 'fb' ? ['#3987e5', '#5b9df0', '#86b8f5', '#2b6cc0'][i % 4] : ['#d6589b', '#e47bb3', '#b8437f', '#f0a3cb'][i % 4] }))}
          onElegir={(k) => { const [red, formato] = k.split('|'); filtrar({ red, formato }); irA('publicaciones') }} />
      </Tarjeta>
    </div>

    <div className="mkv2-duo">
      <Tarjeta titulo="Programado vs publicado por marca" sub="Publicadas de las programadas a la fecha · clic para ver solo esa marca">
        <div className="mkv2-embudo mkv2-embudo-rol">
          {marcas.map((m) => <FilaBarra key={m.marca} nombre={MARCAS[m.marca].corto} valor={m.cumplimiento ?? 0} max={100} meta={90}
            color={colorSem(m.semaforo)} cifra={m.cumplimiento === null ? <span className="fv2-tenue">—</span> : `${numero(m.publicadas)} de ${numero(m.aFecha)}`}
            detalle={m.cumplimiento === null ? 'sin programadas' : `${Math.round(m.cumplimiento)} % · ${TEXTO_SEMAFORO[m.semaforo]}`}
            tip={`${MARCAS[m.marca].nombre}: ${numero(m.publicadas)} publicadas de ${numero(m.aFecha)} programadas (${pct(m.cumplimiento)})`}
            onClick={() => filtrar({ marca: filtros.marca === m.marca ? '' : m.marca })} activa={filtros.marca === m.marca} />)}
        </div>
        <LeyendaSemaforo />
      </Tarjeta>
      <Tarjeta titulo="Alcance por semana" sub="Facebook e Instagram lado a lado · publicaciones del mes">
        <BarrasSemana semanas={alcancePorSemana(base, filtros.mes)} redes={redes} />
      </Tarjeta>
    </div>

    <Bloque titulo="Por marca" />
    <div className="mkv2-redes-marcas">
      {marcas.map((m, i) => <button type="button" key={m.marca} className={`mkv2-redes-marca ${filtros.marca === m.marca ? 'is-activa' : ''}`}
        style={{ '--c': MARCAS[m.marca].color, animationDelay: `${i * 0.07}s` }} onClick={() => filtrar({ marca: filtros.marca === m.marca ? '' : m.marca })}
        data-tip={`${MARCAS[m.marca].nombre} (${MARCAS[m.marca].pais}) · clic para ${filtros.marca === m.marca ? 'ver todas' : 'ver solo esta marca'}`}>
        <Anillo pct={m.cumplimiento} color={colorSem(semaforoCumplimiento(m.cumplimiento))} />
        <span className="mkv2-redes-marca-datos">
          <span className="mkv2-redes-marca-cabeza"><b>{MARCAS[m.marca].nombre}</b><em>{MARCAS[m.marca].pais}</em></span>
          <span><small>Publicadas</small><b>{numero(m.publicadas)} de {numero(m.aFecha)} <PildoraSem semaforo={m.semaforo} cumplimiento={m.cumplimiento} /></b></span>
          <span><small>Alcance</small><b>{numero(m.alcance)}</b></span>
          <span><small>Interacciones</small><b>{numero(m.interacciones)}</b></span>
        </span>
      </button>)}
    </div>
    <p className="mkv2-nota">«Programado» saldrá del «Plan del mes» que carga Marketing (REDES.md, parte 7); hoy son datos de ejemplo. Redes: <span style={{ color: COLOR_RED.fb }}>■</span> Facebook · <span style={{ color: COLOR_RED.ig }}>■</span> Instagram.</p>
  </>
}
