// Función de Vercel: GET /api/marketing/mailing/leads → leads calificados de Prospekt atribuidos a campañas.
// Solo lectura (Prospekt con PROSPEKT_API_KEY, eventos de Brevo en Supabase y Cumplimiento). Nunca devuelve correo ni
// teléfono del lead. Lógica en server/mailing/leads.js.
import { responderLeads } from '../../../server/mailing/leads.js'

export default async function handler(request, response) {
  const resultado = await responderLeads({ method: request.method })
  for (const [clave, valor] of Object.entries(resultado.headers)) response.setHeader(clave, valor)
  return response.status(resultado.status).send(resultado.body)
}
