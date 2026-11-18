/**
 * Marketing por canales — lector del CSV de Brevo (reporte por persona de una campaña).
 *
 * Convierte el texto del CSV al FORMATO ESTÁNDAR interno: una fila por persona por campaña.
 * Lo usan todas las fuentes que entreguen CSV de Brevo (carpeta local hoy, Google Drive en la Fase 2).
 * Los cálculos nunca ven el CSV: solo ven filas estándar.
 *
 * Formato de Brevo: separador ";", fechas "DD-MM-YYYY HH:mm:ss", una fila por persona,
 * 18 columnas fijas y después una columna por enlace (encabezado = URL, valor = fecha del clic).
 *
 * FILA ESTÁNDAR (los datos personales solo se usan dentro del servidor):
 * {
 *   canal: 'mailing',
 *   campanaId: '74',                     // de la columna Campaign ID (no del nombre del archivo)
 *   campanaNombre: 'GERENTE GENERAL …',
 *   correo: 'persona@dominio.com',       // en minúsculas — PRIVADO, nunca va al navegador
 *   fechaEnvio: '2026-11-05T09:30:00',   // hora local tal como viene en Brevo
 *   fechaEntrega, fechaReboteSuave, fechaReboteDuro:
 *       null (no pasó) · '2026-11-05T09:31:00' · FECHA_ILEGIBLE (pasó, pero la fecha no se entiende)
 *   aperturaReal, baja, queja: true/false
 *   aperturasTotales, aperturasApple, clicsTotales: número
 *   fechaApertura, fechaBaja, fechaQueja: null · fecha ISO · FECHA_ILEGIBLE   (solo para el detalle por persona, D34)
 *   enlaces: [{ url, fecha }]            // columnas de enlace con fecha de clic — PRIVADO (detalle por persona)
 * }
 * Con las fechas, los cálculos deciden el estado final de cada persona (gana el último evento, D21).
 */

import { FECHA_ILEGIBLE } from './filaEstandar.js'

const COLUMNAS_EVENTO = { fechaEntrega: 'Delivered_Date', fechaReboteSuave: 'Soft_Bounce_Date', fechaReboteDuro: 'Hard_Bounce_Date' }
// Nombre simple de cada evento para los avisos que se ven en pantalla.
const NOMBRE_EVENTO = { fechaEntrega: 'la fecha de entrega', fechaReboteSuave: 'la fecha de rebote temporal', fechaReboteDuro: 'la fecha de rebote permanente' }

/** Columnas que el CSV DEBE tener (nombre en Brevo → campo interno). */
const COLUMNAS = {
  campanaId: 'Campaign ID',
  campanaNombre: 'Campaign Name',
  correo: 'Email_ID',
  fechaEnvio: 'Send_Date',
  fechaEntrega: 'Delivered_Date',
  fechaApertura: 'Open_Date',
  aperturasTotales: 'Total Opens',
  aperturasApple: 'Total Apple MPP Opens',
  fechaBaja: 'Unsubscribe_Date',
  fechaReboteDuro: 'Hard_Bounce_Date',
  fechaReboteSuave: 'Soft_Bounce_Date',
  clicsTotales: 'Clicked_Links_Count',
  fechaQueja: 'Complaint_date',
}

const COLUMNAS_MOTIVO_REBOTE = {
  motivoReboteDuro: 'Hard_Bounce_Reason',
  motivoReboteSuave: 'Soft_Bounce_Reason',
}

const claveColumna = (t) => String(t ?? '').trim().replace(/^"|"$/g, '').toLowerCase().replace(/[\s_]+/g, '')

/**
 * Lee un CSV de Brevo.
 * @param {Buffer|string} contenido
 * @returns {{ ok: true, filas: object[], descartadas: Record<string, number>, avisos: Record<string, number>, columnasEnlace: number }
 *         | { ok: false, motivo: string }}
 */
