// Marketing por canales · métricas de mailing (docs/marketing-canales/README.md).
// En local y en Docker esta misma ruta la atiende server.ts.
import { obtenerMailing } from '../../server/marketingMailing.js'

export default async function handler(request, response) {
  const resultado = await obtenerMailing({ method: request.method })
  if (resultado.status === 405) response.setHeader('Allow', 'GET')
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Content-Type', resultado.contentType)
  return response.status(resultado.status).send(resultado.body)
}
