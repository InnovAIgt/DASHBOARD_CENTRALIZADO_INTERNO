// Canales de marketing · Redes sociales · PRESUPUESTOS MÁS EFECTIVOS (mockup_presupuestos): la tarjeta de Anuncios y la
// ventana de una campaña. Datos del mes elegido, sin reclutamiento (/anuncios-detalle). Cálculos en
// datos/presupuestoDetalle.js. Cada campaña se nombra por su texto promocionado (nombreConTexto).
import { numero, pct } from '../../datos/calculos.js'
import { MIN_MENSAJES, nombreConTexto } from '../../datos/anunciosFase2.js'
import { dinero as dineroDe, MARCAS, PAISES, tituloLimpio } from '../../datos/redes.js'
import {
  comparacionCampana, dineroYMensajes, estadoMeta, lecturaPresupuestos, presupuestoDelMes, recomendacionesCampana, resultadoCampana, resumenPresupuestos, semanasCampana,
} from '../../datos/presupuestoDetalle.js'
import { ESTADOS_META, formatoAnuncio, leadsDeAnuncio, textoFechas } from '../../datos/segmentoDetalle.js'
import { CircleDollarSign } from 'lucide-react'
import { PildoraCosto, TarjetaCompacta } from './piezasRedes.jsx'
import { textoNormal } from '../../datos/palabrasTalCual.js'

const COLORES = ['#3fcf8e', '#f0c15a', '#7fb0f0', '#e27bb5', '#9085e9', '#2fb8c4']
const Resaltado = ({ texto }) => <>{String(texto).split('**').map((t, i) => (i % 2 ? <b key={i}>{t}</b> : t))}</>
const Seccion = ({ titulo, children }) => <section className="mkv2-sd-seccion"><h4>{titulo}</h4>{children}</section>

/**
 * Tarjeta «Presupuestos más efectivos» compacta: costo promedio por mensaje en grande (con invertido y meta al lado),
 * barras finas por campaña con la meta punteada, pocos datos plegados en una línea y la lectura en 1 línea.
 * «Ver reparto» abre «¿A dónde fue el dinero y qué trajo?». Clic en una campaña = su ventana (alAbrir).
 */
export function TarjetaPresupuestos({ pres, moneda, meta, textoDe, alAbrir, abrir, aviso = null, nota = null }) {
  const d = (v) => dineroDe(v, moneda)
  const r = resumenPresupuestos(pres)
  const nombre = (p) => nombreConTexto({ texto: textoDe(p), campana: p.campana, objetivo: p.campanaInfo?.objetivo })
  const buenas = pres.filter((p) => !p.pocos && p.costo !== null).sort((a, b) => a.costo - b.costo)
  const pocas = pres.filter((p) => p.pocos || p.costo === null)
  const tope = Math.max(meta ?? 0, ...buenas.map((p) => p.costo), 0.01) * 1.15
  const fila = (p) => {
    const n = nombre(p)
    return <button key={p.id} type="button" className="mkv2-tc-barra" onClick={() => alAbrir(p)} data-tip={`${n.tip}\n${n.sub ?? ''}\n${d(p.gastado)} → ${numero(p.mensajes)} mensajes`}>
      <span className="mkv2-tc-barra-top"><b className="mkv2-una-linea">{n.titulo}</b>
        <PildoraCosto costo={p.costo} mensajes={p.mensajes} pocos={p.pocos} meta={meta} formato={d} /></span>
      {!p.pocos && p.costo !== null && <span className="mkv2-tc-pista" style={meta ? { '--x': `${(meta / tope) * 100}%` } : undefined}>
        <i className={meta && p.costo > meta ? 'is-ambar' : 'is-verde'} style={{ width: `${(p.costo / tope) * 100}%` }} />{meta && <em />}</span>}
    </button>
  }
  const reparto = () => abrir(ventanaReparto({ pres, moneda, meta, textoDe }))
  return <TarjetaCompacta aviso={aviso} nota={nota} color="#f0c341" icono={<CircleDollarSign size={15} />} titulo="Presupuestos más efectivos" sub="¿Dónde rindió más cada dólar? · clic para ver la campaña"
    enlace={pres.length ? { texto: 'Ver reparto', alHacer: reparto } : null} lectura={buenas.length ? lecturaPresupuestos(pres, (p) => nombre(p).titulo) : ''}>
    {pres.length ? <>
      <div className="mkv2-tc-hero">
        <div><b className="mkv2-tc-grande">{d(r.promedio)}<small>/ mensaje</small></b><span>promedio del mes</span></div>
        <div className="mkv2-tc-lado">Invertido <b>{d(r.total)}</b><br />{meta ? <>Meta <b>{d(meta)}</b> · por confirmar</> : 'Sin meta'}</div>
      </div>
      {buenas.length ? <div className="mkv2-tc-barras">{buenas.map(fila)}</div> : <p className="mkv2-redes-vacio is-gris">Ninguna campaña con {MIN_MENSAJES}+ mensajes</p>}
      {pocas.length > 0 && <details className="mkv2-tc-pocos">
        <summary>{numero(pocas.length)} {pocas.length === 1 ? 'campaña' : 'campañas'} con pocos datos · {d(r.pocos.gastado)}</summary>
        <div className="mkv2-tc-barras">{pocas.map(fila)}</div>
      </details>}
    </> : <p className="mkv2-redes-vacio is-gris">Sin campañas en este mes</p>}
  </TarjetaCompacta>
}

