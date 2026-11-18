/**
 * Marketing por canales — respuesta de /api/marketing/mailing-detalle (D34, D42).
 *
 * ⚠️ Entrega CORREOS DE CLIENTES. No requiere una clave adicional; la interfaz y la ruta usan la
 * fuente de mailing configurada. Nunca escribe correos en registros ni guarda datos en archivos.
 * - responde siempre con Cache-Control: no-store.
 *
 * La usan:
 *   - api/marketing/mailing-detalle.js  (función de Vercel)
 *   - server.ts                         (desarrollo local)
 */
import { armarDetallePersonas, armarInformeMailing } from './marketingCanales/detallePersonas.js'
import { ErrorFuente } from './marketingCanales/errorFuente.js'
import { obtenerFilasDrive } from './marketingCanales/fuenteDrive.js'
import { CARGOS, SIN_CARGO } from './marketingCanales/reglas.js'
import { elegirFuente, leerFiltroCampanas, leerFiltroPais } from './marketingMailing.js'

const VISTAS = ['metricas', 'totalBrevo']
const TARJETAS = ['entregados', 'rebotesPermanentes', 'rebotesTemporales', 'soloAperturaAutomatica', 'bajas', 'quejas', 'aperturas', 'clics']
const CARGOS_VALIDOS = new Set([...CARGOS.map((c) => c.cargo), SIN_CARGO])

/**
 * Crea el servicio de detalle (en las pruebas se le pasan reloj y fuente).
 */
export function crearDetalleMailing({ ahora = () => Date.now(), fuenteDrive = obtenerFilasDrive } = {}) {
  return async function obtenerDetalleMailing({ method, campana, vista, pais, campanas, desde, hasta, cargos, tarjeta }, { env = process.env } = {}) {
    if (method !== 'GET') return json(405, { error: 'Método no permitido. Usa GET.' })

    const vistaElegida = vista ?? 'metricas'
    if (!VISTAS.includes(vistaElegida)) return json(400, { error: 'El parámetro vista debe ser metricas o totalBrevo.' })
    const paisElegido = leerFiltroPais(pais)
    if (paisElegido?.error) return json(400, { error: paisElegido.error })

    const informe = campana == null
    let filtroCampanas = null
    let filtroCargos = null
    if (informe) {
      if (campanas !== undefined) {
        filtroCampanas = String(campanas).trim() === '' ? new Set() : leerFiltroCampanas(campanas)
        if (filtroCampanas?.error) return json(400, { error: filtroCampanas.error })
      }
      if (cargos !== undefined) {
        const valores = String(cargos).trim() === '' ? [] : String(cargos).split(',').map((x) => x.trim())
        if (valores.some((c) => !CARGOS_VALIDOS.has(c))) return json(400, { error: 'El parámetro cargos contiene un cargo no reconocido.' })
        filtroCargos = new Set(valores)
      }
      if ((desde && !fechaValida(desde)) || (hasta && !fechaValida(hasta))) return json(400, { error: 'Las fechas desde y hasta deben tener el formato AAAA-MM-DD.' })
      if (desde && hasta && desde > hasta) return json(400, { error: 'La fecha desde no puede ser posterior a hasta.' })
      if (tarjeta != null && !TARJETAS.includes(tarjeta)) return json(400, { error: 'El parámetro tarjeta no es válido.' })
    } else if (!/^[A-Za-z0-9_-]{1,40}$/.test(String(campana))) {
      return json(400, { error: 'Falta el parámetro campana (Campaign ID).' })
    }

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

    if (informe) {
      const detalle = armarInformeMailing(resultado.filas, {
        vista: vistaElegida,
        pais: paisElegido,
        campanas: filtroCampanas,
        desde: desde ?? null,
        hasta: hasta ?? null,
        cargos: filtroCargos,
        tarjeta: tarjeta ?? null,
      })
      if (!detalle.tarjetaValida) return json(400, { error: 'El parámetro tarjeta no es válido.' })
      return json(200, {
        generado: new Date(ahora()).toISOString(),
        leidoEn: resultado.cache?.leidoEn ?? new Date(ahora()).toISOString(),
        ...detalle,
      })
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

function fechaValida(texto) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(texto))) return false
  const [anio, mes, dia] = texto.split('-').map(Number)
  const fecha = new Date(Date.UTC(anio, mes - 1, dia))
  return fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia
}

/** Instancia única del servidor (la memoria de intentos vive mientras el proceso esté encendido). */
export const obtenerDetalleMailing = crearDetalleMailing()

function json(status, data) {
  return { status, contentType: 'application/json', body: JSON.stringify(data) }
}
