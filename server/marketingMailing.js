/**
 * Marketing por canales — respuesta de /api/marketing/mailing.
 *
 * Une las 3 piezas (docs/marketing-canales/DECISIONES.md, D1):
 *   1. FUENTE   → filas estándar   (Google Drive o carpeta local; ver elegirFuente)
 *   2. CÁLCULOS → métricas         (server/marketingCanales/calculos.js)
 *   3. RUTA     → esta respuesta   (solo totales: sin correos, IPs ni datos personales)
 *
 * La usan:
 *   - api/marketing/mailing.js  (función de Vercel)
 *   - server.ts                 (desarrollo local y Docker/Coolify)
 */
import { calcularMailing } from './marketingCanales/calculos.js'
import { ErrorFuente } from './marketingCanales/errorFuente.js'
import { MINUTOS_CACHE_DRIVE, TIPO_FUENTE_DRIVE, obtenerFilasDrive } from './marketingCanales/fuenteDrive.js'
import { TIPO_FUENTE_LOCAL, obtenerFilasCarpetaLocal } from './marketingCanales/fuenteLocal.js'

const FILTROS_PAIS = {
  todos: null,
  GT: 'Guatemala',
  SV: 'El Salvador',
  'sin-pais': 'Desconocido',
}

const DESCRIPCION = {
  [TIPO_FUENTE_DRIVE]: 'Carpeta de Google Drive',
  [TIPO_FUENTE_LOCAL]: 'Carpeta local (solo en la computadora de desarrollo)',
}

/**
 * Elige la fuente según las variables de entorno del servidor (D15):
 * si Drive está configurado, gana Drive; si no, la carpeta local; si no hay ninguna, "no configurada".
 */
export function elegirFuente(env, fuenteDrive = obtenerFilasDrive) {
  const cuentaTexto = env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim()
  const carpetaId = env.MARKETING_DRIVE_FOLDER_ID?.trim()
  const carpetaLocal = env.MARKETING_LOCAL_CSV_DIR?.trim()

  if (cuentaTexto || carpetaId) {
    const falta = !cuentaTexto ? 'GOOGLE_SERVICE_ACCOUNT_JSON' : !carpetaId ? 'MARKETING_DRIVE_FOLDER_ID' : null
    if (falta) return { tipo: TIPO_FUENTE_DRIVE, error: `Google Drive está a medio configurar: falta ${falta}.` }
    return {
      tipo: TIPO_FUENTE_DRIVE,
      nota: carpetaLocal ? 'También hay una carpeta local configurada; cuando existen las dos, se usa Google Drive.' : null,
      obtener: ({ actualizar }) => fuenteDrive({ cuentaTexto, carpetaId, actualizar }),
    }
  }
  if (carpetaLocal) return { tipo: TIPO_FUENTE_LOCAL, nota: null, obtener: () => obtenerFilasCarpetaLocal(carpetaLocal) }
  return null
}

/**
 * Lee el filtro ?campanas=74,75 (D29). Vacío o ausente = todas. Devuelve un Set, null (todas) o { error }.
 */
export function leerFiltroCampanas(texto) {
  if (texto == null || String(texto).trim() === '') return null
  const ids = String(texto).split(',').map((x) => x.trim()).filter(Boolean)
  if (ids.length === 0 || ids.length > 500 || ids.some((id) => !/^[A-Za-z0-9_-]{1,40}$/.test(id))) {
    return { error: 'El parámetro campanas debe ser una lista de Campaign ID separados por comas (por ejemplo 74,75).' }
  }
  return new Set(ids)
}

/** Convierte el filtro visible del país a la categoría calculada desde el dominio. */
export function leerFiltroPais(texto) {
  if (texto == null || String(texto).trim() === '') return null
  const clave = String(texto).trim()
  return Object.prototype.hasOwnProperty.call(FILTROS_PAIS, clave)
    ? FILTROS_PAIS[clave]
    : { error: 'El parámetro pais debe ser todos, GT, SV o sin-pais.' }
}

/**
 * @param {{ method: string, actualizar?: boolean, campanas?: string, pais?: string }} pedido
 * @param {{ env?: object, fuenteDrive?: Function }} [opciones]  solo para pruebas
 */
export async function obtenerMailing({ method, actualizar = false, campanas, pais }, { env = process.env, fuenteDrive = obtenerFilasDrive } = {}) {
  if (method !== 'GET') return json(405, { error: 'Método no permitido. Usa GET.' })
  const soloCampanas = leerFiltroCampanas(campanas)
  if (soloCampanas?.error) return json(400, { error: soloCampanas.error })
  const paisElegido = leerFiltroPais(pais)
  if (paisElegido?.error) return json(400, { error: paisElegido.error })

  const fuente = elegirFuente(env, fuenteDrive)
  if (!fuente) {
    return json(200, {
      generado: new Date().toISOString(),
      fuente: {
        tipo: null,
        descripcion: null,
        configurada: false,
        mensaje: 'Fuente de datos no configurada. Configura Google Drive (GOOGLE_SERVICE_ACCOUNT_JSON y MARKETING_DRIVE_FOLDER_ID) o, en local, MARKETING_LOCAL_CSV_DIR.',
      },
      archivos: { revisados: 0, usados: [], ignorados: [] },
      ...calcularMailing([], { pais: paisElegido }),
    })
  }
  if (fuente.error) return json(500, { error: fuente.error, fuente: { tipo: fuente.tipo, configurada: false } })

  let resultado
  try {
    resultado = await fuente.obtener({ actualizar })
  } catch (error) {
    if (error instanceof ErrorFuente) return json(500, { error: error.message, fuente: { tipo: fuente.tipo, configurada: true } })
    console.error('[marketing/mailing] Error inesperado al leer la fuente:', error?.message)
    return json(500, { error: 'Error inesperado al leer la fuente de datos de mailing.' })
  }

  const respuesta = {
    generado: new Date().toISOString(),
    fuente: {
      tipo: resultado.tipo,
      descripcion: DESCRIPCION[resultado.tipo],
      configurada: true,
      mensaje: null,
      nota: fuente.nota,
      // Solo Drive usa caché: cuándo se leyó y cuándo vence (MINUTOS_CACHE_DRIVE).
      cache: resultado.cache ? { ...resultado.cache, minutos: MINUTOS_CACHE_DRIVE } : null,
    },
    archivos: resultado.archivos,
    ...calcularMailing(resultado.filas, { soloCampanas, pais: paisElegido }),
  }

  // Candado de privacidad: si por error algún texto trae un correo, no se envía nada.
  const body = JSON.stringify(respuesta)
  if (CORREO.test(body)) {
    console.error('[marketing/mailing] Bloqueado: la respuesta contenía un correo.')
    return json(500, { error: 'La respuesta se bloqueó porque incluía un dato personal. Revisa los nombres de archivos o campañas.' })
  }
  return { status: 200, contentType: 'application/json', body }
}

const CORREO = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/

function json(status, data) {
  return { status, contentType: 'application/json', body: JSON.stringify(data) }
}
