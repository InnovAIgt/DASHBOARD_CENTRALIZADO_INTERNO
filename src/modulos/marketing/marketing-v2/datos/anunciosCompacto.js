// Canales de marketing · Redes sociales · TARJETAS COMPACTAS de Anuncios (mockup_anuncios_compacto): cálculos que
// solo usan las tarjetas (lo demás ya está en presupuestoDetalle.js, plataformasDetalle.js y anunciosFase2.js).
// Cálculos puros, probados con node --test. «Pocos datos» = menos de 5 mensajes.
import { MIN_MENSAJES } from './anunciosFase2.js'

const div = (a, b) => (b > 0 ? a / b : null)

/**
 * Lista de plataformas de la tarjeta: WhatsApp y Otras van juntas («WhatsApp y otras») si cada una tiene menos de 5
 * mensajes. filas = resumenPlataformas(...).filas (con pctMensajes). La fila junta lleva junta: true.
 */
export function listaPlataformasCompacta(filas = []) {
  const chicas = filas.filter((p) => (p.k === 'whatsapp' || p.k === 'otras') && p.mensajes < MIN_MENSAJES)
  if (chicas.length < 2) return filas
  const suma = (k) => chicas.reduce((n, p) => n + (Number(p[k]) || 0), 0)
  const mensajes = suma('mensajes')
  const gastado = suma('gastado')
  const junta = { k: 'resto', nombre: 'WhatsApp y otras', junta: true, mensajes, gastado, impresiones: suma('impresiones'), clics: suma('clics'),
    pctMensajes: suma('pctMensajes'), pctInversion: suma('pctInversion'), pctImpresiones: suma('pctImpresiones'),
    costo: div(gastado, mensajes), pocos: mensajes < MIN_MENSAJES }
  return [...filas.filter((p) => !chicas.includes(p)), junta]
}

/**
 * Lectura de Segmentaciones ganadoras (solo públicos con 5+ mensajes): cuánto más barato escribió el primero que el
 * segundo (por edad si las edades son distintas; si no, por nombre). '' sin públicos con 5+ mensajes.
 * nombre(s) = cómo se escribe un público; formato = dinero.
 */
export function lecturaSegmentaciones(segmentos = [], nombre = (s) => s.nombre, formato = (v) => String(v)) {
  const buenos = segmentos.filter((s) => !s.pocos && s.costo !== null).sort((a, b) => a.costo - b.costo)
  if (!buenos.length) return ''
  const [a, b] = buenos
  if (!b) return `Solo «${nombre(a)}» llegó a ${MIN_MENSAJES}+ mensajes: ${formato(a.costo)} por mensaje.`
  const dif = Math.round(((b.costo - a.costo) / b.costo) * 100)
  const [ea, eb] = [a.publico?.edad, b.publico?.edad]
  const quien = ea && eb && ea !== eb ? [`El público de ${ea}`, `el de ${eb}`] : [`«${nombre(a)}»`, `«${nombre(b)}»`]
  if (dif <= 0) return `${quien[0]} y ${quien[1]} cuestan casi lo mismo: ${formato(a.costo)} por mensaje.`
  return `${quien[0]} escribió ${dif} % más barato que ${quien[1]} (${formato(a.costo)} contra ${formato(b.costo)} por mensaje).`
}

/** Chips de un público en una línea: marca · edad · sexo · ubicaciones · primer interés «+N». */
export function chipsCompactos(s, marcaCorta) {
  const p = s.publico ?? {}
  const intereses = p.intereses ?? []
  return [marcaCorta ?? 'Sin página', p.edad, p.sexo, p.ubicaciones,
    intereses.length ? `${intereses[0]}${intereses.length > 1 ? ` +${intereses.length - 1}` : ''}` : null].filter(Boolean)
}