/** Ventana «Ver reparto» de Presupuestos: resumen, ¿a dónde fue el dinero y qué trajo? y la lectura completa. */
function ventanaReparto({ pres, moneda, meta, textoDe }) {
  const d = (v) => dineroDe(v, moneda)
  const r = resumenPresupuestos(pres)
  const nombre = (p) => nombreConTexto({ texto: textoDe(p), campana: p.campana, objetivo: p.campanaInfo?.objetivo })
  const dinero = dineroYMensajes(pres)
  const color = (id, i) => (id === 'pocos' ? '#5b6b84' : COLORES[i % COLORES.length])
  const nom = (x) => (x.pocos ? 'Pocos datos' : nombre(pres.find((p) => p.id === x.id)).titulo)
  const cuerpo = <div className="mkv2-sd">
    <div className="mkv2-pres-resumen">
      <div style={{ '--c': '#d98b1f' }}><small>Invertido</small><b>{d(r.total)}</b><span>{numero(r.campanas)} {r.campanas === 1 ? 'campaña' : 'campañas'}</span></div>
      <div style={{ '--c': '#18935f' }}><small>Mejor campaña</small><b className="mkv2-una-linea" data-tip={r.mejor ? nombre(r.mejor).tip : ''}>{r.mejor ? nombre(r.mejor).titulo : 'Aún sin datos'}</b>
        <span>{r.mejor ? `${d(r.mejor.costo)} por mensaje` : `ninguna con ${MIN_MENSAJES}+ mensajes`}</span></div>
      <div style={{ '--c': '#7fb0f0' }}><small>Promedio del mes</small><b>{d(r.promedio)}</b><span>{meta ? `meta: ${d(meta)} (por confirmar)` : 'sin meta'}</span></div>
    </div>
    {dinero.length > 0 && <div className="mkv2-pres-dinero">
      <h5>¿A dónde fue el dinero y qué trajo?</h5>
      {[['Inversión', 'pctInversion'], ['Mensajes', 'pctMensajes']].map(([t, k]) => <div key={t} className="mkv2-pres-dinero-fila">
        <span>{t}</span>
        <span className="mkv2-pres-apilada">{dinero.map((x, i) => <i key={x.id} style={{ width: `${x[k]}%`, background: color(x.id, i) }} data-tip={`${nom(x)}\n${t}: ${pct(x[k])}`} />)}</span>
      </div>)}
      <p className="mkv2-redes-esc">{dinero.map((x, i) => <span key={x.id}><i style={{ background: color(x.id, i) }} /> {nom(x)} · {Math.round(x.pctInversion)} % / {Math.round(x.pctMensajes)} % </span>)}</p>
    </div>}
    {pres.some((p) => !p.pocos) && <p className="mkv2-redes-lectura"><b>Lectura:</b> {lecturaPresupuestos(pres, (p) => nombre(p).titulo)}</p>}
  </div>
  return { ancho: true, etiqueta: 'Presupuestos más efectivos', titulo: '¿A dónde fue el dinero y qué trajo?', sub: '% de la inversión y % de los mensajes de cada campaña · sin reclutamiento',
    cuerpo, pie: 'Fuente: Meta (pauta del mes elegido) · las de pocos datos (menos de 5 mensajes) van juntas' }
}

/**
 * Ventana de una campaña (objeto «detalle» con cuerpo propio).
 * @param {{c, todas, moneda, meta, leadsDePub, mes, hoy, anterior, textoDe}} p  anterior = costo por mensaje del mes pasado
 */
