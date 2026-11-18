/**
 * Redes sociales — respuesta de GET /api/marketing/redes (docs/marketing-redes/README.md).
 *
 * Une las piezas:
 *   1. FUENTE        → bytes del Excel          (server/marketingRedes/fuente.js, intercambiable)
 *   2. LECTOR        → filas limpias            (server/marketingRedes/lector.js)
 *   3. ADVERTENCIAS  → "datos a revisar"        (server/marketingRedes/advertencias.js)
 *   4. RUTA          → esta respuesta (JSON). Los cálculos los hace la pantalla con
 *                      src/modulos/marketing/redes/logica/calculos.js (estados según la fecha de hoy).
 *
 * La usan api/marketing/redes.js (Vercel) y server.ts (local y Docker).
 * El resultado se guarda en memoria (caché) para no leer el Excel en cada visita.
 */
import { leerExcelRRSS } from './marketingRedes/lector.js'
import { detectarAdvertencias } from './marketingRedes/advertencias.js'
import { ErrorFuenteRRSS, obtenerArchivoRRSS } from './marketingRedes/fuente.js'

export const MINUTOS_CACHE = 10
const MENSAJE_SIN_DATOS = 'No hay datos de Redes sociales disponibles.'

let cache = null // { guardado: ms, cuerpo: objeto }

/** Procesa los bytes del Excel (sin importar de dónde vinieron). */
export function procesarArchivo({ bytes, actualizado, origen }) {
  const lectura = leerExcelRRSS(bytes)
  if (!lectura.filas.length) throw new ErrorFuenteRRSS(MENSAJE_SIN_DATOS)
  const { filas, generales, conteo } = detectarAdvertencias(lectura.filas, lectura.totalesExcel)
  return {
    actualizado,
    origen,
    hojas: lectura.hojas,
    filas,
    totalesExcel: lectura.totalesExcel,
    advertencias: { generales, conteo, lectura: lectura.advertenciasLectura },
  }
}

const respuesta = (status, cuerpo) => ({ status, contentType: 'application/json; charset=utf-8', body: JSON.stringify(cuerpo) })

/**
 * @param {{ method?: string, fuente?: () => Promise<{bytes, actualizado, origen}>, sinCache?: boolean, ahora?: number }} opciones
 *   fuente: se puede reemplazar (pruebas o el servicio de Microsoft 365) sin tocar nada más.
 */
export async function obtenerRedes({ method = 'GET', fuente = obtenerArchivoRRSS, sinCache = false, ahora = Date.now() } = {}) {
  if (method !== 'GET') return respuesta(405, { error: 'Método no permitido.' })
  if (!sinCache && cache && ahora - cache.guardado < MINUTOS_CACHE * 60_000) return respuesta(200, cache.cuerpo)

  try {
    const cuerpo = procesarArchivo(await fuente())
    if (!sinCache) cache = { guardado: ahora, cuerpo }
    return respuesta(200, cuerpo)
  } catch (error) {
    // Nunca se muestran detalles técnicos ni rutas: solo un mensaje claro.
    if (!(error instanceof ErrorFuenteRRSS)) console.error('[Redes sociales] No se pudo leer el Excel:', error?.message)
    return respuesta(503, { error: MENSAJE_SIN_DATOS, detalle: error instanceof ErrorFuenteRRSS ? error.message : 'El archivo de métricas no se pudo leer.' })
  }
}

/** Solo para pruebas: vacía la caché. */
export const limpiarCacheRedes = () => { cache = null }
