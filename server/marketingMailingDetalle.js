/**
 * Marketing por canales — respuesta de /api/marketing/mailing-detalle (D34).
 *
 * ⚠️ Entrega CORREOS DE CLIENTES de UNA campaña. Por eso, a diferencia de /api/marketing/mailing:
 * - exige la clave MARKETING_DETALLE_CLAVE (solo servidor, mínimo 24 caracteres), enviada en el
 *   encabezado X-Marketing-Clave (nunca en la dirección);
 * - frena los intentos repetidos: 1 s de espera por clave incorrecta y, con 5 fallos en 15 min,
 *   bloquea 15 min esa conexión. En Vercel la cuenta vive en la memoria de cada copia de la
 *   función (no es exacta); por eso la clave debe ser larga;
 * - nunca escribe correos ni la clave en los registros; no guarda nada en archivos;
 * - responde siempre con Cache-Control: no-store.
 *
 * La usan:
 *   - api/marketing/mailing-detalle.js  (función de Vercel)
 *   - server.ts                         (desarrollo local)
 */
import crypto from 'node:crypto'
import { armarDetallePersonas } from './marketingCanales/detallePersonas.js'
import { ErrorFuente } from './marketingCanales/errorFuente.js'
import { obtenerFilasDrive } from './marketingCanales/fuenteDrive.js'
import { elegirFuente } from './marketingMailing.js'

export const LARGO_MINIMO_CLAVE = 24
export const MAXIMO_FALLOS = 5
export const MINUTOS_VENTANA = 15
export const MINUTOS_BLOQUEO = 15
export const ESPERA_FALLO_MS = 1000

const VISTAS = ['metricas', 'totalBrevo']

/** Compara dos textos sin revelar cuánto se parecen (mismo tiempo para cualquier intento). */
function mismaClave(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest()
  const hb = crypto.createHash('sha256').update(String(b)).digest()
  return crypto.timingSafeEqual(ha, hb)
}

/**
 * Crea el servicio con su propia memoria de intentos (en las pruebas se le pasan reloj, espera y fuente).
 */
export function crearDetalleMailing({ ahora = () => Date.now(), esperar = (ms) => new Promise((r) => setTimeout(r, ms)), fuenteDrive = obtenerFilasDrive } = {}) {
  const intentos = new Map() // conexión → { fallos: [ms], bloqueadoHasta: ms }

  function estadoDe(ip) {
    const e = intentos.get(ip) ?? { fallos: [], bloqueadoHasta: 0 }
    e.fallos = e.fallos.filter((t) => t > ahora() - MINUTOS_VENTANA * 60 * 1000)
    intentos.set(ip, e)
    return e
  }

  return async function obtenerDetalleMailing({ method, campana, vista, clave, ip = 'desconocida' }, { env = process.env } = {}) {
    if (method !== 'GET') return json(405, { error: 'Método no permitido. Usa GET.' })

    const claveServidor = env.MARKETING_DETALLE_CLAVE ?? ''
    if (!claveServidor) {
      return json(503, { error: 'No disponible: falta configurar MARKETING_DETALLE_CLAVE en el servidor.', motivo: 'sin-clave' })
    }
    if (claveServidor.length < LARGO_MINIMO_CLAVE) {
      console.warn(`[marketing/mailing-detalle] MARKETING_DETALLE_CLAVE es demasiado corta (mínimo ${LARGO_MINIMO_CLAVE} caracteres). La lista por persona queda deshabilitada.`)
      return json(503, { error: `No disponible: la clave configurada en el servidor es demasiado corta (mínimo ${LARGO_MINIMO_CLAVE} caracteres).`, motivo: 'clave-corta' })
    }

    const estado = estadoDe(ip)
    if (estado.bloqueadoHasta > ahora()) {
      const minutos = Math.ceil((estado.bloqueadoHasta - ahora()) / 60000)
      return json(429, { error: `Demasiados intentos con clave incorrecta. Espera ${minutos} minuto${minutos === 1 ? '' : 's'}.`, motivo: 'bloqueado' })
    }
    if (!clave || !mismaClave(clave, claveServidor)) {
      estado.fallos.push(ahora())
      if (estado.fallos.length >= MAXIMO_FALLOS) {
        estado.bloqueadoHasta = ahora() + MINUTOS_BLOQUEO * 60 * 1000
        estado.fallos = []
      }
      await esperar(ESPERA_FALLO_MS)
      return json(401, { error: clave ? 'Clave incorrecta.' : 'Escribe la clave para ver la lista por persona.', motivo: 'clave' })
    }
    estado.fallos = []

    if (!/^[A-Za-z0-9_-]{1,40}$/.test(String(campana ?? ''))) return json(400, { error: 'Falta el parámetro campana (Campaign ID).' })
    const vistaElegida = vista ?? 'metricas'
    if (!VISTAS.includes(vistaElegida)) return json(400, { error: 'El parámetro vista debe ser metricas o totalBrevo.' })

    const fuente = elegirFuente(env, fuenteDrive)
    if (!fuente) return json(503, { error: 'Fuente de datos no configurada.', motivo: 'sin-fuente' })
    if (fuente.error) return json(500, { error: fuente.error })

    let resultado
    try {
      resultado = await fuente.obtener({ actualizar: false })
    } catch (error) {
      if (error instanceof ErrorFuente) return json(500, { error: error.message })
      console.error('[marketing/mailing-detalle] Error inesperado al leer la fuente.')
      return json(500, { error: 'Error inesperado al leer la fuente de datos de mailing.' })
    }

    const detalle = armarDetallePersonas(resultado.filas, String(campana), vistaElegida)
    if (!detalle) return json(404, { error: `No se encontró la campaña #${campana}.` })
    if (detalle.excluida) return json(409, { error: `La campaña #${campana} está excluida: ${detalle.motivo}`, motivo: 'excluida' })

    return json(200, {
      generado: new Date(ahora()).toISOString(),
      leidoEn: resultado.cache?.leidoEn ?? new Date(ahora()).toISOString(),
      ...detalle,
    })
  }
}

/** Instancia única del servidor (la memoria de intentos vive mientras el proceso esté encendido). */
export const obtenerDetalleMailing = crearDetalleMailing()

/**
 * Conexión que hace el pedido (para el freno de intentos). En Vercel, x-real-ip la pone Vercel
 * (el visitante no puede cambiarla); si no está, la primera de x-forwarded-for; en local, la del socket.
 * No se guarda en ningún archivo ni se envía al navegador.
 */
export function ipDe(headers, respaldo) {
  const real = String(headers?.['x-real-ip'] ?? '').trim()
  const reenviada = String(headers?.['x-forwarded-for'] ?? '').split(',')[0].trim()
  return real || reenviada || respaldo || 'desconocida'
}

function json(status, data) {
  return { status, contentType: 'application/json', body: JSON.stringify(data) }
}