export function ventanaCampana({ c, todas, moneda, meta, leadsDePub, mes, hoy, anterior = null, textoDe }) {
  const d = (v) => dineroDe(v, moneda)
  const nombre = (x) => nombreConTexto({ texto: textoDe(x), campana: x.campana, objetivo: x.campanaInfo?.objetivo })
  const n = nombre(c)
  const res = resultadoCampana(c, todas, leadsDePub)
  const pre = presupuestoDelMes(c, mes, hoy)
  const { semanas, cansancio } = semanasCampana(c)
  const maxG = Math.max(1, ...semanas.map((w) => w.gastado))
  const maxM = Math.max(1, ...semanas.map((w) => w.mensajes))
  const comp = comparacionCampana(c, todas, res.promedio, meta, anterior, (x) => nombre(x).titulo)
  const maxC = Math.max(...comp.map((x) => x.costo ?? 0), 0.01) * 1.1
  const recos = recomendacionesCampana(c, todas, meta, cansancio)
  const e = estadoMeta(c.costo, meta, c.pocos)
  const ci = c.campanaInfo ?? {}
  const marca = MARCAS[c.marca]
  const anuncios = c.anuncios ?? []
  const semanaTxt = (w) => `${Number(String(w.desde).slice(8, 10))}–${Number(String(w.hasta).slice(8, 10))}`

  const cuerpo = <div className="mkv2-sd">
    <Seccion titulo="Resultado de la inversión">
      <div className="mkv2-redes-det-kpis mkv2-pres-kpis">
        <div className="mkv2-redes-det-kpi" style={{ '--c': '#d98b1f' }}><small>Invertido</small><b>{d(c.gastado)}</b><em>{pct(res.pctInversion)} de la pauta</em></div>
        <div className="mkv2-redes-det-kpi" style={{ '--c': '#18935f' }}><small>Mensajes</small><b>{numero(c.mensajes)}</b><em>{pct(res.pctMensajes)} del mes</em></div>
        <div className="mkv2-redes-det-kpi" style={{ '--c': '#2fb8c4' }}><small>Costo c/u</small><b>{c.pocos ? 'pocos datos' : d(c.costo)}</b>
          <em>{res.difCosto === null || c.pocos ? `promedio ${d(res.promedio)}` : `${Math.round(Math.abs(res.difCosto))} % ${res.difCosto <= 0 ? 'menos' : 'más'} que el promedio`}</em></div>
        <div className="mkv2-redes-det-kpi" style={{ '--c': '#d6589b' }}><small>Leads (est.)</small><b>{numero(res.leads.length)}</b><em>{res.leads.length ? `${d(res.costoLead)} por lead` : 'sin leads estimados'}</em></div>
      </div>
    </Seccion>

    <Seccion titulo="Presupuesto">
      {pre ? <div className="mkv2-redes-det-bloque mkv2-pres-uso">
        <div className="mkv2-pres-uso-fila"><span>{pre.tipo === 'diario'
          ? <>Presupuesto diario: <b>{d(pre.monto)}</b>{pre.dias ? <> × {numero(pre.dias)} días = <b>{d(pre.previsto)}</b> previsto</> : ''}</>
          : <>Presupuesto total de la campaña: <b>{d(pre.monto)}</b></>}</span>
          <span><b>{pre.usado === null ? '—' : `${Math.round(pre.usado)} %`}</b> usado</span></div>
        <span className="mkv2-pres-uso-barra"><i style={{ width: `${Math.min(100, pre.usado ?? 0)}%` }} /></span>
        <div className="mkv2-pres-uso-fila"><span>Gastado: <b>{d(pre.gastado)}</b></span><span>Gasto promedio: <b>{pre.porDia === null ? '—' : `${d(pre.porDia)} por día`}</b></span></div>
      </div> : <p className="mkv2-redes-vacio is-gris">Meta no da el presupuesto de esta campaña.</p>}
    </Seccion>

    <Seccion titulo="Cómo se fue gastando">
      <div className="mkv2-sd-dos">
        <div className="mkv2-redes-det-bloque">
          <h5>Por semana · inversión y mensajes</h5>
          {semanas.length ? <>
            <div className="mkv2-pres-semanas">{semanas.map((w) => <div key={w.desde} className="mkv2-pres-semana" data-tip={`Días ${semanaTxt(w)}\n${d(w.gastado)} · ${numero(w.mensajes)} mensajes`}>
              <span className="mkv2-pres-cols"><i className="is-gasto" style={{ height: `${(w.gastado / maxG) * 100}%` }} /><i className="is-msj" style={{ height: `${(w.mensajes / maxM) * 100}%` }} /></span>
              <small>{semanaTxt(w)}</small></div>)}</div>
            <p className="mkv2-redes-esc"><i style={{ background: '#d9a520' }} /> Inversión · <i style={{ background: '#3fcf8e' }} /> Mensajes</p>
            {cansancio
              ? <p className="mkv2-redes-lectura is-alerta">Los mensajes bajaron {cansancio.caida} % en la {cansancio.semana}.ª semana con un gasto parecido: <b>el anuncio se está cansando</b>.</p>
              : <p className="mkv2-redes-det-nota">Sin caídas fuertes de mensajes con el mismo gasto.</p>}
          </> : <p className="mkv2-redes-vacio is-gris">Meta no dio el detalle por semana.</p>}
        </div>
        <div className="mkv2-redes-det-bloque">
          <h5>Comparada con las demás · costo por mensaje</h5>
          {comp.map((x) => <div key={x.id} className={`mkv2-sd-comp ${x.esta ? 'is-este' : ''}`}>
            <span className="mkv2-una-linea" data-tip={x.nombre}>{x.nombre}</span>
            <span className="mkv2-sd-barra">{x.meta
              ? <em style={{ left: `${(x.costo / maxC) * 100}%` }} />
              : !x.pocos && x.costo !== null && <i style={{ width: `${(x.costo / maxC) * 100}%`, background: x.esta ? '#3fcf8e' : x.gris ? '#5b6b84' : x.anterior ? '#3987e5' : meta && x.costo > meta ? '#d9a520' : '#3f9c85' }} />}</span>
            <b>{x.pocos ? 'pocos datos' : dineroDe(x.costo, moneda)}</b>
          </div>)}
          <p className="mkv2-redes-det-nota">Barra más corta = más barato. La meta está por confirmar.</p>
        </div>
      </div>
    </Seccion>

    <Seccion titulo="Anuncios de la campaña">
      <div className="fv2-tabla-caja"><table className="fv2-tabla mkv2-tabla mkv2-sd-anuncios">
        <thead><tr>{['Anuncio', 'Formato', 'Invertido', 'Mensajes', 'Costo c/u', 'Leads (est.)'].map((h, i) => <th key={h} className={i > 1 ? 'num' : ''}>{h}</th>)}</tr></thead>
        <tbody>{anuncios.map((a) => {
          const costo = a.mensajes > 0 ? a.gastado / a.mensajes : null
          const pocos = a.mensajes < MIN_MENSAJES
          const titulo = a.texto || a.titulo || a.nombre
          return <tr key={a.id}>
            <td className="mkv2-celda-campana"><b className="mkv2-una-linea" data-tip={titulo}>{textoNormal(tituloLimpio(titulo))}</b><small className="mkv2-una-linea mkv2-redes-campana-sub" data-tip={a.nombre}>Anuncio: {a.nombre}</small></td>
            <td>{formatoAnuncio(a)}</td><td className="num">{d(a.gastado)}</td><td className="num">{numero(a.mensajes)}</td>
            <td className="num">{pocos ? <span className="mkv2-redes-pocos">pocos datos</span> : <span className={`mkv2-redes-sem ${meta && costo !== null ? (costo <= meta ? 'is-verde' : 'is-amarillo') : ''}`}>{d(costo)}</span>}</td>
            <td className="num mkv2-redes-rosa">{numero(leadsDeAnuncio(a, leadsDePub).length)}</td>
          </tr>
        })}
        {!anuncios.length && <tr><td colSpan={6} className="fv2-tabla-vacia">Meta no dio los anuncios de esta campaña</td></tr>}</tbody>
      </table></div>
    </Seccion>

    {recos.length > 0 && <Seccion titulo="Recomendación">
      <div className="mkv2-sd-reco"><small>Calculada con los datos</small><ul>{recos.map((x) => <li key={x}><Resaltado texto={x} /></li>)}</ul></div>
    </Seccion>}
  </div>

  return {
    ancho: true,
    etiqueta: `Campaña${c.pocos ? ' · pocos datos' : e ? ` · ${e.texto}` : ''}`,
    titulo: n.titulo,
    sub: n.sub ?? '',
    chips: [marca ? `${marca.corto} · ${PAISES[marca.pais]}` : 'Sin página', ESTADOS_META[ci.estado] ?? null, textoFechas(ci.inicio, ci.fin, hoy),
      `${numero(c.conjuntos ?? 0)} ${c.conjuntos === 1 ? 'conjunto' : 'conjuntos'} · ${numero(anuncios.length)} ${anuncios.length === 1 ? 'anuncio' : 'anuncios'}`],
    cuerpo,
    pie: `Fuente: Meta (pauta) y Prospekt (leads estimados) · sin reclutamiento · campaña en Meta: ${c.campana}`,
  }
}
