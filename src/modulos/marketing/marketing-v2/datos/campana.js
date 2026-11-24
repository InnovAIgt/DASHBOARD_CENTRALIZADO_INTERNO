// Canales de marketing · Mailing · cómo se nombra una campaña en TODA la pestaña (regla de Keily):
//   título = ASUNTO · debajo = «#74 · NOMBRE REAL DE BREVO · fecha de envío» (y el cargo donde haga falta).
// Sin asunto: el nombre es el título y no se repite debajo. Los campos de Brevo ({{ contact.NOMBRE }}) → [NOMBRE].
// La pieza visual es <TituloCampana> (pantalla/mailing/piezas.jsx); aquí solo los textos (también para CSV y correos).
import { fechaCorta, NOMBRE_CARGO } from './calculos.js'

/** Campos de Brevo legibles ({{ contact.NOMBRE }} → [NOMBRE]) y sin saltos de línea. */
export const limpiarCampo = (t) => String(t ?? '')
  .replace(/\{\{\s*contact\.([A-Za-z0-9_]+)\s*\}\}/g, (_m, campo) => `[${campo.toUpperCase()}]`)
  .replace(/\s+/g, ' ').trim()

/**
 * Textos de una campaña. c: la campaña (o null si solo se conoce el id).
 * @param {{fecha?: boolean, cargo?: boolean}} [o] qué agregar a la línea de abajo
 * @returns {{id: number, titulo: string, asunto: string, nombre: string, linea: string, unaLinea: string, corto: string, tip: string, conAsunto: boolean}}
 */
export function textosCampana(c, id = c?.id, { fecha = true, cargo = false } = {}) {
  const asunto = limpiarCampo(c?.asunto)
  const nombre = limpiarCampo(c?.nombre)
  const conAsunto = Boolean(asunto)
  const titulo = asunto || nombre || `Campaña #${id}`
  const fechaTxt = fecha && c?.fecha ? fechaCorta(c.fecha) : ''
  const cargoTxt = cargo && c?.cargo ? (NOMBRE_CARGO[c.cargo] ?? c.cargo) : ''
  const linea = [`#${id}`, conAsunto ? nombre : '', fechaTxt === '—' ? '' : fechaTxt, cargoTxt].filter(Boolean).join(' · ')
  return {
    id, titulo, asunto, nombre, conAsunto, linea,
    // Una sola línea (opciones del filtro, globos): «Asunto — #74 NOMBRE» o «NOMBRE — #74» sin asunto.
    unaLinea: conAsunto ? `${asunto} — #${id}${nombre ? ` ${nombre}` : ''}` : `${titulo} — #${id}`,
    // Corto («Filtrado por», correo al ejecutivo): «Asunto · #74» / «asunto (#74)».
    corto: `${titulo} · #${id}`,
    tip: `${titulo}\n${linea}`,
  }
}

/** «asunto (#74)» para el correo al ejecutivo. */
export const campanaEnCorreo = (c, id = c?.id) => `${textosCampana(c, id).titulo} (#${id})`

/**
 * Columnas de CSV/Excel de la campaña: «Campaña (#)», «Asunto» y «Nombre de campaña».
 * campanasDe(fila) → lista de campañas de la fila (una o varias); varias se juntan con « / ».
 */
export function columnasCampana(campanasDe) {
  const lista = (f) => campanasDe(f).filter(Boolean)
  return [
    { label: 'Campaña (#)', valor: (f) => lista(f).map((c) => `#${c.id}`).join(' / ') },
    { label: 'Asunto', valor: (f) => lista(f).map((c) => limpiarCampo(c.asunto) || '—').join(' / ') },
    { label: 'Nombre de campaña', valor: (f) => lista(f).map((c) => limpiarCampo(c.nombre) || '—').join(' / ') },
  ]
}
