/**
 * Proxy de solo lectura para la API de preofertas de Workflow.
 * La llave se obtiene únicamente de WORKFLOW_API_KEY (variable de servidor).
 */
export async function obtenerPreofertas({ method = 'GET' } = {}) {
  if (method !== 'GET') {
    return { status: 405, body: { error: 'Método no permitido' } };
  }

  const apiKey = process.env.WORKFLOW_API_KEY;
  if (!apiKey) {
    console.error('[Flash] Falta configurar WORKFLOW_API_KEY en el entorno del servidor.');
    return { status: 503, body: { error: 'La integración de Workflow no está configurada en el servidor.' } };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch('https://workflow.red.com.gt/api/integraciones/dashboard/preofertas', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        DASHBOARD_API_KEY: apiKey,
        'X-API-KEY': apiKey,
        Accept: 'application/json'
      },
      cache: 'no-store',
      signal: controller.signal
    });

    const bodyText = await response.text();
    let body;
    try { body = bodyText ? JSON.parse(bodyText) : null; }
    catch { body = { error: 'Workflow devolvió una respuesta que no es JSON.' }; }

    if (!response.ok) {
      console.error(`[Flash] Workflow respondió HTTP ${response.status}.`);
      return {
        status: response.status >= 500 ? 502 : response.status,
        body: { error: `Workflow respondió HTTP ${response.status}.` }
      };
    }

    const lista = Array.isArray(body) ? body : (body && Array.isArray(body.data) ? body.data : null);
    if (!lista) {
      console.error('[Flash] Respuesta de Workflow sin lista de preofertas.');
      return { status: 502, body: { error: 'La respuesta de Workflow no contiene una lista de preofertas.' } };
    }

    return { status: 200, body: { data: lista } };
  } catch (error) {
    const timeoutError = error?.name === 'AbortError';
    console.error(`[Flash] ${timeoutError ? 'Timeout' : 'Error'} consultando Workflow: ${error?.message || 'error desconocido'}`);
    return {
      status: 502,
      body: { error: timeoutError
        ? 'Workflow tardó demasiado en responder.'
        : 'No fue posible conectar con Workflow.' }
    };
  } finally {
    clearTimeout(timeout);
  }
}
