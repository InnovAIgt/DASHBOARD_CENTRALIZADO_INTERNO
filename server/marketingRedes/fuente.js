/**
 * Redes sociales — FUENTE DE DATOS (docs/marketing-redes/DECISIONES.md, D-D y D5).
 *
 * Es el ÚNICO archivo que sabe de dónde sale el Excel. El lector, los cálculos y las pantallas
 * solo reciben los bytes.
 *
 * HOY: copia guardada en el proyecto
 *   server/marketingRedes/datos/metricas-rrss.xlsx   (el Excel)
 *   server/marketingRedes/datos/info.json            ({ "actualizado": "AAAA-MM-DD", "origen": "…" })
 * En Vercel estos archivos viajan con la función gracias a "includeFiles" en vercel.json.
 *
 * FUTURO (Microsoft 365): reemplazar SOLO el cuerpo de obtenerArchivoRRSS() por la descarga del
 * Excel en línea (Microsoft Graph) y devolver lo mismo: { bytes, actualizado, origen }.
 * Ver "Cómo conectar el servicio automático" en docs/marketing-redes/README.md.
 */
import fs from 'node:fs/promises'
import path from 'node:path'

/** Error de fuente: el mensaje se puede mostrar tal cual (no tiene rutas ni detalles técnicos). */
export class ErrorFuenteRRSS extends Error {
  constructor(mensaje) {
    super(mensaje)
    this.name = 'ErrorFuenteRRSS'
  }
}

// process.cwd() es la carpeta del proyecto en local, en Docker (/app) y en Vercel (/var/task).
export const CARPETA_DATOS = path.join(process.cwd(), 'server', 'marketingRedes', 'datos')
export const ARCHIVO_EXCEL = 'metricas-rrss.xlsx'
export const ARCHIVO_INFO = 'info.json'

/**
 * @returns {Promise<{ bytes: Buffer, actualizado: string|null, origen: string }>}
 */
export async function obtenerArchivoRRSS({ carpeta = CARPETA_DATOS } = {}) {
  let bytes
  try {
    bytes = await fs.readFile(path.join(carpeta, ARCHIVO_EXCEL))
  } catch {
    throw new ErrorFuenteRRSS('No se encontró el archivo de métricas de Redes sociales.')
  }

  let info = {}
  try {
    info = JSON.parse(await fs.readFile(path.join(carpeta, ARCHIVO_INFO), 'utf8'))
  } catch {
    // Sin info.json el dashboard funciona igual; solo no muestra la fecha de actualización.
  }
  const actualizado = typeof info.actualizado === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(info.actualizado) ? info.actualizado : null
  return { bytes, actualizado, origen: typeof info.origen === 'string' ? info.origen : 'Copia del Excel en el proyecto' }
}
