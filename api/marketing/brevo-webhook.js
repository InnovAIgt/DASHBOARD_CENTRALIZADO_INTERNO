// Función de Vercel: POST /api/marketing/brevo-webhook → avisos (webhooks de marketing) de Brevo.
// Protegida con la variable de servidor BREVO_WEBHOOK_SECRET; guarda en el proyecto Supabase
// «Dashboard Canales de marketing». Lógica en server/brevoWebhook.js.
import { procesarWebhookBrevo } from '../../server/brevoWebhook.js'

export default async function handler(request, response) {
  const resultado = await procesarWebhookBrevo({ method: request.method, headers: request.headers, body: request.body })
  for (const [clave, valor] of Object.entries(resultado.headers)) response.setHeader(clave, valor)
  return response.status(resultado.status).send(resultado.body)
}
