// Flujo de ventas v2 · "Recorrido de los leads" (D16): las 6 etapas como rastreo de pedido.
// Recibe el resultado de recorridoLeads() (datos.js), que a su vez sale de embudoEtapas(): mismos
// números que la ventana de detalle de etapa. Los % se muestran redondeados a entero (53.8 % → 54 %).
// Colores (D12): verde / gris / amarillo según LIMITES_PASO; nada de rojo.
// Se usa en la pestaña Resumen y en "Avance por etapa" de la ventana del ejecutivo (sin "Mejor").
import { CalendarDays, Check, ChevronRight, Monitor, Phone, Send, TriangleAlert, UserPlus } from 'lucide-react'
import { formatNumber } from '../utils/analytics.js'

const ICONOS = [UserPlus, CalendarDays, Monitor, Send, Phone, Check]
// Se redondea lo que muestra la ventana (1 decimal, formatearRatio) para que nunca difieran: 53.8 % → 54 %.
export const pctEntero = (ratio) => Math.round(Number(((ratio || 0) * 100).toFixed(1)))
const pct = (ratio) => `${pctEntero(ratio)} %`

function textoTramo(t) {
  const menos = t.perdieron > 0 ? `−${formatNumber(t.perdieron)} · ` : ''
  if (t.pocos) return `${menos}pocos datos`
  return `${menos}${pct(t.ratio)} pasa`
}

function tituloTramo(t, etapas) {
  const a = etapas[t.desde - 1].label
  const b = etapas[t.hasta - 1].label
  return `${a} → ${b}: ${formatNumber(t.pasaron)} de ${formatNumber(t.llegaron)} pasaron${t.pocos ? ' (menos de 5 leads: pocos datos)' : ''}`
}

/** Tramo entre dos etapas. `vertical` = versión para pantallas angostas (va entre una etapa y otra). */
function Tramo({ t, etapas, frenado, vertical }) {
  const resaltado = frenado && frenado.desde === t.desde
  return <div className={`fv2-rec-tramo is-${t.tono} ${resaltado ? 'is-frenado' : ''} ${vertical ? 'is-vertical' : ''}`} title={tituloTramo(t, etapas)}>
    <span className="fv2-rec-linea" aria-hidden="true" />
    <span className="fv2-rec-etiqueta">{textoTramo(t)}</span>
  </div>
}

function Etapa({ e, total, frenado, mostrarMejor, onClick }) {
  const Icono = ICONOS[e.stage - 1] ?? Check
  const esCierre = e.stage === 6
  const ganados = esCierre ? e.pasaron : 0
  const resaltada = frenado?.hasta === e.stage
  const tono = resaltada ? 'amarillo' : e.llegaron === 0 ? 'vacio' : esCierre && ganados > 0 ? 'verde' : 'azul'
  const esperando = e.hoy > 0 ? `${formatNumber(e.hoy)} esperando aquí` : null

  let pastilla
  if (esCierre) {
    const cierre = ganados > 0 ? `${formatNumber(ganados)} ${ganados === 1 ? 'ganado' : 'ganados'}` : 'aún sin cierres'
    pastilla = <span className={`fv2-rec-pastilla ${ganados > 0 ? 'is-verde' : esperando ? 'is-azul' : 'is-gris'}`}>{esperando ? `${cierre} · ${esperando}` : cierre}</span>
  } else {
    pastilla = <span className={`fv2-rec-pastilla ${esperando ? 'is-azul' : 'is-gris'}`}>{esperando ?? 'nadie esperando'}</span>
  }

  const contenido = <>
    <span className={`fv2-rec-circulo is-${tono}`} aria-hidden="true"><Icono size={22} strokeWidth={2} /></span>
    <span className={`fv2-rec-nombre ${resaltada ? 'is-amarillo' : ''}`}>{e.label}</span>
    <span className={`fv2-rec-tarjeta ${resaltada ? 'is-frenado' : ''}`}>
      <strong className="fv2-rec-numero">{formatNumber(e.llegaron)}</strong>
      <small>{e.stage === 1 ? 'leads entraron' : `${pct(total ? e.llegaron / total : 0)} del total`}</small>
      {pastilla}
      {mostrarMejor && (e.mejor
        ? <span className="fv2-rec-mejor" title="Mayor % de paso a la siguiente etapa (mínimo 5 leads); en Cierre, % que se ganó">Mejor: ★ {e.mejor.name} · {pct(e.mejor.ratio)}</span>
        : <span className="fv2-rec-mejor is-pocos">Mejor: pocos datos</span>)}
      {onClick && <em className="fv2-rec-ver">Ver detalle<ChevronRight size={12} aria-hidden="true" /></em>}
    </span>
  </>

  return onClick
    ? <button type="button" className="fv2-rec-etapa" onClick={() => onClick(e.stage)} aria-label={`Ver detalle de la etapa ${e.label}`}>{contenido}</button>
    : <div className="fv2-rec-etapa">{contenido}</div>
}

