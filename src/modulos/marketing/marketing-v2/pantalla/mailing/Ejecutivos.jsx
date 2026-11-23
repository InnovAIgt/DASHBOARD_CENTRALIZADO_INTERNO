// Canales de marketing · Mailing · Correos por corregir · «Correos pendientes por ejecutivo de ventas».
// Misma estructura que la referencia visual (renderExecutiveGroups): tarjetas cerradas en 3 columnas por grupo
// (coincidencia exacta · posible por dominio en ámbar · sin identificar); al hacer clic, una ventana emergente con el
// correo del ejecutivo, «Correo con diseño», «Correo simple», «Exportar lista CSV» y su tabla.
// NUNCA se envía nada: el correo con diseño se copia o se baja como borrador .eml; el simple abre el programa de correo.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Mail, X } from 'lucide-react'
import { numero } from '../../datos/calculos.js'
import { descargarCsv } from '../../datos/csv.js'
import {
  correoValido, csvGrupo, csvResumen, emlCorreo, enlaceMailto, gruposEjecutivos, htmlCorreo, iniciales, PLAZO, SIN_IDENTIFICAR, textoCorreo,
} from '../../datos/correoEjecutivo.js'
import { Aviso, Tarjeta, TituloCampana } from './piezas.jsx'

// Correos de ejecutivos que la persona escribió (solo en este navegador). Si no hay, se usa el de correos_usuarios.
const CLAVE_LIBRETA = 'mkv2-correos-ejecutivos'
export const leerLibreta = () => { try { return JSON.parse(localStorage.getItem(CLAVE_LIBRETA) || '{}') || {} } catch { return {} } }
export const guardarLibreta = (libreta) => { try { localStorage.setItem(CLAVE_LIBRETA, JSON.stringify(libreta)) } catch { /* solo en memoria */ } }
const nombreArchivo = (t) => String(t).replace(/[^a-zA-ZÀ-ſ0-9]+/g, '_')
const hoy = () => new Date().toISOString().slice(0, 10)

/** Cierra con Esc (solo la ventana de arriba: activo = false la deja quieta). */
function useEsc(activo, cerrar) {
  useEffect(() => {
    if (!activo) return undefined
    const tecla = (e) => { if (e.key === 'Escape') cerrar() }
    document.addEventListener('keydown', tecla)
    return () => document.removeEventListener('keydown', tecla)
  }, [activo, cerrar])
}

