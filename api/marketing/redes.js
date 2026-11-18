// Función de Vercel: GET /api/marketing/redes (Dashboard de Redes sociales).
// En local y en Docker esta misma ruta la atiende server.ts.
// El Excel viaja con esta función gracias a "includeFiles" en vercel.json.
// Documentación: docs/marketing-redes/README.md
import { obtenerRedes } from '../../server/marketingRedes.js'

export default async function handler(request, response) {
  const resultado = await obtenerRedes({ method: request.method })
  if (resultado.status === 405) response.setHeader('Allow', 'GET')
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Content-Type', resultado.contentType)
  return response.status(resultado.status).send(resultado.body)
}
