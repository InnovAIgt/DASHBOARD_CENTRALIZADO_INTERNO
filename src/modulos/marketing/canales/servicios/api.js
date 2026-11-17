// Marketing por canales · llamada a /api/marketing/mailing (mismo servidor del portal).
// El navegador solo recibe totales: ningún correo ni dato personal (server/marketingMailing.js).

/**
 * @param {{ actualizar?: boolean, campanas?: string | null, signal?: AbortSignal }} opciones
 *        campanas: "74,75" para pedir solo esas campañas (D29); null = todas.
 * @returns {Promise<{ ok: true, datos: object } | { ok: false, mensaje: string }>}
 */
export async function pedirMailing({ actualizar = false, campanas = null, signal } = {}) {
  const params = new URLSearchParams()
  if (actualizar) params.set('actualizar', '1')
  if (campanas) params.set('campanas', campanas)
  const consulta = params.toString()
  let respuesta
  try {
    respuesta = await fetch(`/api/marketing/mailing${consulta ? `?${consulta}` : ''}`, { cache: 'no-store', signal })
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    return { ok: false, mensaje: 'No fue posible conectar con el servidor del portal.' }
  }
  let cuerpo = null
  try { cuerpo = await respuesta.json() } catch { /* respuesta sin JSON */ }
  if (!respuesta.ok) {
    return { ok: false, mensaje: cuerpo?.error ?? `El servidor respondió con error ${respuesta.status}.` }
  }
  if (!cuerpo || !Array.isArray(cuerpo.campanas)) return { ok: false, mensaje: 'El servidor devolvió una respuesta inesperada.' }
  return { ok: true, datos: cuerpo }
}
