// Redes sociales · nombre de la red de un link (para el botón "Abrir publicación en …").
// Versión mínima para el navegador; la regla completa vive en server/marketingRedes/links.js.
export function redDelLinkTexto(link) {
  try {
    const host = new URL(link).hostname.toLowerCase()
    if (/(^|\.)instagram\.com$/.test(host)) return 'Instagram'
    if (/(^|\.)(facebook\.com|fb\.com|fb\.watch|fb\.me)$/.test(host)) return 'Facebook'
  } catch { /* link no válido */ }
  return null
}
