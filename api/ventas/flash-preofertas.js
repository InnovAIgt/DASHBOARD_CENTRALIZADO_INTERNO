// GET /api/ventas/flash-preofertas — proxy seguro hacia Workflow.
import { obtenerPreofertas } from '../../server/flashPreofertas.js';

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('X-Content-Type-Options', 'nosniff');

  const resultado = await obtenerPreofertas({ method: request.method });
  if (resultado.status === 405) response.setHeader('Allow', 'GET');
  return response.status(resultado.status).json(resultado.body);
}
