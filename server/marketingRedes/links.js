/**
 * Redes sociales — links de las publicaciones (docs/marketing-redes/DECISIONES.md, D10).
 *
 *  - linkReal(): si el link es una redirección de Facebook ("l.facebook.com/l.php?u=…"),
 *    devuelve el link verdadero que va en el parámetro u, ya decodificado.
 *  - redDelLink(): dice si un link es de Facebook o de Instagram (o null si no se sabe).
 *  - claveLink(): versión "comparable" del link para detectar el mismo post en dos filas.
 *    Quita lo que cambia en cada copia (fbclid, utm_…, locale) y deja lo que identifica el post.
 */

function aUrl(texto) {
  try { return new URL(String(texto).trim()) } catch { return null }
}

const esRedireccionFacebook = (url) => /(^|\.)l\.facebook\.com$/i.test(url.hostname) && url.pathname.startsWith('/l.php')

export function linkReal(texto) {
  if (texto === null || texto === undefined) return null
  const limpio = String(texto).trim()
  if (!limpio) return null
  const url = aUrl(limpio)
  if (!url || !esRedireccionFacebook(url)) return limpio
  const destino = url.searchParams.get('u') // searchParams ya decodifica %3A, %2F…
  return destino && aUrl(destino) ? destino : limpio
}

export function redDelLink(texto) {
  const url = aUrl(texto)
  if (!url) return null
  const host = url.hostname.toLowerCase()
  if (/(^|\.)instagram\.com$/.test(host) || host === 'instagr.am') return 'Instagram'
  if (/(^|\.)(facebook\.com|fb\.com|fb\.watch|fb\.me)$/.test(host)) return 'Facebook'
  return null
}

/** Parámetros que sí identifican una publicación de Facebook (el resto se descarta). */
const PARAMETROS_FACEBOOK = ['story_fbid', 'fbid', 'id', 'v']

export function claveLink(texto) {
  const url = aUrl(texto)
  if (!url) return texto ? String(texto).trim().toLowerCase() : null
  const host = url.hostname.toLowerCase().replace(/^(www|m|web)\./, '')
  const ruta = url.pathname.replace(/\/+$/, '').toLowerCase()
  if (redDelLink(texto) === 'Facebook') {
    const params = PARAMETROS_FACEBOOK
      .filter((p) => url.searchParams.has(p))
      .map((p) => `${p}=${url.searchParams.get(p)}`)
    return `${host}${ruta}${params.length ? `?${params.join('&')}` : ''}`
  }
  return `${host}${ruta}` // Instagram y otros: la ruta identifica el post (/p/CÓDIGO)
}
