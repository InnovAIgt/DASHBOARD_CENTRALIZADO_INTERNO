/**
 * Workflow — conexión segura con la API de preofertas (docs/ventas-flash-altas/DECISIONES.md, D2).
 *
 * Antes, Flash de altas y Activaciones llamaban a Workflow DESDE EL NAVEGADOR con la llave escrita en
 * el HTML (cualquiera podía verla). Ahora la llave vive solo en el servidor, en la variable de entorno
 * WORKFLOW_API_KEY (sin prefijo VITE_, para que nunca llegue al navegador), y las pantallas piden las
 * preofertas a GET /api/workflow/preofertas.
 *
 * La respuesta de Workflow se reenvía TAL CUAL (mismo JSON), para que las pantallas muestren
 * exactamente lo mismo que antes.
 *
 * La usan:
 *   - api/workflow/preofertas.js   (función de Vercel)
 *   - server.ts                    (desarrollo local y Docker)
 */

export const WORKFLOW_PREOFERTAS_URL = 'https://workflow.red.com.gt/api/integraciones/dashboard/preofertas'
const ESPERA_MS = 30_000
const MENSAJE = 'No se pudieron cargar las preofertas.'

const json = (status, cuerpo) => ({ status, contentType: 'application/json; charset=utf-8', body: JSON.stringify(cuerpo) })

/**
 * @param {{ method?: string, env?: Record<string,string|undefined>, fetchFn?: typeof fetch }} opciones
 *   env y fetchFn se pueden reemplazar en las pruebas.
 * @returns {Promise<{ status: number, contentType: string, body: string }>}
 */
export async function obtenerPreofertas({ method = 'GET', env = process.env, fetchFn = fetch } = {}) {
  if (method !== 'GET') return json(405, { ok: false, message: 'Método no permitido. Usa GET.' })

  const llave = env.WORKFLOW_API_KEY?.trim()
  // Sin llave: mensaje claro (sin detalles técnicos). El nombre de la variable sí se dice, para TI.
  if (!llave) return json(503, { ok: false, message: MENSAJE, detalle: 'Falta configurar WORKFLOW_API_KEY en el servidor.' })

  const control = new AbortController()
  const temporizador = setTimeout(() => control.abort(), ESPERA_MS)
  try {
    // Mismos encabezados que usaban las pantallas (Workflow acepta cualquiera de los tres).
    const respuesta = await fetchFn(WORKFLOW_PREOFERTAS_URL, {
      method: 'GET',
      headers: { Accept: 'application/json', Authorization: `Bearer ${llave}`, DASHBOARD_API_KEY: llave, 'X-API-KEY': llave },
      signal: control.signal,
    })
    const texto = await respuesta.text()
    if (!respuesta.ok) {
      console.warn(`[Workflow] Preofertas: la API respondió ${respuesta.status}`)
      return json(502, { ok: false, message: MENSAJE, detalle: `Workflow respondió ${respuesta.status}.` })
    }
    return { status: 200, contentType: respuesta.headers.get('content-type') ?? 'application/json; charset=utf-8', body: texto }
  } catch (error) {
    console.warn('[Workflow] Preofertas: sin conexión', error?.name === 'AbortError' ? '(tiempo de espera)' : '')
    return json(502, { ok: false, message: MENSAJE, detalle: 'Sin conexión con Workflow.' })
  } finally {
    clearTimeout(temporizador)
  }
}
