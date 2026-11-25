/**
 * Canales de marketing · Redes sociales: campañas de RECLUTAMIENTO (decisión de Keily, 24/11/2026; DECISIONES.md).
 *
 * Una campaña es de reclutamiento si su nombre contiene alguna de estas palabras o frases COMPLETAS (sin importar
 * mayúsculas ni tildes). Esas campañas no cuentan en inversión, mensajes ni costo por mensaje de marketing; se
 * muestran aparte con su gasto.
 *
 * PARA EDITAR LA LISTA: agregar o quitar líneas aquí. Cada línea es una expresión regular sobre el nombre ya en
 * minúsculas y sin tildes; «s?» acepta el plural. Las frases se escriben con espacios normales.
 */
export const PALABRAS_RECLUTAMIENTO = [
  'vacantes?',
  'plazas?',
  'empleos?',
  'rh',
  'reclutamiento',
  'trabajos?',
  'contratacion(es)?',
  'contratando',
  'ejecutivos? de ventas',
  'unete',
]

const sinTildes = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const PATRON = new RegExp(`(^|[^a-z0-9])(${PALABRAS_RECLUTAMIENTO.map((p) => p.replace(/ /g, '\\s+')).join('|')})(?=$|[^a-z0-9])`)

/** ¿El nombre de la campaña es de reclutamiento? */
export const esReclutamiento = (nombre) => PATRON.test(sinTildes(nombre))
