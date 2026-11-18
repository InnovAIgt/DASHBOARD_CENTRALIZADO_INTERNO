// Marketing por canales · detalle de personas (docs/marketing-canales/DECISIONES.md, D34 y D42).
import { obtenerDetalleMailing } from '../../server/marketingMailingDetalle.js'

export default async function handler(request, response) {
  const url = new URL(request.url, 'http://localhost')
  const resultado = await obtenerDetalleMailing({
    method: request.method,
    campana: url.searchParams.get('campana') ?? undefined,
    vista: url.searchParams.get('vista') ?? undefined,
    pais: url.searchParams.get('pais') ?? undefined,
    campanas: url.searchParams.has('campanas') ? url.searchParams.get('campanas') : undefined,
    desde: url.searchParams.get('desde') ?? undefined,
    hasta: url.searchParams.get('hasta') ?? undefined,
    cargos: url.searchParams.has('cargos') ? url.searchParams.get('cargos') : undefined,
    tarjeta: url.searchParams.get('tarjeta') ?? undefined,
  })
  if (resultado.status === 405) response.setHeader('Allow', 'GET')
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Content-Type', resultado.contentType)
  return response.status(resultado.status).send(resultado.body)
}