/**
 * @param recorrido     resultado de recorridoLeads(embudo)
 * @param titulo        si se pasa, se muestra el encabezado con título y subtítulo
 * @param mostrarMejor  línea "Mejor: ★ …" en cada tarjeta (no en la ventana del ejecutivo)
 * @param mostrarAviso  aviso "el recorrido se frena entre A y B" y leyenda de colores
 * @param onClickEtapa  (k) => …; sin él, las etapas no se pueden cliquear
 */
export function RecorridoLeads({ recorrido, titulo, subtitulo, mostrarMejor = true, mostrarAviso = true, onClickEtapa }) {
  const { etapas, tramos, frenado, entraron, enCamino, cerrados } = recorrido
  const a = frenado ? etapas[frenado.desde - 1] : null
  const b = frenado ? etapas[frenado.hasta - 1] : null

  return <div className="fv2-rec">
    <div className="fv2-rec-cabeza">
      {titulo && <div>
        <h3 className="fv2-rec-titulo">{titulo}</h3>
        {subtitulo && <p className="fv2-rec-sub">{subtitulo}</p>}
      </div>}
      <div className="fv2-rec-chips">
        <span className="fv2-rec-chip is-azul"><b>{formatNumber(entraron)}</b> entraron</span>
        <span className="fv2-rec-chip is-gris" title="Leads abiertos hoy en cualquier etapa"><b>{formatNumber(enCamino)}</b> en camino</span>
        <span className="fv2-rec-chip is-verde" title="Leads ganados"><b>{formatNumber(cerrados)}</b> cerrados</span>
      </div>
    </div>

    <div className="fv2-rec-pista">
      {/* Tramos en escritorio: capa encima de la fila de círculos (no reciben clics). */}
      <div className="fv2-rec-tramos" aria-hidden="true">
        {tramos.map((t) => <div key={t.desde} className="fv2-rec-celda"><Tramo t={t} etapas={etapas} frenado={frenado} /></div>)}
      </div>
      {etapas.map((e, i) => <div key={e.stage} className="fv2-rec-paso">
        <Etapa e={e} total={entraron} frenado={frenado} mostrarMejor={mostrarMejor} onClick={onClickEtapa} />
        {/* Tramo en pantallas angostas: entre una etapa y la siguiente. */}
        {tramos[i] && <Tramo t={tramos[i]} etapas={etapas} frenado={frenado} vertical />}
      </div>)}
    </div>

    {mostrarAviso && <>
      <p className="fv2-rec-leyenda">
        <span>Colores de la línea (% que pasa a la siguiente etapa):</span>
        <span><i className="is-verde" />Verde ≥ 75 % · bien</span>
        <span><i className="is-neutro" />Gris 60–74 % · normal</span>
        <span><i className="is-amarillo" />Amarillo &lt; 60 % · atención</span>
        <span><i className="is-pocos" />Punteado = pocos datos (menos de 5 leads)</span>
      </p>
      <div className={`fv2-rec-aviso ${frenado ? '' : 'is-neutro'}`}>
        {frenado && <TriangleAlert size={16} className="fv2-rec-aviso-icono" aria-hidden="true" />}
        <p>
          {frenado && <><b className="fv2-texto-amarillo">Atención:</b> el recorrido se frena entre <b>{a.label}</b> y <b>{b.label}</b> — de {formatNumber(frenado.llegaron)} leads, {frenado.pasaron === 0 ? 'ninguno siguió' : `solo ${formatNumber(frenado.pasaron)} ${frenado.pasaron === 1 ? 'siguió' : 'siguieron'}`}. </>}
          <span className="fv2-tenue">"Mejor" = ejecutivo que más leads pasa a la siguiente etapa (mínimo 5 leads). Etapa estimada: los perdidos se ubican en la última etapa con datos del vendedor.</span>
        </p>
        {onClickEtapa && <span className="fv2-rec-aviso-clic">Clic en una etapa → ver su detalle</span>}
      </div>
    </>}
  </div>
}
