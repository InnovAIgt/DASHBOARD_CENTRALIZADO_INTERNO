// Función de Vercel: GET /api/marketing/mantener-supabase → tarea diaria (cron de vercel.json, solo Production) para que
// el proyecto Supabase «Dashboard Canales de marketing» (Free) no se pause. Exige `Authorization: Bearer <CRON_SECRET>`.
// Lógica en server/mktMantener.js.
import { responderMantener } from '../../server/mktMantener.js'

export default async function handler(request, response) {
  const resultado = await responderMantener({ method: request.method, headers: request.headers })
  for (const [clave, valor] of Object.entries(resultado.headers)) response.setHeader(clave, valor)
  return response.status(resultado.status).send(resultado.body)
}
