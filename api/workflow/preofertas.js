// Función de Vercel: GET /api/workflow/preofertas (Flash de altas y Activaciones).
// La llave de Workflow va en WORKFLOW_API_KEY (solo servidor). En local y Docker esta misma ruta
// la atiende server.ts. Documentación: docs/ventas-flash-altas/README.md
import { obtenerPreofertas } from '../../server/workflowPreofertas.js'

export default async function handler(request, response) {
  const resultado = await obtenerPreofertas({ method: request.method })
  if (resultado.status === 405) response.setHeader('Allow', 'GET')
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Content-Type', resultado.contentType)
  return response.status(resultado.status).send(resultado.body)
}
