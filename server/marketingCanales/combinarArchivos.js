/**
 * Marketing por canales — junta TODOS los CSV de Brevo de una carpeta (el historial).
 *
 * No depende de dónde vienen los archivos (carpeta local o Google Drive):
 * recibe la lista de archivos con su contenido y fecha de modificación.
 *
 * Regla (D37): la campaña se identifica por la columna de número de campaña (no por el nombre del archivo).
 * Si dos o más archivos traen la misma campaña, se usa SOLO uno, el de datos más actualizados:
 *   1. el que tiene el ÚLTIMO EVENTO más reciente (entrega, apertura, clic, rebote, baja o queja);
 *   2. si empatan, el que tiene más filas de esa campaña;
 *   3. si siguen empatados, el de fecha de modificación más reciente (Drive o carpeta local);
 *   4. y por último, el último por nombre.
 * Así no importa en qué orden ni cuándo se suban los archivos: una copia vieja subida después no gana.
 */
import { leerCsvBrevo } from './brevoCsv.js'
import { FECHA_ILEGIBLE } from './filaEstandar.js'

const CAMPOS_FECHA = ['fechaEnvio', 'fechaEntrega', 'fechaReboteSuave', 'fechaReboteDuro', 'fechaApertura', 'fechaBaja', 'fechaQueja']

/** Fecha (ISO) del último evento de un grupo de filas. Las fechas ilegibles no cuentan. */
export function ultimoEvento(filas) {
  let max = ''
  const ver = (f) => { if (f && f !== FECHA_ILEGIBLE && f > max) max = f }
  for (const fila of filas) {
    for (const c of CAMPOS_FECHA) ver(fila[c])
    for (const e of fila.enlaces ?? []) ver(e.fecha)
  }
  return max || null
}

/**
 * @param {{ nombre: string, fechaModificacion: number, contenido?: Buffer|string, motivoIgnorado?: string }[]} entradas
 *        fechaModificacion en milisegundos. Si viene motivoIgnorado, el archivo no se lee.
 * @returns {{ filas: object[], archivos: { revisados: number, usados: object[], ignorados: object[], repetidos: object[] } }}
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
    const resumen = new Map([...porCampana].map(([id, filas]) => [id, { ultimoEvento: ultimoEvento(filas), filas: filas.length }]))
    leidos.push({ ...e, porCampana, resumen, descartadas: r.descartadas, avisos: r.avisos })
  }

  // Para cada campaña: >0 si el archivo a tiene datos más actualizados que b.
  const masActualizado = (id) => (a, b) => {
    const ra = a.resumen.get(id), rb = b.resumen.get(id)
    return (ra.ultimoEvento ?? '').localeCompare(rb.ultimoEvento ?? '')
      || ra.filas - rb.filas
      || a.fechaModificacion - b.fechaModificacion
      || a.nombre.localeCompare(b.nombre)
  }
  const ganador = new Map()
  const copias = new Map() // id → archivos que traen esa campaña
  for (const archivo of leidos) {
    for (const id of archivo.porCampana.keys()) {
      if (!copias.has(id)) copias.set(id, [])
      copias.get(id).push(archivo)
      const actual = ganador.get(id)
      if (!actual || masActualizado(id)(archivo, actual) > 0) ganador.set(id, archivo)
    }
  }

  // Desglose de campañas repetidas: cuál se usó y cuáles copias se ignoraron (y por qué).
  const describir = (archivo, id) => ({
    archivo: archivo.nombre,
    ultimoEvento: archivo.resumen.get(id).ultimoEvento,
    filas: archivo.resumen.get(id).filas,
    fechaModificacion: new Date(archivo.fechaModificacion).toISOString(),
  })
  const repetidos = [...copias].filter(([, lista]) => lista.length > 1).map(([id, lista]) => {
    const usado = ganador.get(id)
    const ignoradas = lista.filter((a) => a !== usado).sort(masActualizado(id)).reverse()
    const criterio = (otro) => {
      const ru = usado.resumen.get(id), ro = otro.resumen.get(id)
      if ((ru.ultimoEvento ?? '') !== (ro.ultimoEvento ?? '')) return 'último evento más reciente'
      if (ru.filas !== ro.filas) return 'mismo último evento, más filas'
      if (usado.fechaModificacion !== otro.fechaModificacion) return 'datos iguales, fecha de modificación más reciente'
      return 'datos y fechas iguales, último por nombre'
    }
    return { campana: id, usado: describir(usado, id), ignorados: ignoradas.map((a) => ({ ...describir(a, id), criterio: criterio(a) })) }
  }).sort((a, b) => a.campana.localeCompare(b.campana, 'es', { numeric: true }))

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
        reemplazadas.push(`#${id} (se usa "${ganador.get(id).nombre}", datos más actualizados)`)
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
  return { filas, archivos: { revisados: entradas.length, usados, ignorados, repetidos } }
}
