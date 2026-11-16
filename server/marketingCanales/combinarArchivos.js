/**
 * Marketing por canales — junta TODOS los CSV de Brevo de una carpeta (el historial).
 *
 * No depende de dónde vienen los archivos (carpeta local hoy, Google Drive en la Fase 2):
 * recibe la lista de archivos con su contenido y fecha de modificación.
 *
 * Regla: la campaña se identifica por la columna Campaign ID (no por el nombre del archivo).
 * Si dos archivos traen la misma campaña, se usa el de fecha de modificación más reciente.
 */
import { leerCsvBrevo } from './brevoCsv.js'

/**
 * @param {{ nombre: string, fechaModificacion: number, contenido?: Buffer|string, motivoIgnorado?: string }[]} entradas
 *        fechaModificacion en milisegundos. Si viene motivoIgnorado, el archivo no se lee.
 * @returns {{ filas: object[], archivos: { revisados: number, usados: object[], ignorados: object[] } }}
 */
export function combinarArchivosBrevo(entradas) {
  const ignorados = []
  const leidos = []

  for (const e of entradas) {
    if (e.motivoIgnorado) { ignorados.push({ archivo: e.nombre, motivo: e.motivoIgnorado }); continue }
    const r = leerCsvBrevo(e.contenido)
    if (!r.ok) { ignorados.push({ archivo: e.nombre, motivo: r.motivo }); continue }
    const porCampana = new Map()
    for (const fila of r.filas) {
      if (!porCampana.has(fila.campanaId)) porCampana.set(fila.campanaId, [])
      porCampana.get(fila.campanaId).push(fila)
    }
    leidos.push({ ...e, porCampana, descartadas: r.descartadas, avisos: r.avisos })
  }

  // Para cada Campaign ID, el archivo más reciente (si empatan, el último por nombre).
  const masReciente = (a, b) => a.fechaModificacion - b.fechaModificacion || a.nombre.localeCompare(b.nombre)
  const ganador = new Map()
  for (const archivo of leidos) {
    for (const id of archivo.porCampana.keys()) {
      const actual = ganador.get(id)
      if (!actual || masReciente(archivo, actual) > 0) ganador.set(id, archivo)
    }
  }

  const filas = []
  const usados = []
  for (const archivo of [...leidos].sort((a, b) => a.nombre.localeCompare(b.nombre))) {
    const campanas = []
    const reemplazadas = []
    for (const [id, filasCampana] of archivo.porCampana) {
      if (ganador.get(id) === archivo) {
        filas.push(...filasCampana)
        campanas.push({ id, filas: filasCampana.length })
      } else {
        reemplazadas.push(`#${id} (se usa "${ganador.get(id).nombre}", más reciente)`)
      }
    }
    const filasDescartadas = Object.entries(archivo.descartadas).map(([motivo, cantidad]) => ({ motivo, cantidad }))
    const avisos = Object.entries(archivo.avisos).map(([motivo, cantidad]) => ({ motivo, cantidad }))
    if (campanas.length === 0) {
      ignorados.push({ archivo: archivo.nombre, motivo: `Campaña repetida: ${reemplazadas.join('; ')}.` })
      continue
    }
    usados.push({
      archivo: archivo.nombre,
      fechaModificacion: new Date(archivo.fechaModificacion).toISOString(),
      campanas,
      filasDescartadas,
      avisos,
      ...(reemplazadas.length ? { campanasNoUsadas: reemplazadas } : {}),
    })
  }

  ignorados.sort((a, b) => a.archivo.localeCompare(b.archivo))
  return { filas, archivos: { revisados: entradas.length, usados, ignorados } }
}
