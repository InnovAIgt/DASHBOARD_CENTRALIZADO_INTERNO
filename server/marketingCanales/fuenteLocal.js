/**
 * Marketing por canales — FUENTE: carpeta local con CSV de Brevo.
 *
 * La carpeta se indica en MARKETING_LOCAL_CSV_DIR (solo servidor, en .env.local).
 * Sirve en la computadora de desarrollo; en Vercel/Docker no existe esa carpeta
 * (ahí se usará Google Drive en la Fase 2).
 *
 * Toda fuente devuelve lo mismo: { tipo, filas (formato estándar), archivos (resumen) }.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { combinarArchivosBrevo } from './combinarArchivos.js'

export const TIPO_FUENTE_LOCAL = 'carpeta-local'

export class ErrorFuente extends Error {}

export async function obtenerFilasCarpetaLocal(carpeta) {
  let nombres
  try {
    nombres = await fs.readdir(carpeta, { withFileTypes: true })
  } catch {
    // No se muestra la ruta: solo el problema.
    throw new ErrorFuente('No se pudo abrir la carpeta indicada en MARKETING_LOCAL_CSV_DIR (no existe o no hay permiso).')
  }

  const entradas = []
  for (const entrada of nombres) {
    const nombre = entrada.name
    const ruta = path.join(carpeta, nombre)
    if (entrada.isDirectory()) { entradas.push({ nombre, fechaModificacion: 0, motivoIgnorado: 'Es una carpeta: no se leen subcarpetas.' }); continue }
    if (nombre.startsWith('.') || nombre.startsWith('~$')) { entradas.push({ nombre, fechaModificacion: 0, motivoIgnorado: 'Archivo oculto o temporal.' }); continue }
    if (!nombre.toLowerCase().endsWith('.csv')) { entradas.push({ nombre, fechaModificacion: 0, motivoIgnorado: 'No es un archivo .csv.' }); continue }
    try {
      const [info, contenido] = await Promise.all([fs.stat(ruta), fs.readFile(ruta)])
      entradas.push({ nombre, fechaModificacion: info.mtimeMs, contenido })
    } catch {
      entradas.push({ nombre, fechaModificacion: 0, motivoIgnorado: 'No se pudo leer el archivo (¿está abierto en otro programa?).' })
    }
  }

  return { tipo: TIPO_FUENTE_LOCAL, ...combinarArchivosBrevo(entradas) }
}
