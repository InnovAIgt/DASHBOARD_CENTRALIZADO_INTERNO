/**
 * Marketing por canales — FUENTE: carpeta de Google Drive con CSV de Brevo.
 *
 * Variables (solo servidor): GOOGLE_SERVICE_ACCOUNT_JSON y MARKETING_DRIVE_FOLDER_ID.
 * La cuenta de servicio solo LEE la carpeta (permiso Lector + permiso drive.readonly).
 *
 * - Lista los archivos de la carpeta (no subcarpetas), en "Mi unidad" o en unidades compartidas.
 * - Descarga los .csv y los pasa a combinarArchivosBrevo(): mismas reglas que la carpeta local.
 * - Caché de 15 minutos del resultado. Al refrescar, solo descarga los archivos que cambiaron.
 * - `actualizar: true` ignora la caché (ruta: /api/marketing/mailing?actualizar=1).
 * - Los errores no se guardan en caché.
 *
 * Toda fuente devuelve lo mismo: { tipo, filas (formato estándar), archivos (resumen) }.
 * Guía de configuración: docs/marketing-canales/CONFIGURAR_DRIVE.md
 */
import { combinarArchivosBrevo } from './combinarArchivos.js'
import { ErrorFuente } from './errorFuente.js'
import { crearAutorizador, leerCuentaServicio } from './googleAuth.js'

export const TIPO_FUENTE_DRIVE = 'google-drive'
export const MINUTOS_CACHE_DRIVE = 15

const API_DRIVE = 'https://www.googleapis.com/drive/v3/files'
const DESCARGAS_A_LA_VEZ = 5

const TIPO_CARPETA = 'application/vnd.google-apps.folder'
const TIPO_HOJA_GOOGLE = 'application/vnd.google-apps.spreadsheet'

/** Motivo para no leer un archivo de Drive, o null si es un .csv que se debe leer. */
function motivoParaIgnorar(archivo) {
  if (archivo.mimeType === TIPO_CARPETA) return 'Es una carpeta: no se leen subcarpetas.'
  if (archivo.mimeType === TIPO_HOJA_GOOGLE) return 'Es una hoja de Google, no un CSV: sube el CSV original de Brevo (sin convertirlo).'
  if (archivo.mimeType?.startsWith('application/vnd.google-apps.')) return 'Es un documento de Google, no un CSV.'
  if (archivo.name.startsWith('.') || archivo.name.startsWith('~$')) return 'Archivo oculto o temporal.'
  if (!archivo.name.toLowerCase().endsWith('.csv')) return 'No es un archivo .csv.'
  return null
}

/**
 * Crea la fuente de Drive con su propia memoria (caché). En las pruebas se le pasa un fetch simulado.
 */
