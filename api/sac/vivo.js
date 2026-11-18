// Función de Vercel: GET /api/sac/vivo → Edge Function sac-vivo-publico (variable de servidor SAC_VIVO_URL).
// Solo lectura; el portal la usa para no chocar con CORS. Lógica en server/sacProxy.js.
import { reenviarSac } from '../../server/sacProxy.js'

export default async function handler(request, response) {
  const url = new URL(request.url, 'http://localhost')
  const resultado = await reenviarSac({ fuente: 'vivo', method: request.method, query: url.search })
  for (const [clave, valor] of Object.entries(resultado.headers)) response.setHeader(clave, valor)
  return response.status(resultado.status).send(resultado.body)
}