export function leerCsvBrevo(contenido) {
  const texto = decodificar(contenido)
  const registros = separarCsv(texto, ';').filter((r) => r.some((c) => c.trim() !== ''))
  if (registros.length === 0) return { ok: false, motivo: 'El archivo está vacío.' }

  const encabezados = registros[0].map(claveColumna)
  const indice = {}
  const faltan = []
  for (const [campo, nombre] of Object.entries(COLUMNAS)) {
    const i = encabezados.indexOf(claveColumna(nombre))
    if (i === -1) faltan.push(nombre)
    indice[campo] = i
  }
  for (const [campo, nombre] of Object.entries(COLUMNAS_MOTIVO_REBOTE)) {
    indice[campo] = encabezados.indexOf(claveColumna(nombre))
  }
  if (faltan.length) {
    return { ok: false, motivo: `No parece un reporte de campaña de Brevo: faltan las columnas ${faltan.join(', ')}.` }
  }
  if (registros.length === 1) return { ok: false, motivo: 'El archivo solo tiene encabezados, sin filas.' }

  // Columnas de enlace: el encabezado es la URL y el valor, la fecha del clic.
  const enlacesColumnas = registros[0]
    .map((c, i) => ({ i, url: c.trim().replace(/^"|"$/g, '') }))
    .filter((c) => /^https?:\/\//i.test(c.url))
  const columnasEnlace = enlacesColumnas.length
  const fechaOpcional = (texto) => (texto === '' ? null : fechaIso(texto) ?? FECHA_ILEGIBLE)
  const filas = []
  const descartadas = {}
  const descartar = (motivo) => { descartadas[motivo] = (descartadas[motivo] ?? 0) + 1 }
  const avisos = {}
  const avisar = (motivo) => { avisos[motivo] = (avisos[motivo] ?? 0) + 1 }

  for (const r of registros.slice(1)) {
    const celda = (campo) => (r[indice[campo]] ?? '').trim()
    const campanaId = celda('campanaId')
    const correo = celda('correo').toLowerCase()
    const fechaEnvio = fechaIso(celda('fechaEnvio'))

    if (!campanaId) { descartar('Fila sin número de campaña'); continue }
    if (!correo.includes('@')) { descartar('Fila sin correo válido'); continue }
    if (!fechaEnvio) { descartar('Fila sin fecha de envío válida (DD-MM-YYYY HH:mm:ss)'); continue }

    const eventos = {}
    for (const campo of Object.keys(COLUMNAS_EVENTO)) {
      const texto = celda(campo)
      eventos[campo] = texto === '' ? null : fechaIso(texto) ?? FECHA_ILEGIBLE
      if (eventos[campo] === FECHA_ILEGIBLE) avisar(`Fecha ilegible en ${NOMBRE_EVENTO[campo]}: el evento se cuenta y, si no se puede ordenar, gana el rebote`)
    }

    filas.push({
      canal: 'mailing',
      campanaId,
      campanaNombre: celda('campanaNombre'),
      correo,
      fechaEnvio,
      ...eventos,
      motivoReboteDuro: indice.motivoReboteDuro === -1 ? '' : (r[indice.motivoReboteDuro] ?? '').trim(),
      motivoReboteSuave: indice.motivoReboteSuave === -1 ? '' : (r[indice.motivoReboteSuave] ?? '').trim(),
      aperturaReal: celda('fechaApertura') !== '',
      aperturasTotales: entero(celda('aperturasTotales')),
      aperturasApple: entero(celda('aperturasApple')),
      clicsTotales: entero(celda('clicsTotales')),
      baja: celda('fechaBaja') !== '',
      queja: celda('fechaQueja') !== '',
      // Solo para el detalle por persona (D34); los cálculos no los usan.
      fechaApertura: fechaOpcional(celda('fechaApertura')),
      fechaBaja: fechaOpcional(celda('fechaBaja')),
      fechaQueja: fechaOpcional(celda('fechaQueja')),
      enlaces: enlacesColumnas
        .map((c) => ({ url: c.url, texto: (r[c.i] ?? '').trim() }))
        .filter((c) => c.texto !== '')
        .map((c) => ({ url: c.url, fecha: fechaOpcional(c.texto) })),
    })
  }
  return { ok: true, filas, descartadas, avisos, columnasEnlace }
}

/** UTF-8 (con o sin BOM). Si el archivo no es UTF-8 válido, se lee como Windows-1252/Latin-1 (Excel). */
function decodificar(contenido) {
  if (typeof contenido === 'string') return contenido.replace(/^﻿/, '')
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(contenido).replace(/^﻿/, '')
  } catch {
    return Buffer.from(contenido).toString('latin1')
  }
}

/** Separa un CSV respetando comillas ("a;b" es una sola celda y "" es una comilla). */
function separarCsv(texto, separador) {
  const registros = []
  let registro = []
  let celda = ''
  let entreComillas = false
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]
    if (entreComillas) {
      if (c === '"') {
        if (texto[i + 1] === '"') { celda += '"'; i++ } else entreComillas = false
      } else celda += c
    } else if (c === '"' && celda === '') entreComillas = true
    else if (c === separador) { registro.push(celda); celda = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++
      registro.push(celda); registros.push(registro); registro = []; celda = ''
    } else celda += c
  }
  if (celda !== '' || registro.length) { registro.push(celda); registros.push(registro) }
  return registros
}

/** "05-11-2026 09:30:00" → "2026-11-05T09:30:00". Si no tiene ese formato o no es una fecha real → null. */
export function fechaIso(texto) {
  const m = /^(\d{2})-(\d{2})-(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(texto)
  if (!m) return null
  const [, dd, mm, yyyy, hh = '00', mi = '00', ss = '00'] = m
  const d = new Date(Date.UTC(+yyyy, +mm - 1, +dd))
  if (d.getUTCMonth() !== +mm - 1 || d.getUTCDate() !== +dd || +hh > 23 || +mi > 59 || +ss > 59) return null
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`
}

function entero(texto) {
  const n = Number.parseInt(texto, 10)
  return Number.isFinite(n) && n > 0 ? n : 0
}
