// Función de Vercel: GET /api/marketing/reuniones?offset=N
// Reenvía la consulta a Prospekt IA con la llave RED_API_KEY (solo servidor).
// Documentación: docs/marketing/README.md
import { obtenerPaginaReuniones } from '../../server/marketingReuniones.js'

export default async function handler(request, response) {
  const url = new URL(request.url, 'http://localhost')
  const resultado = await obtenerPaginaReuniones({
    method: request.method,
    offset: url.searchParams.get('offset'),
  })

  if (resultado.status === 405) response.setHeader('Allow', 'GET')
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Content-Type', resultado.contentType)
  return response.status(resultado.status).send(resultado.body)
}