/** Vista previa del correo con diseño, con «Borrador HTML (.eml)», «Copiar con formato» y «Correo simple». */
export function VistaCorreo({ grupo, para, onCerrar, onSimple, onPara }) {
  const [aviso, setAviso] = useState('')
  useEsc(true, onCerrar)
  const html = useMemo(() => htmlCorreo(grupo), [grupo])
  const eml = () => {
    if (!correoValido(para)) { setAviso('Escribe un correo válido del ejecutivo en la ventana anterior para preparar el borrador.'); onPara?.(); return }
    const url = URL.createObjectURL(new Blob([emlCorreo(grupo, para.trim())], { type: 'message/rfc822' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `RED_Intelfon_Correcciones_${nombreArchivo(grupo.ejecutivo)}.eml`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
    setAviso('Borrador .eml preparado con diseño y lista completa. Ábrelo en tu programa de correo, revisa el contenido y pulsa Enviar. Algunos programas lo abren solo para lectura.')
  }
  const copiar = async () => {
    const texto = textoCorreo(grupo).cuerpo
    try {
      if (!navigator.clipboard || !window.ClipboardItem) throw new Error('sin portapapeles con formato')
      await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([texto], { type: 'text/plain' }) })])
      setAviso('Diseño copiado. Abre un correo nuevo en Outlook o Gmail, pega el contenido y envíalo tras revisarlo.')
    } catch {
      const tmp = document.createElement('div')
      tmp.innerHTML = html
      tmp.contentEditable = 'true'
      tmp.style.cssText = 'position:fixed;left:-10000px;top:0;width:640px;background:white'
      document.body.appendChild(tmp)
      const rango = document.createRange()
      rango.selectNodeContents(tmp)
      const sel = window.getSelection()
      sel.removeAllRanges()
      sel.addRange(rango)
      const ok = document.execCommand('copy')
      sel.removeAllRanges()
      tmp.remove()
      setAviso(ok ? 'Diseño copiado. Pégalo en un correo nuevo, agrega el destinatario y revisa antes de enviar.' : 'No se pudo copiar automáticamente. Descarga el borrador .eml o usa Correo simple.')
    }
  }
  return <div className="mkv2-modal-fondo mkv2-modal-correo" onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar() }}>
    <div className="mkv2-correo-dialogo" role="dialog" aria-modal="true" aria-labelledby="mkv2-correo-titulo">
      <div className="mkv2-correo-cabeza">
        <div>
          <div className="mkv2-correo-kicker">RED INTELFON · NOTIFICACIÓN INTERNA</div>
          <h2 id="mkv2-correo-titulo">{grupo.tipo === 'posible' ? 'Correos por confirmar' : 'Correos por corregir'} · Plazo {PLAZO}</h2>
          <p>{grupo.ejecutivo} · {numero(grupo.unicos.length)} {grupo.unicos.length === 1 ? 'dirección' : 'direcciones'} · {correoValido(para) ? para : 'Sin destinatario configurado'}</p>
        </div>
        <button type="button" className="mkv2-x" onClick={onCerrar} aria-label="Cerrar"><X size={16} /></button>
      </div>
      <div className="mkv2-acciones">
        <button type="button" className="fv2-pildora mkv2-boton-rojo" onClick={eml}><Download size={13} />Borrador HTML (.eml)</button>
        <button type="button" className="fv2-pildora" onClick={copiar}>▤ Copiar con formato</button>
        <button type="button" className="fv2-pildora" onClick={onSimple}>Correo simple</button>
      </div>
      <p className="mkv2-correo-nota"><strong>Importante:</strong> los enlaces normales de correo no admiten estilos HTML. El archivo <strong>.eml</strong> permite preparar el mensaje con diseño en programas compatibles; «Copiar con formato» permite pegarlo en Outlook o Gmail. <strong>Ninguna opción lo envía automáticamente.</strong></p>
      {aviso && <p className="mkv2-correo-aviso" role="status">{aviso}</p>}
      <iframe className="mkv2-correo-vista" title="Vista previa del correo" srcDoc={html} sandbox="" />
    </div>
  </div>
}

