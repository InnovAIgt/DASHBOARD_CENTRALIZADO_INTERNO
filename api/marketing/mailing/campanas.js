// Función de Vercel: GET /api/marketing/mailing/campanas → campañas de Brevo con sus totales (sin datos personales).
// Lógica en server/mailing/campanas.js.
import { responderCampanas } from '../../../server/mailing/campanas.js'

export default async function handler(request, response) {
  const resultado = await responderCampanas({ method: request.method })
  for (const [clave, valor] of Object.entries(resultado.headers)) response.setHeader(clave, valor)
  return response.status(resultado.status).send(resultado.body)
}
