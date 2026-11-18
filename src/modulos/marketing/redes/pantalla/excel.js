// Redes sociales · Excel del Informe detallado.
// Mismo método y misma plantilla que el Excel del Flujo de ventas v2 (flujo-ventas-v2/pantalla/excel.js),
// COPIADO aquí (no se importa ni se modifica): ExcelJS 4.4.0 desde el CDN al pulsar el botón,
// título azul marino, filas cebra, encabezado congelado y autofiltro. Si ExcelJS no carga, CSV de respaldo.
// Hojas: "Publicaciones" (lo filtrado), "Totales" (mismos cálculos que el Resumen) y "Filtros aplicados".
import { ESTADOS } from '../logica/calculos.js'

const NAVY = 'FF0F172A'
const WHITE = 'FFFFFFFF'
const TEXTO = 'FF1E293B'
const TENUE = 'FF64748B'
const ZEBRA = 'FFF8FAFC'
const AMBAR = 'FFB45309'

const COLUMNAS = [
  { titulo: 'Fecha', ancho: 12, valor: (f) => (f.fecha ? f.fecha.split('-').reverse().join('/') : '') },
  { titulo: 'Marca', ancho: 17, valor: (f) => f.marca },
  { titulo: 'País', ancho: 7, valor: (f) => f.pais },
  { titulo: 'Red', ancho: 11, valor: (f) => f.red },
  { titulo: 'Publicación', ancho: 40, valor: (f) => f.campana },
  { titulo: 'Link', ancho: 45, valor: (f) => f.link ?? '' },
  { titulo: 'Pauta', ancho: 10, valor: (f) => f.pauta, formato: '"$"#,##0.00' },
  { titulo: 'Alcance', ancho: 10, valor: (f) => f.alcance, formato: '#,##0' },
  { titulo: 'Visualizaciones', ancho: 13, valor: (f) => f.visualizaciones, formato: '#,##0' },
  { titulo: 'Clics', ancho: 8, valor: (f) => f.clics, formato: '#,##0' },
  { titulo: 'Interacciones', ancho: 12, valor: (f) => f.interacciones, formato: '#,##0' },
  { titulo: 'Leads', ancho: 8, valor: (f) => f.leads, formato: '#,##0' },
  { titulo: 'Calificados', ancho: 11, valor: (f) => f.calificados, formato: '#,##0' },
  { titulo: 'No calificados', ancho: 12, valor: (f) => f.noCalificados, formato: '#,##0' },
  { titulo: 'Costo por lead', ancho: 12, valor: (f) => f.costoLead, formato: '"$"#,##0.00' },
  { titulo: 'Costo por lead calificado', ancho: 14, valor: (f) => f.costoCalificado, formato: '"$"#,##0.00' },
  { titulo: 'Cierres', ancho: 8, valor: (f) => f.cierres, formato: '#,##0' },
  { titulo: 'Unidades', ancho: 9, valor: (f) => f.unidades, formato: '#,##0' },
  { titulo: 'Costo por cliente', ancho: 12, valor: (f) => f.costoCliente, formato: '"$"#,##0.00' },
  { titulo: 'Estado de la fila', ancho: 15, valor: (f) => ESTADOS[f.estadoFila]?.etiqueta ?? f.estadoFila },
  { titulo: 'Estado de la publicación', ancho: 17, valor: (f) => ESTADOS[f.estado]?.etiqueta ?? f.estado },
  { titulo: 'Datos a revisar', ancho: 60, valor: (f) => f.advertencias.map((a) => a.mensaje).join(' | ') },
]

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
  const lineas = [
    { texto: titulo, font: { size: 16, bold: true, color: { argb: WHITE } }, fondo: NAVY, alto: 32 },
    { texto: subtitulo, font: { size: 11, italic: true, color: { argb: 'FF475569' } }, fondo: 'FFEAF0F8', alto: 20 },
    { texto: `Generado el ${generado} · Redes sociales · Intelfon`, font: { size: 9, color: { argb: TENUE } }, fondo: ZEBRA, alto: 16 },
  ]
  lineas.forEach((l, i) => {
    ws.mergeCells(i + 1, 1, i + 1, ultimaCol)
    const c = ws.getCell(i + 1, 1)
    c.value = l.texto
    c.font = { name: 'Calibri', ...l.font }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: l.fondo } }
    c.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    ws.getRow(i + 1).height = l.alto
  })
}

function filaTitulos(ws, titulos) {
  const hr = ws.getRow(4)
  titulos.forEach((titulo, i) => {
    const cell = hr.getCell(i + 1)
    cell.value = titulo
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: WHITE } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true }
  })
  hr.height = 30
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: titulos.length } }
}

function filasSimples(ws, filas) {
  const thin = { style: 'thin', color: { argb: 'FFE2E8F0' } }
  filas.forEach((valores, idx) => {
    const row = ws.getRow(5 + idx)
    row.values = valores
    row.height = 20
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.font = { name: 'Calibri', size: 11, bold: col === 1, color: { argb: TEXTO } }
      cell.border = { bottom: thin }
      cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true }
      if (idx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } }
    })
  })
}

const dinero = (n) => (n === null || n === undefined ? '—' : `$${n.toFixed(2)}`)

