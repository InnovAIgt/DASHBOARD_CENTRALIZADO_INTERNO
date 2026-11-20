// Función de Vercel: GET /api/sac/historico → Edge Function sac-historico-semanal (variable de servidor SAC_HIST_URL).
// Solo lectura; el portal la usa para no chocar con CORS. Lógica en server/sacProxy.js.
import { reenviarSac } from '../../server/sacProxy.js'

export default async function handler(request, response) {
  const url = new URL(request.url, 'http://localhost')
  const resultado = await reenviarSac({ fuente: 'historico', method: request.method, query: url.search })
  for (const [clave, valor] of Object.entries(resultado.headers)) response.setHeader(clave, valor)
  return response.status(resultado.status).send(resultado.body)
}
