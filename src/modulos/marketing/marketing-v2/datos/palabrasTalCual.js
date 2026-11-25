// Canales de marketing · Redes sociales · cómo se escriben los títulos que llegan TODO EN MAYÚSCULAS.
//
// LISTA FÁCIL DE EDITAR: siglas y nombres que se quedan EXACTAMENTE como están escritos aquí cuando un título se pasa a
// mayúsculas y minúsculas normales. Para agregar una, escríbala tal como debe verse (por ejemplo 'Intelfon', 'PTToC').
// Las de varias palabras («DATA RED») también sirven.
export const PALABRAS_TAL_CUAL = [
  'RED', 'Intelfon', 'DATA RED', 'SV', 'GT', 'PTToC', 'PTT', 'GPS', 'PBX', 'LTE', '4G', '5G', 'IA', 'B2B', 'BF',
  'WhatsApp', 'Facebook', 'Instagram', 'Black Friday', 'Cyber Monday', 'RH',
]

const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// Las más largas primero («DATA RED» antes que «RED»); sin letras ni números pegados a los lados.
const REGLAS = [...PALABRAS_TAL_CUAL].sort((a, b) => b.length - a.length)
  .map((p) => ({ p, re: new RegExp(`(?<![\\p{L}\\p{N}])${escapar(p).replace(/\s+/g, '\\s+')}(?![\\p{L}\\p{N}])`, 'giu') }))

/** ¿Viene todo (o casi todo) en mayúsculas? Al menos 4 letras y no más de 1 de cada 10 en minúscula. */
export function estaEnMayusculas(texto) {
  const letras = String(texto ?? '').match(/\p{L}/gu) ?? []
  if (letras.length < 4) return false
  const minus = letras.filter((l) => l !== l.toUpperCase()).length
  return minus / letras.length <= 0.1
}

/**
 * Título en mayúsculas y minúsculas normales: si viene todo en mayúsculas, se pasa a minúsculas con mayúscula al inicio
 * de cada frase, y las palabras de PALABRAS_TAL_CUAL se dejan como están en la lista. Si ya trae minúsculas, no se toca.
 */
export function textoNormal(texto) {
  const t = String(texto ?? '')
  if (!estaEnMayusculas(t)) return t
  let s = t.toLowerCase()
    .replace(/^([^\p{L}\p{N}]*)(\p{L})/u, (_, a, b) => a + b.toUpperCase())
    .replace(/([.!?]\s+[¡¿"«]?)(\p{L})/gu, (_, a, b) => a + b.toUpperCase())
  for (const { p, re } of REGLAS) s = s.replace(re, p)
  return s
}
