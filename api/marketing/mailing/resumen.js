// Función de Vercel: GET /api/marketing/mailing/resumen → conteos de los eventos del webhook (nunca correos).
// Lógica en server/mailing/resumen.js.
import { responderResumen } from '../../../server/mailing/resumen.js'

export default async function handler(request, response) {
  const url = new URL(request.url, 'http://localhost')
  const resultado = await responderResumen({ method: request.method, query: { campanas: url.searchParams.get('campanas') ?? '' } })
  for (const [clave, valor] of Object.entries(resultado.headers)) response.setHeader(clave, valor)
  return response.status(resultado.status).send(resultado.body)
}
