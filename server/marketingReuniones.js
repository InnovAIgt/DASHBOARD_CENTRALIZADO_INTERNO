/**
 * Marketing · Flujo de ventas v2 — conexión segura con Prospekt IA.
 *
 * Consulta la API de reuniones de Prospekt IA agregando la llave RED_API_KEY
 * desde el servidor, para que la llave nunca llegue al navegador.
 * La usan:
 *   - api/marketing/reuniones.js  (función de Vercel, producción)
 *   - server.ts                   (desarrollo local con `npm run dev`)
 *
 * Antes de responder, quita el teléfono del cliente (client_phone) de cada registro.
 *
 * Basado en Dashboard-Leds/api/metrics/reuniones.js del repo InnovAIgt/DashboardLeads.
 * Documentación: docs/marketing/README.md
 */

export const PROSPEKTIA_REUNIONES_URL = 'https://prospektia.red.com.sv/api/metrics/reuniones'

/**
 * Pide UNA página (50 registros) a Prospekt IA.
 * Devuelve { status, contentType, body } para que cada servidor responda igual.
 */
export async function obtenerPaginaReuniones({ method, offset }) {
  if (method !== 'GET') {
    return json(405, { error: 'Método no permitido. Usa GET.' })
  }

  const apiKey = process.env.RED_API_KEY
  if (!apiKey) {
    return json(500, { error: 'RED_API_KEY no está configurada en el servidor.' })
  }

  const offsetTexto = offset == null || offset === '' ? '0' : String(offset)
  if (!/^\d+$/.test(offsetTexto)) {
    return json(400, { error: 'El parámetro offset debe ser un entero no negativo.' })
  }

  let respuesta
  try {
    respuesta = await fetch(`${PROSPEKTIA_REUNIONES_URL}?offset=${encodeURIComponent(offsetTexto)}`, {
      method: 'GET',
      headers: { Accept: 'application/json', 'X-API-Key': apiKey },
    })
  } catch {
    return json(502, { error: 'No fue posible conectar con la API de reuniones de Prospekt IA.' })
  }

  return {
    status: respuesta.status,
    contentType: respuesta.headers.get('content-type') ?? 'application/json',
    body: quitarDatosPersonales(await respuesta.text()),
  }
}

/**
 * Campos de cada registro que NO se envían al navegador.
 * client_name se conserva a propósito (ver docs/marketing/DECISIONES.md, D8).
 */
const CAMPOS_PRIVADOS = ['client_phone']
const LISTAS_DE_REGISTROS = ['leads', 'reuniones', 'data', 'items', 'results']

/**
 * Si el texto es JSON válido, quita CAMPOS_PRIVADOS de cada registro
 * (en la lista principal o en leads/reuniones/data/items/results).
 * Si no es JSON, lo devuelve tal cual.
 */
export function quitarDatosPersonales(texto) {
  let datos
  try {
    datos = JSON.parse(texto)
  } catch {
    return texto
  }

  if (Array.isArray(datos)) {
    limpiarLista(datos)
  } else if (datos && typeof datos === 'object') {
    for (const clave of LISTAS_DE_REGISTROS) {
      if (Array.isArray(datos[clave])) limpiarLista(datos[clave])
    }
  }
  return JSON.stringify(datos)
}

function limpiarLista(lista) {
  for (const registro of lista) {
    if (!registro || typeof registro !== 'object') continue
    for (const campo of CAMPOS_PRIVADOS) delete registro[campo]
  }
}

function json(status, data) {
  return { status, contentType: 'application/json', body: JSON.stringify(data) }
}
