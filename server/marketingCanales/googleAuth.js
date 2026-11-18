/**
 * Marketing por canales — permiso de Google con una CUENTA DE SERVICIO (sin librerías externas).
 *
 * 1. Lee la llave de GOOGLE_SERVICE_ACCOUNT_JSON (JSON tal cual o en base64).
 * 2. Firma un "JWT" con la llave privada (node:crypto) y lo cambia por un token de acceso de Google.
 * 3. Guarda el token hasta 5 minutos antes de que venza (~55 min).
 *
 * Permiso pedido: SOLO LECTURA de Drive. La llave nunca se muestra ni se registra.
 * Guía: docs/marketing-canales/CONFIGURAR_DRIVE.md
 */
import crypto from 'node:crypto'
import { ErrorFuente } from './errorFuente.js'

export const PERMISO_DRIVE_LECTURA = 'https://www.googleapis.com/auth/drive.readonly'
const URL_TOKEN = 'https://oauth2.googleapis.com/token'

/**
 * Convierte el texto de la variable en { client_email, private_key }.
 * Acepta el JSON descargado de Google tal cual, o el mismo JSON en base64 (un solo renglón).
 */
export function leerCuentaServicio(texto) {
  const limpio = String(texto ?? '').trim()
  let datos
  try {
    const json = limpio.startsWith('{') ? limpio : Buffer.from(limpio, 'base64').toString('utf8')
    datos = JSON.parse(json)
  } catch {
    throw new ErrorFuente('GOOGLE_SERVICE_ACCOUNT_JSON no es un JSON válido (ni en texto ni en base64). Vuelve a copiar la llave completa.')
  }
  if (!datos || typeof datos.client_email !== 'string' || typeof datos.private_key !== 'string') {
    throw new ErrorFuente('GOOGLE_SERVICE_ACCOUNT_JSON no parece la llave de una cuenta de servicio (faltan client_email o private_key).')
  }
  // Algunos paneles guardan los saltos de línea de la llave como "\n" literal.
  return { client_email: datos.client_email, private_key: datos.private_key.replace(/\\n/g, '\n') }
}

const base64url = (b) => Buffer.from(b).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')

/**
 * Crea un "pedidor" de tokens con su propia memoria (en las pruebas se le pasa un fetch simulado).
 */
export function crearAutorizador({ fetch = globalThis.fetch, ahora = () => Date.now() } = {}) {
  const guardados = new Map() // client_email + permiso → { token, vence }

  return async function obtenerToken(cuenta, permiso = PERMISO_DRIVE_LECTURA) {
    const clave = `${cuenta.client_email}|${permiso}`
    const guardado = guardados.get(clave)
    if (guardado && guardado.vence - 5 * 60 * 1000 > ahora()) return guardado.token

    const iat = Math.floor(ahora() / 1000)
    const cabecera = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
    const datos = base64url(JSON.stringify({ iss: cuenta.client_email, scope: permiso, aud: URL_TOKEN, iat, exp: iat + 3600 }))
    let firma
    try {
      firma = base64url(crypto.createSign('RSA-SHA256').update(`${cabecera}.${datos}`).sign(cuenta.private_key))
    } catch {
      throw new ErrorFuente('La llave privada de GOOGLE_SERVICE_ACCOUNT_JSON está dañada o incompleta. Vuelve a copiarla.')
    }

    let respuesta
    try {
      respuesta = await fetch(URL_TOKEN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: `${cabecera}.${datos}.${firma}`,
        }).toString(),
      })
    } catch {
      throw new ErrorFuente('No fue posible conectar con Google para obtener el permiso de Drive.')
    }
    if (!respuesta.ok) {
      throw new ErrorFuente(`Google rechazó la cuenta de servicio (error ${respuesta.status}). Revisa que la llave no esté revocada y que el reloj del servidor esté en hora.`)
    }
    const { access_token: token, expires_in: duracion = 3600 } = await respuesta.json()
    if (!token) throw new ErrorFuente('Google no entregó un permiso válido para Drive.')
    guardados.set(clave, { token, vence: ahora() + duracion * 1000 })
    return token
  }
}
