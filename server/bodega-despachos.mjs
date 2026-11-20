import { construirUniverso, calcularSla, FECHA_INICIO_REPORTE, hoyEnPais } from '../public/assets/js/despachos-reglas.js';

const COUNTRIES = { GT: { codigo: 'GT', nombre: 'Guatemala', moneda: 'GTQ' }, SV: { codigo: 'SV', nombre: 'El Salvador', moneda: 'USD' } };
export async function getDispatchData({ country = 'combined', fetchImpl = fetch, env = process.env, today = hoyEnPais('America/El_Salvador') } = {}) {
  if (!['combined', 'GT', 'SV'].includes(country)) throw new Error('País inválido');
  const apiKey = env.SAP_API_KEY || env.VITE_SAP_API_KEY;
  if (!apiKey) throw new Error('Falta configurar SAP_API_KEY en el servidor');
  const base = (env.SAP_API_URL || env.VITE_SAP_API_URL || 'https://sapapi.red.com.sv/api').replace(/\/$/, '');
  async function list(path, params) {
    const url = new URL(base + '/Procesos/' + path);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));
    const response = await fetchImpl(url, { headers: { Accept: 'application/json', 'X-API-KEY': apiKey, 'Cache-Control': 'no-cache, no-store, max-age=0', Pragma: 'no-cache' }, signal: AbortSignal.timeout(120000) });
    const text = await response.text();
    if (response.status === 404 && !text.trim()) return { items: [], sinDatos: true };
    if (!response.ok) throw new Error(`Consulta ${path}: HTTP ${response.status}`);
    let items;
    try { items = JSON.parse(text); } catch { throw new Error(`Respuesta inválida de ${path}`); }
    if (!Array.isArray(items)) throw new Error(`Respuesta de ${path} no contiene una lista`);
    return { items, sinDatos: false };
  }
  const years = Array.from({ length: Number(today.slice(0, 4)) - 2026 + 1 }, (_, index) => 2026 + index);
  const countries = await Promise.all((country === 'combined' ? ['GT', 'SV'] : [country]).map(async code => {
    try {
      const [annual, transfers] = await Promise.all([
        Promise.all(years.map(year => list('facturasyear', { year, var_pais: code }))),
        list('solicitudtraslado', { var_pais: code }),
      ]);
      const facturas = annual.flatMap(result => result.items);
      // In the supplied country configuration, both exclusion lists are empty.
      const { documentos, descartes } = construirUniverso({ facturas, solicitudes: transfers.items, periodo: { fechaInicio: FECHA_INICIO_REPORTE }, hoy: today });
      const documents = documentos.map(doc => ({ ...doc, pais: code, moneda: COUNTRIES[code].moneda }));
      return { ...COUNTRIES[code], ok: true, documentos: documents, sla: calcularSla(documents), descartes, strSinDatos: transfers.sinDatos, facturasSinDatos: annual.every(result => result.sinDatos), consultadas: { facturas: facturas.length, lineasSTR: transfers.items.length } };
    } catch (error) {
      return { ...COUNTRIES[code], ok: false, error: error.name === 'TimeoutError' || error.name === 'AbortError' ? 'La consulta excedió el tiempo de espera.' : error.message };
    }
  }));
  return { ok: countries.every(item => item.ok), parcial: countries.some(item => item.ok) && countries.some(item => !item.ok), corte: today, desde: FECHA_INICIO_REPORTE, actualizado: new Date().toISOString(), regla: { enTiempoHasta: 1, porVencerHasta: 3, unidad: 'días hábiles de lunes a viernes; sin feriados' }, paises: countries };
}
