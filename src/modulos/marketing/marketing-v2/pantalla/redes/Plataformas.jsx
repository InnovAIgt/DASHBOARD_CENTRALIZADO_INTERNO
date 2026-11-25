// Canales de marketing · Redes sociales · ¿DÓNDE SE VIERON Y ESCRIBIERON? (mockup_plataformas y mockup_anuncios_compacto):
// la tarjeta compacta de Anuncios (pestañas, dona y lista; «Ver reparto» = tabla completa, «¿Lo que se vio trajo
// mensajes?» y lectura) y la ventana de una plataforma (resultado, ubicaciones y recomendación). Datos del mes elegido,
// sin reclutamiento (/anuncios-detalle). Cálculos en datos/plataformasDetalle.js y datos/anunciosCompacto.js. Sin
// desglose por campaña ni por edad: eso ya está en otras tarjetas.
import { useState } from 'react'
import { numero, pct } from '../../datos/calculos.js'
import { MIN_MENSAJES } from '../../datos/anunciosFase2.js'
import { lecturaPlataformas, recomendacionPlataforma, resultadoPlataforma, resumenPlataformas, ubicacionesPlataforma } from '../../datos/plataformasDetalle.js'
import { dinero as dineroDe, MARCAS, nombreMes } from '../../datos/redes.js'
import { ChartPie } from 'lucide-react'
import { listaPlataformasCompacta } from '../../datos/anunciosCompacto.js'
import { DonaRedes, PildoraCosto, TarjetaCompacta } from './piezasRedes.jsx'

export const COLOR_PLATAFORMA = { facebook: '#3987e5', instagram: '#d6589b', whatsapp: '#18935f', otras: '#5b6b84', resto: '#2bbf7c' }
const VISTAS = { mensajes: 'Mensajes', impresiones: 'Impresiones', inversion: 'Inversión' }
const Resaltado = ({ texto }) => <>{String(texto).split('**').map((t, i) => (i % 2 ? <b key={i}>{t}</b> : t))}</>
const Seccion = ({ titulo, children }) => <section className="mkv2-sd-seccion"><h4>{titulo}</h4>{children}</section>

/**
 * Tarjeta «¿Dónde se vieron y escribieron?» compacta: pestañas en píldora para la dona (Mensajes por defecto,
 * Impresiones, Inversión), dona pequeña y lista (plataforma, % de mensajes, mensajes y costo). WhatsApp y Otras van
 * juntas si las dos tienen menos de 5 mensajes; esa fila abre «Ver reparto». Clic en una plataforma = su ventana.
 */
export function TarjetaPlataformas({ plataformas, moneda, meta, mes, abrir, aviso = null, nota = null }) {
  const [vista, setVista] = useState('mensajes')
  const d = (v) => dineroDe(v, moneda)
  const { total, filas } = resumenPlataformas(plataformas)
  const lista = listaPlataformasCompacta(filas)
  const valor = (p) => (vista === 'mensajes' ? p.mensajes : vista === 'impresiones' ? p.impresiones : p.gastado)
  const centro = vista === 'mensajes' ? numero(total.mensajes) : vista === 'impresiones' ? `${numero(Math.round(total.impresiones / 1000))}k` : d(total.gastado).replace(/\.\d+$/, '')
  const verPlataforma = (p) => ventanaPlataforma({ p, plataformas, moneda, meta, mes })
  const reparto = () => abrir(ventanaRepartoPlataformas({ plataformas, moneda, meta, mes }))
  const elegir = (k) => { const p = lista.find((x) => x.k === k); if (!p) return; if (p.junta) reparto(); else abrir(verPlataforma(plataformas.find((x) => x.k === k))) }
  const lectura = lecturaPlataformas(plataformas, d)
  return <TarjetaCompacta aviso={aviso} nota={nota} color="#4a90ea" icono={<ChartPie size={15} />} titulo="¿Dónde se vieron y escribieron?" sub="Por plataforma · clic para ver sus ubicaciones"
    enlace={plataformas.length ? { texto: 'Ver reparto', alHacer: reparto } : null} lectura={lectura}>
    {plataformas.length ? <>
      <div className="mkv2-tc-vistas" role="tablist" aria-label="La dona muestra">
        {Object.entries(VISTAS).map(([k, t]) => <button key={k} type="button" role="tab" aria-selected={vista === k} className={vista === k ? 'is-activo' : ''} onClick={() => setVista(k)}>{t}</button>)}
      </div>
      <div className="mkv2-tc-plat">
        <DonaRedes sinLista centro={centro} sub={VISTAS[vista].toLowerCase()} onElegir={elegir}
          formato={vista === 'inversion' ? d : numero} items={lista.map((p) => ({ k: p.k, l: p.nombre, v: valor(p), c: COLOR_PLATAFORMA[p.k] }))} />
        <div className="mkv2-tc-lista">{lista.map((p) => <button key={p.k} type="button" className={`mkv2-tc-item ${p.pocos ? 'is-tenue' : ''}`} onClick={() => elegir(p.k)}
          data-tip={p.junta ? 'Menos de 5 mensajes cada una · clic para ver el reparto completo' : `Clic para ver las ubicaciones de ${p.nombre}`}>
          <span className="mkv2-tc-item-color" style={{ background: COLOR_PLATAFORMA[p.k] }} />
          <span className="mkv2-tc-item-nom"><b>{p.nombre}</b><small>{Math.round(p.pctMensajes)} % de los mensajes</small></span>
          <span className="mkv2-tc-item-n">{numero(p.mensajes)}</span>
          <PildoraCosto costo={p.costo} mensajes={p.mensajes} pocos={p.pocos} meta={meta} formato={d} />
        </button>)}</div>
      </div>
    </> : <p className="mkv2-redes-vacio is-gris">Sin impresiones en este mes</p>}
  </TarjetaCompacta>
}

