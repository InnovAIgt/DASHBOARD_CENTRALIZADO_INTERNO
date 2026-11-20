import { getDispatchData } from '../server/bodega-despachos.mjs';
export const config = { maxDuration: 300 };
export default async function handler(req, res) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'Método no permitido' }); }
  const country = String(req.query?.pais || 'combined');
  if (!['combined','GT','SV'].includes(country)) return res.status(400).json({ error: 'País inválido' });
  res.setHeader('Cache-Control', 'no-store');
  try {
    const data = await getDispatchData({ country });
    return res.status(data.paises.some(pais => pais.ok) ? 200 : 502).json(data);
  } catch (error) { return res.status(503).json({ error: error.message }); }
}
