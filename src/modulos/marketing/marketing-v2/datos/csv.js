// Canales de marketing · Mailing: CSV para descargar (por ejemplo, «Descargar resumen CSV» de Resultado por campaña).
// Separador coma y punto decimal (como en Guatemala), con BOM para que Excel lea bien las tildes.

/** Una celda: comillas si hace falta; números tal cual; vacío para null/undefined. */
function celda(v) {
  if (v === null || v === undefined || (typeof v === 'number' && !Number.isFinite(v))) return ''
  const texto = String(v)
  // Evita que Excel interprete una celda como fórmula (=, +, -, @ al inicio), salvo números.
  const seguro = typeof v !== 'number' && /^[=+\-@]/.test(texto) ? `'${texto}` : texto
  return /[",\r\n]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro
}

/**
 * Texto CSV.
 * @param {Array<{label: string, valor: Function}>} columnas
 * @param {object[]} filas
 */
export function aCsv(columnas, filas) {
  const lineas = [columnas.map((c) => celda(c.label)).join(',')]
  for (const f of filas) lineas.push(columnas.map((c) => celda(c.valor(f))).join(','))
  return `﻿${lineas.join('\r\n')}\r\n`
}

/** Descarga el CSV en el navegador. */
export function descargarCsv(nombre, texto) {
  const url = URL.createObjectURL(new Blob([texto], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = nombre.endsWith('.csv') ? nombre : `${nombre}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