export function armarLibro(ExcelJS, { filas, totales: t, textoFiltros, vista, busqueda, actualizado }) {
  const generado = new Date().toLocaleString('es-SV')
  const subtitulo = `${textoFiltros} · ${vista}${busqueda ? ` · búsqueda "${busqueda}"` : ''} · ${filas.length} filas · datos al ${actualizado ?? 'sin fecha'}`
  const wb = new ExcelJS.Workbook()
  wb.creator = 'RED Intelfon'
  wb.created = new Date()
  const thin = { style: 'thin', color: { argb: 'FFE2E8F0' } }

  // Hoja 1: Publicaciones (una fila por publicación y red)
  const ws = wb.addWorksheet('Publicaciones', { views: [{ state: 'frozen', ySplit: 4, showGridLines: false }] })
  ws.columns = COLUMNAS.map((c) => ({ width: c.ancho }))
  encabezadoHoja(ws, COLUMNAS.length, 'INFORME DETALLADO · REDES SOCIALES', subtitulo, generado)
  filaTitulos(ws, COLUMNAS.map((c) => c.titulo))
  filas.forEach((f, idx) => {
    const row = ws.getRow(5 + idx)
    row.values = COLUMNAS.map((c) => { const v = c.valor(f); return v === null || v === undefined ? '' : v })
    row.height = 20
    COLUMNAS.forEach((c, i) => {
      const cell = row.getCell(i + 1)
      cell.font = { name: 'Calibri', size: 11, color: { argb: TEXTO } }
      cell.border = { bottom: thin }
      cell.alignment = { vertical: 'middle', horizontal: c.formato ? 'right' : 'left', indent: c.formato ? 0 : 1 }
      if (c.formato) cell.numFmt = c.formato
      if (idx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } }
      if (c.titulo === 'Datos a revisar' && f.advertencias.length) cell.font = { name: 'Calibri', size: 11, color: { argb: AMBAR } }
      if (c.titulo === 'Link' && f.link) cell.value = { text: f.link, hyperlink: f.link }
    })
  })

  // Hoja 2: Totales (salen de la misma función que el Resumen: deben cuadrar)
  const ws2 = wb.addWorksheet('Totales', { views: [{ state: 'frozen', ySplit: 4, showGridLines: false }] })
  ws2.columns = [{ width: 34 }, { width: 22 }, { width: 50 }]
  encabezadoHoja(ws2, 3, 'TOTALES DE LO EXPORTADO', subtitulo, generado)
  filaTitulos(ws2, ['Dato', 'Valor', 'Cómo se calcula'])
  filasSimples(ws2, [
    ['Publicaciones', t.publicaciones, 'Facebook + Instagram de un mismo post = 1'],
    ['Filas (publicación y red)', t.filas, ''],
    ['Hechas · programadas', `${t.hechas} · ${t.programadas}`, 'Programada = fecha posterior a hoy'],
    ['Leads', t.leads, 'Suma de Mensajes/Leads'],
    ['Calificados', t.calificados, 'Suma de Lead calificado'],
    ['No calificados', t.noCalificados, 'Leads − calificados'],
    ['Cierres', t.cierres, 'Suma de Cierres exitoso'],
    ['Unidades', t.unidades, 'Suma de No. de unidades'],
    ['Pauta invertida', dinero(t.pauta), 'Suma de Presupuesto pauta'],
    ['Costo por lead', dinero(t.costoLead), 'Pauta ÷ leads'],
    ['Costo por lead calificado', dinero(t.costoCalificado), 'Pauta ÷ calificados'],
    ['Costo por cliente', dinero(t.costoCliente), 'Pauta ÷ cierres'],
  ])

  // Hoja 3: Filtros aplicados
  const ws3 = wb.addWorksheet('Filtros aplicados', { views: [{ state: 'frozen', ySplit: 4, showGridLines: false }] })
  ws3.columns = [{ width: 28 }, { width: 90 }]
  encabezadoHoja(ws3, 2, 'FILTROS APLICADOS', subtitulo, generado)
  filaTitulos(ws3, ['Filtro', 'Valor'])
  filasSimples(ws3, [['Filtros', textoFiltros], ['Vista', vista], ['Búsqueda', busqueda || '(ninguna)'], ['Datos al', actualizado ?? 'sin fecha']])
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

/** Respaldo en CSV (; y BOM UTF-8). */
export function textoCsv({ filas }) {
  const celda = (t) => `"${String(t ?? '').replace(/"/g, '""')}"`
  let csv = '﻿' + COLUMNAS.map((c) => celda(c.titulo)).join(';') + '\r\n'
  for (const f of filas) csv += COLUMNAS.map((c) => celda(c.valor(f))).join(';') + '\r\n'
  return csv
}

export async function descargarInforme(datos) {
  const nombre = `redes-sociales-informe-${new Date().toISOString().slice(0, 10)}`
  let ExcelJS
  try {
    ExcelJS = await cargarExcelJs()
  } catch (err) {
    console.warn('ExcelJS no cargó, se usa CSV de respaldo:', err.message)
    descargarBlob(new Blob([textoCsv(datos)], { type: 'text/csv;charset=utf-8;' }), `${nombre}.csv`)
    return 'csv'
  }
  const buffer = await armarLibro(ExcelJS, datos).xlsx.writeBuffer()
  descargarBlob(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${nombre}.xlsx`)
  return 'xlsx'
}
