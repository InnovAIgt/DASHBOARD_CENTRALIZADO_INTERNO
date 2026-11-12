// Flujo de ventas v2 · Excel del Informe detallado.
//
// Mismo método y misma plantilla que el Excel del dashboard de Activaciones
// (public/dashboards/activaciones/activaciones.html: loadExcelJsLib, exportActToExcel y
// exportActToExcelCsv). Se REPLICÓ aquí; Activaciones no se modificó ni se importa.
//   - ExcelJS 4.4.0 se carga desde el CDN al pulsar el botón (no está en package.json).
//   - Hoja "Informe detallado": título azul marino, subtítulo (país · período · N leads),
//     "Generado el…", encabezado azul marino, filas cebra, primeras 4 filas congeladas,
//     autofiltro, fechas dd/mm/yyyy, números alineados y estado/semáforo en color.
//   - Hoja "Filtros aplicados" (propia de la v2, mismo estilo).
//   - Si ExcelJS no carga o falla, se descarga un CSV (; y BOM UTF-8) como respaldo.
// Nunca incluye el teléfono del cliente (la API ya no lo envía y no hay columna para él).
import { semaforo, textoCelda } from './informeDatos.js'

const NAVY = 'FF0F172A'
const WHITE = 'FFFFFFFF'
const TEXTO = 'FF1E293B'
const TENUE = 'FF64748B'
const ZEBRA = 'FFF8FAFC'
const VERDE = 'FF15803D'
const ROJO = 'FFB91C1C'
const AZUL = 'FF1D4ED8'
const AMBAR = 'FFB45309'
const CENTRADAS = new Set(['numero', 'fecha', 'semaforo', 'estado', 'calificacion'])

export function cargarExcelJs() {
  return new Promise((resolve, reject) => {
    if (window.ExcelJS) return resolve(window.ExcelJS)
    const s = document.createElement('script')
    s.src = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js'
    s.onload = () => (window.ExcelJS ? resolve(window.ExcelJS) : reject(new Error('ExcelJS no disponible')))
    s.onerror = () => reject(new Error('No se pudo cargar ExcelJS'))
    document.head.appendChild(s)
  })
}

function encabezadoHoja(ws, ultimaCol, titulo, subtitulo, generado) {
  ws.mergeCells(1, 1, 1, ultimaCol)
  const t = ws.getCell(1, 1)
  t.value = titulo
  t.font = { name: 'Calibri', size: 16, bold: true, color: { argb: WHITE } }
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }
  t.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  ws.getRow(1).height = 32
  ws.mergeCells(2, 1, 2, ultimaCol)
  const s = ws.getCell(2, 1)
  s.value = subtitulo
  s.font = { name: 'Calibri', size: 11, italic: true, color: { argb: 'FF475569' } }
  s.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAF0F8' } }
  s.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  ws.getRow(2).height = 20
  ws.mergeCells(3, 1, 3, ultimaCol)
  const g = ws.getCell(3, 1)
  g.value = `Generado el ${generado} · Flujo de ventas v2 · Intelfon`
  g.font = { name: 'Calibri', size: 9, color: { argb: TENUE } }
  g.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } }
  g.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  ws.getRow(3).height = 16
}

function filaTitulos(ws, titulos, centradas) {
  const hr = ws.getRow(4)
  titulos.forEach((titulo, i) => {
    const cell = hr.getCell(i + 1)
    cell.value = titulo
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: WHITE } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }
    cell.alignment = { vertical: 'middle', horizontal: centradas(i) ? 'center' : 'left', indent: centradas(i) ? 0 : 1, wrapText: true }
  })
  hr.height = 30
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: titulos.length } }
}

const colorEstado = (estado) => (estado === 'ganado' ? VERDE : estado === 'perdido' ? ROJO : AZUL)
const colorSemaforo = (s) => (s === 'vencida' ? ROJO : s === 'hoy' ? AMBAR : s === 'a_tiempo' ? VERDE : TENUE)

/**
 * Arma el libro (sin descargarlo). datos = { filas, columnas, subtitulo, generado, filtros }
 * filas: [{ lead, v }] de filasInforme · columnas: las visibles · filtros: [[nombre, valor], …]
 */
