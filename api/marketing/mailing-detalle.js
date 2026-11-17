// Marketing por canales · lista por persona de una campaña (docs/marketing-canales/DECISIONES.md, D34).
// Protegida con MARKETING_DETALLE_CLAVE (encabezado X-Marketing-Clave). En local la atiende server.ts.
import { ipDe, obtenerDetalleMailing } from '../../server/marketingMailingDetalle.js'

export default async function handler(request, response) {
  const url = new URL(request.url, 'http://localhost')
  const resultado = await obtenerDetalleMailing({
    method: request.method,
    campana: url.searchParams.get('campana') ?? undefined,
    vista: url.searchParams.get('vista') ?? undefined,
    clave: request.headers['x-marketing-clave'],
    ip: ipDe(request.headers, request.socket?.remoteAddress),
  })
  if (resultado.status === 405) response.setHeader('Allow', 'GET')
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Content-Type', resultado.contentType)
  return response.status(resultado.status).send(resultado.body)
}