/** Ventana «Ver reparto» de plataformas: tabla completa (clic = la plataforma, con «Volver»), ¿lo que se vio trajo mensajes? y lectura. */
function ventanaRepartoPlataformas({ plataformas, moneda, meta, mes }) {
  const d = (v) => dineroDe(v, moneda)
  const { filas } = resumenPlataformas(plataformas)
  const lectura = lecturaPlataformas(plataformas, d)
  const cuerpo = ({ ir }) => <div className="mkv2-sd">
    <Seccion titulo="Por plataforma">
      <div className="fv2-tabla-caja"><table className="fv2-tabla mkv2-tabla mkv2-plat-ubic">
        <thead><tr><th>Plataforma</th><th className="num">Impresiones</th><th className="num">CTR</th><th className="num">Inversión</th><th className="num">Mensajes</th><th className="num">Costo c/u</th></tr></thead>
        <tbody>{filas.map((p) => <tr key={p.k} className={`mkv2-redes-clic ${p.pocos ? 'is-tenue' : ''}`} tabIndex={0} data-tip={`Clic para ver las ubicaciones de ${p.nombre}`}
          onClick={() => ir(ventanaPlataforma({ p: plataformas.find((x) => x.k === p.k), plataformas, moneda, meta, mes }))}
          onKeyDown={(e) => { if (e.key === 'Enter') ir(ventanaPlataforma({ p: plataformas.find((x) => x.k === p.k), plataformas, moneda, meta, mes })) }}>
          <td><i className="mkv2-plat-cuadro" style={{ background: COLOR_PLATAFORMA[p.k] }} /><b>{p.nombre}</b></td>
          <td className="num">{numero(p.impresiones)} <small className="mkv2-tenue">{Math.round(p.pctImpresiones)} %</small></td>
          <td className="num">{p.ctr === null ? '—' : pct(p.ctr)}</td>
          <td className="num">{d(p.gastado)} <small className="mkv2-tenue">{Math.round(p.pctInversion)} %</small></td>
          <td className="num"><b>{numero(p.mensajes)}</b> <small className="mkv2-tenue">{Math.round(p.pctMensajes)} %</small></td>
          <td className="num"><PildoraCosto costo={p.costo} mensajes={p.mensajes} pocos={p.pocos} meta={meta} formato={d} /></td>
        </tr>)}</tbody>
      </table></div>
    </Seccion>
    <Seccion titulo="¿Lo que se vio trajo mensajes?">
      <div className="mkv2-pres-dinero">
        {[['Impresiones', 'pctImpresiones'], ['Inversión', 'pctInversion'], ['Mensajes', 'pctMensajes']].map(([t, k]) => <div key={t} className="mkv2-pres-dinero-fila">
          <span>{t}</span>
          <span className="mkv2-pres-apilada">{filas.map((p) => <i key={p.k} style={{ width: `${p[k]}%`, background: COLOR_PLATAFORMA[p.k] }} data-tip={`${p.nombre}\n${t}: ${pct(p[k])}`} />)}</span>
        </div>)}
        <p className="mkv2-redes-esc">{filas.map((p) => <span key={p.k}><i style={{ background: COLOR_PLATAFORMA[p.k] }} /> {p.nombre} </span>)}</p>
      </div>
    </Seccion>
    {lectura && <p className="mkv2-redes-lectura"><b>Lectura:</b> {lectura}</p>}
  </div>
  return { ancho: true, etiqueta: '¿Dónde se vieron y escribieron?', titulo: 'Reparto por plataforma', chips: [nombreMes(mes), 'Sin reclutamiento'],
    cuerpo, pie: 'Fuente: Meta (pauta por plataforma y ubicación) · clic en una plataforma para ver sus ubicaciones' }
}

