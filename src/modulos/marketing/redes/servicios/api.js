// Redes sociales · lectura de /api/marketing/redes (docs/marketing-redes/README.md).
// El navegador no sabe de dónde sale el Excel: solo recibe las filas ya limpias.

const MENSAJE = 'No hay datos de Redes sociales disponibles.'

export async function cargarRedes(signal) {
  let respuesta
  try {
    respuesta = await fetch('/api/marketing/redes', { signal, headers: { Accept: 'application/json' } })
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    throw new Error(MENSAJE)
  }
  let cuerpo = null
  try { cuerpo = await respuesta.json() } catch { /* respuesta no JSON */ }
  if (!respuesta.ok || !cuerpo || !Array.isArray(cuerpo.filas)) throw new Error(cuerpo?.error || MENSAJE)
  return cuerpo
}