/** Ventana emergente de un ejecutivo (una sola abierta a la vez). */
function VentanaEjecutivo({ grupo, correoInicial, onGuardarCorreo, onCerrar }) {
  const sin = grupo.tipo === 'sin'
  const [para, setPara] = useState(correoInicial)
  const [aviso, setAviso] = useState('')
  const [vista, setVista] = useState(false)
  const cerrarVista = useCallback(() => setVista(false), [])
  useEsc(!vista, onCerrar)
  const guardar = () => {
    const v = para.trim()
    if (v && !correoValido(v)) { setAviso('Escribe una dirección de correo válida.'); return false }
    onGuardarCorreo(grupo.ejecutivo, v)
    return true
  }
  const simple = () => {
    setVista(false)
    if (!guardar()) return
    if (!correoValido(para)) { setAviso('Escribe el correo del ejecutivo para preparar el mensaje.'); return }
    const { enlace, corto } = enlaceMailto(grupo, para.trim())
    const a = document.createElement('a')
    a.href = enlace
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setAviso(corto
      ? 'Se abrirá el correo con la lista abreviada (la completa no cabe en el enlace). Puedes exportar el detalle en CSV. Revisa antes de pulsar Enviar.'
      : 'Se abrirá el correo con destinatario, asunto y lista ya escritos. Revisa antes de pulsar Enviar.')
  }
  const disenio = () => { if (guardar()) { setAviso(''); setVista(true) } }
  const exportar = () => descargarCsv(`RED_Intelfon_Correcciones_${nombreArchivo(grupo.ejecutivo)}_${hoy()}`, csvGrupo(grupo))

  return <div className="mkv2-modal-fondo" onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar() }}>
    <div className={`mkv2-modal mkv2-ventana-ejecutivo ${grupo.tipo === 'posible' ? 'is-posible' : ''}`} role="dialog" aria-modal="true" aria-labelledby="mkv2-ejecutivo-titulo">
      <div className="mkv2-ventana-cabeza">
        <span className="mkv2-avatar" aria-hidden="true">{iniciales(grupo.ejecutivo)}</span>
        <div>
          <strong id="mkv2-ejecutivo-titulo">{grupo.ejecutivo}</strong>
          <small>{numero(grupo.unicos.length)} correo(s) por corregir · {numero(grupo.filas.length)} registro(s) de campañas{grupo.tipo === 'posible' ? ' · posible (por dominio)' : ''}</small>
        </div>
        <button type="button" className="mkv2-x" onClick={onCerrar} aria-label="Cerrar"><X size={16} /></button>
      </div>
      {sin && <div className="mkv2-alerta-ambar">No se puede dirigir una notificación a este grupo hasta identificar al ejecutivo responsable.</div>}
      {grupo.tipo === 'posible' && <div className="mkv2-alerta-ambar">Posible cliente (por dominio): estas direcciones no están en la base; su dominio coincide con clientes de este ejecutivo. El correo dice «confirmar antes de corregir».</div>}
      <div className="mkv2-ventana-barra">
        {!sin && <>
          <label className="mkv2-campo-v mkv2-campo-correo">
            <span>Correo del ejecutivo para notificar</span>
            <input className="mkv2-control" type="email" value={para} onChange={(e) => { setPara(e.target.value); setAviso('') }} onBlur={guardar}
              placeholder="correo@empresa.com" autoComplete="email" aria-label={`Correo de ${grupo.ejecutivo}`} />
          </label>
          <button type="button" className="fv2-pildora mkv2-boton-rojo" onClick={disenio}><Mail size={13} />Correo con diseño</button>
          <button type="button" className="fv2-pildora" onClick={simple}>Correo simple</button>
        </>}
        <button type="button" className="fv2-pildora" onClick={exportar}><Download size={13} />Exportar lista CSV</button>
      </div>
      {aviso && <p className="mkv2-correo-aviso" role="status">{aviso}</p>}
      <p className="mkv2-nota">{sin
        ? 'Se muestran los registros sin vinculación a un ejecutivo.'
        : 'El correo con diseño incluye el listado completo y un resumen destacado. Puedes copiarlo con formato o preparar un archivo .eml para Outlook. Revisa siempre antes de enviarlo.'}</p>
      <div className="fv2-tabla-caja">
        <table className="fv2-tabla mkv2-tabla">
          <thead><tr><th scope="col">Dirección por corregir</th><th scope="col">Cliente(s)</th><th scope="col">Campaña(s)</th><th scope="col">Motivo(s) del rechazo</th></tr></thead>
          <tbody>{grupo.unicos.map((x) => <tr key={x.correo}>
            <td className="mkv2-celda-correo"><strong className="mkv2-texto-fuerte">{x.correo}</strong></td>
            <td className="mkv2-celda-media">{x.clientes.join(' / ') || SIN_IDENTIFICAR}</td>
            <td className="mkv2-celda-campana"><span className="mkv2-tc-lista">{x.campanasInfo.map((c) => <TituloCampana key={c.id} campana={c.nombre || c.asunto ? c : null} id={c.id} fecha={false} />)}</span></td>
            <td className="mkv2-celda-media">{x.motivos.join(' / ')}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </div>
    {vista && <VistaCorreo grupo={grupo} para={para} onCerrar={cerrarVista} onSimple={simple} />}
  </div>
}

/** Tarjeta cerrada de un ejecutivo. */
function TarjetaEjecutivo({ grupo, onAbrir }) {
  const sin = grupo.tipo === 'sin'
  return <button type="button" className={`mkv2-ejecutivo-tarjeta ${grupo.tipo === 'posible' ? 'is-posible' : ''} ${sin ? 'is-sin' : ''}`} onClick={onAbrir}
    data-tip={`${grupo.ejecutivo}: ${numero(grupo.unicos.length)} direcciones únicas · ${numero(grupo.filas.length)} registros de campañas`}>
    <span className="mkv2-avatar" aria-hidden="true">{iniciales(grupo.ejecutivo)}</span>
    <span className="mkv2-ejecutivo-datos">
      <strong>{grupo.ejecutivo}</strong>
      <small>{sin ? 'Responsable sin identificar' : grupo.tipo === 'posible' ? 'Responsable sugerido por dominio (confirmar)' : 'Responsable asignado en la base de clientes'} · {numero(grupo.filas.length)} registro(s) de campañas</small>
    </span>
    <span className="mkv2-ejecutivo-cuenta">{numero(grupo.unicos.length)} correo(s)</span>
    <span className="mkv2-ejecutivo-abrir">Abrir ›</span>
  </button>
}

/**
 * Bloque completo. filas = correo + campaña marcadas CORREGIR (con los filtros de arriba).
 * cruce: 'ok' | 'error' | 'sin_configurar' (si no hay cruce, todo queda en «Sin identificar» y se avisa).
 */
export function PorEjecutivo({ filas, campanaDe, cruce }) {
  const grupos = useMemo(() => gruposEjecutivos(filas, campanaDe), [filas, campanaDe])
  const [libreta, setLibreta] = useState(leerLibreta)
  const [abierto, setAbierto] = useState(null)
  const cerrar = useCallback(() => setAbierto(null), [])
  const todos = [...grupos.exacta, ...grupos.posible, ...grupos.sin]
  const elegido = todos.find((g) => g.clave === abierto)
  const correoDe = (g) => libreta[g.ejecutivo] || g.correoEjecutivo || ''
  const guardarCorreo = (nombre, correo) => setLibreta((l) => {
    const nueva = { ...l }
    if (correo) nueva[nombre] = correo
    else delete nueva[nombre]
    guardarLibreta(nueva)
    return nueva
  })
  const direcciones = new Set(filas.map((f) => String(f.correo).toLowerCase())).size
  const resumen = () => descargarCsv(`RED_Intelfon_Resumen_Correcciones_Por_Ejecutivo_${hoy()}`, csvResumen(todos, correoDe))
  const bloque = (titulo, lista, clase = '') => <>
    <div className={`mkv2-subtitulo-bloque ${clase}`}>{titulo} · {numero(lista.reduce((n, g) => n + g.unicos.length, 0))} direcciones</div>
    {lista.length
      ? <div className="mkv2-ejecutivos3">{lista.map((g) => <TarjetaEjecutivo key={g.clave} grupo={g} onAbrir={() => setAbierto(g.clave)} />)}</div>
      : <p className="mkv2-nota">Ninguna con los filtros actuales.</p>}
  </>

  return <Tarjeta titulo="Correos pendientes por ejecutivo de ventas" sub="Selecciona un ejecutivo para ver sus correos y preparar una notificación personalizada."
    acciones={<button type="button" className="fv2-pildora" onClick={resumen} disabled={!todos.length}><Download size={13} />Resumen por ejecutivo CSV</button>}>
    {cruce && cruce !== 'ok' && <Aviso titulo="Pendiente del cruce" texto="No se pudo leer Cumplimiento de Clientes: todas las direcciones quedan en «Sin identificar» hasta que responda." />}
    <div className="mkv2-intro-ejecutivos">
      <strong>{numero(todos.length)}</strong> grupos de responsables · <strong>{numero(direcciones)}</strong> direcciones distintas incluidas en los filtros actuales · <strong>{numero(filas.length)}</strong> registros por campaña. Selecciona un nombre para abrir su lista.
    </div>
    {bloque('Coincidencia exacta', grupos.exacta)}
    {bloque('Posible (por dominio)', grupos.posible, 'is-ambar')}
    {bloque('Sin identificar', grupos.sin)}
    <p className="mkv2-nota">Las cifras por ejecutivo cuentan <strong>direcciones únicas</strong>; si un correo figura en varias campañas, se muestra una sola vez para ese responsable. Las direcciones vinculadas con más de un ejecutivo aparecen en los grupos correspondientes. <strong>Correo con diseño</strong> muestra una vista previa y permite copiar el diseño o preparar un borrador para Outlook. <strong>No envía mensajes automáticamente.</strong></p>
    {elegido && <VentanaEjecutivo key={elegido.clave} grupo={elegido} correoInicial={correoDe(elegido)} onGuardarCorreo={guardarCorreo} onCerrar={cerrar} />}
  </Tarjeta>
}

/** Abre el programa de correo con el borrador simple (nunca envía). Devuelve si se usó la lista abreviada. */
export function abrirCorreoSimple(grupo, para) {
  const { enlace, corto } = enlaceMailto(grupo, String(para ?? '').trim())
  const a = document.createElement('a')
  a.href = enlace
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
  return corto
}
