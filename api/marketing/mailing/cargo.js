// Función de Vercel: POST / DELETE /api/marketing/mailing/cargo → guardar cargo y objetivo de una campaña con la clave de
// Marketing (sin inicio de sesión; decisión de Keily, docs/marketing/v2/DECISIONES.md). Solo escribe en
// mkt_campana_cargo. Lógica en server/mailing/cargoEditar.js.
import { responderCargo } from '../../../server/mailing/cargoEditar.js'

export default async function handler(request, response) {
  const ip = String(request.headers['x-forwarded-for'] ?? request.socket?.remoteAddress ?? 'desconocida').split(',')[0].trim()
  let body = request.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
  const resultado = await responderCargo({ method: request.method, body: body ?? {}, ip })
  for (const [clave, valor] of Object.entries(resultado.headers)) response.setHeader(clave, valor)
  return response.status(resultado.status).send(resultado.body)
}
