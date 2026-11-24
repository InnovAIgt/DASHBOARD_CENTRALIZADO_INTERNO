// Canales de marketing · Mailing: exportar a Excel lo que se ve en una tabla (con los filtros aplicados).
// Mismo método y mismo aspecto que el Excel de Flujo de ventas: ExcelJS se carga del CDN al pulsar el botón (se usa
// su cargarExcelJs, solo importado, sin modificar Flujo de ventas); título azul marino, encabezado congelado,
// autofiltro, filas cebra y una hoja «Filtros aplicados». Si ExcelJS no carga, se descarga un CSV (; y BOM UTF-8).
import { cargarExcelJs } from '../../flujo-ventas-v2/pantalla/excel.js'

const NAVY = 'FF1E3A5F', WHITE = 'FFFFFFFF', TEXTO = 'FF1E293B', TENUE = 'FF64748B', ZEBRA = 'FFF1F5F9'

/** Texto de una celda para el CSV / Excel. */
const texto = (v) => (v === null || v === undefined ? '' : Array.isArray(v) ? v.join(', ') : String(v))

function encabezado(ws, ultima, titulo, subtitulo, generado) {
  const fila = (n, valor, fuente, relleno, alto) => {
    ws.mergeCells(n, 1, n, ultima)
    const c = ws.getCell(n, 1)
    c.value = valor
    c.font = fuente
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: relleno } }
    c.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    ws.getRow(n).height = alto
  }
  fila(1, titulo, { name: 'Calibri', size: 16, bold: true, color: { argb: WHITE } }, NAVY, 32)
  fila(2, subtitulo, { name: 'Calibri', size: 11, italic: true, color: { argb: 'FF475569' } }, 'FFEAF0F8', 20)
  fila(3, `Generado el ${generado} · Canales de marketing · RED Intelfon`, { name: 'Calibri', size: 9, color: { argb: TENUE } }, ZEBRA, 16)
}

function titulos(ws, lista) {
  const r = ws.getRow(4)
  lista.forEach((t, i) => {
    const c = r.getCell(i + 1)
    c.value = t
    c.font = { name: 'Calibri', size: 11, bold: true, color: { argb: WHITE } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }
    c.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true }
  })
  r.height = 30
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: lista.length } }
}

function hoja(wb, nombre, { titulo, subtitulo, generado, columnas, filas }) {
  const ws = wb.addWorksheet(nombre, { views: [{ state: 'frozen', ySplit: 4, showGridLines: false }] })
  ws.columns = columnas.map((c) => ({ width: c.ancho ?? 18 }))
  encabezado(ws, columnas.length, titulo, subtitulo, generado)
  titulos(ws, columnas.map((c) => c.label))
  const borde = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } }
  filas.forEach((f, i) => {
    const r = ws.getRow(5 + i)
    r.values = columnas.map((c) => texto(c.valor(f)))
    columnas.forEach((_c, k) => {
      const cell = r.getCell(k + 1)
      cell.font = { name: 'Calibri', size: 11, color: { argb: TEXTO } }
      cell.border = borde
      cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true }
      if (i % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } }
    })
  })
}

export function textoCsv({ columnas, filas }) {
  const celda = (v) => `"${texto(v).replace(/"/g, '""')}"`
  return '﻿' + [columnas.map((c) => celda(c.label)).join(';'), ...filas.map((f) => columnas.map((c) => celda(c.valor(f))).join(';'))].join('\r\n') + '\r\n'
}

function descargar(blob, nombre) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Descarga el Excel (o el CSV de respaldo). Devuelve 'xlsx' o 'csv'.
 * @param {{nombreBase: string, titulo: string, subtitulo: string, columnas: Array<{label: string, valor: Function, ancho?: number}>, filas: any[], filtros: Array<[string, string]>}} datos
 */
export async function exportarExcel(datos) {
  const generado = new Date().toLocaleString('es-GT', { timeZone: 'America/Guatemala' })
  const csv = () => { descargar(new Blob([textoCsv(datos)], { type: 'text/csv;charset=utf-8;' }), `${datos.nombreBase}.csv`); return 'csv' }
  let ExcelJS
  try { ExcelJS = await cargarExcelJs() } catch { return csv() }
  try {
    const wb = new ExcelJS.Workbook()
    wb.creator = 'RED Intelfon'
    wb.created = new Date()
    hoja(wb, 'Datos', { ...datos, generado })
    hoja(wb, 'Filtros aplicados', {
      titulo: 'FILTROS APLICADOS', subtitulo: datos.subtitulo, generado,
      columnas: [{ label: 'Filtro', valor: (f) => f[0], ancho: 30 }, { label: 'Valor', valor: (f) => f[1], ancho: 80 }],
      filas: datos.filtros,
    })
    descargar(new Blob([await wb.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${datos.nombreBase}.xlsx`)
    return 'xlsx'
  } catch (err) {
    console.error('Error generando el Excel de Mailing:', err?.message)
    return csv()
  }
}