export function crearFuenteDrive({ fetch = globalThis.fetch, ahora = () => Date.now() } = {}) {
  const obtenerToken = crearAutorizador({ fetch, ahora })
  let cache = null // { clave, resultado, leidoEn, vence }
  const contenidos = new Map() // id de archivo → { modifiedTime, contenido }

  async function pedirDrive(url, token, que) {
    let respuesta
    try {
      respuesta = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    } catch {
      throw new ErrorFuente('No fue posible conectar con Google Drive.')
    }
    if (respuesta.ok) return respuesta
    if (que === 'carpeta' && respuesta.status === 404) {
      throw new ErrorFuente('No se encontró la carpeta de Drive: revisa MARKETING_DRIVE_FOLDER_ID y que la carpeta esté compartida con la cuenta de servicio como Lector.')
    }
    if (que === 'carpeta' && respuesta.status === 403) {
      throw new ErrorFuente('Drive negó el acceso: revisa que la API de Google Drive esté activada en el proyecto de Google Cloud y que la carpeta esté compartida con la cuenta de servicio.')
    }
    if (que === 'carpeta') throw new ErrorFuente(`Google Drive respondió con error ${respuesta.status} al listar la carpeta.`)
    return respuesta // error al descargar un archivo: se decide afuera
  }

  async function listarCarpeta(carpetaId, token) {
    const archivos = []
    let pagina = ''
    do {
      const params = new URLSearchParams({
        q: `'${carpetaId}' in parents and trashed = false`,
        fields: 'nextPageToken, files(id, name, mimeType, modifiedTime)',
        pageSize: '1000',
        supportsAllDrives: 'true',
        includeItemsFromAllDrives: 'true',
        ...(pagina ? { pageToken: pagina } : {}),
      })
      const datos = await (await pedirDrive(`${API_DRIVE}?${params}`, token, 'carpeta')).json()
      archivos.push(...(datos.files ?? []))
      pagina = datos.nextPageToken ?? ''
    } while (pagina)
    return archivos
  }

  /** Descarga un archivo, o reutiliza el que ya se tenía si no cambió en Drive. */
  async function contenidoDe(archivo, token) {
    const guardado = contenidos.get(archivo.id)
    if (guardado && guardado.modifiedTime === archivo.modifiedTime) return { contenido: guardado.contenido, descargado: false }
    const respuesta = await pedirDrive(`${API_DRIVE}/${encodeURIComponent(archivo.id)}?alt=media&supportsAllDrives=true`, token, 'archivo')
    if (!respuesta.ok) return { error: `No se pudo descargar de Drive (error ${respuesta.status}).` }
    const contenido = Buffer.from(await respuesta.arrayBuffer())
    contenidos.set(archivo.id, { modifiedTime: archivo.modifiedTime, contenido })
    return { contenido, descargado: true }
  }

  return async function obtenerFilasDrive({ cuentaTexto, carpetaId, actualizar = false }) {
    if (!/^[A-Za-z0-9_-]+$/.test(carpetaId)) {
      throw new ErrorFuente('MARKETING_DRIVE_FOLDER_ID no es válido: copia solo el código de la carpeta (lo que va después de /folders/ en el enlace).')
    }
    const cuenta = leerCuentaServicio(cuentaTexto)
    const clave = `${cuenta.client_email}|${carpetaId}`

    if (!actualizar && cache && cache.clave === clave && cache.vence > ahora()) {
      return { ...cache.resultado, cache: { usada: true, leidoEn: cache.leidoEn, venceEn: new Date(cache.vence).toISOString() } }
    }

    const token = await obtenerToken(cuenta)
    const lista = await listarCarpeta(carpetaId, token)

    const entradas = []
    const porDescargar = []
    for (const archivo of lista) {
      const fechaModificacion = Date.parse(archivo.modifiedTime) || 0
      const motivo = motivoParaIgnorar(archivo)
      if (motivo) entradas.push({ nombre: archivo.name, fechaModificacion, motivoIgnorado: motivo })
      else porDescargar.push({ archivo, fechaModificacion })
    }

    let descargados = 0
    let fallaronDescargas = false
    for (let i = 0; i < porDescargar.length; i += DESCARGAS_A_LA_VEZ) {
      const grupo = porDescargar.slice(i, i + DESCARGAS_A_LA_VEZ)
      const resultados = await Promise.all(grupo.map(({ archivo }) => contenidoDe(archivo, token)))
      grupo.forEach(({ archivo, fechaModificacion }, j) => {
        const r = resultados[j]
        if (r.error) { fallaronDescargas = true; entradas.push({ nombre: archivo.name, fechaModificacion, motivoIgnorado: r.error }); return }
        if (r.descargado) descargados += 1
        entradas.push({ nombre: archivo.name, fechaModificacion, contenido: r.contenido })
      })
    }

    // Se olvidan los archivos que ya no están en la carpeta.
    const vigentes = new Set(lista.map((a) => a.id))
    for (const id of contenidos.keys()) if (!vigentes.has(id)) contenidos.delete(id)

    const resultado = { tipo: TIPO_FUENTE_DRIVE, ...combinarArchivosBrevo(entradas) }
    const leidoEn = new Date(ahora()).toISOString()
    const vence = ahora() + MINUTOS_CACHE_DRIVE * 60 * 1000
    // Si alguna descarga falló, no se guarda: el próximo pedido vuelve a intentar.
    cache = fallaronDescargas ? null : { clave, resultado, leidoEn, vence }
    return {
      ...resultado,
      cache: { usada: false, leidoEn, venceEn: fallaronDescargas ? null : new Date(vence).toISOString(), archivosDescargados: descargados },
    }
  }
}

/** Instancia única del servidor (la caché vive mientras el proceso esté encendido). */
export const obtenerFilasDrive = crearFuenteDrive()
