// Canales de marketing · ¿se muestra la pestaña Redes sociales? (docs/marketing/v2/PRODUCCION.md)
// Se decide AL ARMAR la página (vite.config.ts), no en el navegador:
//  - MKT_REDES_VISIBLE = «si» la muestra y «no» la esconde (pone «Próximamente»), en cualquier ambiente;
//  - sin esa variable, se muestra en todo menos en Vercel Production (VERCEL_ENV = production), donde sale «Próximamente».
// No es una clave: solo decide si la pestaña muestra la pantalla de ejemplo.

/** @param {{MKT_REDES_VISIBLE?: string, VERCEL_ENV?: string}} env */
export function redesVisible(env = {}) {
  const v = String(env.MKT_REDES_VISIBLE ?? '').trim().toLowerCase()
  if (v === 'si' || v === 'sí') return true
  if (v === 'no') return false
  return env.VERCEL_ENV !== 'production'
}
