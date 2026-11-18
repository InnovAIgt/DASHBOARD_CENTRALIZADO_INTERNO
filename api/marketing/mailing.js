// Marketing por canales · métricas de mailing (docs/marketing-canales/README.md).
// En local y en Docker esta misma ruta la atiende server.ts.
import { obtenerMailing } from '../../server/marketingMailing.js'

export default async function handler(request, response) {
  const url = new URL(request.url, 'http://localhost')
  const resultado = await obtenerMailing({
    method: request.method,
    actualizar: url.searchParams.get('actualizar') === '1',
    campanas: url.searchParams.get('campanas') ?? undefined,
    pais: url.searchParams.get('pais') ?? undefined,
  })
  if (resultado.status === 405) response.setHeader('Allow', 'GET')
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Content-Type', resultado.contentType)
  return response.status(resultado.status).send(resultado.body)
}
