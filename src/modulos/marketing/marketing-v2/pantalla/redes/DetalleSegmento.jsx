// Canales de marketing · Redes sociales · VENTANA DE UNA SEGMENTACIÓN (mockup_detalle_segmentacion): encabezado,
// resultados del público, lectura para Marketing, a quién se le mostró (configuración y comparación), dentro de este
// público (edad y sexo, plataforma, momento del día), anuncios del conjunto y recomendación. Datos del mes elegido, sin
// reclutamiento. Cálculos en datos/segmentoDetalle.js. Se abre desde «Segmentaciones ganadoras» (Anuncios.jsx).
import { numero, pct } from '../../datos/calculos.js'
import { MIN_MENSAJES, nombreConTexto, objetivoTexto } from '../../datos/anunciosFase2.js'
import { dinero as dineroDe, MARCAS, nombreCampana, nombreMes, PAISES, tituloLimpio } from '../../datos/redes.js'
import { textoNormal } from '../../datos/palabrasTalCual.js'
import {
  comparacionSegmento, edadesSegmento, ESTADOS_META, formatoAnuncio, lecturaSegmento, leadsDeAnuncio, momentosSegmento, plataformasSegmento,
  recomendacionesSegmento, resultadosSegmento, textoFechas,
} from '../../datos/segmentoDetalle.js'

/** Texto con «**resaltado**». */
const Resaltado = ({ texto }) => <>{String(texto).split('**').map((t, i) => (i % 2 ? <b key={i}>{t}</b> : t))}</>
const Pocos = () => <span className="mkv2-redes-pocos">pocos datos</span>
const Seccion = ({ titulo, children }) => <section className="mkv2-sd-seccion"><h4>{titulo}</h4>{children}</section>

/** Fila con barra: nombre, barra, valor y costo (o «pocos datos»). */
function FilaBarra({ nombre, partes, max, valor, costo, pocos, mejor }) {
  return <div className="mkv2-sd-fila">
    <span className="mkv2-una-linea">{nombre}</span>
    <span className="mkv2-sd-barra">{partes.map((p, i) => <i key={i} style={{ width: `${(p.v / max) * 100}%`, background: p.c }} />)}</span>
    <b>{numero(valor)}</b>
    {pocos ? <Pocos /> : <small className={mejor ? 'mkv2-redes-sem is-verde' : ''}>{costo}</small>}
  </div>
}

/**
 * Arma la ventana (objeto «detalle» con cuerpo propio) de una segmentación.
 * @param {{seg, n, ganadora, todos, moneda, meta, leadsDePub: (idPublicacion) => leads[], mes, hoy}} p
 */
