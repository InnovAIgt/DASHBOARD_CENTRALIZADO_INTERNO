/**
 * Canales de marketing · carga inicial del historial: CSV de Brevo → filas de mkt_brevo_eventos (origen = historial).
 * MAILING.md, sección 10.3. Solo convierte texto en filas (no se conecta a nada). Los CSV NUNCA entran al repo: el
 * script scripts/importar-historial-brevo.mjs los lee de una carpeta de fuera.
 *
 * Formato del CSV (exportación de destinatarios de una campaña): separado por «;», fechas «dd-mm-aaaa hh:mm:ss» en hora
 * de Guatemala. Cada ENLACE de la campaña es una columna (encabezado = URL) y su celda trae la FECHA del clic de esa
 * persona; por eso el clic lleva su fecha real (no aproximada). Solo si el CSV no trae esa fecha se usa la de apertura
 * o envío, marcada como aproximada.
 */
import { huellaDe, limpiarUrl } from '../brevoWebhook.js'

/** CSV con «;» y comillas (un motivo puede traer ; o comillas). */
export function leerCsv(texto) {
  const filas = []
  let fila = [], celda = '', comillas = false
  const t = String(texto ?? '').replace(/^﻿/, '')
  for (let i = 0; i < t.length; i++) {
    const ch = t[i]
    if (comillas) {
      if (ch === '"' && t[i + 1] === '"') { celda += '"'; i++ } else if (ch === '"') comillas = false
      else celda += ch
      continue
    }
    if (ch === '"') comillas = true
    else if (ch === ';') { fila.push(celda); celda = '' }
    else if (ch === '\n') { fila.push(celda.replace(/\r$/, '')); filas.push(fila); fila = []; celda = '' }
    else celda += ch
  }
  if (celda || fila.length) { fila.push(celda.replace(/\r$/, '')); filas.push(fila) }
  return filas.filter((f) => f.some((c) => c.trim()))
}

/** «dd-mm-aaaa hh:mm:ss» en hora de Guatemala → ISO UTC; null si no sirve. */
export function fechaCsv(valor) {
  const m = String(valor ?? '').trim().match(/^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2}):(\d{2})$/)
  if (!m) return null
  const d = new Date(`${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:${m[6]}-06:00`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export const COLUMNAS_NECESARIAS = ['Campaign ID', 'Email_ID', 'Send_Date', 'Delivered_Date', 'Open_Date', 'Total Opens', 'Total Apple MPP Opens',
  'Hard_Bounce_Date', 'Hard_Bounce_Reason', 'Soft_Bounce_Date', 'Soft_Bounce_Reason', 'Clicked_Links_Count', 'Unsubscribe_Date', 'Complaint_date']

/**
 * Convierte el CSV de UNA campaña en filas para mkt_brevo_eventos (con su huella), sin duplicados.
 * @returns {{filas: object[], problemas: string[]}}
 */
export function eventosDesdeCsv(texto, campanaId) {
  const problemas = []
  const [cab = [], ...datos] = leerCsv(texto)
  const col = (n) => cab.findIndex((c) => c.trim() === n)
  for (const n of COLUMNAS_NECESARIAS) if (col(n) < 0) problemas.push(`falta la columna ${n}`)
  const enlaces = cab.map((c, i) => ({ i, url: c.trim() })).filter((x) => /^https?:\/\//i.test(x.url))
  const filas = []
  for (const [k, f] of datos.entries()) {
    if (f.length !== cab.length) { problemas.push(`la fila ${k + 2} tiene ${f.length} columnas (esperadas ${cab.length})`); continue }
    const g = (n) => (f[col(n)] ?? '').trim()
    if (Number(g('Campaign ID')) !== Number(campanaId)) { problemas.push(`la fila ${k + 2} es de otra campaña`); continue }
    const correo = g('Email_ID').toLowerCase()
    if (!correo.includes('@')) { problemas.push(`la fila ${k + 2} no tiene un correo válido`); continue }
    const envio = fechaCsv(g('Send_Date'))
    const apertura = fechaCsv(g('Open_Date'))
    const base = { campana_id: Number(campanaId), correo, fecha_envio: envio, origen: 'historial', motivo: null, cantidad: null, fecha_aproximada: false, url: null }
    const poner = (evento, fecha_evento, extra = {}) => { if (fecha_evento) filas.push({ ...base, evento, fecha_evento, ...extra }) }
    poner('delivered', fechaCsv(g('Delivered_Date')))
    poner('soft_bounce', fechaCsv(g('Soft_Bounce_Date')), { motivo: g('Soft_Bounce_Reason') || null })
    poner('hard_bounce', fechaCsv(g('Hard_Bounce_Date')), { motivo: g('Hard_Bounce_Reason') || null })
    if (apertura) poner('opened', apertura, { cantidad: Number(g('Total Opens')) || null })
    const mpp = Number(g('Total Apple MPP Opens')) || 0
    if (mpp > 0) poner('apple_mpp', apertura ?? envio, { cantidad: mpp, fecha_aproximada: !apertura })
    const clics = Number(g('Clicked_Links_Count')) || 0
    if (clics > 0) {
      // El enlace clicado y su fecha real: la columna de enlace con fecha (si hay varias, la primera en el tiempo).
      const clic = enlaces.map((e) => ({ url: e.url, cuando: fechaCsv(f[e.i]) })).filter((e) => e.cuando).sort((a, b) => a.cuando.localeCompare(b.cuando))[0]
      if (clic) poner('click', clic.cuando, { cantidad: clics, url: limpiarUrl(clic.url) })
      else poner('click', apertura ?? envio, { cantidad: clics, fecha_aproximada: true })
    }
    poner('unsubscribe', fechaCsv(g('Unsubscribe_Date')))
    poner('spam', fechaCsv(g('Complaint_date')))
  }
  const unicas = new Map()
  for (const fila of filas) {
    const huella = huellaDe(fila)
    if (!unicas.has(huella)) unicas.set(huella, { huella, ...fila })
  }
  return { filas: [...unicas.values()], problemas }
}