/**
 * Ventana de una plataforma (objeto «detalle» con cuerpo propio).
 * @param {{p, plataformas, moneda, meta, mes}} a
 */
export function ventanaPlataforma({ p, plataformas, moneda, meta, mes }) {
  const d = (v) => dineroDe(v, moneda)
  const r = resultadoPlataforma(p, plataformas)
  const { masBarata } = resumenPlataformas(plataformas)
  const ubic = ubicacionesPlataforma(p)
  const recos = recomendacionPlataforma(p, meta, d)
  const color = COLOR_PLATAFORMA[p.k]

  const cuerpo = <div className="mkv2-sd">
    <Seccion titulo={`Resultado en ${p.nombre}`}>
      <div className="mkv2-redes-det-kpis mkv2-plat-kpis">
        <div className="mkv2-redes-det-kpi" style={{ '--c': '#d98b1f' }}><small>Inversión</small><b>{d(r.gastado)}</b><em>{pct(r.pctInversion)} de la pauta</em></div>
        <div className="mkv2-redes-det-kpi" style={{ '--c': color }}><small>Impresiones</small><b>{numero(r.impresiones)}</b><em>{pct(r.pctImpresiones)} del total</em></div>
        <div className="mkv2-redes-det-kpi" style={{ '--c': '#6650c8' }}><small>CTR · CPC</small><b>{r.ctr === null ? '—' : pct(r.ctr)}</b><em>{r.cpc === null ? 'sin clics' : `${d(r.cpc)} por clic`}</em></div>
        <div className="mkv2-redes-det-kpi" style={{ '--c': '#18935f' }}><small>Mensajes</small><b>{numero(r.mensajes)}</b><em>{pct(r.pctMensajes)} del mes</em></div>
        <div className="mkv2-redes-det-kpi" style={{ '--c': '#3fcf8e' }}><small>Costo c/u</small><b>{!r.mensajes ? '—' : r.pocos ? 'pocos datos' : d(r.costo)}</b>
          <em>{r.difCosto === null ? `promedio ${d(r.promedio)}` : Math.round(r.difCosto) === 0 ? 'igual al promedio' : `${Math.round(Math.abs(r.difCosto))} % ${r.difCosto < 0 ? 'menos' : 'más'} que el promedio`}</em></div>
      </div>
    </Seccion>

    <Seccion titulo={`Ubicaciones dentro de ${p.nombre}`}>
      <div className="fv2-tabla-caja"><table className="fv2-tabla mkv2-tabla mkv2-plat-ubic">
        <thead><tr><th>Ubicación</th><th>Qué es</th><th className="num">Impres.</th><th className="num">CTR</th><th className="num">Mensajes</th><th className="num">Costo c/u</th></tr></thead>
        <tbody>{ubic.map((u) => <tr key={u.clave} className={u.pocos ? 'is-tenue' : ''}>
          <td><b>{u.lugar}</b></td><td className="mkv2-tenue">{u.queEs ?? '—'}</td>
          <td className="num">{numero(u.impresiones)}</td><td className="num">{u.ctr === null ? '—' : pct(u.ctr)}</td>
          <td className="num">{numero(u.mensajes)}</td><td className="num"><PildoraCosto costo={u.costo} mensajes={u.mensajes} pocos={u.pocos} meta={meta} formato={d} /></td>
        </tr>)}
        {!ubic.length && <tr><td colSpan={6} className="fv2-tabla-vacia">Meta no dio las ubicaciones de esta plataforma</td></tr>}</tbody>
      </table></div>
      <p className="mkv2-redes-det-nota">Costo en verde = en meta; en ámbar = sobre la meta (por confirmar). «Pocos datos» = menos de {MIN_MENSAJES} mensajes.</p>
    </Seccion>

    {recos.length > 0 && <Seccion titulo="Recomendación">
      <div className="mkv2-sd-reco"><small>Calculada con los datos</small><ul>{recos.map((x) => <li key={x}><Resaltado texto={x} /></li>)}</ul></div>
    </Seccion>}
  </div>

  return {
    ancho: true,
    etiqueta: `Plataforma${masBarata?.k === p.k ? ' · la más barata del mes' : ''}`,
    titulo: p.nombre,
    chips: [nombreMes(mes), p.marcas?.length ? p.marcas.map((m) => MARCAS[m]?.corto ?? m).join(' · ') : 'Sin página', 'Sin reclutamiento'],
    cuerpo,
    pie: 'Fuente: Meta (pauta por plataforma y ubicación) · sin reclutamiento',
  }
}
