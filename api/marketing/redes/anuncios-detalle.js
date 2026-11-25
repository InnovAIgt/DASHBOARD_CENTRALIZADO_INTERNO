// Función de Vercel: GET /api/marketing/redes/anuncios-detalle (Redes sociales, Anuncios fase 2, solo lectura de Meta). Lógica en server/redes/rutas.js.
import { responderRedes } from '../../../server/redes/rutas.js'

export default async function handler(request, response) {
  const url = new URL(request.url, 'http://localhost')
  const resultado = await responderRedes({ recurso: 'anuncios-detalle', method: request.method, query: { mes: url.searchParams.get('mes') ?? '' } })
  for (const [clave, valor] of Object.entries(resultado.headers)) response.setHeader(clave, valor)
  return response.status(resultado.status).send(resultado.body)
}
