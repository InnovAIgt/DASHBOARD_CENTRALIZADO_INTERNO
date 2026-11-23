// Función de Vercel: GET /api/marketing/mailing/detalle → detalle por correo (estado, CORREGIR/MANTENER, indicación…).
// Muestra correos sin inicio de sesión por decisión de Keily (docs/marketing/v2/DECISIONES.md); interruptor
// MKT_MOSTRAR_CORREOS (por defecto «si»). Lógica en server/mailing/detalle.js.
import { responderDetalle } from '../../../server/mailing/detalle.js'

export default async function handler(request, response) {
  const url = new URL(request.url, 'http://localhost')
  const resultado = await responderDetalle({ method: request.method, query: { campanas: url.searchParams.get('campanas') ?? '' } })
  for (const [clave, valor] of Object.entries(resultado.headers)) response.setHeader(clave, valor)
  return response.status(resultado.status).send(resultado.body)
}
