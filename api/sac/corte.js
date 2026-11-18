// Función de Vercel: GET /api/sac/corte → Edge Function sac-corte-publico (variable de servidor SAC_CORTE_URL).
// Solo lectura; el portal la usa para no chocar con CORS. Lógica en server/sacProxy.js.
import { reenviarSac } from '../../server/sacProxy.js'

export default async function handler(request, response) {
  const url = new URL(request.url, 'http://localhost')
  const resultado = await reenviarSac({ fuente: 'corte', method: request.method, query: url.search })
  for (const [clave, valor] of Object.entries(resultado.headers)) response.setHeader(clave, valor)
  return response.status(resultado.status).send(resultado.body)
}