export function armarLibro(ExcelJS, { filas, columnas, subtitulo, generado, filtros }) {
  const thin = { style: 'thin', color: { argb: 'FFE2E8F0' } }
  const wb = new ExcelJS.Workbook()
  wb.creator = 'RED Intelfon'
  wb.created = new Date()

  // ---- Hoja 1: Informe detallado ----
  const ws = wb.addWorksheet('Informe detallado', { views: [{ state: 'frozen', ySplit: 4, showGridLines: false }] })
  const ultimaCol = columnas.length + 1
  ws.columns = [{ width: 6 }, ...columnas.map((col) => ({ width: col.ancho }))]
  encabezadoHoja(ws, ultimaCol, 'INFORME DETALLADO · FLUJO DE VENTAS', subtitulo, generado)
  filaTitulos(ws, ['#', ...columnas.map((col) => col.label)], (i) => i === 0 || CENTRADAS.has(columnas[i - 1]?.tipo))

  filas.forEach((fila, idx) => {
    const row = ws.getRow(5 + idx)
    row.values = [idx + 1, ...columnas.map((col) => {
      const valor = fila.v[col.key]
      if (valor === null || valor === undefined || valor === '') return ''
      if (valor instanceof Date || typeof valor === 'number') return col.tipo === 'etapa' ? textoCelda(col, valor) : valor
      return String(valor)
    })]
    row.height = 20
    const zebra = idx % 2 === 1
    for (let cIdx = 1; cIdx <= ultimaCol; cIdx++) {
      const cell = row.getCell(cIdx)
      const col = columnas[cIdx - 2]
      const centrada = cIdx === 1 || CENTRADAS.has(col?.tipo)
      cell.font = { name: 'Calibri', size: 11, color: { argb: TEXTO } }
      cell.border = { bottom: thin }
      cell.alignment = { vertical: 'middle', horizontal: centrada ? 'center' : 'left', indent: centrada ? 0 : 1, wrapText: col?.tipo === 'largo' }
      if (zebra) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } }
      if (!col) continue
      if (col.tipo === 'fecha' || col.tipo === 'semaforo') cell.numFmt = 'dd/mm/yyyy'
      if (col.tipo === 'numero') cell.numFmt = '#,##0'
      if (col.tipo === 'cliente') cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: TEXTO } }
      if (col.tipo === 'estado') cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: colorEstado(fila.lead.estado) } }
      if (col.tipo === 'semaforo') cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: colorSemaforo(semaforo(fila.lead)) } }
    }
    row.getCell(1).font = { name: 'Calibri', size: 11, color: { argb: TENUE } }
  })

  // ---- Hoja 2: Filtros aplicados ----
  const ws2 = wb.addWorksheet('Filtros aplicados', { views: [{ state: 'frozen', ySplit: 4, showGridLines: false }] })
  ws2.columns = [{ width: 28 }, { width: 90 }]
  encabezadoHoja(ws2, 2, 'FILTROS APLICADOS', subtitulo, generado)
  filaTitulos(ws2, ['Filtro', 'Valor'], () => false)
  filtros.forEach(([nombre, valor], idx) => {
    const row = ws2.getRow(5 + idx)
    row.values = [nombre, valor]
    row.height = 20
    for (let cIdx = 1; cIdx <= 2; cIdx++) {
      const cell = row.getCell(cIdx)
      cell.font = { name: 'Calibri', size: 11, bold: cIdx === 1, color: { argb: TEXTO } }
      cell.border = { bottom: thin }
      cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true }
      if (idx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } }
    }
  })
  return wb
}

function descargarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nombre
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/** Respaldo en CSV (; y BOM UTF-8), como exportActToExcelCsv de Activaciones. */
export function textoCsv({ filas, columnas }) {
  const celda = (texto) => `"${String(texto).replace(/"/g, '""')}"`
  let csv = '﻿'
  csv += ['#', ...columnas.map((col) => col.label)].map(celda).join(';') + '\r\n'
  filas.forEach((fila, idx) => {
    csv += [idx + 1, ...columnas.map((col) => textoCelda(col, fila.v[col.key]))].map(celda).join(';') + '\r\n'
  })
  return csv
}

/** Descarga el Excel (o el CSV de respaldo). Devuelve 'xlsx' o 'csv'. */
export async function descargarInforme(datos) {
  let ExcelJS
  try {
    ExcelJS = await cargarExcelJs()
  } catch (err) {
    console.warn('ExcelJS no cargó, se usa exportación CSV de respaldo:', err.message)
    descargarBlob(new Blob([textoCsv(datos)], { type: 'text/csv;charset=utf-8;' }), `${datos.nombreBase}.csv`)
    return 'csv'
  }
  try {
    const buffer = await armarLibro(ExcelJS, datos).xlsx.writeBuffer()
    descargarBlob(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${datos.nombreBase}.xlsx`)
    return 'xlsx'
  } catch (err) {
    console.error('Error generando el Excel:', err)
    descargarBlob(new Blob([textoCsv(datos)], { type: 'text/csv;charset=utf-8;' }), `${datos.nombreBase}.csv`)
    return 'csv'
  }
}
