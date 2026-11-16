/**
 * Marketing por canales — respuesta de /api/marketing/mailing.
 *
 * Une las 3 piezas (docs/marketing-canales/DECISIONES.md, D1):
 *   1. FUENTE   → filas estándar   (hoy: carpeta local; Fase 2: Google Drive)
 *   2. CÁLCULOS → métricas         (server/marketingCanales/calculos.js)
 *   3. RUTA     → esta respuesta   (solo totales: sin correos, IPs ni datos personales)
 *
 * La usan:
 *   - api/marketing/mailing.js  (función de Vercel)
 *   - server.ts                 (desarrollo local y Docker/Coolify)
 */
import { calcularMailing } from './marketingCanales/calculos.js'
import { ErrorFuente, obtenerFilasCarpetaLocal } from './marketingCanales/fuenteLocal.js'

/** Elige la fuente según las variables de entorno del servidor. */
function elegirFuente() {
  const carpeta = process.env.MARKETING_LOCAL_CSV_DIR?.trim()
  if (carpeta) return { tipo: 'carpeta-local', obtener: () => obtenerFilasCarpetaLocal(carpeta) }
  return null
}

export async function obtenerMailing({ method }) {
  if (method !== 'GET') return json(405, { error: 'Método no permitido. Usa GET.' })

  const fuente = elegirFuente()
  if (!fuente) {
    return json(200, {
      generado: new Date().toISOString(),
      fuente: {
        tipo: null,
        configurada: false,
        mensaje: 'Fuente de datos no configurada. En local, define MARKETING_LOCAL_CSV_DIR en .env.local.',
      },
      archivos: { revisados: 0, usados: [], ignorados: [] },
      ...calcularMailing([]),
    })
  }

  let resultado
  try {
    resultado = await fuente.obtener()
  } catch (error) {
    if (error instanceof ErrorFuente) return json(500, { error: error.message, fuente: { tipo: fuente.tipo, configurada: true } })
    console.error('[marketing/mailing] Error inesperado al leer la fuente:', error?.message)
    return json(500, { error: 'Error inesperado al leer la fuente de datos de mailing.' })
  }

  const respuesta = {
    generado: new Date().toISOString(),
    fuente: { tipo: resultado.tipo, configurada: true, mensaje: null },
    archivos: resultado.archivos,
    ...calcularMailing(resultado.filas),
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
