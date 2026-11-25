// Función de Vercel: GET /api/marketing/redes/leads (Redes sociales, leads de Prospekt, solo lectura). Lógica en server/redes/leads.js.
import { responderLeadsRedes } from '../../../server/redes/leads.js'

export default async function handler(request, response) {
  const resultado = await responderLeadsRedes({ method: request.method })
  for (const [clave, valor] of Object.entries(resultado.headers)) response.setHeader(clave, valor)
  return response.status(resultado.status).send(resultado.body)
}