export function ventanaSegmento({ seg, n, ganadora, todos, moneda, meta, leadsDePub, mes, hoy, textoDe = (x) => x.texto }) {
  const nombre = (x) => nombreConTexto({ texto: textoDe(x), campana: x.campana, objetivo: x.campanaInfo?.objetivo })
  const nom = nombre(seg)
  const d = (v) => dineroDe(v, moneda)
  const res = resultadosSegmento(seg, todos, leadsDePub)
  const lectura = lecturaSegmento(seg, res, todos, d)
  const comp = comparacionSegmento(seg, todos, res.promedio, meta, (s) => nombre(s).titulo)
  const maxComp = Math.max(...comp.map((c) => c.costo ?? 0), 0.01) * 1.1
  const edades = edadesSegmento(seg)
  const maxEdad = Math.max(1, ...edades.filas.map((e) => e.mensajes))
  const baratoEdad = edades.filas.filter((e) => !e.pocos && e.edad !== 'Sin dato').reduce((a, b) => (!a || b.costo < a.costo ? b : a), null)
  const plataformas = plataformasSegmento(seg)
  const maxPlat = Math.max(1, ...plataformas.map((p) => p.mensajes))
  const baratoPlat = plataformas.filter((p) => !p.pocos).reduce((a, b) => (!a || b.costo < a.costo ? b : a), null)
  const momentos = momentosSegmento(seg)
  const maxMom = Math.max(1, ...momentos.map((m) => m.mensajes))
  const baratoMom = momentos.filter((m) => !m.pocos).reduce((a, b) => (!a || b.costo < a.costo ? b : a), null)
  const recos = recomendacionesSegmento(seg, res)
  const p = seg.publico ?? {}
  const c = seg.conjunto ?? {}
  const ci = seg.campanaInfo ?? {}
  const estado = ESTADOS_META[c.estado] ?? ESTADOS_META[ci.estado] ?? null
  const fechas = textoFechas(c.inicio ?? ci.inicio, c.fin ?? ci.fin, hoy)
  const conjuntoDistinto = nombreCampana(seg.nombre).toLowerCase().trim() !== nombreCampana(seg.campana).toLowerCase().trim()
  const marca = MARCAS[seg.marca]
  const verde = '#18935f'

  const cuerpo = <div className="mkv2-sd">
    <Seccion titulo="Resultados del público">
      <div className="mkv2-redes-det-kpis mkv2-sd-kpis">
        <div className="mkv2-redes-det-kpi" style={{ '--c': '#d98b1f' }}><small>Inversión</small><b>{d(res.gastado)}</b><em>{pct(res.pctInversion)} de la pauta</em></div>
        <div className="mkv2-redes-det-kpi" style={{ '--c': verde }}><small>Mensajes</small><b>{numero(res.mensajes)}</b><em>{pct(res.pctMensajes)} del mes</em></div>
        <div className="mkv2-redes-det-kpi" style={{ '--c': '#2fb8c4' }}><small>Costo c/u</small><b>{res.pocos ? 'pocos datos' : d(res.costo)}</b>
          <em>{res.difCosto === null || res.pocos ? `promedio del mes ${d(res.promedio)}` : `${Math.round(Math.abs(res.difCosto))} % ${res.difCosto <= 0 ? 'menos' : 'más'} que el promedio`}</em></div>
        <div className="mkv2-redes-det-kpi" style={{ '--c': '#3987e5' }}><small>Alcance</small><b>{res.alcance ? numero(res.alcance) : '—'}</b><em>frecuencia {res.frecuencia ? res.frecuencia.toFixed(1) : '—'}</em></div>
        <div className="mkv2-redes-det-kpi" style={{ '--c': '#9085e9' }}><small>CTR · CPC</small><b>{pct(res.ctr)}</b><em>{d(res.cpc)} por clic</em></div>
        <div className="mkv2-redes-det-kpi" style={{ '--c': '#d6589b' }}><small>Leads (est.)</small><b>{numero(res.leads.length)}</b><em>{res.leads.length ? `${d(res.costoLead)} por lead` : 'sin leads estimados'}</em></div>
      </div>
    </Seccion>

    <Seccion titulo="Lectura para Marketing">
      <div className="mkv2-sd-lectura">
        {lectura.map((l) => <div key={l.k} className={`mkv2-sd-lect is-${l.k} ${l.alerta ? 'is-alerta' : ''}`}><small>{l.titulo}</small><p><Resaltado texto={l.texto} /></p></div>)}
      </div>
    </Seccion>

    <Seccion titulo="A quién se le mostró">
      <div className="mkv2-sd-dos">
        <div className="mkv2-redes-det-bloque">
          <h5>Público configurado</h5>
          <dl className="mkv2-sd-config">
            <dt>Edad</dt><dd>{p.edad ?? '—'}</dd>
            <dt>Sexo</dt><dd>{p.sexo ?? '—'}</dd>
            <dt>Ubicación</dt><dd>{[...(p.paises ?? []).map((x) => PAISES[x] ?? x), ...(p.lugares ?? [])].join(' · ') || '—'}{p.paises?.length && !p.lugares?.length ? ' · todo el país' : ''}</dd>
            <dt>Idioma</dt><dd>{p.idiomas ? `${p.idiomas} configurado${p.idiomas === 1 ? '' : 's'}` : 'Todos'}</dd>
            <dt>Intereses</dt><dd>{p.intereses?.length ? <span className="mkv2-seg-chips is-det">{p.intereses.map((i) => <span key={i} className="mkv2-seg-chip">{i}</span>)}</span>
              : <span className="mkv2-seg-chip">Sin intereses · público amplio</span>}</dd>
            <dt>Públicos</dt><dd>{p.publicos?.length ? p.publicos.join(' · ') : '— (sin públicos personalizados)'}</dd>
            <dt>Ubicaciones</dt><dd>{p.posiciones?.length ? p.posiciones.join(' · ') : p.ubicaciones && p.ubicaciones !== 'Automáticas' ? p.ubicaciones : 'Automáticas (Meta decide)'}</dd>
          </dl>
        </div>
        <div className="mkv2-redes-det-bloque">
          <h5>Comparado con los otros públicos del mes</h5>
          {comp.map((x) => <div key={x.id} className={`mkv2-sd-comp ${x.este ? 'is-este' : ''}`}>
            <span className="mkv2-una-linea">{x.nombre}</span>
            <span className="mkv2-sd-barra">{x.meta
              ? <em style={{ left: `${(x.costo / maxComp) * 100}%` }} />
              : !x.pocos && x.costo !== null && <i style={{ width: `${(x.costo / maxComp) * 100}%`, background: x.este ? verde : x.gris ? '#5b6b84' : meta && x.costo > meta ? '#d9a520' : '#3f9c85' }} />}</span>
            <b>{x.pocos ? 'pocos datos' : d(x.costo)}</b>
          </div>)}
          <p className="mkv2-redes-det-nota">Costo por mensaje · barra más corta = más barato. La meta está por confirmar.</p>
        </div>
      </div>
    </Seccion>

    <Seccion titulo="Dentro de este público, ¿quién escribió?">
      <div className="mkv2-sd-tres">
        <div className="mkv2-redes-det-bloque">
          <h5>Por edad y sexo · mensajes</h5>
          {edades.filas.length ? edades.filas.map((e) => <FilaBarra key={e.edad} nombre={e.edad} max={maxEdad} valor={e.mensajes} pocos={e.pocos} costo={d(e.costo)} mejor={e === baratoEdad}
            partes={e.edad === 'Sin dato' ? [{ v: e.mensajes, c: '#5b6b84' }] : [{ v: e.hombres, c: '#3b82e0' }, { v: e.mujeres, c: '#d64f9a' }, { v: e.sinDato, c: '#5b6b84' }]} />)
            : <p className="mkv2-redes-vacio is-gris">Sin datos</p>}
          {edades.pctHombres !== null && <p className="mkv2-redes-esc"><i style={{ background: '#3b82e0' }} /> Hombres {Math.round(edades.pctHombres)} % · <i style={{ background: '#d64f9a' }} /> Mujeres {Math.round(edades.pctMujeres ?? 0)} %</p>}
        </div>
        <div className="mkv2-redes-det-bloque">
          <h5>Por plataforma · mensajes</h5>
          {plataformas.length ? plataformas.map((x) => <FilaBarra key={x.nombre} nombre={x.nombre} max={maxPlat} valor={x.mensajes} pocos={x.pocos} costo={d(x.costo)} mejor={x === baratoPlat} partes={[{ v: x.mensajes, c: '#3987e5' }]} />)
            : <p className="mkv2-redes-vacio is-gris">Sin datos</p>}
        </div>
        <div className="mkv2-redes-det-bloque">
          <h5>Por momento del día · mensajes</h5>
          {momentos.length ? momentos.map((m) => <FilaBarra key={m.k} nombre={m.nombre} max={maxMom} valor={m.mensajes} pocos={m.pocos} costo={d(m.costo)} mejor={m === baratoMom} partes={[{ v: m.mensajes, c: '#2fb8c4' }]} />)
            : <p className="mkv2-redes-vacio is-gris">Sin datos de horario</p>}
        </div>
      </div>
      <p className="mkv2-redes-det-nota">«pocos datos» = menos de {MIN_MENSAJES} mensajes · el costo verde es el más barato de cada lista.</p>
    </Seccion>

    <Seccion titulo="Anuncios de este público">
      <div className="fv2-tabla-caja"><table className="fv2-tabla mkv2-tabla mkv2-sd-anuncios">
        <thead><tr>{['Anuncio', 'Formato', 'Inversión', 'Alcance', 'CTR', 'Mensajes', 'Costo c/u', 'Leads (est.)'].map((h, i) => <th key={h} className={i > 1 ? 'num' : ''}>{h}</th>)}</tr></thead>
        <tbody>{(seg.anuncios ?? []).map((a) => {
          const costo = a.mensajes > 0 ? a.gastado / a.mensajes : null
          const pocos = a.mensajes < MIN_MENSAJES
          return <tr key={a.id}>
            <td className="mkv2-celda-campana"><b className="mkv2-una-linea" data-tip={a.nombre}>{textoNormal(tituloLimpio(a.titulo || a.nombre))}</b>
              {a.texto && <small className="mkv2-una-linea mkv2-redes-campana-sub" data-tip={a.texto}>«{textoNormal(tituloLimpio(a.texto))}»</small>}</td>
            <td>{formatoAnuncio(a)}</td><td className="num">{d(a.gastado)}</td><td className="num">{numero(a.alcance)}</td>
            <td className="num">{pct(a.impresiones ? (a.clics * 100) / a.impresiones : null)}</td><td className="num">{numero(a.mensajes)}</td>
            <td className="num">{pocos ? <Pocos /> : <span className={`mkv2-redes-sem ${meta && costo !== null ? (costo <= meta ? 'is-verde' : 'is-amarillo') : ''}`}>{d(costo)}</span>}</td>
            <td className="num mkv2-redes-rosa">{numero(leadsDeAnuncio(a, leadsDePub).length)}</td>
          </tr>
        })}
        {!(seg.anuncios ?? []).length && <tr><td colSpan={8} className="fv2-tabla-vacia">Meta no dio los anuncios de este conjunto</td></tr>}</tbody>
      </table></div>
    </Seccion>

    {recos.length > 0 && <Seccion titulo="Recomendación para la próxima pauta">
      <div className="mkv2-sd-reco"><small>Sugerencias calculadas con los datos</small>
        <ul>{recos.map((r) => <li key={r}><Resaltado texto={r} /></li>)}</ul></div>
    </Seccion>}
  </div>

  return {
    ancho: true,
    etiqueta: `${ganadora ? `${n} · Segmentación ganadora` : 'Segmentación'} · ${nombreMes(mes)}`,
    titulo: nom.titulo,
    sub: [nom.sub, conjuntoDistinto ? `Conjunto: ${seg.nombre}` : null].filter(Boolean).join(' · '),
    chips: [marca ? `${marca.corto} · ${PAISES[marca.pais]}` : 'Sin página', objetivoTexto(ci.objetivo) ? `Objetivo: ${objetivoTexto(ci.objetivo)}` : null, estado, fechas,
      c.presupuestoDiario ? `Presupuesto: ${d(c.presupuestoDiario)} diarios` : c.presupuestoTotal ? `Presupuesto: ${d(c.presupuestoTotal)} en total` : null],
    cuerpo,
    pie: 'Fuente: Meta (pauta) y Prospekt (leads estimados) · sin reclutamiento · hora de El Salvador (UTC−6)',
  }
}
