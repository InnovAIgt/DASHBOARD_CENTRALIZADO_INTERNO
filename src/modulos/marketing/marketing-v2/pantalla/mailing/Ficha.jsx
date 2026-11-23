// Canales de marketing · Mailing: FICHA de un correo (se abre al hacer clic en una fila de Detalle por correo, Correos
// por corregir o Relación con clientes). Forma de la ventana de detalle de la plantilla de Mailing, con los colores del
// portal. Muestra correos sin inicio de sesión por decisión de Keily (DECISIONES.md). Nunca el texto original del motivo.
import { useEffect, useRef, useState } from 'react'
import { ExternalLink, X } from 'lucide-react'
import { Bandera, Insignia } from '../../../flujo-ventas-v2/pantalla/comunes.jsx'
import { CLASIFICACIONES, clasificarCruce, empresasDe, NOMBRE_CARGO } from '../../datos/calculos.js'

const TONO_ESTADO = { entregado: 'verde', rebote_temporal: 'amarillo', rebote_permanente: 'rojo', sin_confirmacion: 'neutro' }
const ETIQUETA_EVENTO = {
  delivered: 'Entregado', opened: 'Apertura registrada', click: 'Clic', soft_bounce: 'Rebote temporal', hard_bounce: 'Rebote permanente',
  apple_mpp: 'Apertura automática (Apple)', proxy_open: 'Apertura por proxy', unsubscribe: 'Se dio de baja', spam: 'Marcado como spam',
}
const TONO_EVENTO = { delivered: 'verde', opened: 'azul', click: 'azul', soft_bounce: 'amarillo', hard_bounce: 'rojo', unsubscribe: 'amarillo', spam: 'rojo' }
const ORIGEN = { historial: 'Historial importado (CSV de Brevo)', webhook: 'Webhook de Brevo', ambos: 'Historial (CSV) y webhook' }
const FECHA_HORA = new Intl.DateTimeFormat('es-GT', { timeZone: 'America/Guatemala', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const fechaHora = (iso) => (Number.isFinite(Date.parse(iso)) ? FECHA_HORA.format(new Date(iso)) : '—')

/** Destino del clic: enlace (se abre aparte), enlace de baja o sin clic. */
function Destino({ fila }) {
  if (fila.urlClic === 'ENLACE_DE_BAJA') return <strong>Enlace de baja (no se guarda la dirección)</strong>
  if (fila.urlClic) {
    const texto = fila.urlClic.replace(/^https?:\/\//, '')
    return <a className="mkv2-enlace-externo" href={fila.urlClic} target="_blank" rel="noopener noreferrer" title={fila.urlClic}>{texto.length > 48 ? `${texto.slice(0, 48)}…` : texto}<ExternalLink size={12} /></a>
  }
  return <strong className="fv2-tenue">{fila.clic === 'CLIC REGISTRADO' ? 'Clic sin destino registrado' : 'Sin clic'}</strong>
}

/** Bloque del cliente: exacta, posible por dominio (ámbar) o sin identificar. */
function BloqueCliente({ fila, cargoObjetivo }) {
  if (fila.clientes === null || fila.clientes === undefined) return <div className="mkv2-ficha-cliente is-sin"><strong>Cliente pendiente del cruce</strong><span>No se pudo leer Cumplimiento de Clientes.</span></div>
  const { tipo, empresas } = empresasDe(fila)
  if (tipo === 'sin') return <div className="mkv2-ficha-cliente is-sin"><strong>Sin identificar</strong><span>El correo no está en Cumplimiento de Clientes (GG, GF ni GO) ni por dominio.</span></div>
  const relacion = CLASIFICACIONES[clasificarCruce(fila, cargoObjetivo)]
  return <div className={`mkv2-ficha-cliente ${tipo === 'posible' ? 'mkv2-posible' : ''}`}>
    {tipo === 'posible' && <em className="mkv2-posible-etiqueta">Posible cliente (por dominio): confirmar antes de usar</em>}
    {empresas.map((e) => <div key={`${e.pais}-${e.codigo}`} className="mkv2-ficha-empresa">
      <div className="mkv2-ficha-dato"><small>Cliente</small><strong>{e.cliente}</strong></div>
      <div className="mkv2-ficha-dato"><small>Ejecutivo de ventas</small><strong>{e.ejecutivo || 'Sin identificar'}</strong></div>
      <div className="mkv2-ficha-dato"><small>País</small><strong className="mkv2-pais-celda"><Bandera pais={e.pais} />{e.pais}</strong></div>
      <div className="mkv2-ficha-dato"><small>Código</small><strong>{e.codigo}</strong></div>
      <div className="mkv2-ficha-dato"><small>Relación</small><strong>{relacion}</strong></div>
      <div className="mkv2-ficha-dato"><small>Contacto en base</small><strong>{tipo === 'posible' ? 'Otro contacto del mismo dominio' : e.contactos?.length ? e.contactos.map((c) => `${c.nombre} (${c.cargo})`).join(' · ') : `Cargo ${e.cargos.join('/')}`}</strong></div>
    </div>)}
  </div>
}

/**
 * Ventana de la ficha. filas = todas las filas del MISMO correo (una por campaña); si hay varias, se elige la campaña.
 * @param {{filas: object[], nombres: Record<number, object>, onCerrar: Function}} p
 */
export function Ficha({ filas, nombres, onCerrar }) {
  const [indice, setIndice] = useState(0)
  const caja = useRef(null)
  useEffect(() => {
    const tecla = (e) => { if (e.key === 'Escape') onCerrar() }
    document.addEventListener('keydown', tecla)
    caja.current?.focus()
    return () => document.removeEventListener('keydown', tecla)
  }, [onCerrar])
  if (!filas?.length) return null
  const fila = filas[Math.min(indice, filas.length - 1)]
  const campana = nombres[fila.campana_id] ?? {}
  const cargo = campana.cargo ?? 'Sin clasificar'
  const hayAutomatica = fila.eventos?.some((e) => e.evento === 'apple_mpp' || e.evento === 'proxy_open')

  return <div className="mkv2-modal-fondo" onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar() }}>
    <div className="mkv2-modal" role="dialog" aria-modal="true" aria-labelledby="mkv2-ficha-titulo" tabIndex={-1} ref={caja}>
      <div className="mkv2-modal-cabeza">
        <div>
          <h3 id="mkv2-ficha-titulo">{fila.correo}</h3>
          <p title={campana.nombre}>Campaña #{fila.campana_id}{campana.asunto ? ` · ${campana.asunto}` : ''} · {cargo === 'Sin clasificar' ? cargo : NOMBRE_CARGO[cargo]}</p>
        </div>
        <button type="button" className="fv2-pildora" onClick={onCerrar}><X size={14} />Cerrar</button>
      </div>

      {filas.length > 1 && <div className="mkv2-ficha-campanas" role="tablist" aria-label="Campañas de este correo">
        {filas.map((f, i) => <button key={f.campana_id} type="button" role="tab" aria-selected={i === indice}
          className={`mkv2-subpestana ${i === indice ? 'is-activa' : ''}`} onClick={() => setIndice(i)}>{nombres[f.campana_id]?.nombre ?? `Campaña ${f.campana_id}`}</button>)}
      </div>}

      <div className="mkv2-ficha-etiquetas">
        <Insignia tono={TONO_ESTADO[fila.estado]}>{fila.estadoTexto}</Insignia>
        <Insignia tono={fila.status === 'CORREGIR' ? 'rojo' : 'neutro'}>{fila.status} CORREO</Insignia>
        <Insignia tono={fila.apertura === 'APERTURA REGISTRADA' ? 'azul' : 'neutro'}>{fila.apertura}</Insignia>
        <Insignia tono={fila.clic === 'CLIC REGISTRADO' ? 'azul' : 'neutro'}>{fila.clic}</Insignia>
      </div>

      <BloqueCliente fila={fila} cargoObjetivo={cargo} />

      <div className="mkv2-ficha-tarjetas">
        <div className="mkv2-ficha-tarjeta"><small>Motivo técnico (Brevo)</small><strong>{fila.motivoTecnico ?? 'Sin rebote / sin incidencia técnica'}</strong></div>
        <div className="mkv2-ficha-tarjeta"><small>Destino del clic</small><Destino fila={fila} /></div>
        <div className="mkv2-ficha-tarjeta"><small>Fuente original</small><strong>{ORIGEN[fila.origen] ?? fila.origen}</strong></div>
      </div>
      {fila.indicacion && <div className="mkv2-ficha-indicacion"><small>Indicación</small><span>{fila.indicacion}</span></div>}

      <h4 className="mkv2-ficha-subtitulo">Secuencia registrada</h4>
      <ol className="mkv2-linea-tiempo">
        {fila.eventos?.length
          ? fila.eventos.map((e, i) => <li key={`${e.evento}-${e.fecha}-${i}`} className={`is-${TONO_EVENTO[e.evento] ?? 'neutro'}`}>
            <span className="mkv2-linea-punto" aria-hidden="true" />
            <div>
              <strong>{ETIQUETA_EVENTO[e.evento] ?? e.evento}{e.cantidad > 1 ? ` · ${e.cantidad}` : ''}</strong>
              <small>{fechaHora(e.fecha)}{e.fechaAproximada ? ' (aproximada)' : ''} · {e.origen === 'historial' ? 'historial CSV' : 'webhook'}{e.url && e.url !== 'ENLACE_DE_BAJA' ? ` · ${e.url.replace(/^https?:\/\//, '')}` : ''}</small>
            </div>
          </li>)
          : <li className="is-neutro"><span className="mkv2-linea-punto" /><div><strong>Sin eventos con fecha</strong></div></li>}
      </ol>
      <p className="mkv2-ficha-auditoria">
        {fila.apertura === 'APERTURA REGISTRADA'
          ? 'Brevo informa una apertura fechada; no permite confirmar que fue realizada por el destinatario.'
          : hayAutomatica || fila.apertura === 'APERTURA AUTOMÁTICA'
            ? 'La apertura automática (Apple / proxy) no acredita lectura humana: el sistema del destinatario puede cargar el correo solo.'
            : 'Sin apertura registrada por Brevo.'}
        {fila.clic === 'CLIC REGISTRADO' ? ' Brevo registra un clic, pero el origen humano no es verificable solo con estos datos.' : ''}
      </p>
      <p className="mkv2-nota">Fechas en hora de Guatemala. El texto original del motivo del rebote no se muestra (puede traer otros correos).</p>
    </div>
  </div>
}
